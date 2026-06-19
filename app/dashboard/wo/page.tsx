"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { WorkOrder, WorkOrderItem } from "@/lib/types";
import { useRole, can } from "@/lib/roles";
import {
  Plus, Search, FileText, Printer, ArrowLeft,
  ChevronDown, ChevronUp, Download, Trash2, X,
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

  const csv = [...metaRows, ...itemRows].map((row) => row.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `WO-${wo.wo_number.replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Confirm Delete Modal ───────────────────────────────────────────────────────
function DeleteModal({
  wo, onCancel, onConfirm, deleting,
}: {
  wo: WorkOrder; onCancel: () => void; onConfirm: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-viton-navy dark:text-white font-bold text-center text-lg mb-1">Delete Work Order?</h3>
        <p className="text-[#8892a8] dark:text-gray-400 text-sm text-center mb-2">
          <strong className="text-viton-navy dark:text-white">{wo.wo_number}</strong> and all its items will be
          permanently deleted.
        </p>
        <p className="text-[#8892a8] dark:text-gray-500 text-xs text-center mb-6">This cannot be undone.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 bg-[#f1f3f8] hover:bg-[#e7ebf3] dark:bg-gray-800 dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 bg-viton-red hover:bg-viton-red-hover dark:bg-red-500 dark:hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-all"
          >
            {deleting ? "Deleting..." : "Yes, Delete"}
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
  const canDelete = role === "admin";

  const [orders, setOrders] = useState<(WorkOrder & { items?: WorkOrderItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteWO, setDeleteWO] = useState<WorkOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

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

  async function handleDelete() {
    if (!deleteWO) return;
    setDeleting(true);
    const supabase = createClient();
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

  // Table columns shown in the dropdown
  const PREVIEW_COLS = [
    { key: "sr_no", label: "Sr." },
    { key: "valve_sr_no", label: "Valve SR. No." },
    { key: "material_no", label: "Material No." },
    { key: "valve", label: "Valve" },
    { key: "type", label: "Type" },
    { key: "bore", label: "Bore" },
    { key: "size_mm", label: "Size MM" },
    { key: "rating", label: "Rating" },
    { key: "end_connection", label: "End Conn." },
    { key: "body_bonnet", label: "Body/Bonnet" },
    { key: "operation", label: "Operation" },
    { key: "qty", label: "Qty" },
    { key: "delivery", label: "Delivery" },
    { key: "remarks", label: "Remarks" },
  ] as const;

  return (
    <>
      {deleteWO && (
        <DeleteModal
          wo={deleteWO}
          onCancel={() => setDeleteWO(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1 text-sm text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Work Orders</h1>
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
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by WO number, party name, or PO number..."
            className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#8892a8] dark:text-gray-600">
            {search ? "No work orders match your search." : "No work orders yet. Create your first one."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((wo) => {
              const isOpen = expanded === wo.id;
              const items = wo.items ?? [];
              const date = new Date(wo.created_at).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              });

              return (
                <div
                  key={wo.id}
                  className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden hover:border-[#cfd5e2] dark:hover:border-gray-700 transition-all"
                >
                  {/* Collapsed row — click to expand */}
                  <div
                    className="px-5 py-4 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : wo.id)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-viton-red/10 dark:bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-viton-red dark:text-orange-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-viton-navy dark:text-white font-semibold font-mono text-sm">{wo.wo_number}</p>
                        <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">
                          {wo.party_name ?? "—"} · Created: {date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span className="text-viton-navy dark:text-white font-semibold text-sm hidden sm:block">
                        {items.length} item{items.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                        {wo.po_no ? `PO: ${wo.po_no}` : "No PO"}
                      </span>
                      {isOpen
                        ? <ChevronUp size={16} className="text-[#8892a8] dark:text-gray-500" />
                        : <ChevronDown size={16} className="text-[#8892a8] dark:text-gray-500" />
                      }
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isOpen && (
                    <div className="border-t border-[#dde1ea] dark:border-gray-800">

                      {/* Meta info strip */}
                      <div className="px-5 py-3 bg-[#f7f8fb] dark:bg-gray-800/40 border-b border-[#dde1ea] dark:border-gray-800">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-2 text-xs">
                          {[
                            ["Party", wo.party_name],
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

                      {/* Items table */}
                      <div className="overflow-x-auto">
                        {items.length === 0 ? (
                          <p className="px-5 py-6 text-[#8892a8] dark:text-gray-500 text-sm text-center">No items in this work order.</p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[#dde1ea] dark:border-gray-800 bg-[#f7f8fb] dark:bg-gray-800/40">
                                {PREVIEW_COLS.map((c) => (
                                  <th
                                    key={c.key}
                                    className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-4 py-2.5 whitespace-nowrap"
                                  >
                                    {c.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, i) => (
                                <tr key={i} className="border-b border-[#eef1f6] dark:border-gray-800/40 last:border-0">
                                  {PREVIEW_COLS.map((c) => (
                                    <td
                                      key={c.key}
                                      className={`px-4 py-2.5 text-xs whitespace-nowrap ${
                                        c.key === "material_no" || c.key === "valve_sr_no"
                                          ? "text-viton-red dark:text-orange-400 font-mono font-semibold"
                                          : c.key === "remarks"
                                          ? "text-[#8892a8] dark:text-gray-500 italic max-w-[180px] whitespace-normal"
                                          : "text-[#4a5578] dark:text-gray-400"
                                      }`}
                                    >
                                      {String(item[c.key as keyof WorkOrderItem] || "") || "—"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* Footer actions */}
                      <div className="px-5 py-4 border-t border-[#dde1ea] dark:border-gray-800">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <span className="text-[#8892a8] dark:text-gray-500 text-sm">Total items: </span>
                            <span className="text-viton-navy dark:text-white font-bold">{items.length}</span>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            {/* Export CSV */}
                            <button
                              onClick={(e) => { e.stopPropagation(); exportToCSV(wo); }}
                              className="flex items-center gap-2 bg-green-50 hover:bg-green-500 text-green-700 hover:text-white border border-green-200 hover:border-green-500 dark:bg-green-500/10 dark:hover:bg-green-500 dark:text-green-400 dark:hover:text-white dark:border-green-500/30 hover:dark:border-green-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                            >
                              <Download size={14} /> Export CSV
                            </button>

                            {/* Preview / PDF */}
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/wo/print/${wo.id}`); }}
                              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-500 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-500 dark:bg-blue-500/10 dark:hover:bg-blue-500 dark:text-blue-400 dark:hover:text-white dark:border-blue-500/30 hover:dark:border-blue-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                            >
                              <Printer size={14} /> Preview / PDF
                            </button>

                            {/* Delete — admin only */}
                            {canDelete && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteWO(wo); }}
                                className="flex items-center gap-2 bg-red-50 hover:bg-red-500 text-red-700 hover:text-white border border-red-200 hover:border-red-500 dark:bg-red-500/10 dark:hover:bg-red-500 dark:text-red-400 dark:hover:text-white dark:border-red-500/30 hover:dark:border-red-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
