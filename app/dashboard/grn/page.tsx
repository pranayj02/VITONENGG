"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { useRouter } from "next/navigation";
import { can, useRole, isAdmin } from "@/lib/roles";
import { getCurrentFY } from "@/lib/fy";
import type { PurchaseOrder, Vendor, GRN, GRNLineItem, LineItem, Item } from "@/lib/types";
import {
  Search,
  X,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  AlertCircle,
  ArrowLeft,
  Truck,
  FileText,
  Trash2,
  Package,
  Download,
  RefreshCw,
  Save,
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { GRNPdfDocument } from "@/components/GRNPdf";

interface POWithVendor extends PurchaseOrder {
  vendors: Vendor | null;
}

const FIXED_RECEIVED_BY_NAME = "Yatish Jain";
const UNITS = ["NOS", "SET", "KG", "MTR", "MM", "PCS"];

// ── Catalog item builder helpers (mirrors catalog page) ──────────────────
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
  Valves: "VALV", Castings: "CSTG", Gaskets: "GASK", Fasteners: "FAST",
  "Gland Packing": "GLPK", Material: "MTRL", Misc: "MISC",
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
  if (category === "Valves") return [prefix, fields.type, fields.size, fields.class, fields.end, fields.material].filter(Boolean).join("-").toUpperCase();
  if (category === "Castings") return [prefix, fields.part, fields.size, fields.class, fields.material].filter(Boolean).join("-").toUpperCase();
  if (category === "Gaskets") return [prefix, fields.type, fields.size, fields.material].filter(Boolean).join("-").toUpperCase();
  if (category === "Fasteners") return [prefix, fields.type, fields.diam, fields.length, fields.grade].filter(Boolean).join("-").toUpperCase().replace(/\s/g, "");
  if (category === "Gland Packing") return [prefix, fields.type, fields.size, fields.material].filter(Boolean).join("-").toUpperCase();
  if (category === "Material") return [prefix, fields.form, fields.size, fields.material, fields.grade].filter(Boolean).join("-").toUpperCase();
  return prefix;
}

function generateName(category: string, fields: Record<string, string>): string {
  if (category === "Valves") {
    const tn = TYPE_LABELS[fields.type] ?? fields.type ?? "";
    return [tn, fields.size ? fields.size.replace("IN", '"') : "", fields.class, fields.end, fields.material].filter(Boolean).join(" ");
  }
  if (category === "Castings") {
    const tn = TYPE_LABELS[fields.part] ?? fields.part ?? "";
    return [tn, fields.size, fields.class, fields.material].filter(Boolean).join(" ");
  }
  if (category === "Gaskets") {
    const tn = TYPE_LABELS[fields.type] ?? fields.type ?? "";
    return [tn, fields.size, fields.material].filter(Boolean).join(" ");
  }
  if (category === "Fasteners") {
    const tn = TYPE_LABELS[fields.type] ?? fields.type ?? "";
    const dim = fields.diam && fields.length ? `${fields.diam} x ${fields.length}` : fields.diam ?? "";
    return [tn, dim, fields.grade].filter(Boolean).join(" ");
  }
  if (category === "Gland Packing") {
    const tn = TYPE_LABELS[fields.type] ?? fields.type ?? "";
    return [tn, fields.size, fields.material].filter(Boolean).join(" ");
  }
  if (category === "Material") {
    const fn = TYPE_LABELS[fields.form] ?? fields.form ?? "";
    return [fn, fields.size, fields.material, fields.grade].filter(Boolean).join(" ");
  }
  return "";
}

function getFreeformItemUnit(type: string): string {
  const t = type.toLowerCase();
  if (t === "valves" || t === "castings" || t === "gaskets" || t === "fasteners" || t === "gland packing") return "NOS";
  if (t === "material") return "KGS";
  return "NOS";
}

function getTodayDisplayDate() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  under_review: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  inspected: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  approved: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  partial: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
};

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ").toUpperCase();
}

