"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { can, useRole } from "@/lib/roles";
import { getCurrentFY } from "@/lib/fy";
import type { PurchaseOrder, Vendor, GRN, GRNLineItem, LineItem, Item } from "@/lib/types";
import {
  Package,
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
  Printer,
  Eye,
  Pencil,
} from "lucide-react";

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
  const { role, loading: roleLoading } = useRole();
  const [pos, setPos] = useState<POWithVendor[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [filteredGRN, setFilteredGRN] = useState<GRN[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create GRN modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"against_po" | "without_po" | null>(null);
  const [selectedPO, setSelectedPO] = useState<POWithVendor | null>(null);
  const [manualVendorId, setManualVendorId] = useState("");
  const [manualVendorName, setManualVendorName] = useState("");
  const [grnNumber, setGrnNumber] = useState("");
  const [grnLines, setGrnLines] = useState<GRNLineItem[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Manual item search state
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
      out = out.filter(
        (g) =>
          g.grn_number.toLowerCase().includes(q) ||
          (g.received_by_name ?? "").toLowerCase().includes(q) ||
          (g.vendor_name ?? "").toLowerCase().includes(q)
      );
    }
    setFilteredGRN(out);
  }, [search, grns]);

  // Item search for manual mode
  useEffect(() => {
    if (!itemSearch.trim()) { setItemResults([]); setShowItemSearch(false); return; }
    const q = itemSearch.toLowerCase();
    const supabase = createClient();
    supabase.from("items").select("*").or(`serial_id.ilike.%${q}%,name.ilike.%${q}%`).limit(8).then(({ data }) => {
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
    setGrnLines([]);
    setInspectionNotes("");
    setError("");
    setItemSearch("");
    setItemResults([]);
    setShowItemSearch(false);

    const fy = getCurrentFY();
    const nextSerial = 1;
    setGrnNumber(`GRN/${nextSerial}/${fy}`);
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
    }));
    setGrnLines(lines);
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
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };
    const name = (profile as any)?.full_name ?? user?.email ?? "Unknown";

    const fy = getCurrentFY();
    const { data: last } = await supabase
      .from("grn")
      .select("fy_serial")
      .eq("fy_label", fy)
      .order("fy_serial", { ascending: false })
      .limit(1);
    const nextSerial = (Number((last as any)?.[0]?.fy_serial) || 0) + 1;
    const finalGrnNumber = `GRN/${String(nextSerial).padStart(3, "0")}/${fy}`;

    const selectedVendor = vendors.find((v) => v.id === manualVendorId);

    const payload = {
      grn_number: finalGrnNumber,
      fy_label: fy,
      fy_serial: nextSerial,
      po_id: selectedPO?.id ?? null,
      vendor_id: selectedPO?.vendor_id ?? selectedVendor?.id ?? null,
      vendor_name: selectedPO?.vendors?.name ?? selectedVendor?.name ?? (manualVendorName.trim() || null),
      received_by: user?.id ?? null,
      received_by_name: (profile as any)?.full_name ?? user?.email ?? "Unknown",
      line_items: grnLines,
      status: "pending" as const,
      inspection_notes: inspectionNotes.trim() || null,
    };

    const { error: saveErr, data } = await supabase.from("grn").insert(payload).select("id").single();
    if (saveErr) { setError(saveErr.message); setSaving(false); return; }

    // Update stock ledger for accepted quantities
    for (const line of grnLines) {
      if (line.accepted_qty > 0) {
        await supabase.from("stock_ledger").insert({
          item_id: line.item_id,
          transaction_type: "grn_in",
          reference_type: "grn",
          reference_id: (data as any)?.id ?? null,
          reference_code: finalGrnNumber,
          qty_in: line.accepted_qty,
          qty_out: 0,
          balance: line.accepted_qty,
          unit: line.unit,
          notes: selectedPO ? `Received against PO ${selectedPO.po_number}` : `Direct receipt - ${payload.vendor_name}`,
          created_by: user?.id ?? null,
          created_by_name: (profile as any)?.full_name ?? user?.email ?? "Unknown",
        });
      }
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
        if (next.received_qty !== undefined) {
          next.accepted_qty = Math.min(next.accepted_qty ?? l.accepted_qty, next.received_qty);
          next.rejected_qty = next.received_qty - next.accepted_qty;
        }
        if (next.accepted_qty !== undefined) {
          next.rejected_qty = (next.received_qty ?? l.received_qty) - next.accepted_qty;
        }
        return next;
      })
    );
  }

  async function updateStatus(id: string, newStatus: string) {
    const supabase = createClient();
    await supabase.from("grn").update({ status: newStatus }).eq("id", id);
    await load();
  }

  function openPrint(id: string) {
    window.open(`/dashboard/grn/print/${encodeURIComponent(id)}`, "_blank", "noopener,noreferrer");
  }

  const canCreate = role && can(role, "create_grn");

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
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#dde1ea] dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-viton-navy dark:text-white font-bold">
                  {createMode === "against_po" ? "Receive Against PO" : createMode === "without_po" ? "Direct Receipt (No PO)" : "Create GRN"}
                </h2>
                {createMode && (
                  <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">
                    {createMode === "against_po" && selectedPO ? `PO: ${selectedPO.po_number}` : "Manual entry — material received without purchase order"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {createMode && (
                  <button
                    onClick={() => setCreateMode(null)}
                    className="text-sm text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white flex items-center gap-1"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                )}
                <button onClick={() => setCreateOpen(false)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Mode Selection */}
            {!createMode && (
              <div className="p-6 grid sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setCreateMode("against_po")}
                  className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-6 hover:border-viton-red dark:hover:border-orange-500 hover:shadow-md transition-all text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center mb-4">
                    <FileText size={22} />
                  </div>
                  <p className="text-viton-navy dark:text-white font-semibold text-sm">Receive Against PO</p>
                  <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">
                    Select a pending purchase order and record what actually arrived.
                  </p>
                </button>

                <button
                  onClick={() => setCreateMode("without_po")}
                  className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-6 hover:border-viton-red dark:hover:border-orange-500 hover:shadow-md transition-all text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 flex items-center justify-center mb-4">
                    <Truck size={22} />
                  </div>
                  <p className="text-viton-navy dark:text-white font-semibold text-sm">Direct Receipt (No PO)</p>
                  <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">
                    Emergency buy, local market, replacement, or return — no PO needed.
                  </p>
                </button>
              </div>
            )}

            {/* Against PO: Select PO */}
            {createMode === "against_po" && !selectedPO && (
              <div className="p-6">
                <h3 className="text-[#8892a8] dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
                  Select Pending PO
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pos
                    .filter((po) => !grns.some((g) => g.po_id === po.id))
                    .map((po) => (
                      <div
                        key={po.id}
                        className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-5 hover:border-viton-red dark:hover:border-orange-500 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => selectPO(po)}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-viton-navy dark:text-white font-semibold font-mono text-sm">{po.po_number}</p>
                          <Plus size={14} className="text-viton-red dark:text-orange-400" />
                        </div>
                        <p className="text-[#8892a8] dark:text-gray-500 text-xs">{po.vendors?.name ?? "Unknown Vendor"}</p>
                        <p className="text-[#4a5578] dark:text-gray-400 text-xs mt-1">
                          {po.line_items?.length ?? 0} items · Rs. {po.total?.toLocaleString("en-IN") ?? 0}
                        </p>
                      </div>
                    ))}
                  {pos.filter((po) => !grns.some((g) => g.po_id === po.id)).length === 0 && (
                    <p className="text-[#8892a8] dark:text-gray-600 text-sm col-span-full">No pending POs to receive. You can still use "Direct Receipt" mode.</p>
                  )}
                </div>
              </div>
            )}

            {/* GRN Form */}
            {(createMode === "against_po" && selectedPO) || createMode === "without_po" ? (
              <div className="p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 text-red-600 dark:text-red-300 text-sm">{error}</div>
                )}

                {/* Meta */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">GRN Number (Auto)</label>
                    <div className="bg-[#eceef4] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-[#4a5578] dark:text-gray-400 font-mono">{grnNumber}</div>
                  </div>
                  {createMode === "against_po" && selectedPO ? (
                    <div>
                      <label className="block text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Vendor</label>
                      <div className="bg-[#eceef4] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-[#4a5578] dark:text-gray-400">{selectedPO.vendors?.name ?? "—"}</div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Vendor</label>
                      <div className="space-y-2">
                        <div className="relative">
                          <select
                            value={manualVendorId}
                            onChange={(e) => {
                              setManualVendorId(e.target.value);
                              const v = vendors.find((v) => v.id === e.target.value);
                              setManualVendorName(v?.name ?? "");
                            }}
                            className="w-full appearance-none bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-sm text-viton-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 cursor-pointer"
                          >
                            <option value="">— select vendor (optional) —</option>
                            {vendors.map((v) => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 pointer-events-none" />
                        </div>
                        <input
                          value={manualVendorName}
                          onChange={(e) => setManualVendorName(e.target.value)}
                          placeholder="Or type vendor name if not in list"
                          className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Item Search for Manual Mode */}
                {createMode === "without_po" && (
                  <div className="bg-[#f7f8fb] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-viton-navy dark:text-white font-semibold text-sm">Add Items</h3>
                      <button
                        onClick={addFreeformItem}
                        className="text-xs text-viton-red dark:text-orange-400 font-semibold hover:underline"
                      >
                        + Add freeform item
                      </button>
                    </div>
                    <div className="relative" ref={itemSearchRef}>
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
                      <input
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder="Search catalog by serial ID or name..."
                        className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                      />
                      {showItemSearch && itemResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden shadow-2xl z-50">
                          {itemResults.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => addManualItem(item)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f1f3f8] dark:hover:bg-gray-900 transition-colors text-left border-b border-[#dde1ea] dark:border-gray-800 last:border-0"
                            >
                              <div>
                                <p className="text-viton-red dark:text-orange-400 font-mono text-xs font-semibold">{item.serial_id}</p>
                                <p className="text-viton-navy dark:text-white text-sm mt-0.5">{item.name}</p>
                              </div>
                              <span className="text-[#8892a8] dark:text-gray-500 text-xs bg-[#f1f3f8] dark:bg-gray-800 px-2 py-0.5 rounded-lg">{item.unit}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lines Table */}
                {grnLines.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#dde1ea] dark:border-gray-800">
                          <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">Item</th>
                          <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">{createMode === "against_po" ? "PO Qty" : "Unit"}</th>
                          <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">Received</th>
                          <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">Accepted</th>
                          <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">Rejected</th>
                          <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">Reason</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {grnLines.map((line, i) => (
                          <tr key={i} className="border-b border-[#eef1f6] dark:border-gray-800/40">
                            <td className="px-3 py-2 min-w-[180px]">
                              {createMode === "without_po" && !line.serial_id ? (
                                <input
                                  value={line.name}
                                  onChange={(e) => updateGRNLine(i, { name: e.target.value })}
                                  placeholder="Item name"
                                  className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-2 py-1 text-sm text-viton-navy dark:text-white focus:outline-none focus:ring-1 focus:ring-viton-red dark:focus:ring-orange-500"
                                />
                              ) : (
                                <>
                                  <p className="text-viton-navy dark:text-white font-medium">{line.name}</p>
                                  <p className="text-viton-red dark:text-orange-400 font-mono text-xs">{line.serial_id}</p>
                                </>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-[#4a5578] dark:text-gray-400">
                              {createMode === "against_po" ? line.po_qty : (
                                <input
                                  value={line.unit}
                                  onChange={(e) => updateGRNLine(i, { unit: e.target.value })}
                                  className="w-16 bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-2 py-1 text-sm text-right text-viton-navy dark:text-white focus:outline-none focus:ring-1 focus:ring-viton-red dark:focus:ring-orange-500"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                max={createMode === "against_po" ? line.po_qty : undefined}
                                value={line.received_qty}
                                onChange={(e) => updateGRNLine(i, { received_qty: Number(e.target.value) })}
                                className="w-20 bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-2 py-1 text-sm text-right text-viton-navy dark:text-white focus:outline-none focus:ring-1 focus:ring-viton-red dark:focus:ring-orange-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                max={line.received_qty}
                                value={line.accepted_qty}
                                onChange={(e) => updateGRNLine(i, { accepted_qty: Number(e.target.value) })}
                                className="w-20 bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-2 py-1 text-sm text-right text-viton-navy dark:text-white focus:outline-none focus:ring-1 focus:ring-viton-red dark:focus:ring-orange-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-red-500 font-medium">{line.rejected_qty}</td>
                            <td className="px-3 py-2">
                              <input
                                value={line.rejection_reason ?? ""}
                                onChange={(e) => updateGRNLine(i, { rejection_reason: e.target.value })}
                                placeholder="If rejected..."
                                className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-2 py-1 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-viton-red dark:focus:ring-orange-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div>
                  <label className="block text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Inspection Notes</label>
                  <textarea
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="General inspection remarks..."
                    rows={3}
                    className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setCreateOpen(false)} className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveGRN}
                    disabled={saving || grnLines.length === 0}
                    className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2"
                  >
                    <CheckCircle size={15} /> {saving ? "Saving..." : "Create GRN"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* GRN History */}
      <h2 className="text-[#8892a8] dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
        GRN History
      </h2>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search GRN number, receiver, or vendor..."
          className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {loading || roleLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredGRN.length === 0 ? (
        <div className="text-center py-16 text-[#8892a8] dark:text-gray-600">
          {search ? "No GRNs match your search." : "No GRNs yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGRN.map((g) => {
            const isOpen = expanded === g.id;
            const lines = (g.line_items ?? []) as GRNLineItem[];
            const date = new Date(g.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const hasRejections = lines.some((l) => l.rejected_qty > 0);

            return (
              <div
                key={g.id}
                className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden hover:border-[#cfd5e2] dark:hover:border-gray-700 transition-all"
              >
                <div
                  className="px-5 py-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : g.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-viton-red/10 dark:bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package size={16} className="text-viton-red dark:text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-viton-navy dark:text-white font-semibold font-mono text-sm">{g.grn_number}</p>
                      <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">
                        {g.po_id ? "Linked to PO" : "Direct receipt"} · {g.vendor_name ?? "—"} · {g.received_by_name ?? "—"} · {date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    {hasRejections && (
                      <AlertCircle size={16} className="text-red-500" />
                    )}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${statusColors[g.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {g.status}
                    </span>
                    {isOpen ? <ChevronUp size={16} className="text-[#8892a8] dark:text-gray-500" /> : <ChevronDown size={16} className="text-[#8892a8] dark:text-gray-500" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-[#dde1ea] dark:border-gray-800">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#dde1ea] dark:border-gray-800 bg-[#f7f8fb] dark:bg-gray-800/40">
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">#</th>
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Serial ID</th>
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Item</th>
                            <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">{g.po_id ? "PO Qty" : "Unit"}</th>
                            <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Accepted</th>
                            <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Rejected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line, i) => (
                            <tr key={i} className="border-b border-[#eef1f6] dark:border-gray-800/40 last:border-0">
                              <td className="px-5 py-2.5 text-[#8892a8] dark:text-gray-500 text-xs">{i + 1}</td>
                              <td className="px-5 py-2.5 text-viton-red dark:text-orange-400 font-mono text-xs font-semibold">{line.serial_id || "—"}</td>
                              <td className="px-5 py-2.5 text-viton-navy dark:text-white">{line.name}</td>
                              <td className="px-5 py-2.5 text-right text-[#4a5578] dark:text-gray-400">{g.po_id ? line.po_qty : line.unit}</td>
                              <td className="px-5 py-2.5 text-right text-green-600 dark:text-green-400 font-medium">{line.accepted_qty}</td>
                              <td className="px-5 py-2.5 text-right text-red-500 font-medium">{line.rejected_qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {g.inspection_notes && (
                      <div className="px-5 py-3 border-t border-[#dde1ea] dark:border-gray-800 text-sm text-[#4a5578] dark:text-gray-400">
                        <span className="font-semibold text-[#8892a8] dark:text-gray-500">Inspection Notes:</span> {g.inspection_notes}
                      </div>
                    )}

                    {/* Status Actions */}
                    <div className="px-5 py-4 border-t border-[#dde1ea] dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider">Change Status:</span>
                        {g.status !== "pending" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatus(g.id, "pending"); }}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/30 hover:bg-yellow-500 hover:text-white transition-all"
                          >
                            Pending
                          </button>
                        )}
                        {g.status !== "inspected" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatus(g.id, "inspected"); }}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all"
                          >
                            Inspected
                          </button>
                        )}
                        {g.status !== "approved" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatus(g.id, "approved"); }}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/30 hover:bg-green-500 hover:text-white transition-all"
                          >
                            Approved
                          </button>
                        )}
                        {g.status !== "rejected" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatus(g.id, "rejected"); }}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-500 hover:text-white transition-all"
                          >
                            Rejected
                          </button>
                        )}
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); openPrint(g.id); }}
                        className="flex items-center gap-2 bg-[#f1f3f8] hover:bg-viton-red dark:bg-gray-800 dark:hover:bg-orange-500 text-[#4a5578] dark:text-gray-300 hover:text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                      >
                        <Printer size={14} /> Print GRN
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
