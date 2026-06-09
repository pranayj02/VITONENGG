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

    // ── 2. Reverse each stock entry (add "out" transaction) ──
    // We keep the original entries for audit trail and add reversal entries.
    let totalReversed = 0;
    for (const entry of (stockEntries ?? [])) {
      const netIn = Number(entry.qty_in ?? 0) - Number(entry.qty_out ?? 0);
      if (netIn <= 0) continue;

      // Get latest balance for this item
      const { data: lastLedger } = await adminClient
        .from("stock_ledger")
        .select("balance")
        .eq("item_id", entry.item_id)
        .order("created_at", { ascending: false })
        .limit(1);

      const baseBalance = Number((lastLedger as any)?.[0]?.balance ?? 0);

      const { error: reverseErr } = await adminClient
        .from("stock_ledger")
        .insert({
          item_id: entry.item_id,
          transaction_type: "adjustment_out",
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
        });

      if (reverseErr) {
        console.error("delete GRN: reversal error", reverseErr);
        return NextResponse.json({ error: `Failed to reverse stock: ${reverseErr.message}` }, { status: 500 });
      }
      totalReversed += netIn;
    }

    // ── 3. Log the activity ──
    const { error: activityErr } = await adminClient
      .from("activity_logs")
      .insert({
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
          entries_count: (stockEntries ?? []).length,
        },
      });

    if (activityErr) {
      console.error("delete GRN: activity log error", activityErr);
      // Non-fatal — continue
    }

    // ── 4. If stock was reversed, also log a stock_ledger activity ──
    if (totalReversed > 0) {
      const { error: stockActivityErr } = await adminClient
        .from("activity_logs")
        .insert({
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

      if (stockActivityErr) {
        console.error("delete GRN: stock activity log error", stockActivityErr);
      }
    }

    // ── 5. Delete the GRN record itself ──
    const { data: deleted, error: deleteErr } = await adminClient
      .from("grn")
      .delete()
      .eq("id", grnId)
      .select("id");

    if (deleteErr) {
      console.error("delete GRN: grn delete error", deleteErr);
      return NextResponse.json({ error: `Failed to delete GRN: ${deleteErr.message}` }, { status: 500 });
    }

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
