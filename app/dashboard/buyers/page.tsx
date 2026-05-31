"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Search, X, Save, Pencil } from "lucide-react";

interface Buyer {
  id: string;
  name: string;
  gstin?: string | null;
  address?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
}

const emptyBuyer: Omit<Buyer, "id"> = {
  name: "",
  gstin: "",
  address: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
};

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [filtered, setFiltered] = useState<Buyer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Buyer | null>(null);
  const [form, setForm] = useState<Omit<Buyer, "id">>(emptyBuyer);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadBuyers() {
    const supabase = createClient();
    const { data, error } = await supabase.from("buyers").select("*").order("name");
    if (error) { setError(error.message); setBuyers([]); setFiltered([]); setLoading(false); return; }
    const rows = (data ?? []) as unknown as Buyer[];
    setBuyers(rows); setFiltered(rows); setLoading(false);
  }

  useEffect(() => { loadBuyers(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(buyers); return; }
    const q = search.toLowerCase();
    setFiltered(buyers.filter((b) => b.name.toLowerCase().includes(q) || (b.gstin ?? "").toLowerCase().includes(q)));
  }, [search, buyers]);

  function openAdd() { setEditing(null); setForm(emptyBuyer); setError(""); setShowForm(true); }
  function openEdit(b: Buyer) {
    setEditing(b);
    setForm({ name: b.name, gstin: b.gstin ?? "", address: b.address ?? "", contact_name: b.contact_name ?? "", contact_phone: b.contact_phone ?? "", contact_email: b.contact_email ?? "" });
    setError(""); setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Buyer name is required."); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    const payload = { name: form.name.trim(), gstin: (form.gstin ?? "").trim() || null, address: (form.address ?? "").trim() || null, contact_name: (form.contact_name ?? "").trim() || null, contact_phone: (form.contact_phone ?? "").trim() || null, contact_email: (form.contact_email ?? "").trim() || null };
    let saveError = null;
    if (editing) { const { error } = await supabase.from("buyers").update(payload).eq("id", editing.id); saveError = error; }
    else { const { error } = await supabase.from("buyers").insert(payload); saveError = error; }
    if (saveError) { setError(saveError.message); setSaving(false); return; }
    await loadBuyers(); setShowForm(false); setSaving(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Buyers</h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">{buyers.length} buyers registered</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
          <Plus size={16} />
          Add Buyer
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or GSTIN..."
          className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white"><X size={14} /></button>
        )}
      </div>

      {error && !showForm && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm mb-6">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((b) => (
            <div key={b.id} className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl px-5 py-4 flex items-center justify-between hover:border-[#c0c8db] dark:hover:border-gray-700 hover:shadow-sm transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-viton-navy dark:text-white font-semibold">{b.name}</p>
                  {b.gstin && (
                    <span className="text-xs font-mono bg-[#f1f3f8] dark:bg-gray-800 text-[#4a5578] dark:text-gray-400 px-2 py-0.5 rounded-lg">{b.gstin}</span>
                  )}
                </div>
                <div className="flex gap-4 mt-1 flex-wrap">
                  {b.contact_name && <p className="text-[#8892a8] dark:text-gray-500 text-xs">{b.contact_name}</p>}
                  {b.contact_phone && <p className="text-[#8892a8] dark:text-gray-500 text-xs">{b.contact_phone}</p>}
                </div>
              </div>
              <button onClick={() => openEdit(b)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-red dark:hover:text-orange-400 transition-colors p-1 ml-4">
                <Pencil size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-[#dde1ea] dark:border-gray-800">
              <h2 className="text-viton-navy dark:text-white font-bold">{editing ? "Edit Buyer" : "Add Buyer"}</h2>
              <button onClick={() => setShowForm(false)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm">{error}</div>}
              {[
                { label: "Buyer Name *", key: "name", placeholder: "e.g. Tata Chemicals" },
                { label: "GSTIN", key: "gstin", placeholder: "e.g. 27AATCT2127Q1ZF" },
                { label: "Address", key: "address", placeholder: "City, State" },
                { label: "Contact Person", key: "contact_name", placeholder: "e.g. Mr. Raj" },
                { label: "Phone", key: "contact_phone", placeholder: "e.g. 9876543210" },
                { label: "Email", key: "contact_email", placeholder: "e.g. buyer@company.com" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{field.label}</label>
                  <input
                    value={(form as Record<string, string>)[field.key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-[#dde1ea] dark:border-gray-800 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold py-3 rounded-xl text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <Save size={15} />
                {saving ? "Saving..." : "Save Buyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
