"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Search, X, Save, Pencil, RefreshCw, Trash2 } from "lucide-react";
import type { Item } from "@/lib/types";

const UNITS = ["NOS", "SET", "KG", "MTR", "MM", "PCS"];

const CATEGORY_FIELDS: Record<string, { key: string; label: string; options?: string[]; placeholder?: string }[]> = {
  Valves: [
    { key: "type", label: "Valve Type", options: ["BV", "GV", "GLV", "NRV", "BFV", "PLV"] },
    { key: "size", label: "Size", placeholder: "e.g. 02IN, 50MM, 05IN" },
    { key: "class", label: "Class / Rating", options: ["150", "300", "600", "800", "900", "1500", "2500"] },
    { key: "end", label: "End Connection", options: ["FLG", "SCR", "SW", "BW", "THR"] },
    { key: "material", label: "Material", options: ["WCB", "SS304", "SS316", "SS316L", "CI", "LCB", "CF8M"] },
  ],
  Castings: [
    { key: "part", label: "Part Type", options: ["BDY", "BON", "WDG", "DISC", "CVR", "YOKE"] },
    { key: "size", label: "Size", placeholder: "e.g. 06IN, 04IN" },
    { key: "class", label: "Class / Rating", options: ["150", "300", "600", "800"] },
    { key: "material", label: "Material", options: ["WCB", "SS304", "SS316", "SS316L", "CI", "LCB", "CF8M"] },
  ],
  Gaskets: [
    { key: "type", label: "Gasket Type", options: ["SR", "FF", "RJ", "RTJ"] },
    { key: "size", label: "Size", placeholder: "e.g. 02IN, 04IN" },
    { key: "material", label: "Material", options: ["SS304", "SS316", "SS316L", "CAF", "PTFE", "GRPH"] },
  ],
  Fasteners: [
    { key: "type", label: "Type", options: ["HB", "HN", "ST", "CSK", "WAS"] },
    { key: "diam", label: "Diameter", placeholder: "e.g. M16, M20, 3QIN" },
    { key: "length", label: "Length", placeholder: "e.g. 075, 100, 045" },
    { key: "grade", label: "Grade / Spec", options: ["B7", "B72H", "8.8", "10.9", "A193B7", "A194 2H"] },
  ],
  "Gland Packing": [
    { key: "type", label: "Type", options: ["GRAPH", "BRAID", "PTFE", "COMP"] },
    { key: "size", label: "Cross Section", placeholder: "e.g. 06MM, 10MM" },
    { key: "material", label: "Material", options: ["GRPH", "PTFE", "AMNT", "FLAX"] },
  ],
  Material: [
    { key: "form", label: "Form", options: ["ROD", "RND", "FLT", "PLT", "SHT"] },
    { key: "size", label: "Size / Dimensions", placeholder: "e.g. 20MM, 50x10" },
    { key: "material", label: "Material", options: ["MS", "SS304", "SS316", "SS316L", "EN8"] },
    { key: "grade", label: "Grade", placeholder: "e.g. A105, IS2062, A182" },
  ],
  Misc: [],
};

const CATEGORY_PREFIX: Record<string, string> = {
  Valves: "VALV",
  Castings: "CSTG",
  Gaskets: "GASK",
  Fasteners: "FAST",
  "Gland Packing": "GLPK",
  Material: "MTRL",
  Misc: "MISC",
};

const TYPE_LABELS: Record<string, string> = {
  BV: "Ball Valve", GV: "Gate Valve", GLV: "Globe Valve", NRV: "Check Valve",
  BFV: "Butterfly Valve", PLV: "Plug Valve",
  BDY: "Body Casting", BON: "Bonnet Casting", WDG: "Wedge Casting",
  DISC: "Disc Casting", CVR: "Cover Casting", YOKE: "Yoke Casting",
  SR: "Spiral Wound Gasket", FF: "Full Face Gasket", RJ: "Ring Joint", RTJ: "RTJ Gasket",
  HB: "Hex Bolt", HN: "Hex Nut", ST: "Stud", CSK: "Countersunk", WAS: "Washer",
  GRAPH: "Graphite Packing", BRAID: "Braided Packing", PTFE: "PTFE Packing", COMP: "Compression Packing",
  ROD: "Rod", RND: "Round Bar", FLT: "Flat Bar", PLT: "Plate", SHT: "Sheet",
};

