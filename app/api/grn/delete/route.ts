import { createClient, type User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL env var");
  if (!serviceRole) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env var. Add it in Vercel Project Settings → Environment Variables, then redeploy.");
  }

  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyUser(request: NextRequest): Promise<{ error: string } | { user: User; role: string; name: string }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: "Unauthorized" };

  const token = authHeader.replace("Bearer ", "");
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !user) return { error: "Invalid token" };

  const { data: profile } = await anonClient
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  const p = profile as any;
  const role = p?.role;
  if (!role || !["admin", "store_keeper", "purchase_manager"].includes(role)) {
    return { error: "Forbidden: you need admin, store_keeper, or purchase_manager role to delete GRNs" };
  }

  return { user, role, name: p?.full_name || user.email || "Unknown" };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

    const body = await request.json();
    const grnId = String(body.grnId ?? "").trim();
    const grnNumber = String(body.grnNumber ?? "").trim();
    if (!grnId) return NextResponse.json({ error: "grnId is required" }, { status: 400 });

    const adminClient = getAdminClient();

    // ── 1. Look up existing stock ledger entries linked to this GRN ──
    const { data: stockEntries, error: lookupErr } = await adminClient
      .from("stock_ledger")
      .select("id, item_id, qty_in, qty_out, unit, balance")
      .eq("reference_type", "grn")
      .eq("reference_id", grnId);

    if (lookupErr) {
      console.error("delete GRN: stock lookup error", lookupErr);
      return NextResponse.json({ error: `Failed to look up stock: ${lookupErr.message}` }, { status: 500 });
    }

    // ── 2. Reverse stock entries in parallel ──
    // We keep the original entries for audit trail and add reversal entries.
    const entries = (stockEntries ?? []).filter(e => Number(e.qty_in ?? 0) - Number(e.qty_out ?? 0) > 0);
    let totalReversed = 0;

    if (entries.length > 0) {
      // Grab unique item IDs
      const itemIds = Array.from(new Set(entries.map(e => e.item_id)));

      // ONE query: get latest balance for ALL items at once
      const { data: allBalances, error: balanceErr } = await adminClient
        .from("stock_ledger")
        .select("item_id, balance")
        .in("item_id", itemIds)
        .order("created_at", { ascending: false });

      if (balanceErr) {
        console.error("delete GRN: balance lookup error", balanceErr);
        return NextResponse.json({ error: `Failed to look up balances: ${balanceErr.message}` }, { status: 500 });
      }

      // Build a map of item_id → latest balance (first entry per item after ordering desc)
      const balanceMap: Record<string, number> = {};
      for (const entry of (allBalances ?? [])) {
        if (!(entry.item_id in balanceMap)) {
          balanceMap[entry.item_id] = Number(entry.balance ?? 0);
        }
      }

      // Build reversals and run all inserts in parallel
      const reversals = entries.map(entry => {
        const netIn = Number(entry.qty_in ?? 0) - Number(entry.qty_out ?? 0);
        const baseBalance = balanceMap[entry.item_id] ?? 0;
        totalReversed += netIn;
        return {
          item_id: entry.item_id,
          transaction_type: "adjustment_out" as const,
          reference_type: "grn",
          reference_id: grnId,
          reference_code: `REVERSAL-${grnNumber}`,
          qty_in: 0,
          qty_out: netIn,
          balance: Math.max(0, baseBalance - netIn),
          unit: entry.unit,
          notes: `Stock reversal for deleted GRN ${grnNumber}`,
          created_by: auth.user.id,
          created_by_name: auth.name,
        };
      });

      // Batch insert ALL reversals in ONE query
      const { error: batchErr } = await adminClient
        .from("stock_ledger")
        .insert(reversals);

      if (batchErr) {
        console.error("delete GRN: reversal error", batchErr);
        return NextResponse.json({ error: `Failed to reverse stock: ${batchErr.message}` }, { status: 500 });
      }
    }

    // ── 3. Log both activities in parallel ──
    const activities: any[] = [{
      user_id: auth.user.id,
      user_email: auth.user.email,
      user_name: auth.name,
      action: "grn_deleted",
      entity_type: "grn",
      entity_id: grnId,
      entity_code: grnNumber,
      details: {
        stock_reversed: totalReversed > 0,
        reversed_quantity: totalReversed,
        entries_count: entries.length,
      },
    }];

    if (totalReversed > 0) {
      activities.push({
        user_id: auth.user.id,
        user_email: auth.user.email,
        user_name: auth.name,
        action: "stock_reversed",
        entity_type: "grn",
        entity_id: grnId,
        entity_code: grnNumber,
        details: {
          reversed_quantity: totalReversed,
          reason: "GRN deleted",
        },
      });
    }

    // ── 4. Log activity + delete GRN in parallel ──
    const [activityResult, deleteResult] = await Promise.all([
      // Activity log (non-fatal if it fails)
      adminClient.from("activity_logs").insert(activities),
      // Delete the GRN itself
      adminClient.from("grn").delete().eq("id", grnId).select("id"),
    ]);

    if (activityResult.error) {
      console.error("delete GRN: activity log error", activityResult.error);
    }

    if (deleteResult.error) {
      console.error("delete GRN: grn delete error", deleteResult.error);
      return NextResponse.json({ error: `Failed to delete GRN: ${deleteResult.error.message}` }, { status: 500 });
    }

    const deleted = deleteResult.data;
    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: "GRN not found or already deleted." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deletedId: grnId,
      stockReversed: totalReversed,
      message: totalReversed > 0
        ? `GRN deleted. ${totalReversed} unit${totalReversed !== 1 ? "s" : ""} of stock reversed.`
        : "GRN deleted (no stock entries to reverse).",
    });
  } catch (err: any) {
    console.error("delete GRN API: unexpected error", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
