"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { can, useRole } from "@/lib/roles";
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
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { GRNPdfDocument } from "@/components/GRNPdf";

interface POWithVendor extends PurchaseOrder {
  vendors: Vendor | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  inspected: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  approved: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  partial: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
};

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

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"against_po" | "without_po" | null>(null);
  const [selectedPO, setSelectedPO] = useState<POWithVendor | null>(null);
  const [manualVendorId, setManualVendorId] = useState("");
  const [manualVendorName, setManualVendorName] = useState("");
  const [manualVendorAddress, setManualVendorAddress] = useState("");
  const [manualVendorGstin, setManualVendorGstin] = useState("");
  const [grnLines, setGrnLines] = useState<GRNLineItem[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [inspectedBy, setInspectedBy] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [challanDate, setChallanDate] = useState("");
  const [revisionNo, setRevisionNo] = useState("00");
  const [revisionDate, setRevisionDate] = useState("01/10/2025");
  const [grnDate, setGrnDate] = useState(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" }));
  const [grnNumber, setGrnNumber] = useState("Auto");
  const [receivedByName, setReceivedByName] = useState("");

  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<Item[]>([]);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const itemSearchRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [poRes, grnRes, vendorRes] = await Promise.all([
      supabase.from("purchase_orders").select("*, vendors(*)").eq("status", "confirmed").order("created_at", { ascending: false }),
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
    setSelectedPO(null);
    setManualVendorId("");
    setManualVendorName("");
    setManualVendorAddress("");
    setManualVendorGstin("");
    setGrnLines([]);
    setInspectionNotes("");
    setInspectedBy("");
    setChallanNo("");
    setChallanDate("");
    setRevisionNo("00");
    setRevisionDate("01/10/2025");
    setGrnDate(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" }));
    setGrnNumber("Auto");
    setReceivedByName("");
    setError("");
    setItemSearch("");
    setItemResults([]);
    setShowItemSearch(false);
    setCreateOpen(true);
  }

  function selectPO(po: POWithVendor) {
    setSelectedPO(po);
    const lines: GRNLineItem[] = (po.line_items ?? []).map((l: LineItem) => ({
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
    }));
    setGrnLines(lines);
    setManualVendorName(po.vendors?.name ?? "");
    setManualVendorAddress(po.vendors?.address ?? "");
    setManualVendorGstin(po.vendors?.gstin ?? "");
    setInspectionNotes("");
    setError("");
    setCreateMode("against_po");
  }

  function addManualItem(item: Item) {
    setGrnLines((prev) => [
      ...prev,
      {
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
      },
    ]);
    setItemSearch("");
    setShowItemSearch(false);
  }

  function addFreeformItem() {
    const nextId = `FREE-${Date.now()}`;
    setGrnLines((prev) => [
      ...prev,
      {
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
      },
    ]);
  }

  function removeLine(index: number) {
    setGrnLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveGRN() {
    if (grnLines.length === 0) { setError("Add at least one item."); return; }
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
    const nextSerial = (Number((last as any)?.[0]?.fy_serial) || 0) + 1;
    const finalGrnNumber = grnNumber === "Auto" ? `GRN/${String(nextSerial).padStart(3, "0")}/${fy}` : grnNumber.trim();
    const selectedVendor = vendors.find((v) => v.id === manualVendorId);

    const payload = {
      grn_number: finalGrnNumber,
      fy_label: fy,
      fy_serial: nextSerial,
      po_id: selectedPO?.id ?? null,
      vendor_id: selectedPO?.vendor_id ?? selectedVendor?.id ?? null,
      vendor_name: selectedPO?.vendors?.name ?? selectedVendor?.name ?? (manualVendorName.trim() || null),
      received_by: user?.id ?? null,
      received_by_name: receivedByName.trim() || name,
      inspected_by: null,
      inspected_by_name: inspectedBy.trim() || null,
      line_items: grnLines,
      status: "pending" as const,
      inspection_notes: inspectionNotes.trim() || null,
      challan_no: challanNo.trim() || null,
      challan_date: challanDate.trim() || null,
      revision_no: revisionNo.trim() || null,
      revision_date: revisionDate.trim() || null,
      grn_date: grnDate.trim() || null,
    };

    const { error: saveErr } = await supabase.from("grn").insert(payload).select("id").single();
    if (saveErr) { setError(saveErr.message); setSaving(false); return; }

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
      prev.map((l, i) => {
        if (i !== index) return l;
        const next = { ...l, ...patch };
        if (next.counted_nos !== undefined) {
          next.accepted_qty = Math.min(next.accepted_qty ?? l.accepted_qty, next.counted_nos);
          next.rejected_qty = next.counted_nos - next.accepted_qty;
        }
        if (next.accepted_qty !== undefined) {
          next.rejected_qty = (next.counted_nos ?? l.counted_nos ?? l.received_qty) - next.accepted_qty;
        }
        return next;
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


  async function updateStatus(grn: GRN, newStatus: "inspected" | "approved" | "rejected" | "partial") {
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

    const { error: updateErr } = await supabase
      .from("grn")
      .update({ status: newStatus, line_items: nextLines })
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

    await load();
  }

  const canCreate = role && can(role, "create_grn");
  const canInspect = role && can(role, "inspect_grn");
  const canApprove = role && can(role, "approve_grn");

  const MIN_ROWS = 10;
  const displayLines = [...grnLines, ...Array(Math.max(0, MIN_ROWS - grnLines.length)).fill(null)];

  const revDate = "01/10/2025";
  const fy = getCurrentFY();

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Goods Receipt Notes (GRN)</h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
            Receive against PO, or record direct receipts. Inspect and update stock.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <Plus size={16} /> New GRN
          </button>
        )}
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
                    {createMode === "against_po" && selectedPO ? `PO: ${selectedPO.po_number}` : "Manual entry — no purchase order"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {createMode && (
                  <button onClick={() => setCreateMode(null)} className="text-sm text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white flex items-center gap-1">
                    <ArrowLeft size={14} /> Back
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

            {createMode === "against_po" && !selectedPO && (
              <div className="p-6">
                <h3 className="text-[#8892a8] dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">Select Pending PO</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pos.filter((po) => !grns.some((g) => g.po_id === po.id)).map((po) => (
                    <div key={po.id} className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-5 hover:border-viton-red dark:hover:border-orange-500 hover:shadow-md transition-all cursor-pointer" onClick={() => selectPO(po)}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-viton-navy dark:text-white font-semibold font-mono text-sm">{po.po_number}</p>
                        <Plus size={14} className="text-viton-red dark:text-orange-500" />
                      </div>
                      <p className="text-[#8892a8] dark:text-gray-500 text-xs">{po.vendors?.name ?? "—"}</p>
                      <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">{po.line_items?.length ?? 0} items</p>
                    </div>
                  ))}
                  {pos.filter((po) => !grns.some((g) => g.po_id === po.id)).length === 0 && (
                    <div className="text-sm text-[#8892a8] dark:text-gray-500 p-4">No pending POs available.</div>
                  )}
                </div>
              </div>
            )}

            {(createMode === "against_po" && selectedPO) || createMode === "without_po" ? (
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
                            <input value={selectedPO?.vendors?.name ?? ""} readOnly style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} />
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
                          ) : (selectedPO?.vendors?.address ?? "—")}
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
                          ) : (selectedPO?.vendors?.gstin ?? "—")}
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
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>PO No.</td>
                        <td colSpan={2} style={{ border:"1px solid #000", padding:"4px 6px", fontFamily:"monospace", color:"#1a1a6e", fontWeight:"700" }}>{selectedPO?.po_number ?? "Direct Receipt"}</td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }} />
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt" }} />
                      </tr>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>PO Date</td>
                        <td colSpan={2} style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt" }}>
                          {selectedPO ? new Date(selectedPO.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"2-digit", year:"numeric" }) : "—"}
                        </td>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }} />
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontSize:"8pt" }} />
                      </tr>
                      <tr>
                        <td style={{ border:"1px solid #000", padding:"4px 6px", fontWeight:"700", fontSize:"8pt", background:"#ebebeb" }}>Inspected By</td>
                        <td colSpan={2} style={{ border:"1px solid #000", padding:"4px 6px" }}>
                          <input value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} style={{ width:"100%", fontSize:"8pt", border:"none", background:"transparent", outline:"none" }} placeholder="Name" />
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
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px", textAlign:"center", fontSize:"7.5pt", fontFamily:"monospace", color:"#1a1a6e" }}>
                            {line ? (selectedPO?.po_number ?? "—") : ""}
                          </td>
                          <td style={{ border:"1px solid #ccc", padding:"4px 5px", textAlign:"center", fontSize:"7.5pt" }}>
                            {line ? (selectedPO ? new Date(selectedPO.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"2-digit", year:"numeric" }) : "—") : ""}
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

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8892a8]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search GRN, vendor, receiver..." className="bg-[#f1f3f8] dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl text-sm px-9 py-2 w-full focus:outline-none focus:border-viton-red dark:focus:border-orange-500" />
        </div>
      </div>

      {/* GRN list */}
      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr,140px,140px,120px,44px] px-5 py-3 border-b border-[#dde1ea] dark:border-gray-800 text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-widest">
          <div>GRN / Vendor</div>
          <div>Items</div>
          <div>Status</div>
          <div className="text-right">Date</div>
          <div />
        </div>

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
          filteredGRN.map((g) => {
            const lines = (g.line_items ?? []) as GRNLineItem[];
            const isOpen = expanded === g.id;
            return (
              <div key={g.id} className="border-b border-[#dde1ea] dark:border-gray-800 last:border-0">
                <div className="grid grid-cols-[1fr,140px,140px,120px,44px] px-5 py-4 items-center gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-viton-navy dark:text-white font-mono text-sm">{g.grn_number}</p>
                      {g.po_id && (
                        <span className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-500/20">Linked PO</span>
                      )}
                    </div>
                    <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">{g.vendor_name ?? "—"}</p>
                    <p className="text-[#8892a8] dark:text-gray-500 text-[10px] mt-0.5">Received by {g.received_by_name ?? "—"}</p>
                  </div>
                  <div className="text-sm text-[#4a5578] dark:text-gray-400">{lines.length} items</div>
                  <div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${statusColors[g.status] ?? "bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400"}`}>
                      {g.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right text-[#8892a8] dark:text-gray-500 text-xs">
                    {new Date(g.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <PDFDownloadLink
                      document={<GRNPdfDocument grn={g} po={pos.find(p => p.id === g.po_id) ? { po_number: (pos.find(p => p.id === g.po_id) as POWithVendor).po_number, created_at: (pos.find(p => p.id === g.po_id) as POWithVendor).created_at } : null} vendor={vendors.find(v => v.id === g.vendor_id) ?? null} />}
                      fileName={`${g.grn_number.replace(/\//g, "-")}.pdf`}
                      className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white"
                      title="Download PDF"
                    >
                      <Download size={14} />
                    </PDFDownloadLink>
                    <button onClick={() => setExpanded(isOpen ? null : g.id)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-5 pb-4">
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
                              <td className="px-4 py-2 text-viton-navy dark:text-white font-medium">{l.name}</td>
                              <td className="px-3 py-2 text-center text-[#8892a8] dark:text-gray-500">{l.po_qty ?? 0}</td>
                              <td className="px-3 py-2 text-center font-semibold">{l.received_qty}</td>
                              <td className="px-3 py-2 text-center text-green-700 dark:text-green-400 font-semibold">{l.accepted_qty}</td>
                              <td className="px-3 py-2 text-center text-viton-red font-semibold">{l.rejected_qty}</td>
                              <td className="px-3 py-2 text-[#8892a8] dark:text-gray-500 text-xs">{l.rejection_reason || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      {g.status === "pending" && canInspect && (
                        <>
                          <button onClick={() => updateStatus(g, "inspected")} className="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-md border border-blue-100 dark:border-blue-500/20">Mark Inspected</button>
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
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SaveIcon() {
  return <Package size={14} />;
}
