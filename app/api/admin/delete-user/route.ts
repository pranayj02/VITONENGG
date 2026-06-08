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

async function verifyAdmin(request: NextRequest) {
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
  if ((profile as any)?.role !== "admin") return { error: "Forbidden: admin only" };

  return { user };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 });

    const body = await request.json();
    const userId = String(body.userId ?? "").trim();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    if (userId === auth.user.id) return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });

    const adminClient = getAdminClient();
    const { data: admins } = await adminClient.from("profiles").select("id, role").eq("role", "admin");
    const adminCount = (admins ?? []).length;
    const { data: targetProfile } = await adminClient.from("profiles").select("role").eq("id", userId).maybeSingle();
    if ((targetProfile as any)?.role === "admin" && adminCount <= 1) {
      return NextResponse.json({ error: "You cannot delete the last administrator." }, { status: 400 });
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