function generateCode(category: string, fields: Record<string, string>): string {
  const prefix = CATEGORY_PREFIX[category] ?? "MISC";
  if (category === "Valves") {
    const parts = [prefix, fields.type, fields.size, fields.class, fields.end, fields.material];
    return parts.filter(Boolean).join("-").toUpperCase();
  }
  if (category === "Castings") {
    const parts = [prefix, fields.part, fields.size, fields.class, fields.material];
    return parts.filter(Boolean).join("-").toUpperCase();
  }
  if (category === "Gaskets") {
    const parts = [prefix, fields.type, fields.size, fields.material];
    return parts.filter(Boolean).join("-").toUpperCase();
  }
  if (category === "Fasteners") {
    const parts = [prefix, fields.type, fields.diam, fields.length, fields.grade];
    return parts.filter(Boolean).join("-").toUpperCase().replace(/\s/g, "");
  }
  if (category === "Gland Packing") {
    const parts = [prefix, fields.type, fields.size, fields.material];
    return parts.filter(Boolean).join("-").toUpperCase();
  }
  if (category === "Material") {
    const parts = [prefix, fields.form, fields.size, fields.material, fields.grade];
    return parts.filter(Boolean).join("-").toUpperCase();
  }
  return prefix;
}

function generateName(category: string, fields: Record<string, string>): string {
  if (category === "Valves") {
    const typeName = TYPE_LABELS[fields.type] ?? fields.type ?? "";
    const size = fields.size ? fields.size.replace("IN", '"').replace("MM", "mm") : "";
    const cls = fields.class ? `${fields.class}#` : "";
    const mat = fields.material ?? "";
    const end = fields.end ?? "";
    return [typeName, size, cls, mat, end].filter(Boolean).join(" ");
  }
  if (category === "Castings") {
    const partName = TYPE_LABELS[fields.part] ?? fields.part ?? "";
    const size = fields.size ? fields.size.replace("IN", '"').replace("MM", "mm") : "";
    const cls = fields.class ? `${fields.class}#` : "";
    const mat = fields.material ?? "";
    return [partName, size, cls, mat].filter(Boolean).join(" ");
  }
  if (category === "Gaskets") {
    const typeName = TYPE_LABELS[fields.type] ?? fields.type ?? "";
    const size = fields.size ? fields.size.replace("IN", '"') : "";
    return [typeName, size, fields.material].filter(Boolean).join(" ");
  }
  if (category === "Fasteners") {
    const typeName = TYPE_LABELS[fields.type] ?? fields.type ?? "";
    const dim = fields.diam && fields.length ? `${fields.diam} x ${fields.length}` : fields.diam ?? "";
    return [typeName, dim, fields.grade].filter(Boolean).join(" ");
  }
  if (category === "Gland Packing") {
    const typeName = TYPE_LABELS[fields.type] ?? fields.type ?? "";
    return [typeName, fields.size, fields.material].filter(Boolean).join(" ");
  }
  if (category === "Material") {
    const formName = TYPE_LABELS[fields.form] ?? fields.form ?? "";
    return [formName, fields.size, fields.material, fields.grade].filter(Boolean).join(" ");
  }
  return "";
}

const CATEGORIES = Object.keys(CATEGORY_FIELDS);

const emptyFormMeta = {
  name: "",
  description: "",
  hsn_code: "",
  unit: "NOS",
  category: "Valves",
  serial_id: "",
  codeEdited: false,
};