function getNextGRNNumber(existingGrns: GRN[]) {
  const fy = getCurrentFY();
  const maxSerial = existingGrns.reduce((max, entry) => {
    const match = entry.grn_number?.match(new RegExp(`^VE/GRN/${fy}/(\\d+)$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 21);
  return `VE/GRN/${fy}/${String(maxSerial + 1).padStart(3, "0")}`;
}

export default function GRNPage() {
  const router = useRouter();
  const { role } = useRole();
  const [pos, setPos] = useState<POWithVendor[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [filteredGRN, setFilteredGRN] = useState<GRN[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Short-lived success animation shown after Approve (green) / Partial approve (amber)
  const [approvalAnim, setApprovalAnim] = useState<{ type: "approved" | "partial"; grnNumber: string } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"against_po" | "without_po" | null>(null);
  const [poSelectionConfirmed, setPoSelectionConfirmed] = useState(false);
  const [selectedPOs, setSelectedPOs] = useState<POWithVendor[]>([]);
  const lockedVendorId = selectedPOs[0]?.vendor_id ?? null;
  const [manualVendorId, setManualVendorId] = useState("");
  const [manualVendorName, setManualVendorName] = useState("");
  const [manualVendorAddress, setManualVendorAddress] = useState("");
  const [manualVendorGstin, setManualVendorGstin] = useState("");
  const [grnLines, setGrnLines] = useState<GRNLineItem[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [challanDate, setChallanDate] = useState("");
  const [revisionNo, setRevisionNo] = useState("01");
  const [revisionDate, setRevisionDate] = useState("01/06/2026");
  const [grnDate, setGrnDate] = useState(getTodayDisplayDate());
  const [grnNumber, setGrnNumber] = useState("Auto");
  const [receivedByName, setReceivedByName] = useState(FIXED_RECEIVED_BY_NAME);
  const [removeReasonByPO, setRemoveReasonByPO] = useState<Record<string, string>>({});
  const [removePanelPOId, setRemovePanelPOId] = useState<string | null>(null);
  const [removingPOId, setRemovingPOId] = useState<string | null>(null);
  // ── Freeform item catalog creation modal
  const [freeformModalOpen, setFreeformModalOpen] = useState(false);
  const [freeformIndex, setFreeformIndex] = useState<number | null>(null);
  const [freeformMeta, setFreeformMeta] = useState({
    category: "Valves",
    serial_id: "",
    name: "",
    unit: "NOS",
    hsn_code: "",
    description: "",
    codeEdited: false,
  });
  const [freeformCodeFields, setFreeformCodeFields] = useState<Record<string, string>>({});
  const [freeformSaving, setFreeformSaving] = useState(false);
  const [freeformError, setFreeformError] = useState("");
  const [catalogItems, setCatalogItems] = useState<Item[]>([]);

  // Load catalog items for duplicate-checking
  useEffect(() => {
    const supabase = createClient();
    supabase.from("items").select("id, serial_id, name, unit, category").then(({ data }) => {
      setCatalogItems((data ?? []) as unknown as Item[]);
    });
  }, []);

  // Auto-dismiss the approval success animation after ~1.5s
  useEffect(() => {
    if (!approvalAnim) return;
    const t = setTimeout(() => setApprovalAnim(null), 1500);
    return () => clearTimeout(t);
  }, [approvalAnim]);


  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<Item[]>([]);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const itemSearchRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [poRes, grnRes, vendorRes] = await Promise.all([
      supabase.from("purchase_orders").select("*, vendors(*)").order("created_at", { ascending: false }),
      supabase.from("grn").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("vendors").select("*").order("name"),
    ]);
    setPos((poRes.data ?? []) as unknown as POWithVendor[]);
    setVendors((vendorRes.data ?? []) as unknown as Vendor[]);
    const gRows = (grnRes.data ?? []) as unknown as GRN[];
    setGrns(gRows);
    setFilteredGRN(gRows);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let out = grns;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((g) =>
        g.grn_number.toLowerCase().includes(q) ||
        (g.received_by_name ?? "").toLowerCase().includes(q) ||
        (g.vendor_name ?? "").toLowerCase().includes(q)
      );
    }
    setFilteredGRN(out);
  }, [search, grns]);

  useEffect(() => {
    if (!itemSearch.trim()) { setItemResults([]); setShowItemSearch(false); return; }
    const supabase = createClient();
    supabase.from("items").select("*").or(`serial_id.ilike.%${itemSearch}%,name.ilike.%${itemSearch}%`).limit(8).then(({ data }) => {
      const rows = (data ?? []) as unknown as Item[];
      setItemResults(rows);
      setShowItemSearch(rows.length > 0);
    });
  }, [itemSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (itemSearchRef.current && !itemSearchRef.current.contains(e.target as Node)) {
        setShowItemSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openCreate() {
    setCreateMode(null);
    setPoSelectionConfirmed(false);
    setSelectedPOs([]);
    setRemoveReasonByPO({});
    setRemovePanelPOId(null);
    setRemovingPOId(null);
    setManualVendorId("");
    setManualVendorName("");
    setManualVendorAddress("");
    setManualVendorGstin("");
    setGrnLines([]);
    setInspectionNotes("");
    setChallanNo("");
    setChallanDate("");
    setRevisionNo("01");
    setRevisionDate("01/06/2026");
    setGrnDate(getTodayDisplayDate());
    setGrnNumber("Auto");
    setReceivedByName(FIXED_RECEIVED_BY_NAME);
    setError("");
    setItemSearch("");
    setItemResults([]);
    setShowItemSearch(false);
    setCreateOpen(true);
  }

  function buildLinesFromPOs(selected: POWithVendor[]) {
    return selected.flatMap((po) => (po.line_items ?? []).map((l: LineItem) => normalizeGRNLine({
      item_id: l.item_id,
      serial_id: l.serial_id,
      name: l.name,
      po_qty: l.quantity,
      received_qty: l.quantity,
      accepted_qty: l.quantity,
      rejected_qty: 0,
      rejection_reason: "",
      unit: l.unit,
      challan_weight: 0,
      challan_nos: l.quantity,
      counted_nos: l.quantity,
      source_po_id: po.id,
      source_po_number: po.po_number,
    } as GRNLineItem & { source_po_id?: string; source_po_number?: string })));
  }

  function togglePOSelection(po: POWithVendor) {
    setError("");
    setInspectionNotes("");
    setSelectedPOs((prev) => {
      const exists = prev.some((row) => row.id === po.id);
      const next = exists ? prev.filter((row) => row.id !== po.id) : [...prev, po];
      const first = next[0];
      setGrnLines(buildLinesFromPOs(next));
      setManualVendorId(first?.vendor_id ?? "");
      setManualVendorName(first?.vendors?.name ?? "");
      setManualVendorAddress(first?.vendors?.address ?? "");
      setManualVendorGstin(first?.vendors?.gstin ?? "");
      if (next.length === 0) setPoSelectionConfirmed(false);
      return next;
    });
  }

  function clearPOSelection() {
    setSelectedPOs([]);
    setPoSelectionConfirmed(false);
    setGrnLines([]);
    setManualVendorId("");
    setManualVendorName("");
    setManualVendorAddress("");
    setManualVendorGstin("");
    setError("");
  }

  async function hidePOFromGRN(po: POWithVendor) {
    const reason = (removeReasonByPO[po.id] ?? "").trim();
    if (!reason) {
      setError("Removal reason is required.");
      return;
    }
    setRemovingPOId(po.id);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const nextMeta = {
      ...(po.dispatch_meta ?? {}),
      grn_hidden_from_modal: true,
      grn_hidden_reason: reason,
      grn_hidden_at: new Date().toISOString(),
      grn_hidden_by: user?.id ?? null,
    };
    const { error: hideErr } = await supabase
      .from("purchase_orders")
      .update({ dispatch_meta: nextMeta })
      .eq("id", po.id);
    if (hideErr) {
      setError(hideErr.message);
      setRemovingPOId(null);
      return;
    }
    await audit({
      action: "po_hidden_from_grn_modal",
      entity_type: "purchase_order",
      entity_id: po.id,
      entity_code: po.po_number,
      details: { reason },
    });
    setRemoveReasonByPO((prev) => {
      const next = { ...prev };
      delete next[po.id];
      return next;
    });
    setPos((prev) => prev.map((row) => row.id === po.id ? { ...row, dispatch_meta: nextMeta } as POWithVendor : row));
    setRemovePanelPOId((current) => current === po.id ? null : current);
    setRemovingPOId(null);
  }

  function addManualItem(item: Item) {
    setGrnLines((prev) => [
      ...prev,
      normalizeGRNLine({
        item_id: item.id,
        serial_id: item.serial_id,
        name: item.name,
        po_qty: 0,
        received_qty: 1,
        accepted_qty: 1,
        rejected_qty: 0,
        rejection_reason: "",
        unit: item.unit,
        challan_weight: 0,
        challan_nos: 1,
        counted_nos: 1,
      }),
    ]);
    setItemSearch("");
    setShowItemSearch(false);
  }

  
  function addFreeformItem() {
    const index = grnLines.length;
    const nextId = `FREE-${Date.now()}`;
    setGrnLines((prev) => [
      ...prev,
      normalizeGRNLine({
        item_id: nextId,
        serial_id: "",
        name: "",
        po_qty: 0,
        received_qty: 1,
        accepted_qty: 1,
        rejected_qty: 0,
        rejection_reason: "",
        unit: "NOS",
        challan_weight: 0,
        challan_nos: 1,
        counted_nos: 1,
      }),
    ]);
    setFreeformIndex(index);
    setFreeformMeta({ category: "Valves", serial_id: "", name: "", unit: "NOS", hsn_code: "", description: "", codeEdited: false });
    setFreeformCodeFields({});
    setFreeformError("");
    setFreeformModalOpen(true);
  }


  function removeLine(index: number) {
    setGrnLines((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFreeformCategoryChange(cat: string) {
    setFreeformCodeFields({});
    setFreeformMeta(f => ({ ...f, category: cat, serial_id: CATEGORY_PREFIX[cat] ?? "MISC", codeEdited: false, name: "" }));
  }

  function setFreeformCodeField(key: string, val: string) {
    setFreeformCodeFields(prev => {
      const next = { ...prev, [key]: val };
      const generated = generateCode(freeformMeta.category, next);
      const generatedName = generateName(freeformMeta.category, next);
      setFreeformMeta(f => ({ ...f, serial_id: f.codeEdited ? f.serial_id : generated, name: f.name || generatedName ? generatedName : f.name }));
      return next;
    });
  }

  async function createFreeformItemInCatalog(index: number) {
    const serial = freeformMeta.serial_id.trim();
    const name = freeformMeta.name.trim();
    if (!serial) { setFreeformError("Serial ID is required."); return; }
    if (!name) { setFreeformError("Item name is required."); return; }
    if (catalogItems.some((it) => it.serial_id.toLowerCase() === serial.toLowerCase())) {
      setFreeformError(`Serial ID "${serial}" already exists in catalog.`);
      return;
    }
    setFreeformSaving(true); setFreeformError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: newItem, error: insertErr } = await supabase.from("items").insert({
      serial_id: serial.toUpperCase(),
      name,
      description: freeformMeta.description.trim() || `Added via GRN freeform item on ${new Date().toLocaleDateString("en-IN")}`,
      hsn_code: freeformMeta.hsn_code.trim() || null,
      unit: freeformMeta.unit,
      category: freeformMeta.category,
      specs: Object.fromEntries(Object.entries(freeformCodeFields).map(([k, v]) => [k, v.trim().toUpperCase()])),
    }).select("id, serial_id, name, unit, category").single();
    if (insertErr) {
      setFreeformError(insertErr.message);
      setFreeformSaving(false);
      return;
    }
    const itemData = newItem as any;
    setGrnLines((prev) => prev.map((line, i) => {
      if (i !== index) return line;
      return { ...line, item_id: itemData.id, serial_id: itemData.serial_id, name: itemData.name, unit: itemData.unit };
    }));
    setCatalogItems((prev) => [...prev, itemData as Item]);
    await audit({
      action: "item_created_from_grn",
      entity_type: "item",
      entity_id: itemData.id,
      entity_code: itemData.serial_id,
      details: { name: itemData.name, category: itemData.category, unit: itemData.unit, created_via: "grn_freeform", created_by: user?.id ?? null },
    });
    setFreeformModalOpen(false);
    setFreeformSaving(false);
  }

  function cancelFreeformItem() {
    if (freeformIndex !== null && (grnLines[freeformIndex]?.item_id ?? "").startsWith("FREE-")) {
      removeLine(freeformIndex);
    }
    setFreeformModalOpen(false);
  }


  function normalizeGRNLine(line: GRNLineItem, patch: Partial<GRNLineItem> = {}): GRNLineItem {
    const next = { ...line, ...patch } as GRNLineItem;
    const rawChallan = Math.max(0, Number(next.challan_nos ?? line.challan_nos ?? line.received_qty ?? 0));
    const rawCounted = Math.max(0, Number(next.counted_nos ?? line.counted_nos ?? line.received_qty ?? 0));
    const requestedAccepted = Math.max(0, Number(next.accepted_qty ?? line.accepted_qty ?? 0));
    const explicitReceived = patch.received_qty !== undefined ? Math.max(0, Number(patch.received_qty)) : null;
    const received = explicitReceived ?? Math.max(Number(line.received_qty ?? 0), rawChallan, rawCounted, requestedAccepted);
    const challanNos = Math.min(rawChallan, received);
    const countedNos = Math.min(rawCounted, received);
    const cappedAccepted = Math.min(requestedAccepted, countedNos);
    const rejected = Math.max(0, countedNos - cappedAccepted);

    return {
      ...next,
      received_qty: received,
      challan_nos: challanNos,
      counted_nos: countedNos,
      accepted_qty: cappedAccepted,
      rejected_qty: rejected,
    };
  }

  async function handleSaveGRN() {
    if (grnLines.length === 0) { setError("Add at least one item."); return; }
    const normalizedLines = grnLines.map((line) => normalizeGRNLine(line));
    const invalidLine = normalizedLines.find((line) => Number(line.accepted_qty ?? 0) + Number(line.rejected_qty ?? 0) !== Number(line.counted_nos ?? line.received_qty ?? 0));
    if (invalidLine) { setError(`Accepted + Rejected must equal Counted/Received for ${invalidLine.name || invalidLine.serial_id || "the item"}.`); return; }

    // ── Auto-create catalog items for FREE- entries ─────────────────────────
    const freeformLines = normalizedLines.filter((line) => (line.item_id ?? "").startsWith("FREE-"));
    if (freeformLines.length > 0) {
      setSaving(true); setError("");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      for (const line of freeformLines) {
        const itemName = (line.name ?? line.serial_id ?? "Unknown Item").trim();
        // Fallback: simple name-based serial for any FREE- items that slip through
        const serialFromName = itemName
          .replace(/[^a-zA-Z0-9 ]/g, "")
          .split(/\s+/)
          .map((w) => w.substring(0, 3).toUpperCase())
          .join("")
          .substring(0, 12);
        const uniqueSerial = `MISC-${serialFromName}-${Date.now().toString(36).toUpperCase()}`;

        const { data: newItem, error: itemErr } = await supabase
          .from("items")
          .insert({
            serial_id: uniqueSerial,
            name: itemName,
            description: `Auto-created from GRN on ${new Date().toLocaleDateString("en-IN")}`,
            unit: "NOS",
            category: "Misc",
            specs: {},
          })
          .select("id, serial_id, name, unit, category")
          .single();

        if (itemErr) {
          setError(`Failed to create catalog item "${itemName}": ${itemErr.message}`);
          setSaving(false);
          return;
        }

        // Replace FREE- item_id with real item_id in the line
        const idx = normalizedLines.findIndex((l) => l.item_id === line.item_id);
        if (idx !== -1) {
          normalizedLines[idx] = {
            ...normalizedLines[idx],
            item_id: (newItem as any).id,
            serial_id: (newItem as any).serial_id,
            name: (newItem as any).name,
            unit: (newItem as any).unit,
          };
        }

        await audit({
          action: "item_created_from_grn",
          entity_type: "item",
          entity_id: (newItem as any).id,
          entity_code: (newItem as any).serial_id,
          details: {
            name: (newItem as any).name,
            category: (newItem as any).category,
            unit: (newItem as any).unit,
            created_via: "grn_freeform_auto",
            created_by: user?.id ?? null,
          },
        });
      }

      setSaving(false);
    }

    setSaving(true); setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("full_name, department").eq("id", user.id).single()
      : { data: null };
    const profileData = profile as any;
    const name = profileData?.full_name ?? user?.email ?? "Unknown";

    const fy = getCurrentFY();
    const { data: last } = await supabase
      .from("grn")
      .select("fy_serial")
      .eq("fy_label", fy)
      .order("fy_serial", { ascending: false })
      .limit(1);
    const nextSerial = Math.max((Number((last as any)?.[0]?.fy_serial) || 0) + 1, 22);
    const finalGrnNumber = grnNumber === "Auto" ? `GRN/${String(nextSerial).padStart(3, "0")}/${fy}` : grnNumber.trim();
    const selectedVendor = vendors.find((v) => v.id === manualVendorId);

    const payload = {
      grn_number: finalGrnNumber,
      fy_label: fy,
      fy_serial: nextSerial,
      po_id: selectedPOs[0]?.id ?? null,
      vendor_id: selectedPOs[0]?.vendor_id ?? selectedVendor?.id ?? null,
      vendor_name: selectedPOs[0]?.vendors?.name ?? selectedVendor?.name ?? (manualVendorName.trim() || null),
      received_by: user?.id ?? null,
      received_by_name: FIXED_RECEIVED_BY_NAME,
      inspected_by: null,
      inspected_by_name: null,
      line_items: normalizedLines,
      status: "pending" as const,
      inspection_notes: inspectionNotes.trim() || null,
      challan_no: challanNo.trim() || null,
      challan_date: challanDate.trim() || null,
      revision_no: revisionNo.trim() || null,
      revision_date: revisionDate.trim() || null,
      grn_date: grnDate.trim() || null,
    };

    const { data: savedGrn, error: saveErr } = await supabase.from("grn").insert(payload).select("id").single();
    if (saveErr) { setError(saveErr.message); setSaving(false); return; }

    await audit({
      action: "grn_created",
      entity_type: "grn",
      entity_id: (savedGrn as any)?.id,
      entity_code: finalGrnNumber,
      details: {
        status: "pending",
        vendor_name: payload.vendor_name,
        po_id: payload.po_id,
        po_ids: selectedPOs.map((po) => po.id),
        po_numbers: selectedPOs.map((po) => po.po_number),
        line_count: normalizedLines.length,
      },
    });

    // Save freeform vendor if no vendor_id and vendor_name provided
    if (!payload.vendor_id && manualVendorName.trim()) {
      await supabase.from("vendors").insert({
        name: manualVendorName.trim(),
        address: manualVendorAddress.trim() || null,
        gstin: manualVendorGstin.trim() || null,
      }).select("id").single();
    }

    setCreateOpen(false);
    setSaving(false);
    await load();
  }

  function updateGRNLine(index: number, patch: Partial<GRNLineItem>) {
    setGrnLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;

        if (patch.challan_nos !== undefined) {
          const qty = Math.max(0, Number(patch.challan_nos));
          return normalizeGRNLine(line, {
            ...patch,
            received_qty: qty,
            challan_nos: qty,
            counted_nos: qty,
            accepted_qty: qty,
            rejected_qty: 0,
          });
        }

        if (patch.counted_nos !== undefined) {
          const qty = Math.max(0, Number(patch.counted_nos));
          return normalizeGRNLine(line, {
            ...patch,
            counted_nos: qty,
            accepted_qty: qty,
            rejected_qty: 0,
          });
        }

        if (patch.accepted_qty !== undefined) {
          return normalizeGRNLine(line, {
            ...patch,
            accepted_qty: Math.max(0, Number(patch.accepted_qty)),
          });
        }

        return normalizeGRNLine(line, patch);
      })
    );
  }

  async function syncStockForGRN(grnId: string, grnNumber: string, lines: GRNLineItem[], userId: string | null, actorName: string) {
    const supabase = createClient();

    const { error: deleteErr } = await supabase
      .from("stock_ledger")
      .delete()
      .eq("reference_type", "grn")
      .eq("reference_id", grnId);

    if (deleteErr) throw deleteErr;

    for (const line of lines) {
      const acceptedQty = Number(line.accepted_qty ?? 0);
      if (acceptedQty <= 0) continue;

      const { data: lastLedger, error: balanceErr } = await supabase
        .from("stock_ledger")
        .select("balance")
        .eq("item_id", line.item_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (balanceErr) throw balanceErr;

      const baseBalance = Number((lastLedger as any)?.[0]?.balance ?? 0);
      const { error: insertErr } = await supabase.from("stock_ledger").insert({
        item_id: line.item_id,
        transaction_type: "grn_in",
        reference_type: "grn",
        reference_id: grnId,
        reference_code: grnNumber,
        qty_in: acceptedQty,
        qty_out: 0,
        balance: baseBalance + acceptedQty,
        unit: line.unit,
        notes: `Stock received via ${grnNumber}`,
        created_by: userId,
        created_by_name: actorName,
      });

      if (insertErr) throw insertErr;
    }
  }


  async function updateStatus(grn: GRN, newStatus: "under_review" | "inspected" | "approved" | "rejected" | "partial") {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };
    const actorName = (profile as any)?.full_name ?? user?.email ?? "Unknown";

    let nextLines = [ ...((grn.line_items ?? []) as GRNLineItem[]) ];

    if (newStatus === "rejected") {
      nextLines = nextLines.map((line) => {
        const counted = Number(line.counted_nos ?? line.received_qty ?? 0);
        return {
          ...line,
          accepted_qty: 0,
          rejected_qty: counted,
          rejection_reason: line.rejection_reason || "Rejected",
        };
      });
    }

    // Build update payload — set inspector/approver fields at the stage they actually happen:
    // under_review = sent for inspection (no actor field yet — QAQC hasn't inspected it)
    // inspected = QAQC has inspected it
    // approved/partial = approver has signed off
    const updatePayload: Record<string, any> = { status: newStatus, line_items: nextLines };
    if (newStatus === "approved" || newStatus === "partial") {
      updatePayload.approved_by = user?.id ?? null;
      updatePayload.approved_by_name = actorName;
      updatePayload.approved_at = new Date().toISOString();
    } else if (newStatus === "inspected") {
      updatePayload.inspected_by = user?.id ?? null;
      updatePayload.inspected_by_name = actorName;
    }

    const { error: updateErr } = await supabase
      .from("grn")
      .update(updatePayload)
      .eq("id", grn.id);

    if (updateErr) { setError(updateErr.message); return; }

    try {
      if (newStatus === "approved" || newStatus === "partial") {
        await syncStockForGRN(grn.id, grn.grn_number, nextLines, user?.id ?? null, actorName);
      } else if (newStatus === "rejected") {
        const { error: deleteErr } = await supabase
          .from("stock_ledger")
          .delete()
          .eq("reference_type", "grn")
          .eq("reference_id", grn.id);
        if (deleteErr) throw deleteErr;
      }
    } catch (err: any) {
      setError(err?.message || "Failed to sync stock for GRN.");
      return;
    }

    const actionMap: Record<"under_review" | "inspected" | "approved" | "rejected" | "partial", string> = {
      under_review: "grn_sent_for_inspection",
      inspected: "grn_inspected",
      approved: "grn_approved",
      rejected: "grn_rejected",
      partial: "grn_partial",
    };

    await audit({
      action: actionMap[newStatus],
      entity_type: "grn",
      entity_id: grn.id,
      entity_code: grn.grn_number,
      details: {
        status: newStatus,
        by: actorName,
        user_id: user?.id ?? null,
        accepted_lines: nextLines.filter((line) => Number(line.accepted_qty ?? 0) > 0).length,
        rejected_lines: nextLines.filter((line) => Number(line.rejected_qty ?? 0) > 0).length,
      },
    });

    if (newStatus === "approved" || newStatus === "partial") {
      await audit({
        action: "stock_received",
        entity_type: "grn",
        entity_id: grn.id,
        entity_code: grn.grn_number,
        details: {
          status: newStatus,
          by: actorName,
          accepted_qty: nextLines.reduce((sum, line) => sum + Number(line.accepted_qty ?? 0), 0),
        },
      });
    }

    if (newStatus === "approved" || newStatus === "partial") {
      setApprovalAnim({ type: newStatus, grnNumber: grn.grn_number });
    }

    await load();
  }

  const canCreate = role && can(role, "create_grn");
  const canSendForInspection = role && can(role, "send_for_inspection");
  const canInspect = role && can(role, "inspect_grn");
  const canApprove = role && can(role, "approve_grn");
  const canDelete = role && can(role, "delete_grn");

  async function cleanupRejectedGRNStock() {
    setError("");
    const supabase = createClient();
    const rejectedGrns = grns.filter((g) => g.status === "rejected");
    let removed = 0;
    let adjusted = 0;

    for (const g of rejectedGrns) {
      const { data: existing, error: existingErr } = await supabase
        .from("stock_ledger")
        .select("id, item_id, qty_in, qty_out, unit")
        .eq("reference_type", "grn")
        .eq("reference_id", g.id);

      if (existingErr) {
        setError(existingErr.message);
        return;
      }

      const entries = (existing ?? []) as any[];
      if (entries.length === 0) continue;

      for (const entry of entries) {
        const { data: lastLedger, error: balanceErr } = await supabase
          .from("stock_ledger")
          .select("balance")
          .eq("item_id", entry.item_id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (balanceErr) {
          setError(balanceErr.message);
          return;
        }

        const baseBalance = Number((lastLedger as any)?.[0]?.balance ?? 0);
        const reverseQty = Number(entry.qty_in ?? 0) - Number(entry.qty_out ?? 0);
        if (reverseQty > 0) {
          const { error: reverseErr } = await supabase.from("stock_ledger").insert({
            item_id: entry.item_id,
            transaction_type: "adjustment_out",
            reference_type: "manual",
            reference_code: `REJECT-CLEAN-${g.grn_number}`,
            qty_in: 0,
            qty_out: reverseQty,
            balance: Math.max(0, baseBalance - reverseQty),
            unit: entry.unit,
            notes: `Auto reversal for rejected GRN ${g.grn_number}`,
          });

          if (reverseErr) {
            setError(reverseErr.message);
            return;
          }
          adjusted += 1;
        }
      }

      const { error: deleteErr } = await supabase
        .from("stock_ledger")
        .delete()
        .eq("reference_type", "grn")
        .eq("reference_id", g.id);

      if (deleteErr) {
        setError(deleteErr.message);
        return;
      }

      removed += entries.length;
    }

    await load();
    alert(removed > 0 ? `Cleanup complete. Removed ${removed} rejected GRN entr${removed === 1 ? "y" : "ies"} and added ${adjusted} reversal adjustment${adjusted === 1 ? "" : "s"}.` : "Cleanup complete. No stale stock ledger entries were found for rejected GRNs.");
  }


  async function deleteGRN(grn: GRN) {
    try {
      const ok = window.confirm(`Delete ${grn.grn_number}? This will also remove any stock ledger entries linked to it.`);
      if (!ok) return;

      setError("");
      const supabase = createClient();

      // Get the current session token for authorization
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session?.access_token) {
        setError("Authentication error. Please log in again.");
        return;
      }

      const res = await fetch("/api/grn/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ grnId: grn.id, grnNumber: grn.grn_number }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("deleteGRN: API error", data);
        setError(data.error || "Failed to delete GRN");
        return;
      }

      await load();
    } catch (err: any) {
      console.error("deleteGRN: unexpected error", err);
      setError(`Unexpected error: ${err?.message || 'Something went wrong'}`);
    }
  }

  const MIN_ROWS = 10;
  const displayLines = [...grnLines, ...Array(Math.max(0, MIN_ROWS - grnLines.length)).fill(null)];

  const revDate = "01/10/2025";
  const fy = getCurrentFY();

  // ── Helper: combined PO numbers string for the header ──────────────────────
  const combinedPONumbers = selectedPOs.length > 0
    ? selectedPOs.map((po) => po.po_number).join(", ")
    : "Direct Receipt";

  // ── Helper: get PO date for a given line (by source_po_id) ─────────────────
  function getLinePODate(line: GRNLineItem): string {
    const sourcePOId = (line as any).source_po_id;
    const matchedPO = sourcePOId
      ? selectedPOs.find((po) => po.id === sourcePOId)
      : selectedPOs[0];
    return matchedPO
      ? new Date(matchedPO.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "—";
  }

  // ── Helper: get PO number for a given line (by source_po_number) ───────────
  function getLinePONumber(line: GRNLineItem): string {
    return (line as any).source_po_number ?? selectedPOs[0]?.po_number ?? "—";
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {approvalAnim && (
        <div className="fixed top-0 left-0 right-0 bottom-0 md:left-72 z-[100] flex items-start justify-center pt-24 pointer-events-none px-4">
          <div
            className={`grn-success-pop pointer-events-auto flex items-center gap-3 rounded-2xl shadow-lg border px-5 py-4 ${
              approvalAnim.type === "approved"
                ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30"
                : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30"
            }`}
          >
            <span
              className={`grn-success-check inline-flex h-9 w-9 items-center justify-center rounded-full ${
                approvalAnim.type === "approved" ? "bg-green-500" : "bg-amber-500"
              }`}
            >
              <CheckCircle size={20} className="text-white" />
            </span>
            <div>
              <p className={`text-sm font-bold ${approvalAnim.type === "approved" ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                {approvalAnim.type === "approved" ? "GRN Approved" : "GRN Partially Approved"}
              </p>
              <p className="text-xs text-[#8892a8] dark:text-gray-500 font-mono">{approvalAnim.grnNumber}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto shrink-0 text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Goods Receipt Notes (GRN)</h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
            Receive against PO, or record direct receipts. Inspect and update stock.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(canInspect || canApprove) && (
            <button
              onClick={cleanupRejectedGRNStock}
              className="flex items-center gap-2 bg-[#f1f3f8] hover:bg-[#e8eaf2] dark:bg-gray-800 dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-200 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all border border-[#dde1ea] dark:border-gray-700"
            >
              <Trash2 size={16} /> Clean Rejected Stock
            </button>
          )}
          {canCreate && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
            >
              <Plus size={16} /> New GRN
            </button>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-4xl my-8 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#dde1ea] dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-viton-navy dark:text-white font-bold">
                  {createMode === "against_po" ? "Receive Against PO" : createMode === "without_po" ? "Direct Receipt (No PO)" : "Create GRN"}
                </h2>
                {createMode && (
                  <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">
                    {createMode === "against_po" && selectedPOs.length ? `POs: ${selectedPOs.map((po) => po.po_number).join(", ")}` : "Manual entry — no purchase order"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {createMode && (
                  <button
                    onClick={() => {
                      if (createMode === "against_po" && poSelectionConfirmed) setPoSelectionConfirmed(false);
                      else setCreateMode(null);
                    }}
                    className="text-sm text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white flex items-center gap-1"
                  >
                    <ArrowLeft size={14} /> {createMode === "against_po" && poSelectionConfirmed ? "Back to PO selection" : "Back"}
                  </button>
                )}
                <button onClick={() => setCreateOpen(false)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            {!createMode && (
              <div className="p-6 grid sm:grid-cols-2 gap-4">
                <button onClick={() => setCreateMode("against_po")} className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-6 hover:border-viton-red dark:hover:border-orange-500 hover:shadow-md transition-all text-left">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center mb-4">
                    <FileText size={22} />
                  </div>
                  <p className="text-viton-navy dark:text-white font-semibold text-sm">Receive Against PO</p>
                  <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">Select a pending PO and record what arrived.</p>
                </button>
                <button onClick={() => setCreateMode("without_po")} className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-6 hover:border-viton-red dark:hover:border-orange-500 hover:shadow-md transition-all text-left">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 flex items-center justify-center mb-4">
                    <Truck size={22} />
                  </div>
                  <p className="text-viton-navy dark:text-white font-semibold text-sm">Direct Receipt (No PO)</p>
                  <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">Emergency, local market, or return without PO.</p>
                </button>
              </div>
            )}

            {createMode === "against_po" && !poSelectionConfirmed && (
              <div className="p-6">
                <div className="mb-4 rounded-2xl border border-[#dde1ea] dark:border-gray-800 bg-[#f8f9fc] dark:bg-gray-950 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-[#8892a8] dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">Select Pending PO</h3>
                    <p className="text-[#8892a8] dark:text-gray-500 text-xs">Select one PO first; other vendors will be disabled. You can add more POs from the same vendor only.</p>
                    {selectedPOs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedPOs.map((po) => (
                          <span key={po.id} className="inline-flex items-center rounded-full bg-viton-red/10 text-viton-red dark:bg-orange-500/10 dark:text-orange-400 px-3 py-1 text-[11px] font-semibold">
                            {po.po_number}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedPOs.length > 0 && (
                      <button
                        type="button"
                        onClick={clearPOSelection}
                        className="rounded-xl border border-[#dde1ea] dark:border-gray-800 px-4 py-2 text-sm font-semibold text-[#4a5578] dark:text-gray-300"
                      >
                        Clear selection
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={selectedPOs.length === 0}
                      onClick={() => setPoSelectionConfirmed(true)}
                      className="rounded-xl bg-viton-red hover:bg-red-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {selectedPOs.length > 0 ? `Create GRN from ${selectedPOs.length} selected PO${selectedPOs.length > 1 ? "s" : ""}` : "Select at least one PO"}
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pos
                    .filter((po) => !grns.some((g) => g.po_id === po.id))
                    .filter((po) => !(po.dispatch_meta as any)?.grn_hidden_from_modal)
                    .map((po) => {
                      const isSelected = selectedPOs.some((row) => row.id === po.id);
                      const vendorLocked = !!lockedVendorId;
                      const vendorMismatch = vendorLocked && po.vendor_id !== lockedVendorId;
                      return (
                    <div key={po.id} className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 transition-all ${isSelected ? "border-viton-red dark:border-orange-500 shadow-md" : vendorMismatch ? "border-[#eceff5] dark:border-gray-800 opacity-50" : "border-[#dde1ea] dark:border-gray-800 hover:border-viton-red dark:hover:border-orange-500 hover:shadow-md"}`}>
                      <button type="button" disabled={vendorMismatch} className="w-full text-left disabled:cursor-not-allowed" onClick={() => togglePOSelection(po)}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-viton-navy dark:text-white font-semibold font-mono text-sm">{po.po_number}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRemovePanelPOId((current) => current === po.id ? null : po.id);
                              }}
                              className="text-[#a8afbf] hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                              aria-label="Remove PO"
                              title="Remove PO"
                            >
                              <Trash2 size={14} />
                            </button>
                            <Plus size={14} className={isSelected ? "text-viton-red dark:text-orange-500" : "text-[#a8afbf] dark:text-gray-500"} />
                          </div>
                        </div>
                        <p className="text-[#8892a8] dark:text-gray-500 text-xs">{po.vendors?.name ?? "—"}</p>
                        <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">Status: {po.status ?? "—"}</p>
                        <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">{po.line_items?.length ?? 0} items</p>
                        <p className="text-[#4a5578] dark:text-gray-300 text-xs mt-2 leading-5 line-clamp-3">
                          Items: {po.line_items?.length ? po.line_items.map((line) => line.name || line.serial_id || "Item").join(", ") : "—"}
                        </p>
                        {vendorMismatch && <p className="text-[11px] text-red-500 dark:text-red-400 mt-2">Disabled: different vendor than selected PO(s).</p>}
                        {isSelected && <p className="text-[11px] text-viton-red dark:text-orange-400 mt-2 font-semibold">Selected for this GRN</p>}
                      </button>
                      {removePanelPOId === po.id && (
                        <div className="mt-4 pt-4 border-t border-[#dde1ea] dark:border-gray-800">
                          <input
                            value={removeReasonByPO[po.id] ?? ""}
                            onChange={(e) => setRemoveReasonByPO((prev) => ({ ...prev, [po.id]: e.target.value }))}
                            placeholder="Reason for removing this PO"
                            className="w-full rounded-xl border border-[#dde1ea] dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-viton-navy dark:text-white outline-none focus:border-viton-red dark:focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => hidePOFromGRN(po)}
                            disabled={removingPOId === po.id || !(removeReasonByPO[po.id] ?? "").trim()}
                            className="mt-2 w-full rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {removingPOId === po.id ? "Removing..." : "Confirm delete"}
                          </button>
                        </div>
                      )}
                    </div>
                  )})}
                  {pos
                    .filter((po) => !grns.some((g) => g.po_id === po.id))
                    .filter((po) => !(po.dispatch_meta as any)?.grn_hidden_from_modal).length === 0 && (
                    <div className="text-sm text-[#8892a8] dark:text-gray-500 p-4">No pending POs available.</div>
                  )}
                </div>
              </div>
            )}

            {(createMode === "against_po" && poSelectionConfirmed && selectedPOs.length > 0) || createMode === "without_po" ? (
              <div className="p-0 overflow-x-auto">
                {/* ── GRN FORM ── */}
                <div style={{ background:"#fff", fontFamily:"Arial, Helvetica, sans-serif", fontSize:"10pt", color:"#000", padding:"8mm 10mm", boxSizing:"border-box", borderRadius:"4px", border:"1px solid #ddd", minWidth:"800px" }}>
                  {/* ── FLAT HEADER TABLE ─────────────────────────────── */}
                  <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"0" }}>
                    <tbody>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb", whiteSpace:"nowrap", width:"15%" }}>Document No.</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt", width:"15%" }}>VT-STR-R-02</td>
                        <td style={{ border:"2px solid #000", padding:"6px 10px", background:"#1a1a6e", color:"#fff", fontSize:"12pt", fontWeight:"900", letterSpacing:"1.5px", textTransform:"uppercase", textAlign:"center", width:"40%" }} rowSpan={3}>
                          <div>Goods Receipt Note</div>
                          <div style={{ fontSize:"8pt", letterSpacing:"0.8px", marginTop:"2px", opacity:0.85 }}>GRN</div>
                          <div style={{ fontSize:"10pt", fontWeight:"900", marginTop:"6px", letterSpacing:"0.3px" }}>VITON ENGINEERS PVT LTD</div>
                        </td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb", whiteSpace:"nowrap", width:"15%" }}>GRN No.</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt", fontWeight:"700", width:"15%" }}>
                          <input value={grnNumber} onChange={(e) => setGrnNumber(e.target.value)} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>Revision No.</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt" }}>
                          <input value={revisionNo} onChange={(e) => setRevisionNo(e.target.value)} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} />
                        </td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>GRN Date</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt" }}>
                          <input value={grnDate} onChange={(e) => setGrnDate(e.target.value)} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} placeholder="DD/MM/YY" />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>Revision Date</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt" }}>
                          <input value={revisionDate} onChange={(e) => setRevisionDate(e.target.value)} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} placeholder="DD/MM/YYYY" />
                        </td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>Status</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt", fontWeight:"700" }}>PENDING</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* ── FLAT SUPPLIER + RECEIVED TABLE ──────────────── */}
                  <table style={{ width:"100%", borderCollapse:"collapse", marginTop:"4px" }}>
                    <tbody>
                      <tr>
                        <td colSpan={3} style={{ border:"1px solid #000", background:"#1a1a6e", color:"#fff", fontWeight:"700", fontSize:"8pt", padding:"3px 7px", textTransform:"uppercase", letterSpacing:"0.8px", width:"55%" }}>Supplier Details</td>
                        <td colSpan={2} style={{ border:"1px solid #000", background:"#1a1a6e", color:"#fff", fontWeight:"700", fontSize:"8pt", padding:"3px 7px", textTransform:"uppercase", letterSpacing:"0.8px", width:"45%" }}>Received At</td>
                      </tr>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb", width:"18%" }}>Supplier Name</td>
                        <td colSpan={2} style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", width:"37%" }}>
                          {createMode === "without_po" ? (
                            <div className="flex gap-2 items-center">
                              <select
                                value={manualVendorId}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  setManualVendorId(id);
                                  const v = vendors.find(v => v.id === id);
                                  setManualVendorName(v?.name ?? "");
                                }}
                                className="text-[10pt] font-normal border rounded px-1 flex-1 min-w-0"
                                style={{ fontSize:"10pt" }}
                              >
                                <option value="">Select vendor...</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                              </select>
                              <span className="text-gray-400 text-[10px] flex-shrink-0">or</span>
                              <input
                                value={manualVendorName}
                                onChange={(e) => { setManualVendorId(""); setManualVendorName(e.target.value); }}
                                placeholder="Type freeform name"
                                className="text-[10pt] font-normal border rounded px-1 flex-1 min-w-0"
                                style={{ fontSize:"10pt", padding: "2px 6px" }}
                              />
                            </div>
                          ) : (
                            <input value={selectedPOs[0]?.vendors?.name ?? ""} readOnly style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} />
                          )}
                        </td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb", width:"22%" }}>Company</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt", width:"23%" }}>M/s. VITON ENGINEERS PVT LTD</td>
                      </tr>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>Supplier Address</td>
                        <td colSpan={2} style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"7.5pt", lineHeight:1.5 }}>
                          {createMode === "without_po" ? (
                            <input
                              value={manualVendorId ? (vendors.find(v => v.id === manualVendorId)?.address ?? "") : manualVendorAddress}
                              onChange={(e) => setManualVendorAddress(e.target.value)}
                              placeholder="Address"
                              style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }}
                            />
                          ) : (selectedPOs[0]?.vendors?.address ?? "—")}
                        </td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>Address</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"7.5pt", lineHeight:1.5 }}>Plot No. B-40/1, Addl. Ambernath MIDC,<br />Anand Nagar, Ambernath E, Dist. Thane - 421506</td>
                      </tr>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>Supplier GSTIN</td>
                        <td colSpan={2} style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700" }}>
                          {createMode === "without_po" ? (
                            <input
                              value={manualVendorId ? (vendors.find(v => v.id === manualVendorId)?.gstin ?? "") : manualVendorGstin}
                              onChange={(e) => setManualVendorGstin(e.target.value)}
                              placeholder="GSTIN"
                              style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }}
                            />
                          ) : (selectedPOs[0]?.vendors?.gstin ?? "—")}
                        </td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>Email</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt" }}>viton.engg@gmail.com</td>
                      </tr>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>Challan / Inv No.</td>
                        <td colSpan={2} style={{ border:"1px solid #000", padding:"4px 6px" }}>
                          <input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} placeholder="Optional" />
                        </td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>GST No.</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt" }}>27AACCV7755N1ZK</td>
                      </tr>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>Challan / Inv Date</td>
                        <td colSpan={2} style={{ border:"1px solid #000", padding:"4px 6px" }}>
                          <input value={challanDate} onChange={(e) => setChallanDate(e.target.value)} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} placeholder="DD/MM/YYYY" />
                        </td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>Received By</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt" }}>
                          <input value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} placeholder="Enter name" style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} />
                        </td>
                      </tr>
                      {/* ── PO No. row: show ALL selected PO numbers ── */}
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>PO No.</td>
                        <td colSpan={2} style={{ border:"1px solid #000", padding:"4px 6px", fontFamily:"monospace", color:"#1a1a6e", fontWeight:"700" }}>
                          {combinedPONumbers}
                        </td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }} />
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt" }} />
                      </tr>
                      {/* ── PO Date row: show dates for all selected POs ── */}
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>PO Date</td>
                        <td colSpan={2} style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt" }}>
                          {selectedPOs.length > 0
                            ? selectedPOs.map((po) =>
                                new Date(po.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"2-digit", year:"numeric" })
                              ).join(", ")
                            : "—"}
                        </td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }} />
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt" }} />
                      </tr>
                    </tbody>
                  </table>

                  {/* Item Search & Add */}
                  <div style={{ marginTop:"10px", marginBottom:"6px" }}>
                    <div className="relative" ref={itemSearchRef}>
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8892a8]" />
                      <input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Search catalog by serial ID or name..." style={{ width:"100%", padding:"6px 10px 6px 32px", fontSize:"9pt", border:"1px solid #ccc", borderRadius:"4px", background:"#fafafa" }} />
                      {showItemSearch && itemResults.length > 0 && (
                        <div className="absolute z-50 mt-1 bg-white border border-[#dde1ea] rounded-lg shadow-lg overflow-hidden w-full">
                          {itemResults.map((item) => (
                            <button key={item.id} onClick={() => addManualItem(item)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#f1f3f8] text-left border-b border-[#eef1f6] last:border-0">
                              <div><p className="text-viton-red font-mono text-[10px] font-semibold">{item.serial_id}</p><p className="text-gray-800 text-[11px]">{item.name}</p></div>
                              <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.unit}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={addFreeformItem} className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">+ Add Freeform Item</button>
                      <button onClick={() => { setItemSearch(""); setItemResults([]); setShowItemSearch(false); }} className="text-[10px] text-gray-400 hover:text-gray-600">Clear</button>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ background:"#1a1a6e", color:"#fff" }}>
                        {[
                          { label:"Sr No.", w:"5%", align:"center" as const },
                          { label:"Description of Material", w:"32%", align:"left" as const },
                          { label:"PO No.", w:"14%", align:"center" as const },
                          { label:"PO Date", w:"10%", align:"center" as const },
                          { label:"Challan Qty\n(Kgs/Mtr)", w:"9%", align:"center" as const },
                          { label:"Challan Qty\n(Nos)", w:"8%", align:"center" as const },
                          { label:"Counted Qty\n(Nos)", w:"8%", align:"center" as const },
                          { label:"Accepted Qty\n(Nos)", w:"8%", align:"center" as const },
                          { label:"Rejection Qty\n(Nos)", w:"8%", align:"center" as const },
                          { label:"Remark", w:"10%", align:"left" as const },
                        ].map((col) => (
                          <th key={col.label} style={{ border:"1px solid #000", padding:"4px 4px", fontWeight:"700", fontSize:"7.5pt", textAlign:col.align, width:col.w, lineHeight:1.3, whiteSpace:"pre-line" }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayLines.map((line, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px", textAlign:"center", fontSize:"8pt", color:"#666" }}>{line ? i + 1 : ""}</td>
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px" }}>
                            {line ? (
                              <input value={line.name} onChange={(e) => updateGRNLine(i, { name: e.target.value })} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} />
                            ) : ""}
                          </td>
                          {/* ── PO No. per line: use source_po_number from the line itself ── */}
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px", textAlign:"center", fontSize:"7.5pt", fontFamily:"monospace", color:"#1a1a6e" }}>
                            {line ? getLinePONumber(line) : ""}
                          </td>
                          {/* ── PO Date per line: look up by source_po_id ── */}
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px", textAlign:"center", fontSize:"7.5pt" }}>
                            {line ? getLinePODate(line) : ""}
                          </td>
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px", textAlign:"center", fontSize:"8pt" }}>
                            {line ? (
                              <input type="number" value={line.challan_weight ?? 0} onChange={(e) => updateGRNLine(i, { challan_weight: Number(e.target.value) })} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none", textAlign:"center" }} />
                            ) : ""}
                          </td>
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px", textAlign:"center", fontSize:"8pt" }}>
                            {line ? (
                              <input type="number" value={line.challan_nos ?? line.received_qty ?? 1} onChange={(e) => updateGRNLine(i, { challan_nos: Number(e.target.value) })} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none", textAlign:"center" }} />
                            ) : ""}
                          </td>
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px", textAlign:"center", fontSize:"8pt" }}>
                            {line ? (
                              <input type="number" value={line.counted_nos ?? line.received_qty ?? 1} onChange={(e) => updateGRNLine(i, { counted_nos: Number(e.target.value) })} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none", textAlign:"center" }} />
                            ) : ""}
                          </td>
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px", textAlign:"center", fontSize:"8pt" }}>
                            {line ? (
                              <input type="number" value={line.accepted_qty ?? 0} onChange={(e) => updateGRNLine(i, { accepted_qty: Number(e.target.value) })} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none", textAlign:"center" }} />
                            ) : ""}
                          </td>
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px", textAlign:"center", fontSize:"8pt", color: line && (line.rejected_qty ?? 0) > 0 ? "#cc0000" : "#000" }}>
                            {line ? (line.rejected_qty ?? 0) : ""}
                          </td>
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px", fontSize:"7.5pt" }}>
                            {line ? (
                              <div className="flex items-center gap-1">
                                <input value={line.rejection_reason ?? ""} onChange={(e) => updateGRNLine(i, { rejection_reason: e.target.value })} style={{ width:"100%", fontSize:"7.5pt", border:"none", background:"transparent", outline:"none" }} />
                                <button onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0"><Trash2 size={10} /></button>
                              </div>
                            ) : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Remark */}
                  <table style={{ width:"100%", borderCollapse:"collapse", marginTop:"0" }}>
                    <tbody>
                      <tr>
                        <td style={{ border:"1px solid #ccc", padding:"5px 7px", fontSize:"8pt", fontWeight:"700", width:"12%" }}>Remark :</td>
                        <td style={{ border:"1px solid #ccc", padding:"5px 7px", fontSize:"8pt" }}>
                          <input value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} placeholder="Inspection notes or overall remarks" />
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Footer Actions */}
                  <div style={{ marginTop:"20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ fontSize:"8pt", color:"#888" }}>
                      This is a computer generated Goods Receipt Note.
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setCreateOpen(false)} className="bg-[#f1f3f8] hover:bg-[#e8eaf2] text-[#4a5578] font-semibold px-4 py-2 rounded-lg text-sm">Cancel</button>
                      <button onClick={handleSaveGRN} disabled={saving || grnLines.length === 0} className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm flex items-center gap-2">
                        <SaveIcon /> {saving ? "Saving..." : "Submit GRN"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      

      {/* ── Freeform Item Catalog Modal (mirrors catalog page) ──────────────── */}
      {freeformModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#dde1ea] dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 flex-shrink-0">
              <div>
                <h2 className="text-viton-navy dark:text-white font-bold">Add New Catalog Item</h2>
                <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">Select category, fill spec fields, serial ID auto-builds.</p>
              </div>
              <button onClick={cancelFreeformItem} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {freeformError && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm">{freeformError}</div>}

              {/* Category selector */}
              <div>
                <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(CATEGORY_FIELDS).map(cat => (
                    <button key={cat} onClick={() => handleFreeformCategoryChange(cat)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                        freeformMeta.category === cat
                          ? "bg-viton-red border-viton-red text-white dark:bg-orange-500 dark:border-orange-500"
                          : "bg-[#f7f8fb] dark:bg-gray-800 border-[#dde1ea] dark:border-gray-700 text-[#4a5578] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white hover:border-[#cfd5e2] dark:hover:border-gray-600"
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spec Fields */}
              {CATEGORY_FIELDS[freeformMeta.category]?.length > 0 && (
                <div className="bg-[#f7f8fb] dark:bg-gray-800/50 rounded-xl p-4 space-y-3 border border-[#dde1ea] dark:border-gray-700">
                  <p className="text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Spec Fields → Auto-builds Code</p>
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORY_FIELDS[freeformMeta.category].map(field => (
                      <div key={field.key}>
                        <label className="block text-[#8892a8] dark:text-gray-500 text-xs mb-1">{field.label}</label>
                        {field.options ? (
                          <div className="relative">
                            <input
                              list={`grn-ff-${freeformMeta.category}-${field.key}`}
                              value={freeformCodeFields[field.key] ?? ""}
                              onChange={e => setFreeformCodeField(field.key, e.target.value.toUpperCase())}
                              placeholder="Select or type"
                              className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 pr-8 text-viton-navy dark:text-white text-xs font-mono placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                            />
                            <datalist id={`grn-ff-${freeformMeta.category}-${field.key}`}>
                              {field.options.map(o => <option key={o} value={o} />)}
                            </datalist>
                            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                              <svg className="w-3.5 h-3.5 text-[#8892a8] dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <input
                            value={freeformCodeFields[field.key] ?? ""}
                            onChange={e => setFreeformCodeField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 text-viton-navy dark:text-white text-xs font-mono placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Serial ID */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Serial ID (Auto-generated)</label>
                  <button onClick={() => setFreeformMeta(f => ({ ...f, codeEdited: false }))}
                    className="flex items-center gap-1 text-[#8892a8] dark:text-gray-500 hover:text-viton-red dark:hover:text-orange-400 text-xs transition-colors">
                    <RefreshCw size={11} /> Reset
                  </button>
                </div>
                <input
                  value={freeformMeta.serial_id}
                  onChange={e => setFreeformMeta(f => ({ ...f, serial_id: e.target.value, codeEdited: true }))}
                  placeholder="Auto-generated from fields above"
                  className="w-full bg-white dark:bg-gray-800 border border-viton-red/30 dark:border-orange-500/30 rounded-xl px-4 py-3 text-viton-red dark:text-orange-400 text-sm font-mono placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                />
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Item Name</label>
                <input
                  value={freeformMeta.name}
                  onChange={e => setFreeformMeta(f => ({ ...f, name: e.target.value }))}
                  placeholder="Auto-filled or type manually"
                  className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                />
              </div>

              {/* Unit + HSN */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Unit</label>
                  <div className="relative">
                    <select
                      value={freeformMeta.unit}
                      onChange={e => setFreeformMeta(f => ({ ...f, unit: e.target.value }))}
                      className="w-full appearance-none bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-viton-navy dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 cursor-pointer"
                    >
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
                  <input
                    value={freeformMeta.hsn_code}
                    onChange={e => setFreeformMeta(f => ({ ...f, hsn_code: e.target.value }))}
                    placeholder="e.g. 84818090"
                    className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-viton-navy dark:text-white text-sm font-mono placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Extra Specs / Notes</label>
                <textarea
                  value={freeformMeta.description}
                  onChange={e => setFreeformMeta(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Certifications, additional specs, remarks..."
                  className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#dde1ea] dark:border-gray-800 flex gap-3 flex-shrink-0">
              <button onClick={cancelFreeformItem} className="flex-1 bg-[#f1f3f8] hover:bg-[#e7ebf3] dark:bg-gray-800 dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold py-3 rounded-xl text-sm">Cancel</button>
              <button onClick={() => createFreeformItemInCatalog(freeformIndex ?? 0)} disabled={freeformSaving}
                className="flex-1 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                <Save size={15} />{freeformSaving ? "Saving..." : "Create & Link to GRN"}
              </button>
            </div>
          </div>
        </div>
      )}
{/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8892a8]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search GRN, vendor, receiver..." className="bg-[#f1f3f8] dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl text-sm px-9 py-2 w-full focus:outline-none focus:border-viton-red dark:focus:border-orange-500" />
        </div>
      </div>

      {/* GRN list */}
      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-[#dde1ea] dark:border-gray-800 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          ))
        ) : filteredGRN.length === 0 ? (
          <div className="px-5 py-12 text-center text-[#8892a8] dark:text-gray-500 text-sm">
            <div className="w-12 h-12 rounded-xl bg-[#f1f3f8] dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <Package size={20} className="text-[#8892a8] dark:text-gray-500" />
            </div>
            <p className="font-semibold mb-1">No GRN records found</p>
            <p className="text-xs">Create a new receipt to start recording.</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[48%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[5%]" />
                <col className="w-[5%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#dde1ea] dark:border-gray-800 text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-widest">
                  <th className="text-left px-7 py-4">GRN / Vendor</th>
                  <th className="text-center px-3 py-4">Items</th>
                  <th className="text-center px-3 py-4">Status</th>
                  <th className="text-center px-3 py-4">Date</th>
                  <th className="px-2 py-4"></th>
                  <th className="px-2 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredGRN.map((g) => {
                  const lines = (g.line_items ?? []) as GRNLineItem[];
                  const isOpen = expanded === g.id;
                  return (
                    <>
                      <tr key={g.id} className="border-b border-[#dde1ea] dark:border-gray-800 last:border-0 align-middle">
                        <td className="px-7 py-5 align-middle">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-viton-navy dark:text-white font-mono text-sm">{g.grn_number}</p>
                              {g.po_id && (
                                <span className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-500/20">Linked PO</span>
                              )}
                            </div>
                            <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">{g.vendor_name ?? "—"}</p>
                            <p className="text-[#8892a8] dark:text-gray-500 text-[10px] mt-1">Received by {g.received_by_name ?? "—"}</p>
                          </div>
                        </td>
                        <td className="px-3 py-5 text-center align-middle text-sm text-[#4a5578] dark:text-gray-400 tabular-nums whitespace-nowrap">
                          {lines.length} item{lines.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-3 py-5 align-middle">
                          <div className="flex justify-center">
                            <span className={`inline-flex w-[132px] justify-center text-[10px] font-semibold px-2.5 py-1.5 rounded-md border ${statusColors[g.status] ?? "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400"}`}>
                              {formatStatusLabel(g.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-5 text-center align-middle text-[#8892a8] dark:text-gray-500 text-xs tabular-nums whitespace-nowrap">
                          {new Date(g.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-2 py-5 align-middle text-center">
                          <PDFDownloadLink
                            document={<GRNPdfDocument grn={g} po={pos.find(p => p.id === g.po_id) ? { po_number: (pos.find(p => p.id === g.po_id) as POWithVendor).po_number, created_at: (pos.find(p => p.id === g.po_id) as POWithVendor).created_at } : null} vendor={vendors.find(v => v.id === g.vendor_id) ?? null} />}
                            fileName={`${g.grn_number.replace(/\//g, "-")}.pdf`}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white hover:bg-[#f1f3f8] dark:hover:bg-gray-800 transition-colors"
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </PDFDownloadLink>
                        </td>
                        <td className="px-2 py-5 align-middle text-center">
                          <button
                            onClick={() => setExpanded(isOpen ? null : g.id)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white hover:bg-[#f1f3f8] dark:hover:bg-gray-800 transition-colors"
                          >
                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="border-b border-[#dde1ea] dark:border-gray-800 last:border-0">
                          <td colSpan={6} className="px-5 pt-4 pb-4">
                            <div className="bg-[#f1f3f8] dark:bg-gray-800 rounded-xl border border-[#dde1ea] dark:border-gray-800 overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-[#8892a8] dark:text-gray-500 text-xs border-b border-[#dde1ea] dark:border-gray-800">
                                    <th className="text-left px-4 py-3 font-semibold">Item</th>
                                    <th className="text-center px-3 py-3 font-semibold">PO Qty</th>
                                    <th className="text-center px-3 py-3 font-semibold">Received</th>
                                    <th className="text-center px-3 py-3 font-semibold">Accepted</th>
                                    <th className="text-center px-3 py-3 font-semibold">Rejected</th>
                                    <th className="text-left px-3 py-3 font-semibold">Reason</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lines.map((l, i) => (
                                    <tr key={i} className="border-b border-[#dde1ea] dark:border-gray-800 last:border-0">
                                      <td className="px-4 py-3 text-viton-navy dark:text-white font-medium">{l.name}</td>
                                      <td className="px-3 py-3 text-center text-[#8892a8] dark:text-gray-500">{l.po_qty ?? 0}</td>
                                      <td className="px-3 py-3 text-center font-semibold">{l.received_qty}</td>
                                      <td className="px-3 py-3 text-center text-green-700 dark:text-green-400 font-semibold">{l.accepted_qty}</td>
                                      <td className="px-3 py-3 text-center text-viton-red font-semibold">{l.rejected_qty}</td>
                                      <td className="px-3 py-3 text-[#8892a8] dark:text-gray-500 text-xs">{l.rejection_reason || "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {(g.approved_by_name || g.inspected_by_name || g.approved_at) && (
                              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                                {g.inspected_by_name && (
                                  <span className="text-[#8892a8] dark:text-gray-500">
                                    Inspected by <span className="font-semibold text-viton-navy dark:text-white">{g.inspected_by_name}</span>
                                  </span>
                                )}
                                {g.approved_by_name && (
                                  <span className="text-[#8892a8] dark:text-gray-500">
                                    Approved by <span className="font-semibold text-green-700 dark:text-green-400">{g.approved_by_name}</span>
                                    {g.approved_at && <span className="ml-1">· {new Date(g.approved_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="mt-4 flex items-center gap-3 flex-wrap">
                              {g.status === "pending" && canSendForInspection && (
                                <>
                                  <button onClick={() => updateStatus(g, "under_review")} className="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-blue-100 dark:border-blue-500/20">Send for Inspection</button>
                                  <button onClick={() => updateStatus(g, "rejected")} className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-red-100 dark:border-red-500/20">Reject</button>
                                </>
                              )}
                              {g.status === "under_review" && canInspect && (
                                <>
                                  <button onClick={() => updateStatus(g, "inspected")} className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-indigo-100 dark:border-indigo-500/20">Inspect</button>
                                  <button onClick={() => updateStatus(g, "rejected")} className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-red-100 dark:border-red-500/20">Reject</button>
                                </>
                              )}
                              {g.status === "inspected" && canApprove && (
                                <>
                                  <button onClick={() => updateStatus(g, "approved")} className="bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-green-100 dark:border-green-500/20">Approve</button>
                                  <button onClick={() => updateStatus(g, "rejected")} className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-red-100 dark:border-red-500/20">Reject</button>
                                </>
                              )}
                              <PDFDownloadLink
                                document={<GRNPdfDocument grn={g} po={pos.find(p => p.id === g.po_id) ? { po_number: (pos.find(p => p.id === g.po_id) as POWithVendor).po_number, created_at: (pos.find(p => p.id === g.po_id) as POWithVendor).created_at } : null} vendor={vendors.find(v => v.id === g.vendor_id) ?? null} />}
                                fileName={`${g.grn_number.replace(/\//g, "-")}.pdf`}
                                className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5"
                              >
                                <Download size={12} /> Download PDF
                              </PDFDownloadLink>
                              {canDelete && (
                                <button onClick={() => deleteGRN(g)} className="bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-red-100 dark:border-red-500/20 flex items-center gap-1.5">
                                  <Trash2 size={12} /> Delete GRN
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {filteredGRN.map((g) => {
                const lines = (g.line_items ?? []) as GRNLineItem[];
                const isOpen = expanded === g.id;
                return (
                  <div key={g.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-[#dde1ea] dark:border-gray-800 overflow-hidden">
                    <div className="p-4" onClick={() => setExpanded(isOpen ? null : g.id)}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-viton-red dark:text-orange-400 text-xs font-semibold">{g.grn_number}</span>
                          <p className="text-viton-navy dark:text-white text-sm font-bold mt-1 leading-tight">{g.vendor_name ?? "—"}</p>
                          <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">{lines.length} item{lines.length !== 1 ? "s" : ""} · {new Date(g.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${statusColors[g.status] ?? "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400"}`}>{formatStatusLabel(g.status)}</span>
                          <PDFDownloadLink
                            document={<GRNPdfDocument grn={g} po={pos.find(p => p.id === g.po_id) ? { po_number: (pos.find(p => p.id === g.po_id) as POWithVendor).po_number, created_at: (pos.find(p => p.id === g.po_id) as POWithVendor).created_at } : null} vendor={vendors.find(v => v.id === g.vendor_id) ?? null} />}
                            fileName={`${g.grn_number.replace(/\//g, "-")}.pdf`}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#f1f3f8] dark:bg-gray-800 text-[#4a5578] dark:text-gray-400"
                          >
                            <Download size={18} />
                          </PDFDownloadLink>
                          <ChevronDown size={20} className={`text-[#8892a8] dark:text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-[#eef1f6] dark:border-gray-800/50 pt-3">
                        <div className="space-y-2 mb-3">
                          {lines.map((l, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-viton-navy dark:text-white font-medium truncate flex-1 mr-2">{l.name}</span>
                              <span className="text-[#4a5578] dark:text-gray-400 tabular-nums">{l.accepted_qty} / {l.received_qty}</span>
                            </div>
                          ))}
                        </div>
                        {(g.approved_by_name || g.inspected_by_name) && (
                          <div className="mb-3 flex flex-wrap gap-2 text-xs">
                            {g.inspected_by_name && (
                              <span className="text-[#8892a8] dark:text-gray-500">
                                Inspected by <span className="font-semibold text-viton-navy dark:text-white">{g.inspected_by_name}</span>
                              </span>
                            )}
                            {g.approved_by_name && (
                              <span className="text-[#8892a8] dark:text-gray-500">
                                Approved by <span className="font-semibold text-green-700 dark:text-green-400">{g.approved_by_name}</span>
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#eef1f6] dark:border-gray-800/50">
                          {g.status === "pending" && canSendForInspection && (
                            <>
                              <button onClick={() => updateStatus(g, "under_review")} className="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-[10px] font-semibold px-2 py-1 rounded border border-blue-100 dark:border-blue-500/20">Send for Inspection</button>
                              <button onClick={() => updateStatus(g, "rejected")} className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-semibold px-2 py-1 rounded border border-red-100 dark:border-red-500/20">Reject</button>
                            </>
                          )}
                          {g.status === "under_review" && canInspect && (
                            <>
                              <button onClick={() => updateStatus(g, "inspected")} className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 text-[10px] font-semibold px-2 py-1 rounded border border-indigo-100 dark:border-indigo-500/20">Inspect</button>
                              <button onClick={() => updateStatus(g, "rejected")} className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-semibold px-2 py-1 rounded border border-red-100 dark:border-red-500/20">Reject</button>
                            </>
                          )}
                          {g.status === "inspected" && canApprove && (
                            <>
                              <button onClick={() => updateStatus(g, "approved")} className="bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 text-[10px] font-semibold px-2 py-1 rounded border border-green-100 dark:border-green-500/20">Approve</button>
                              <button onClick={() => updateStatus(g, "rejected")} className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-semibold px-2 py-1 rounded border border-red-100 dark:border-red-500/20">Reject</button>
                            </>
                          )}
                          {canDelete && (
                            <button onClick={() => deleteGRN(g)} className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-semibold px-2 py-1 rounded border border-red-100 dark:border-red-500/20">Delete</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SaveIcon() {
  return <Package size={14} />;
}
