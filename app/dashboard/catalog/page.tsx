"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Search, X, Save, Pencil } from "lucide-react";
import type { Item } from "@/lib/types";

const emptyItem = {
  serial_id: "",
  name: "",
  description: "",
  unit: "Nos",
  category: "",
  hsn_code: "",
  default_rate: "",
};

export default function CatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filtered, setFiltered] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadItems() {
    const supabase = createClient();
    const { data, error } = await supabase.from("items").select("*").order("serial_id");
    if (error) { setError(error.message); setItems([]); setFiltered([]); setLoading(false); return; }
    const rows = (data ?? []) as unknown as Item[];
    setItems(rows);
    setFiltered(rows);
    setLoading(false);
  }

  useEffect(() => { loadItems(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      (i.serial_id ?? "").toLowerCase().includes(q) ||
      (i.category ?? "").toLowerCase().includes(q)
    ));
  }, [search, items]);

  function openAdd() { setEditing(null); setForm(emptyItem); setError(""); setShowForm(true); }
  function openEdit(item: Item) {
    setEditing(item);
    setForm({ serial_id: item.serial_id ?? "", name: item.name, description: item.description ?? "", unit: item.unit ?? "Nos", category: item.category ?? "", hsn_code: item.hsn_code ?? "", default_rate: item.default_rate != null ? String(item.default_rate) : "" });
    setError(""); setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Item name is required."); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    const payload = { serial_id: form.serial_id.trim() || null, name: form.name.trim(), description: form.description.trim() || null, unit: form.unit.trim() || "Nos", category: form.category.trim() || null, hsn_code: form.hsn_code.trim() || null, default_rate: form.default_rate !== "" ? parseFloat(form.default_rate) : null };
    let saveError = null;
    if (editing) { const { error } = await supabase.from("items").update(payload).eq("id", editing.id); saveError = error; }
    else { const { error } = await supabase.from("items").insert(payload); saveError = error; }
    if (saveError) { setError(saveError.message); setSaving(false); return; }
    await loadItems(); setShowForm(false); setSaving(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Item Catalog</h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">{items.length} items registered</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
          <Plus size={16} />
          Add Item
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, serial ID, or category..."
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
          {filtered.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl px-5 py-4 flex items-center justify-between hover:border-[#c0c8db] dark:hover:border-gray-700 hover:shadow-sm transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  {item.serial_id && (
                    <span className="text-xs font-mono bg-red-50 dark:bg-orange-500/10 text-viton-red dark:text-orange-400 border border-red-200 dark:border-orange-500/20 px-2 py-0.5 rounded-lg">
                      {item.serial_id}
                    </span>
                  )}
                  <p className="text-viton-navy dark:text-white font-semibold">{item.name}</p>
                </div>
                <div className="flex gap-4 mt-1 flex-wrap">
                  {item.category && <p className="text-[#8892a8] dark:text-gray-500 text-xs">{item.category}</p>}
                  {item.unit && <p className="text-[#8892a8] dark:text-gray-500 text-xs">Unit: {item.unit}</p>}
                  {item.hsn_code && <p className="text-[#8892a8] dark:text-gray-500 text-xs">HSN: {item.hsn_code}</p>}
                  {item.default_rate != null && (
                    <p className="text-[#8892a8] dark:text-gray-500 text-xs">Rate: ₹{item.default_rate}</p>
                  )}
                </div>
              </div>
              <button onClick={() => openEdit(item)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-red dark:hover:text-orange-400 transition-colors p-1 ml-4">
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
              <h2 className="text-viton-navy dark:text-white font-bold">{editing ? "Edit Item" : "Add Item"}</h2>
              <button onClick={() => setShowForm(false)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm">{error}</div>}
              {[
                { label: "Serial ID", key: "serial_id", placeholder: "e.g. VE-001" },
                { label: "Item Name *", key: "name", placeholder: "e.g. Butterfly Valve 25mm" },
                { label: "Description", key: "description", placeholder: "Short description" },
                { label: "Unit", key: "unit", placeholder: "e.g. Nos, Kg, Mtr" },
                { label: "Category", key: "category", placeholder: "e.g. Valves, Fittings" },
                { label: "HSN Code", key: "hsn_code", placeholder: "e.g. 8481" },
                { label: "Default Rate (₹)", key: "default_rate", placeholder: "e.g. 1500" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{field.label}</label>
                  <input
                    value={(form as Record<string, string>)[field.key]}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    type={field.key === "default_rate" ? "number" : "text"}
                    className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-[#dde1ea] dark:border-gray-800 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold py-3 rounded-xl text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <Save size={15} />
                {saving ? "Saving..." : "Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
