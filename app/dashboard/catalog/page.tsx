"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { Plus, Search, X, Save, Pencil, RefreshCw, Trash2, CheckCircle2, Clock3 } from "lucide-react";
import type { Item } from "@/lib/types";
import { useRole, can } from "@/lib/roles";


type ItemRequestStatus = "pending" | "approved" | "rejected";

interface ItemApprovalRequest {
  id: string;
  item_payload: {
    serial_id: string;
    name: string;
    description?: string | null;
    hsn_code?: string | null;
    unit: string;
    category: string | null;
    specs: Record<string, unknown> | null;
  };
  status: ItemRequestStatus;
  requested_by?: string | null;
  requested_by_name?: string | null;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
}

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
  const { role, loading: roleLoading } = useRole();
  const canManageCatalog = can(role, "manage_catalog");
  const isAdmin = role === "admin";
  const [items, setItems] = useState<Item[]>([]);
  const [filtered, setFiltered] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showApprovals, setShowApprovals] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [formMeta, setFormMeta] = useState(emptyFormMeta);
  const [codeFields, setCodeFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [approvalRequests, setApprovalRequests] = useState<ItemApprovalRequest[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);
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

  async function loadApprovalRequests() {
    if (!isAdmin) return;
    setApprovalsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("item_creation_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      if (error.message.includes("item_creation_requests")) {
        setApprovalRequests([]);
      } else {
        setError(error.message);
      }
    } else {
      setApprovalRequests(((data ?? []) as unknown) as ItemApprovalRequest[]);
    }
    setApprovalsLoading(false);
  }

  useEffect(() => { loadItems(); }, []);

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      loadApprovalRequests();
    }
  }, [roleLoading, isAdmin]);

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
    if (!canManageCatalog) return;
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

    if (editing) {
      if (!canManageCatalog) {
        setError("You do not have permission to edit catalog items.");
        setSaving(false);
        return;
      }
      const { error } = await supabase.from("items").update(payload).eq("id", editing.id);
      if (error) { setError(error.message); setSaving(false); return; }
      await audit({ action: "item_updated", entity_type: "item", entity_id: editing.id, entity_code: payload.serial_id, details: { name: payload.name, category: payload.category } });
      await loadItems();
      setShowForm(false);
      setSaving(false);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    const { data: profile } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };
    const requesterName = (profile as any)?.full_name?.trim() || user?.email || "Unknown";

    const { error } = await supabase.from("item_creation_requests").insert({
      item_payload: payload,
      status: "pending",
      requested_by: user?.id ?? null,
      requested_by_name: requesterName,
    });
    if (error) {
      if (error.message.includes("item_creation_requests")) {
        setError("Item approval table is not available on this environment yet. Please run the latest database migration for this branch.");
      } else {
        setError(error.message);
      }
      setSaving(false);
      return;
    }

    await audit({ action: "item_creation_requested", entity_type: "item_request", entity_code: payload.serial_id, details: { name: payload.name, category: payload.category, requested_by_name: requesterName } });

    if (isAdmin) {
      await loadApprovalRequests();
    }
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteItem) return;
    if (!canManageCatalog) {
      setError("You do not have permission to delete catalog items.");
      setDeleteItem(null);
      return;
    }
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

  async function handleApprovalAction(request: ItemApprovalRequest, nextStatus: "approved" | "rejected") {
    setProcessingApprovalId(request.id);
    setError("");
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    const { data: profile } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };
    const reviewerName = (profile as any)?.full_name?.trim() || user?.email || "Unknown";

    if (nextStatus === "approved") {
      const { error: insertError } = await supabase.from("items").insert(request.item_payload);
      if (insertError) {
        setError(insertError.message);
        setProcessingApprovalId(null);
        return;
      }
    }

    await audit({ action: nextStatus === "approved" ? "item_creation_approved" : "item_creation_rejected", entity_type: "item_request", entity_id: request.id, entity_code: request.item_payload.serial_id, details: { name: request.item_payload.name, status: nextStatus, reviewer_name: reviewerName } });

    const { error: deleteError } = await supabase
      .from("item_creation_requests")
      .delete()
      .eq("id", request.id);
    if (deleteError) {
      setError(deleteError.message);
      setProcessingApprovalId(null);
      return;
    }

    await Promise.all([loadItems(), loadApprovalRequests()]);
    setProcessingApprovalId(null);
  }

  const pendingApprovals = approvalRequests.filter((request) => request.status === "pending").length;

  const categoryColors: Record<string, string> = {
    Valves: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    Castings: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    Gaskets: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    Fasteners: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
    "Gland Packing": "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    Material: "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400",
    Misc: "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400",
  };

  const currentFields = CATEGORY_FIELDS[formMeta.category] ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Item Catalog</h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">{items.length} items registered</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button onClick={() => setShowApprovals(true)} className="flex items-center gap-2 bg-white hover:bg-[#f7f8fb] dark:bg-gray-900 dark:hover:bg-gray-800 border border-[#dde1ea] dark:border-gray-800 text-viton-navy dark:text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
              <Clock3 size={16} /> Item Approvals{pendingApprovals > 0 ? ` (${pendingApprovals})` : ""}
            </button>
          )}
          <button onClick={openAdd} className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by serial ID, name or category..."
          className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500" />
        {search && <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white"><X size={14} /></button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8892a8] dark:text-gray-600">{search ? "No items match your search." : "No items yet. Add your first item request."}</div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#dde1ea] dark:border-gray-800">
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Serial ID</th>
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Category</th>
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Unit</th>
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">HSN</th>
                  {canManageCatalog && <th className="px-5 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id} className={`border-b border-[#eef1f6] dark:border-gray-800/50 hover:bg-[#f7f8fb] dark:hover:bg-gray-800/40 transition-colors ${i === filtered.length - 1 ? "border-0" : ""}`}>
                    <td className="px-5 py-3.5 font-mono text-viton-red dark:text-orange-400 text-xs font-semibold">{item.serial_id}</td>
                    <td className="px-5 py-3.5 text-viton-navy dark:text-white">{item.name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${categoryColors[item.category ?? "Misc"] ?? "bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400"}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#4a5578] dark:text-gray-400">{item.unit}</td>
                    <td className="px-5 py-3.5 text-[#8892a8] dark:text-gray-500 font-mono text-xs">{item.hsn_code ?? "—"}</td>
                    {canManageCatalog && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(item)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-red dark:hover:text-orange-400 transition-colors p-1" title="Edit item"><Pencil size={14} /></button>
                          <button onClick={() => setDeleteItem(item)} className="text-[#8892a8] dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1" title="Delete item"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} className="text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-viton-navy dark:text-white font-bold text-base">Delete Item?</h2>
                  <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <div className="bg-[#f7f8fb] dark:bg-gray-800 rounded-xl px-4 py-3 mb-5">
                <p className="text-viton-red dark:text-orange-400 font-mono text-xs font-semibold">{deleteItem.serial_id}</p>
                <p className="text-viton-navy dark:text-white text-sm mt-0.5">{deleteItem.name}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteItem(null)}
                  className="flex-1 bg-[#f1f3f8] hover:bg-[#e7ebf3] dark:bg-gray-800 dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-viton-red hover:bg-viton-red-hover dark:bg-red-500 dark:hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showApprovals && isAdmin && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#dde1ea] dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-viton-navy dark:text-white font-bold text-lg">Item Approvals</h2>
                <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">Review pending new item requests.</p>
              </div>
              <button onClick={() => setShowApprovals(false)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-88px)] space-y-4">
              {approvalsLoading ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : approvalRequests.length === 0 ? (
                <div className="text-center py-10 text-[#8892a8] dark:text-gray-600">No item requests yet.</div>
              ) : pendingApprovals === 0 ? (
                <div className="text-center py-10 text-[#8892a8] dark:text-gray-600">No pending item requests.</div>
              ) : (
                approvalRequests.filter((request) => request.status === "pending").map((request) => {
                  const payload = request.item_payload;
                  return (
                    <div key={request.id} className="border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-viton-navy dark:text-white font-semibold font-mono text-sm">{payload.serial_id}</p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${request.status === "pending" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" : request.status === "approved" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>
                              {request.status}
                            </span>
                          </div>
                          <p className="text-viton-navy dark:text-white mt-1">{payload.name}</p>
                          <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">Requested by {request.requested_by_name ?? "Unknown"} · {new Date(request.created_at).toLocaleDateString("en-IN")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleApprovalAction(request, "approved")} disabled={processingApprovalId === request.id} className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-500 dark:bg-emerald-500/10 dark:hover:bg-emerald-500 dark:text-emerald-400 dark:border-emerald-500/30 font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-60">
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button onClick={() => handleApprovalAction(request, "rejected")} disabled={processingApprovalId === request.id} className="flex items-center gap-2 bg-red-50 hover:bg-red-500 text-red-700 hover:text-white border border-red-200 hover:border-red-500 dark:bg-red-500/10 dark:hover:bg-red-500 dark:text-red-400 dark:border-red-500/30 font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-60">
                            <Trash2 size={14} /> Reject
                          </button>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-[#f7f8fb] dark:bg-gray-800/50 rounded-xl px-3 py-2">
                          <p className="text-[#8892a8] dark:text-gray-500 text-xs mb-1">Category</p>
                          <p className="text-viton-navy dark:text-white">{payload.category ?? "—"}</p>
                        </div>
                        <div className="bg-[#f7f8fb] dark:bg-gray-800/50 rounded-xl px-3 py-2">
                          <p className="text-[#8892a8] dark:text-gray-500 text-xs mb-1">Unit</p>
                          <p className="text-viton-navy dark:text-white">{payload.unit}</p>
                        </div>
                        <div className="bg-[#f7f8fb] dark:bg-gray-800/50 rounded-xl px-3 py-2">
                          <p className="text-[#8892a8] dark:text-gray-500 text-xs mb-1">HSN</p>
                          <p className="text-viton-navy dark:text-white">{payload.hsn_code || "—"}</p>
                        </div>
                        <div className="bg-[#f7f8fb] dark:bg-gray-800/50 rounded-xl px-3 py-2">
                          <p className="text-[#8892a8] dark:text-gray-500 text-xs mb-1">Reviewed by</p>
                          <p className="text-viton-navy dark:text-white">{request.reviewed_by_name || "—"}</p>
                        </div>
                      </div>
                      {payload.description && (
                        <div className="mt-3 text-sm text-[#4a5578] dark:text-gray-400">{payload.description}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#dde1ea] dark:border-gray-800">
              <h2 className="text-viton-navy dark:text-white font-bold">{editing ? "Edit Item" : "Add New Item"}</h2>
              <button onClick={() => setShowForm(false)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm">{error}</div>}

              <div>
                <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => handleCategoryChange(cat)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                        formMeta.category === cat
                          ? "bg-viton-red border-viton-red text-white dark:bg-orange-500 dark:border-orange-500"
                          : "bg-[#f7f8fb] dark:bg-gray-800 border-[#dde1ea] dark:border-gray-700 text-[#4a5578] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white hover:border-[#cfd5e2] dark:hover:border-gray-600"
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {!editing && currentFields.length > 0 && (
                <div className="bg-[#f7f8fb] dark:bg-gray-800/50 rounded-xl p-4 space-y-3 border border-[#dde1ea] dark:border-gray-700">
                  <p className="text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Spec Fields → Auto-builds Code</p>
                  <div className="grid grid-cols-2 gap-3">
                    {currentFields.map(field => (
                      <div key={field.key}>
                        <label className="block text-[#8892a8] dark:text-gray-500 text-xs mb-1">{field.label}</label>
                        {field.options ? (
                          <div className="relative">
                            <select value={codeFields[field.key] ?? ""} onChange={e => setCodeField(field.key, e.target.value)}
                              className="w-full appearance-none bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 pr-8 text-viton-navy dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 cursor-pointer">
                              <option value="">— select —</option>
                              {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                              <svg className="w-3.5 h-3.5 text-[#8892a8] dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <input value={codeFields[field.key] ?? ""} onChange={e => setCodeField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 text-viton-navy dark:text-white text-xs font-mono placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Serial ID (Auto-generated)</label>
                  {!editing && (
                    <button onClick={() => setFormMeta(f => ({ ...f, codeEdited: false }))}
                      className="flex items-center gap-1 text-[#8892a8] dark:text-gray-500 hover:text-viton-red dark:hover:text-orange-400 text-xs transition-colors">
                      <RefreshCw size={11} /> Reset
                    </button>
                  )}
                </div>
                <input value={formMeta.serial_id}
                  onChange={e => setFormMeta(f => ({ ...f, serial_id: e.target.value, codeEdited: true }))}
                  placeholder="Auto-generated from fields above"
                  className="w-full bg-white dark:bg-gray-800 border border-viton-red/30 dark:border-orange-500/30 rounded-xl px-4 py-3 text-viton-red dark:text-orange-400 text-sm font-mono placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500" />
              </div>

              <div>
                <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Item Name</label>
                <input value={formMeta.name} onChange={e => setFormMeta(f => ({ ...f, name: e.target.value }))}
                  placeholder="Auto-filled or type manually"
                  className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Unit</label>
                  <div className="relative">
                    <select value={formMeta.unit} onChange={e => setFormMeta(f => ({ ...f, unit: e.target.value }))}
                      className="w-full appearance-none bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-viton-navy dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 cursor-pointer">
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg className="w-4 h-4 text-[#8892a8] dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">HSN Code</label>
                  <input value={formMeta.hsn_code} onChange={e => setFormMeta(f => ({ ...f, hsn_code: e.target.value }))}
                    placeholder="e.g. 84818090"
                    className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-viton-navy dark:text-white text-sm font-mono placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500" />
                </div>
              </div>

              <div>
                <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Extra Specs / Notes</label>
                <textarea value={formMeta.description} onChange={e => setFormMeta(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Certifications, additional specs, remarks..."
                  className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 resize-none" />
              </div>
            </div>

            <div className="p-6 border-t border-[#dde1ea] dark:border-gray-800 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 bg-[#f1f3f8] hover:bg-[#e7ebf3] dark:bg-gray-800 dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold py-3 rounded-xl text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <Save size={15} />{saving ? "Saving..." : editing ? "Save Item" : "Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
