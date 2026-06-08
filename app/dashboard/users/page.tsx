"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { useRouter } from "next/navigation";
import { useRole, ROLE_LABELS, type UserRole } from "@/lib/roles";
import {
  Shield,
  Save,
  User,
  Search,
  X,
  Plus,
  CheckCircle,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Pencil,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

interface ProfileDraft {
  full_name: string;
  department: string;
}

function toProfileDraft(user: UserProfile): ProfileDraft {
  return {
    full_name: (user.full_name ?? "").trim() || "Yatish Jain",
    department: user.department ?? "",
  };
}

function getAdminCount(rows: UserProfile[]) {
  return rows.filter((u) => u.role === "admin").length;
}

export default function UsersPage() {
  const router = useRouter();
  const { role, loading: roleLoading } = useRole();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Add user modal state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "Yatish Jain",
    role: "viewer" as UserRole,
    department: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({ full_name: "Yatish Jain", department: "" });

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
    setDeleteError("");
    const currentUser = users.find((u) => u.id === id);
    if (!currentUser) return;
    if (currentUser.role === "admin" && newRole !== "admin" && getAdminCount(users) <= 1) {
      setDeleteError("At least one administrator must remain in the system.");
      return;
    }
    setSavingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    if (!error) {
      const currentUserName = currentUser.full_name?.trim() || currentUser.email || "User";
      await audit({ action: "user_role_updated", entity_type: "user", entity_id: id, entity_code: currentUserName, details: { previous_role: currentUser.role, next_role: newRole } });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    } else {
      setDeleteError(error.message);
    }
    setSavingId(null);
  }

  function startEditing(user: UserProfile) {
    setDeleteError("");
    setEditingId(user.id);
    setProfileDraft(toProfileDraft(user));
  }

  function cancelEditing() {
    setEditingId(null);
    setProfileDraft({ full_name: "Yatish Jain", department: "" });
  }

  async function saveProfile(id: string) {
    setDeleteError("");
    setSavingId(id);
    const supabase = createClient();
    const nextPatch = {
      full_name: profileDraft.full_name.trim() || "Yatish Jain",
      department: profileDraft.department.trim() || null,
    };
    const { error } = await supabase.from("profiles").update(nextPatch).eq("id", id);
    if (!error) {
      const currentUser = users.find((u) => u.id === id);
      await audit({ action: "user_profile_updated", entity_type: "user", entity_id: id, entity_code: currentUser?.full_name?.trim() || currentUser?.email || "User", details: { full_name: nextPatch.full_name, department: nextPatch.department } });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...nextPatch } : u)));
      setEditingId(null);
      setProfileDraft({ full_name: "Yatish Jain", department: "" });
    } else {
      setDeleteError(error.message);
    }
    setSavingId(null);
  }

  async function handleDeleteUser(user: UserProfile) {
    setDeleteError("");
    if (user.role === "admin" && getAdminCount(users) <= 1) {
      setDeleteError("You cannot delete the last administrator.");
      return;
    }
    const confirmed = window.confirm(`Delete ${user.full_name?.trim() || user.email || "this user"}? This cannot be undone.`);
    if (!confirmed) return;

    setSavingId(user.id);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setDeleteError("You must be logged in to delete users.");
        setSavingId(null);
        return;
      }
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        setDeleteError(result.error || "Failed to delete user");
        setSavingId(null);
        return;
      }
      await audit({ action: "user_deleted", entity_type: "user", entity_id: user.id, entity_code: user.full_name?.trim() || user.email || "User", details: { role: user.role, department: user.department } });
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      setDeleteError(err.message || "Network error");
    }
    setSavingId(null);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    setCreateSuccess(false);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      setCreateError("You must be logged in to create users.");
      setCreating(false);
      return;
    }

    try {
      if (!form.full_name.trim()) { setCreateError("Full name is required."); setCreating(false); return; }
    const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      if (!res.ok) {
        setCreateError(result.error || "Failed to create user");
        setCreating(false);
        return;
      }

      setCreateSuccess(true);
      setForm({ email: "", password: "", full_name: "Yatish Jain", role: "viewer", department: "" });
      await load();
    } catch (err: any) {
      setCreateError(err.message || "Network error");
    }

    setCreating(false);
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
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Team & Roles</h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
            Assign roles so the system enforces who can do what.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setCreateError(""); setCreateSuccess(false); }}
          className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Add User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-[#dde1ea] dark:border-gray-800">
              <h2 className="text-viton-navy dark:text-white font-bold text-lg">Add Team Member</h2>
              <button onClick={() => setShowForm(false)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm">{createError}</div>
              )}
              {createSuccess && (
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-3 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle size={14} /> User created successfully!
                </div>
              )}

              <div>
                <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="e.g. yatish@viton.com"
                  required
                  className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                    className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 pr-12 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label>
                <input
                  value={form.full_name}
                  required
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="e.g. Yatish Kumar"
                  className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Role</label>
                  <div className="relative">
                    <select
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                      className="w-full appearance-none bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-sm text-viton-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 cursor-pointer"
                    >
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-4 h-4 text-[#8892a8] dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Department</label>
                  <input
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    placeholder="e.g. Production"
                    className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold py-3 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  <Save size={15} />
                  {creating ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              {filtered.map((u) => {
                const isEditing = editingId === u.id;
                return (
                <tr key={u.id} className="border-b border-[#eef1f6] dark:border-gray-800/50 hover:bg-[#f7f8fb] dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-viton-red/10 dark:bg-orange-500/10 flex items-center justify-center text-viton-red dark:text-orange-400">
                        <User size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            value={profileDraft.full_name}
                            onChange={(e) => setProfileDraft((prev) => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Full name"
                            className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-700 focus:border-viton-red dark:focus:border-orange-500 rounded px-2 py-1 text-sm text-viton-navy dark:text-white font-medium focus:outline-none transition-all"
                          />
                        ) : (
                          <p className="text-sm text-viton-navy dark:text-white font-medium">{u.full_name?.trim() || "Yatish Jain"}</p>
                        )}
                        <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">{u.email ?? "No email"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {isEditing ? (
                      <input
                        value={profileDraft.department}
                        onChange={(e) => setProfileDraft((prev) => ({ ...prev, department: e.target.value }))}
                        placeholder="Department"
                        className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-700 focus:border-viton-red dark:focus:border-orange-500 rounded px-2 py-1 text-sm text-[#4a5578] dark:text-gray-400 focus:outline-none transition-all"
                      />
                    ) : (
                      <p className="text-sm text-[#4a5578] dark:text-gray-400">{u.department?.trim() || "Department"}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value as UserRole)}
                        disabled={savingId === u.id || isEditing}
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
                    <div className="flex items-center gap-2 flex-wrap justify-end lg:justify-start">
                      {u.role === "admin" && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-viton-red dark:text-orange-400 bg-red-50 dark:bg-orange-500/10 px-2 py-1 rounded-lg">
                          <Shield size={10} /> Admin
                        </span>
                      )}
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveProfile(u.id)}
                            disabled={savingId === u.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-viton-red hover:bg-viton-red-hover text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                          >
                            <Save size={12} /> Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={savingId === u.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#dde1ea] dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-[#4a5578] dark:text-gray-300 disabled:opacity-60"
                          >
                            <X size={12} /> Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditing(u)}
                          disabled={editingId !== null || savingId === u.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#dde1ea] dark:border-gray-700 px-3 py-1.5 text-xs font-semibold text-[#4a5578] dark:text-gray-300 disabled:opacity-60"
                        >
                          <Pencil size={12} /> Edit Profile
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(u)}
                        disabled={savingId === u.id || isEditing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
