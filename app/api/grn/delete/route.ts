import { createClient } from "@supabase/supabase-js";
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

async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: "Unauthorized" };

  const token = authHeader.replace("Bearer ", "");
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !user) return { error: "Invalid token" };

  const { data: profile } = await anonClient.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile as any)?.role;
  if (!role || !["admin", "store_keeper", "purchase_manager"].includes(role)) {
    return { error: "Forbidden: you need admin, store_keeper, or purchase_manager role to delete GRNs" };
  }

  return { user, role };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 });

    const body = await request.json();
    const grnId = String(body.grnId ?? "").trim();
    const grnNumber = String(body.grnNumber ?? "").trim();
    if (!grnId) return NextResponse.json({ error: "grnId is required" }, { status: 400 });

    const adminClient = getAdminClient();

    // Delete stock ledger entries linked to this GRN
    const { error: ledgerErr } = await adminClient
      .from("stock_ledger")
      .delete()
      .eq("reference_type", "grn")
      .eq("reference_id", grnId);

    if (ledgerErr) {
      console.error("delete GRN API: stock_ledger error", ledgerErr);
      return NextResponse.json({ error: `Failed to delete stock entries: ${ledgerErr.message}` }, { status: 500 });
    }

    // Delete the GRN itself
    const { data: deleted, error: deleteErr } = await adminClient
      .from("grn")
      .delete()
      .eq("id", grnId)
      .select("id");

    if (deleteErr) {
      console.error("delete GRN API: grn delete error", deleteErr);
      return NextResponse.json({ error: `Failed to delete GRN: ${deleteErr.message}` }, { status: 500 });
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: "GRN not found or already deleted." }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: grnId });
  } catch (err: any) {
    console.error("delete GRN API: unexpected error", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
