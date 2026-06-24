"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Save, X, Plus, ArrowLeft, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

const FIELDS: { key: string; label: string }[] = [
  { key: "valve", label: "Valve Type" },
  { key: "type", label: "Type" },
  { key: "bore", label: "Bore" },
  { key: "rating", label: "Rating" },
  { key: "end_connection", label: "End Connection" },
  { key: "body_bonnet", label: "Body / Bonnet" },
  { key: "wedge_disc_plug_ball", label: "Wedge / Disc / Plug / Ball" },
  { key: "stem_hinge", label: "Stem / Hinge" },
  { key: "seat", label: "Seat" },
  { key: "gasket", label: "Gasket" },
  { key: "gl_pkng", label: "Gland Packing" },
  { key: "fasteners", label: "Fasteners" },
];

export default function MaterialCodesPage() {
  const router = useRouter();
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [newForm, setNewForm] = useState<Record<string, string>>({});
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("material_codes")
      .select("*")
      .order("material_no", { ascending: true });
    setCodes(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(code: any) {
    setEditingId(code.id);
    const form: Record<string, string> = { material_no: code.material_no };
    for (const f of FIELDS) form[f.key] = code[f.key] ?? "";
    setEditForm(form);
  }

  async function saveEdit() {
    if (!editingId || !editForm.material_no.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const payload: Record<string, any> = { material_no: editForm.material_no.trim(), updated_at: new Date().toISOString() };
    for (const f of FIELDS) payload[f.key] = editForm[f.key]?.trim() || null;
    await supabase.from("material_codes").update(payload).eq("id", editingId);
    setEditingId(null);
    setSaving(false);
    await load();
  }

  async function addNew() {
    if (!newForm.material_no?.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const payload: Record<string, any> = { material_no: newForm.material_no.trim() };
    for (const f of FIELDS) payload[f.key] = newForm[f.key]?.trim() || null;
    await supabase.from("material_codes").insert(payload);
    setShowNew(false);
    setNewForm({});
    setSaving(false);
    await load();
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("material_codes").delete().eq("id", id);
    await load();
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/wo")}
            className="flex items-center gap-1.5 text-xs text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={12} /> Back
          </button>
          <div>
            <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Material Codes</h1>
            <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
              {codes.length} code{codes.length !== 1 ? "s" : ""} stored
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowNew(true); setNewForm({}); }}
          className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus size={16} /> New Code
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : codes.length === 0 && !showNew ? (
        <div className="text-center py-16 text-[#8892a8] dark:text-gray-600">
          No material codes yet. Create one to start auto-filling WO line items.
        </div>
      ) : (
        <div className="space-y-3">
          {/* New Code Form */}
          {showNew && (
            <div className="bg-white dark:bg-gray-900 border-2 border-viton-red/30 dark:border-orange-500/30 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-viton-navy dark:text-white font-bold">New Material Code</h3>
                <button onClick={() => setShowNew(false)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                  <label className="block text-[10px] font-semibold text-[#4a5578] dark:text-gray-400 mb-1 uppercase tracking-wide">Material No. *</label>
                  <input
                    type="text"
                    value={newForm.material_no ?? ""}
                    onChange={(e) => setNewForm((p) => ({ ...p, material_no: e.target.value }))}
                    placeholder="e.g. 51301"
                    className="w-full bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red/20 focus:border-viton-red transition-all"
                  />
                </div>
                {FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-semibold text-[#4a5578] dark:text-gray-400 mb-1 uppercase tracking-wide">{f.label}</label>
                    <input
                      type="text"
                      value={newForm[f.key] ?? ""}
                      onChange={(e) => setNewForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.label}
                      className="w-full bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red/20 focus:border-viton-red transition-all"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowNew(false)} className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-4 py-2 rounded-xl text-sm">Cancel</button>
                <button onClick={addNew} disabled={saving || !newForm.material_no?.trim()} className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                  <Save size={14} /> {saving ? "Saving..." : "Save Code"}
                </button>
              </div>
            </div>
          )}

          {/* Existing Codes */}
          {codes.map((code) => {
            const isEditing = editingId === code.id;
            return (
              <div key={code.id} className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#dde1ea] dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-viton-navy dark:text-white font-bold font-mono text-sm">{code.material_no}</h3>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={() => setEditingId(null)} className="text-xs text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-[#f1f3f8] dark:hover:bg-gray-800">Cancel</button>
                        <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 text-xs bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-all">
                          <Save size={12} /> {saving ? "Saving..." : "Save"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => remove(code.id)} className="text-[#8892a8] dark:text-gray-500 hover:text-red-500 transition-colors p-1" title="Delete">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => startEdit(code)} className="text-xs font-semibold text-viton-red dark:text-orange-400 hover:bg-viton-red/5 dark:hover:bg-orange-500/10 px-3 py-1.5 rounded-lg transition-colors">Edit</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {FIELDS.map((f) => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-semibold text-[#4a5578] dark:text-gray-400 mb-1 uppercase tracking-wide">{f.label}</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm[f.key] ?? ""}
                            onChange={(e) => setEditForm((p) => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-viton-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-viton-red/20 focus:border-viton-red transition-all"
                          />
                        ) : (
                          <p className="text-xs text-viton-navy dark:text-white py-2">{code[f.key] || <span className="text-[#8892a8] dark:text-gray-600">—</span>}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
