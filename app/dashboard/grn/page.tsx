"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { can, useRole } from "@/lib/roles";
import { getCurrentFY } from "@/lib/fy";
import type { PurchaseOrder, Vendor, GRN, GRNLineItem, LineItem } from "@/lib/types";
import {
  Package,
  Search,
  X,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  AlertCircle,
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
  const [grns, setGrns] = useState<GRN[]>([]);
  const [filteredGRN, setFilteredGRN] = useState<GRN[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create GRN modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<POWithVendor | null>(null);
  const [grnNumber, setGrnNumber] = useState("");
  const [grnLines, setGrnLines] = useState<GRNLineItem[]>([]);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const supabase = createClient();

    const [poRes, grnRes] = await Promise.all([
      supabase.from("purchase_orders").select("*, vendors(*)").eq("status", "confirmed").order("created_at", { ascending: false }),
      supabase.from("grn").select("*").order("created_at", { ascending: false }).limit(500),
    ]);

    setPos((poRes.data ?? []) as unknown as POWithVendor[]);
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
          (g.received_by_name ?? "").toLowerCase().includes(q)
      );
    }
    setFilteredGRN(out);
  }, [search, grns]);

  function openCreate(po: POWithVendor) {
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
    setInspectionNotes("");
    setError("");

    const fy = po.fy_label ?? "FY";
    const nextSerial = 1; // We will compute properly on save
    setGrnNumber(`GRN/${nextSerial}/${fy}`);
    setCreateOpen(true);
  }

  async function handleSaveGRN() {
    if (!selectedPO) return;
    setSaving(true); setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    // Determine next serial for FY
    const fy = selectedPO.fy_label ?? getCurrentFY();
    const { data: last } = await supabase
      .from("grn")
      .select("fy_serial")
      .eq("fy_label", fy)
      .order("fy_serial", { ascending: false })
      .limit(1);
    const nextSerial = (last?.[0]?.fy_serial ?? 0) + 1;
    const finalGrnNumber = `GRN/${String(nextSerial).padStart(3, "0")}/${fy}`;

    const payload = {
      grn_number: finalGrnNumber,
      fy_label: fy,
      fy_serial: nextSerial,
      po_id: selectedPO.id,
      vendor_id: selectedPO.vendor_id,
      received_by: user?.id ?? null,
      received_by_name: profile?.data?.full_name ?? user?.email ?? "Unknown",
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
          balance: line.accepted_qty, // Will be adjusted by trigger ideally; for now we store incremental
          unit: line.unit,
          notes: `Received against PO ${selectedPO.po_number}`,
          created_by: user?.id ?? null,
          created_by_name: profile?.data?.full_name ?? user?.email ?? "Unknown",
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
        // Auto-adjust accepted/rejected based on received
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

  const canCreate = role && can(role, "create_grn");

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Goods Receipt Notes (GRN)</h1>
        <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
          Receive against PO, inspect, and update stock.
        </p>
      </div>

      {/* Create Modal */}
      {createOpen && selectedPO && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-4xl my-8 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#dde1ea] dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-viton-navy dark:text-white font-bold">Create GRN</h2>
                <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">PO: {selectedPO.po_number}</p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 text-red-600 dark:text-red-300 text-sm">{error}</div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">GRN Number (Auto)</label>
                  <div className="bg-[#eceef4] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-[#4a5578] dark:text-gray-400 font-mono">{grnNumber}</div>
                </div>
                <div>
                  <label className="block text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Vendor</label>
                  <div className="bg-[#eceef4] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-[#4a5578] dark:text-gray-400">{selectedPO.vendors?.name ?? "—"}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#dde1ea] dark:border-gray-800">
                      <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">Item</th>
                      <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">PO Qty</th>
                      <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">Received</th>
                      <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">Accepted</th>
                      <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">Rejected</th>
                      <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grnLines.map((line, i) => (
                      <tr key={i} className="border-b border-[#eef1f6] dark:border-gray-800/40">
                        <td className="px-3 py-2 min-w-[200px]">
                          <p className="text-viton-navy dark:text-white font-medium">{line.name}</p>
                          <p className="text-viton-red dark:text-orange-400 font-mono text-xs">{line.serial_id}</p>
                        </td>
                        <td className="px-3 py-2 text-right text-[#4a5578] dark:text-gray-400">{line.po_qty}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={line.po_qty}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
            </div>

            <div className="px-6 py-4 border-t border-[#dde1ea] dark:border-gray-800 flex items-center justify-end gap-3">
              <button onClick={() => setCreateOpen(false)} className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm">
                Cancel
              </button>
              <button
                onClick={handleSaveGRN}
                disabled={saving}
                className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2"
              >
                <CheckCircle size={15} /> {saving ? "Saving..." : "Create GRN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending POs to receive */}
      {canCreate && (
        <div className="mb-8">
          <h2 className="text-[#8892a8] dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
            Pending POs (Awaiting Receipt)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pos
              .filter((po) => !grns.some((g) => g.po_id === po.id))
              .slice(0, 6)
              .map((po) => (
                <div
                  key={po.id}
                  className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-5 hover:border-viton-red dark:hover:border-orange-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => openCreate(po)}
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
              <p className="text-[#8892a8] dark:text-gray-600 text-sm">No pending POs to receive.</p>
            )}
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
          placeholder="Search GRN number or receiver..."
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
                        PO: {g.po_id ? "Linked" : "—"} · Received by {g.received_by_name ?? "—"} · {date}
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
                            <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">PO Qty</th>
                            <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Accepted</th>
                            <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Rejected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line, i) => (
                            <tr key={i} className="border-b border-[#eef1f6] dark:border-gray-800/40 last:border-0">
                              <td className="px-5 py-2.5 text-[#8892a8] dark:text-gray-500 text-xs">{i + 1}</td>
                              <td className="px-5 py-2.5 text-viton-red dark:text-orange-400 font-mono text-xs font-semibold">{line.serial_id}</td>
                              <td className="px-5 py-2.5 text-viton-navy dark:text-white">{line.name}</td>
                              <td className="px-5 py-2.5 text-right text-[#4a5578] dark:text-gray-400">{line.po_qty}</td>
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