export default function CatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filtered, setFiltered] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [formMeta, setFormMeta] = useState(emptyFormMeta);
  const [codeFields, setCodeFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadItems() {
    const supabase = createClient();
    const { data, error } = await supabase.from("items").select("*").order("category").order("serial_id");
    if (error) { setError(error.message); setLoading(false); return; }
    const rows = (data ?? []) as unknown as Item[];
    setItems(rows);
    setFiltered(rows);
    setLoading(false);
  }

  useEffect(() => { loadItems(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter(i =>
      i.serial_id.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      (i.category ?? "").toLowerCase().includes(q)
    ));
  }, [search, items]);

  useEffect(() => {
    if (formMeta.codeEdited || editing) return;
    const generated = generateCode(formMeta.category, codeFields);
    const generatedName = generateName(formMeta.category, codeFields);
    setFormMeta(f => ({
      ...f,
      serial_id: generated,
      name: f.name || generatedName ? generatedName : f.name,
    }));
  }, [codeFields, formMeta.category, formMeta.codeEdited, editing]);

  function openAdd() {
    setEditing(null);
    setFormMeta(emptyFormMeta);
    setCodeFields({});
    setError("");
    setShowForm(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setFormMeta({
      serial_id: item.serial_id,
      name: item.name,
      description: item.description ?? "",
      hsn_code: item.hsn_code ?? "",
      unit: item.unit,
      category: item.category ?? "Valves",
      codeEdited: true,
    });
    setCodeFields({});
    setError("");
    setShowForm(true);
  }

  function handleCategoryChange(cat: string) {
    setCodeFields({});
    setFormMeta(f => ({ ...f, category: cat, serial_id: CATEGORY_PREFIX[cat] ?? "MISC", codeEdited: false, name: "" }));
  }

  function setCodeField(key: string, val: string) {
    setCodeFields(f => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!formMeta.serial_id.trim() || !formMeta.name.trim()) {
      setError("Serial ID and Name are required.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const payload = {
      serial_id: formMeta.serial_id.trim().toUpperCase(),
      name: formMeta.name.trim(),
      description: formMeta.description.trim() || null,
      hsn_code: formMeta.hsn_code.trim() || null,
      unit: formMeta.unit,
      category: formMeta.category,
      specs: codeFields,
    };
    let saveError = null;
    if (editing) {
      const { error } = await supabase.from("items").update(payload).eq("id", editing.id);
      saveError = error;
    } else {
      const { error } = await supabase.from("items").insert(payload);
      saveError = error;
    }
    if (saveError) { setError(saveError.message); setSaving(false); return; }
    await loadItems();
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("items").delete().eq("id", deleteItem.id);
    if (error) {
      setError(error.message);
      setDeleting(false);
      setDeleteItem(null);
      return;
    }
    await loadItems();
    setDeleteItem(null);
    setDeleting(false);
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

  const currentFields = CATEGORY_FIELDS[formMeta.category] ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Item Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} items registered</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by serial ID, name or category..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        {search && <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={14} /></button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">{search ? "No items match your search." : "No items yet. Add your first item."}</div>
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
                  <tr key={item.id} className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}>
                    <td className="px-5 py-3.5 font-mono text-orange-400 text-xs font-semibold">{item.serial_id}</td>
                    <td className="px-5 py-3.5 text-white">{item.name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${categoryColors[item.category ?? "Misc"] ?? "bg-gray-500/10 text-gray-400"}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">{item.unit}</td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{item.hsn_code ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(item)} className="text-gray-500 hover:text-orange-400 transition-colors p-1" title="Edit item"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteItem(item)} className="text-gray-500 hover:text-red-400 transition-colors p-1" title="Delete item"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">Delete Item?</h2>
                  <p className="text-gray-500 text-xs mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl px-4 py-3 mb-5">
                <p className="text-orange-400 font-mono text-xs font-semibold">{deleteItem.serial_id}</p>
                <p className="text-white text-sm mt-0.5">{deleteItem.name}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteItem(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Item" : "Add New Item"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

              {/* Category */}
              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => handleCategoryChange(cat)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                        formMeta.category === cat
                          ? "bg-orange-500 border-orange-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic code fields */}
              {!editing && currentFields.length > 0 && (
                <div className="bg-gray-800/50 rounded-xl p-4 space-y-3 border border-gray-700">
                  <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Spec Fields → Auto-builds Code</p>
                  <div className="grid grid-cols-2 gap-3">
                    {currentFields.map(field => (
                      <div key={field.key}>
                        <label className="block text-gray-500 text-xs mb-1">{field.label}</label>
                        {field.options ? (
                          <div className="relative">
                            <select value={codeFields[field.key] ?? ""} onChange={e => setCodeField(field.key, e.target.value)}
                              className="w-full appearance-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-8 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer">
                              <option value="">— select —</option>
                              {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <input value={codeFields[field.key] ?? ""} onChange={e => setCodeField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-generated Serial ID */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Serial ID (Auto-generated)</label>
                  {!editing && (
                    <button onClick={() => setFormMeta(f => ({ ...f, codeEdited: false }))}
                      className="flex items-center gap-1 text-gray-500 hover:text-orange-400 text-xs transition-colors">
                      <RefreshCw size={11} /> Reset
                    </button>
                  )}
                </div>
                <input value={formMeta.serial_id}
                  onChange={e => setFormMeta(f => ({ ...f, serial_id: e.target.value, codeEdited: true }))}
                  placeholder="Auto-generated from fields above"
                  className="w-full bg-gray-800 border border-orange-500/30 rounded-xl px-4 py-3 text-orange-400 text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              {/* Name */}
              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Item Name</label>
                <input value={formMeta.name} onChange={e => setFormMeta(f => ({ ...f, name: e.target.value }))}
                  placeholder="Auto-filled or type manually"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              {/* Unit + HSN */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Unit</label>
                  <div className="relative">
                    <select value={formMeta.unit} onChange={e => setFormMeta(f => ({ ...f, unit: e.target.value }))}
                      className="w-full appearance-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pr-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer">
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">HSN Code</label>
                  <input value={formMeta.hsn_code} onChange={e => setFormMeta(f => ({ ...f, hsn_code: e.target.value }))}
                    placeholder="e.g. 84818090"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Extra Specs / Notes</label>
                <textarea value={formMeta.description} onChange={e => setFormMeta(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Certifications, additional specs, remarks..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <Save size={15} />{saving ? "Saving..." : "Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
