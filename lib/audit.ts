import { createClient } from "./supabase";

export interface AuditPayload {
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_code?: string;
  details?: Record<string, unknown>;
}

/**
 * Client-side audit logger. Best-effort: if it fails it won't block the UX.
 * The database also has triggers on purchase_orders and invoices for belt-and-suspenders logging.
 */
export async function audit(payload: AuditPayload) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Try to get profile name
    let userName = user.email ?? "Unknown";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) userName = profile.full_name;
    } catch {
      // ignore
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      user_email: user.email,
      user_name: userName,
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id ?? null,
      entity_code: payload.entity_code ?? null,
      details: payload.details ?? {},
    });
  } catch {
    // Silently fail — audit should never block business logic
  }
}
