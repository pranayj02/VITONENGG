"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Search, X, Save, Pencil } from "lucide-react";
import type { Item } from "@/lib/types";

const CATEGORIES = ["Valves", "Castings", "Gaskets", "Fasteners", "Gland Packing", "Material", "Misc"];
const UNITS = ["NOS", "SET", "KG", "MTR", "MM", "PCS"];

const emptyItem: {
  serial_id: string;
  name: string;
  description: string;
  hsn_code: string;
  unit: string;
  category: string;
  specs: Record<string, string>;
} = {
  serial_id: "",
  name: "",
  description: "",
  hsn_code: "",
  unit: "NOS",
  category: "Valves",
  specs: {},
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
    const { data, error } = await supabase.from("items").select("*").order("category").order("serial_id");

    if (error) {
      setError(error.message);
      setItems([]);
      setFiltered([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as Item[];
    setItems(rows);
    setFiltered(rows);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(items);
      return;
    }

    const q = search.toLowerCase();
    setFiltered(
      items.filter((i) =>
        i.serial_id.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, items]);

  function openAdd() {
    setEditing(null);
    setForm(emptyItem);
    setError("");
    setShowForm(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setForm({
      serial_id: item.serial_id,
      name: item.name,
      description: item.description ?? "",
      hsn_code: item.hsn_code ?? "",
      unit: item.unit,
      category: item.category ?? "Valves",
      specs: (item.specs ?? {}) as Record<string, string>,
    });
    setError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.serial_id.trim() || !form.name.trim()) {
      setError("Serial ID and Name are required.");
      return;
    }

    setSaving(true);
    setError("");

    const supabase = createClient();
    const payload = {
      serial_id: form.serial_id.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      hsn_code: form.hsn_code.trim() || null,
      unit: form.unit,
      category: form.category,
      specs: form.specs,
    };

    let saveError = null;

    if (editing) {
      const { error } = await supabase.from("items").update(payload).eq("id", editing.id);
      saveError = error;
    } else {
      const { error } = await supabase.from("items").insert(payload);
      saveError = error;
    }

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    await loadItems();
    setShowForm(false);
    setSaving(false);
  }

  const categoryColors: Record<string, string> = {
    Valves: "bg-orange-500/10 text-orange-400",
    Castings: "bg-blue-500/10 text-blue-400",
    Gaskets: "bg-green-500/10 text-green-400",
    Fasteners: "bg-yellow-500/10 text-yellow-400",
    "Gland Packing": "bg-purple-500/10 text-purple-400",
    Material: "bg-pink-500/10 text-pink-400",
    Misc: "bg-gray-500/10 text-gray-400",
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Item Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} items registered</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by serial ID, name or category..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {error && !showForm && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          {search ? "No items match your search." : "No items yet. Add your first item."}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Serial ID</th>
                  <th className="text-left text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-left text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Category</th>
                  <th className="text-left text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Unit</th>
                  <th className="text-left text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">HSN</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors ${
                      i === filtered.length - 1 ? "border-0" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono text-orange-400 text-xs font-semibold">{item.serial_id}</td>
                    <td className="px-5 py-3.5 text-white">{item.name}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                          categoryColors[item.category ?? "Misc"] ?? "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">{item.unit}</td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{item.hsn_code ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-gray-500 hover:text-orange-400 transition-colors p-1"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Item" : "Add New Item"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Serial ID *
                </label>
                <input
                  value={form.serial_id}
                  onChange={(e) => setForm((f) => ({ ...f, serial_id: e.target.value }))}
                  placeholder="e.g. VALV-BV-03IN-150-FLG-SS316"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Item Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Ball Valve 3in 150# SS316 Flanged"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Unit
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  HSN Code
                </label>
                <input
                  value={form.hsn_code}
                  onChange={(e) => setForm((f) => ({ ...f, hsn_code: e.target.value }))}
                  placeholder="e.g. 84818090"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Description / Extra Specs
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Add any extra specs, notes, certifications..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
              >
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
