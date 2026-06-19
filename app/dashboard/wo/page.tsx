"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { WorkOrder, WorkOrderItem } from "@/lib/types";
import { useRole, can } from "@/lib/roles";
import {
  Plus, Search, Printer, ArrowLeft, Eye, Download, Trash2, X, AlertTriangle,
} from "lucide-react";

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportToCSV(wo: WorkOrder & { items?: WorkOrderItem[] }) {
  const headers = [
    "Sr. No.", "P.O. SR. NO.", "Valve SR.NO.", "Material No.", "Valve", "Type",
    "Bore", "Size MM", "Rating", "End Conn.", "Body / Bonnet",
    "Wedge / Disc / Plug / Ball", "Stem / Hinge", "Seat", "Gasket",
    "GL. PKNG.", "Fasteners", "Operation", "Special Req.", "Remarks",
    "Drawing No.", "Qty", "Delivery",
  ];
  const keys: (keyof WorkOrderItem)[] = [
    "sr_no", "po_sr_no", "valve_sr_no", "material_no", "valve", "type",
    "bore", "size_mm", "rating", "end_connection", "body_bonnet",
    "wedge_disc_plug_ball", "stem_hinge", "seat", "gasket",
    "gl_pkng", "fasteners", "operation", "special_requirements", "remarks",
    "drawing_no", "qty", "delivery",
  ];

  const metaRows = [
    ["Work Order No.", wo.wo_number],
    ["Party Name", wo.party_name ?? ""],
    ["P.O. No.", wo.po_no ?? ""],
    ["PO Date", wo.po_date ?? ""],
    ["Delivery Date", wo.delivery_date ?? ""],
    ["Inspection By", wo.inspection_by ?? ""],
    ["QAP No.", wo.qap_no ?? ""],
    [],
    headers,
  ];

  const itemRows = (wo.items ?? []).map((item) =>
    keys.map((k) => {
      const val = item[k];
      const str = val == null ? "" : String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    })
  );

  const csv = [...metaRows, ...itemRows]
    .map((row) => row.join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `WO-${wo.wo_number.replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({
  wo,
  onClose,
}: {
  wo: WorkOrder & { items?: WorkOrderItem[] };
  onClose: () => void;
}) {
  const items = wo.items ?? [];

  const COLS = [
    { key: "sr_no", label: "Sr." },
    { key: "po_sr_no", label: "PO SR" },
    { key: "valve_sr_no", label: "Valve SR" },
    { key: "material_no", label: "Mat No." },
    { key: "valve", label: "Valve" },
    { key: "type", label: "Type" },
    { key: "bore", label: "Bore" },
    { key: "size_mm", label: "Size MM" },
    { key: "rating", label: "Rating" },
    { key: "end_connection", label: "End Conn." },
    { key: "body_bonnet", label: "Body/Bonnet" },
    { key: "wedge_disc_plug_ball", label: "Wedge/Disc" },
    { key: "stem_hinge", label: "Stem/Hinge" },
    { key: "seat", label: "Seat" },
    { key: "gasket", label: "Gasket" },
    { key: "gl_pkng", label: "GL PKNG" },
    { key: "fasteners", label: "Fasteners" },
    { key: "operation", label: "Operation" },
    { key: "special_requirements", label: "Special Req." },
    { key: "remarks", label: "Remarks" },
    { key: "drawing_no", label: "Drg No." },
    { key: "qty", label: "Qty" },
    { key: "delivery", label: "Delivery" },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dde1ea] dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-viton-navy dark:text-white font-bold text-base">
              Preview — {wo.wo_number}
            </h2>
            <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">
              {wo.party_name} · {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV(wo)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#4a5578] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-1.5 hover:bg-[#f6f8fc] dark:hover:bg-gray-800 transition-all"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#f6f8fc] dark:hover:bg-gray-800 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="px-5 py-3 bg-[#f6f8fc] dark:bg-gray-800/50 border-b border-[#dde1ea] dark:border-gray-700 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-1.5 text-xs">
            {[
              ["Party Name", wo.party_name],
              ["P.O. No.", wo.po_no],
              ["PO Date", wo.po_date],
              ["Delivery", wo.delivery_date],
              ["Inspection By", wo.inspection_by],
              ["QAP No.", wo.qap_no],
            ].map(([label, val]) => (
              <div key={label as string}>
                <span className="text-[#8892a8] dark:text-gray-500 uppercase tracking-wider font-semibold block" style={{ fontSize: "10px" }}>
                  {label}
                </span>
                <span className="text-viton-navy dark:text-white font-medium">{val || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 p-4">
          {items.length === 0 ? (
            <div className="py-10 text-center text-[#8892a8] dark:text-gray-500 text-sm">
              No items in this work order.
            </div>
          ) : (
            <table className="w-full text-xs border-collapse" style={{ minWidth: "1400px" }}>
              <thead>
                <tr className="bg-viton-navy dark:bg-gray-800">
                  {COLS.map((c) => (
                    <th
                      key={c.key}
                      className="px-2 py-2 text-white font-semibold text-left whitespace-nowrap border-r border-white/10 last:border-r-0"
                      style={{ fontSize: "10px" }}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={i}
                    className={`border-b border-[#dde1ea] dark:border-gray-700 ${
                      i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-[#f9fafc] dark:bg-gray-800/40"
                    }`}
                  >
                    {COLS.map((c) => (
                      <td
                        key={c.key}
                        className="px-2 py-1.5 text-[#4a5578] dark:text-gray-300 border-r border-[#dde1ea] dark:border-gray-700 last:border-r-0 align-top"
                        style={{ fontSize: "10px" }}
                      >
                        {String(item[c.key as keyof WorkOrderItem] || "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-[#dde1ea] dark:border-gray-700 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="text-sm text-[#8892a8] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white px-4 py-2 rounded-xl border border-[#dde1ea] dark:border-gray-700 hover:bg-[#f6f8fc] dark:hover:bg-gray-800 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({
  wo,
  onCancel,
  onConfirm,
  deleting,
}: {
  wo: WorkOrder;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-viton-navy dark:text-white font-bold text-sm">Delete Work Order?</h3>
            <p className="text-[#8892a8] dark:text-gray-400 text-xs mt-1">
              <strong className="text-viton-navy dark:text-white">{wo.wo_number}</strong> and all its
              items will be permanently deleted. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="text-sm text-[#8892a8] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white px-4 py-2 rounded-xl border border-[#dde1ea] dark:border-gray-700 hover:bg-[#f6f8fc] dark:hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-all disabled:opacity-60"
          >
            {deleting ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WOListPage() {
  const router = useRouter();
  const { role } = useRole();
  const canCreate = can(role, "create_work_order");
  // Only admins can delete (mirrors delete_po / delete_grn pattern)
  const canDelete = role === "admin";

  const [orders, setOrders] = useState<(WorkOrder & { items?: WorkOrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Preview state
  const [previewWO, setPreviewWO] = useState<(WorkOrder & { items?: WorkOrderItem[] }) | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Delete state
  const [deleteWO, setDeleteWO] = useState<WorkOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("work_orders")
      .select("*, items:work_order_items(*)")
      .order("created_at", { ascending: false });
    if (!error) {
      setOrders((data ?? []) as unknown as (WorkOrder & { items?: WorkOrderItem[] })[]);
    }
    setLoading(false);
  }

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.wo_number.toLowerCase().includes(q) ||
      (o.party_name || "").toLowerCase().includes(q) ||
      (o.po_no || "").toLowerCase().includes(q)
    );
  });

  // Open preview — items already loaded with main query
  async function openPreview(wo: WorkOrder & { items?: WorkOrderItem[] }) {
    setPreviewLoading(true);
    setPreviewWO(wo);
    setPreviewLoading(false);
  }

  // Delete handler
  async function handleDelete() {
    if (!deleteWO) return;
    setDeleting(true);
    const supabase = createClient();
    // Delete items first (if no cascade), then WO
    await supabase.from("work_order_items").delete().eq("work_order_id", deleteWO.id);
    const { error } = await supabase.from("work_orders").delete().eq("id", deleteWO.id);
    setDeleting(false);
    setDeleteWO(null);
    if (!error) {
      setOrders((prev) => prev.filter((o) => o.id !== deleteWO.id));
    } else {
      alert("Failed to delete work order. Please try again.");
    }
  }

  return (
    <>
      {/* Preview Modal */}
      {previewWO && !previewLoading && (
        <PreviewModal wo={previewWO} onClose={() => setPreviewWO(null)} />
      )}

      {/* Delete Modal */}
      {deleteWO && (
        <DeleteModal
          wo={deleteWO}
          onCancel={() => setDeleteWO(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1 text-sm text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>
            <h1 className="text-viton-navy dark:text-white text-2xl font-bold tracking-tight">
              Work Orders
            </h1>
            <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
              {orders.length} work order{orders.length !== 1 ? "s" : ""} on record.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => router.push("/dashboard/wo/new")}
              className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              <Plus size={15} /> New Work Order
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8892a8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by WO number, party name, or PO number..."
              className="w-full bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red/20 dark:focus:ring-orange-500/20 focus:border-viton-red dark:focus:border-orange-500 transition-all"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-[#8892a8] dark:text-gray-500 text-sm">
              Loading work orders...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-[#8892a8] dark:text-gray-500 text-sm">
              {search ? "No work orders match your search." : "No work orders yet. Create your first one."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f6f8fc] dark:bg-gray-800 border-b border-[#dde1ea] dark:border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">WO Number</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">Party Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">P.O. No.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">Delivery</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">Items</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((wo) => (
                    <tr
                      key={wo.id}
                      className="border-b border-[#dde1ea] dark:border-gray-700 last:border-b-0 hover:bg-[#f9fafc] dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-viton-navy dark:text-white font-semibold">{wo.wo_number}</td>
                      <td className="px-4 py-3 text-viton-navy dark:text-white">{wo.party_name}</td>
                      <td className="px-4 py-3 text-[#4a5578] dark:text-gray-400">{wo.po_no || "—"}</td>
                      <td className="px-4 py-3 text-[#4a5578] dark:text-gray-400">{wo.delivery_date || "—"}</td>
                      <td className="px-4 py-3 text-[#4a5578] dark:text-gray-400">{wo.items?.length ?? 0}</td>
                      <td className="px-4 py-3 text-[#8892a8] dark:text-gray-500 text-xs">
                        {new Date(wo.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Preview */}
                          <button
                            onClick={() => openPreview(wo)}
                            className="p-1.5 rounded-lg hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#8892a8] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white transition-all"
                            title="Preview"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Export CSV */}
                          <button
                            onClick={() => exportToCSV(wo)}
                            className="p-1.5 rounded-lg hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#8892a8] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white transition-all"
                            title="Export to CSV"
                          >
                            <Download size={14} />
                          </button>

                          {/* Print */}
                          <button
                            onClick={() => router.push(`/dashboard/wo/print/${wo.id}`)}
                            className="p-1.5 rounded-lg hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#8892a8] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white transition-all"
                            title="Print"
                          >
                            <Printer size={14} />
                          </button>

                          {/* Delete — admin only */}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteWO(wo)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[#8892a8] dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
