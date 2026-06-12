// Role-based access control for VITONENGG ERP
// These map to the profiles.role column in Supabase

export type UserRole = "admin" | "purchase_manager" | "accounts" | "store_keeper" | "viewer" | "engineer" | "quality_assurance";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  purchase_manager: "Project Manager",
  accounts: "Accounts",
  store_keeper: "Store Keeper",
  engineer: "Engineer",
  viewer: "Viewer",
  quality_assurance: "Quality Assurance",
};

export interface Profile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role: UserRole;
  department?: string | null;
  is_active?: boolean;
  created_at?: string;
}

// What each role can do
export type PermissionAction = keyof typeof PERMISSIONS;

export const PERMISSIONS = {
  // PO
  create_po: ["admin", "purchase_manager"],
  edit_po: ["admin", "purchase_manager"],
  delete_po: ["admin"],

  // Invoice
  create_invoice: ["admin", "accounts"],
  edit_invoice: ["admin", "accounts"],
  delete_invoice: ["admin"],

  // Requisition
  create_requisition: ["admin", "engineer", "purchase_manager", "store_keeper", "quality_assurance"],
  approve_requisition: ["admin", "purchase_manager"],
  reject_requisition: ["admin", "purchase_manager"],
  convert_requisition: ["admin", "purchase_manager"],

  // GRN / Stock
  create_grn: ["quality_assurance"],
  edit_grn: ["quality_assurance"],
  send_for_inspection: ["admin", "purchase_manager"],
  inspect_grn: ["admin", "quality_assurance"],
  approve_grn: ["admin", "quality_assurance"],
  // All non-viewer roles can submit a stock adjustment.
  // Admins apply it directly; all others go through approval.
  adjust_stock: ["admin", "purchase_manager", "accounts", "store_keeper", "engineer", "quality_assurance"],
  // Only admins can approve/reject pending adjustment requests
  approve_stock_adjustment: ["admin"],

  // Master data
  manage_catalog: ["admin", "purchase_manager", "store_keeper"],
  manage_vendors: ["admin", "purchase_manager"],
  manage_buyers: ["admin", "accounts"],

  // Users
  manage_users: ["admin"],
  view_activity: ["admin", "purchase_manager", "accounts", "quality_assurance"],
} as const;

export function can(role: UserRole | undefined | null, action: keyof typeof PERMISSIONS): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  const allowed = PERMISSIONS[action];
  return (allowed as readonly string[]).includes(role);
}

export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === "admin";
}

// ── React hook ──────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { createClient } from "./supabase";

export function useRole() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile((data as unknown as Profile) ?? null);
      setLoading(false);
    }
    load();
  }, []);

  return { role: profile?.role ?? null, profile, loading };
}
