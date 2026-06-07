"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useRole, ROLE_LABELS, type UserRole } from "@/lib/roles";
import { Shield, Save, User, Search, X } from "lucide-react";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { role, loading: roleLoading } = useRole();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const rows = (data ?? []) as unknown as UserProfile[];
    setUsers(rows);
    setFiltered(rows);
    setLoading(false);
  }

  useEffect(() => {
    if (!roleLoading && role !== "admin") {
      router.push("/dashboard");
      return;
    }
    if (role === "admin") load();
  }, [role, roleLoading, router]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(users); return; }
    const q = search.toLowerCase();
    setFiltered(users.filter((u) =>
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.department ?? "").toLowerCase().includes(q)
    ));
  }, [search, users]);

  async function updateRole(id: string, newRole: UserRole) {
    setSavingId(id);
    const supabase = createClient();
    await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    setSavingId(null);
  }

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-7 h-7 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#8892a8] dark:text-gray-400 text-sm">Loading users...</p>
        </div>
      </div>
    );
  }

  if (role !== "admin") return null;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Team & Roles</h1>
        <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
          Assign roles so the system enforces who can do what.
        </p>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or department..."
          className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#dde1ea] dark:border-gray-800">
                <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">User</th>
                <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Department</th>
                <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Role</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-[#eef1f6] dark:border-gray-800/50 hover:bg-[#f7f8fb] dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-viton-red/10 dark:bg-orange-500/10 flex items-center justify-center text-viton-red dark:text-orange-400">
                        <User size={14} />
                      </div>
                      <div>
                        <p className="text-viton-navy dark:text-white font-medium">{u.full_name ?? "Unnamed"}</p>
                        <p className="text-[#8892a8] dark:text-gray-500 text-xs">{u.email ?? "No email"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#4a5578] dark:text-gray-400">{u.department ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value as UserRole)}
                        disabled={savingId === u.id}
                        className="appearance-none bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 pr-8 text-sm text-viton-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 cursor-pointer disabled:opacity-50"
                      >
                        {Object.entries(ROLE_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      {savingId === u.id && (
                        <div className="w-4 h-4 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {u.role === "admin" && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-viton-red dark:text-orange-400 bg-red-50 dark:bg-orange-500/10 px-2 py-1 rounded-lg">
                        <Shield size={10} /> Admin
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
