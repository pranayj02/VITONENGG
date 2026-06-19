"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { WorkOrder, WorkOrderItem } from "@/lib/types";
import { useRole, can } from "@/lib/roles";
import {
  Plus, Search, Printer, Download, Trash2, X,
  CheckCircle2, Circle, ArrowLeft, Filter, Eye, EyeOff,
} from "lucide-react";

type WOWithItems = WorkOrder & { items: WorkOrderItem[]; is_completed?: boolean };

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportAllCSV(orders: WOWithItems[]) {
  const headers = [
    "WO NO.", "Party Name", "PO SR NO", "Size", "Class", "Valve Type",
    "Description", "Qty", "Due Date", "Inspection", "P.O. NO.", "Status",
  ];
  const rows: string[][] = [headers];
  for (const wo of orders) {
    for (const item of wo.items ?? []) {
      const desc = [
        item.body_bonnet,
        item.wedge_disc_plug_ball,
        item.special_requirements,
      ].filter(Boolean).join(", ");
      rows.push([
        wo.wo_number,
        wo.party_name ?? "",
        item.po_sr_no ?? "",
        item.size_mm ?? "",
        item.rating ?? "",
        item.valve ?? "",
        desc,
        item.qty ?? "",
        wo.delivery_date ?? "",
        wo.inspection_by ?? "",
        wo.po_no ?? "",
        wo.is_completed ? "Completed" : "Active",
      ]);
    }
  }
  const csv = rows
    .map((r) =>
      r
        .map((v) =>
          v.includes(",") || v.includes('"') || v.includes("\n")
            ? `"${v.replace(/"/g, '""')}"`
            : v
        )
        .join(",")
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `WorkOrders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-viton-navy dark:text-white font-bold text-center text-lg mb-1">Delete Work Order?</h3>
        <p className="text-[#8892a8] dark:text-gray-400 text-sm text-center mb-2">
          <strong className="text-viton-navy dark:text-white">{wo.wo_number}</strong> and all its items will be permanently deleted.
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

  const [orders, setOrders] = useState<WOWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
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
    if (!error && data) {
      setOrders(data as unknown as WOWithItems[]);
    }
    setLoading(false);
  }

  async function toggleCompleted(wo: WOWithItems) {
    setTogglingId(wo.id);
    const newVal = !wo.is_completed;
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === wo.id ? { ...o, is_completed: newVal } : o))
    );
    const supabase = createClient();
    await supabase
      .from("work_orders")
      .update({ is_completed: newVal })
      .eq("id", wo.id);
    setTogglingId(null);
  }

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
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      if (!showCompleted && o.is_completed) return false;
      if (!q) return true;
      return (
        o.wo_number.toLowerCase().includes(q) ||
        (o.party_name || "").toLowerCase().includes(q) ||
        (o.po_no || "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, showCompleted]);

  const activeCount = orders.filter((o) => !o.is_completed).length;
  const completedCount = orders.filter((o) => o.is_completed).length;

  // Flatten to rows: one row per line item, with WO context
  type FlatRow = {
    wo: WOWithItems;
    item: WorkOrderItem;
    isFirstInWO: boolean;
    woRowSpan: number;
  };

  const flatRows = useMemo(() => {
    const rows: FlatRow[] = [];
    for (const wo of filtered) {
      const items = wo.items ?? [];
      if (items.length === 0) {
        // Show WO even with no items
        rows.push({ wo, item: {} as WorkOrderItem, isFirstInWO: true, woRowSpan: 1 });
      } else {
        items.forEach((item, idx) => {
          rows.push({
            wo,
            item,
            isFirstInWO: idx === 0,
            woRowSpan: items.length,
          });
        });
      }
    }
    return rows;
  }, [filtered]);

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

      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-5">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1 text-sm text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-viton-navy dark:text-white text-2xl font-bold tracking-tight">Work Orders</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[#8892a8] dark:text-gray-500 text-sm">
                  <span className="font-semibold text-viton-navy dark:text-white">{activeCount}</span> active
                </span>
                {completedCount > 0 && (
                  <span className="text-[#8892a8] dark:text-gray-500 text-sm">
                    · <span className="font-semibold text-emerald-600 dark:text-emerald-400">{completedCount}</span> completed
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => exportAllCSV(filtered)}
                className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-700 text-[#4a5578] dark:text-gray-300 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 font-semibold px-3 py-2 rounded-lg text-xs transition-all"
              >
                <Download size={13} /> Export CSV
              </button>
              {canCreate && (
                <button
                  onClick={() => router.push("/dashboard/wo/new")}
                  className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all"
                >
                  <Plus size={15} /> New Work Order
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search WO #, party, PO..."
              className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-lg pl-9 pr-8 py-2 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red/20 dark:focus:ring-orange-500/20 focus:border-viton-red dark:focus:border-orange-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892a8] hover:text-viton-navy dark:hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowCompleted((v) => !v)}
            className={`flex items-center gap-2 font-semibold px-3 py-2 rounded-lg text-xs border transition-all ${
              showCompleted
                ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
                : "bg-white dark:bg-gray-900 border-[#dde1ea] dark:border-gray-700 text-[#8892a8] dark:text-gray-400 hover:border-[#c0c8db]"
            }`}
          >
            {showCompleted ? <Eye size={13} /> : <EyeOff size={13} />}
            {showCompleted ? "Hiding Completed" : "Show Completed"}
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : flatRows.length === 0 ? (
          <div className="text-center py-20 text-[#8892a8] dark:text-gray-600 text-sm">
            {search ? "No work orders match your search." : "No work orders yet. Create your first one."}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" style={{ minWidth: 1100 }}>
                <thead>
                  <tr className="bg-[#1a2744] dark:bg-gray-800">
                    {[
                      { label: "Done", w: 52 },
                      { label: "WO NO.", w: 72 },
                      { label: "Party Name", w: 160 },
                      { label: "PO SR NO", w: 72 },
                      { label: "Size", w: 60 },
                      { label: "Class", w: 60 },
                      { label: "VALVE TYPE", w: 90 },
                      { label: "Description", w: "auto" },
                      { label: "Qty.", w: 52 },
                      { label: "Due Date", w: 100 },
                      { label: "Inspection", w: 110 },
                      { label: "P.O. NO.", w: 180 },
                      { label: "", w: 80 },
                    ].map((col) => (
                      <th
                        key={col.label}
                        className="text-white text-[11px] font-bold uppercase tracking-wider text-center px-3 py-3 whitespace-nowrap border-r border-white/10 last:border-r-0"
                        style={col.w !== "auto" ? { width: col.w, minWidth: col.w } : {}}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flatRows.map((row, rowIdx) => {
                    const { wo, item, isFirstInWO, woRowSpan } = row;
                    const isCompleted = !!wo.is_completed;
                    const isEvenWO = filtered.indexOf(wo) % 2 === 0;
                    const rowBg = isCompleted
                      ? "bg-emerald-50/50 dark:bg-emerald-500/5"
                      : isEvenWO
                      ? "bg-white dark:bg-gray-900"
                      : "bg-[#fafbfd] dark:bg-gray-900/60";
                    const textClass = isCompleted
                      ? "text-[#8892a8] dark:text-gray-500 line-through"
                      : "text-[#2d3748] dark:text-gray-200";

                    const desc = [
                      item.body_bonnet,
                      item.wedge_disc_plug_ball,
                      item.special_requirements,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    const borderTop = isFirstInWO && rowIdx !== 0
                      ? "border-t-2 border-[#dde1ea] dark:border-gray-700"
                      : "border-t border-[#eef1f6] dark:border-gray-800/60";

                    return (
                      <tr key={`${wo.id}-${rowIdx}`} className={`${rowBg} ${borderTop} transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-500/5`}>
                        {/* Completed toggle — only on first row of WO */}
                        {isFirstInWO && (
                          <td
                            rowSpan={woRowSpan}
                            className="text-center align-middle px-2 border-r border-[#eef1f6] dark:border-gray-800/60"
                          >
                            <button
                              onClick={() => toggleCompleted(wo)}
                              disabled={togglingId === wo.id}
                              title={isCompleted ? "Mark as Active" : "Mark as Completed"}
                              className={`p-1.5 rounded-full transition-all ${
                                isCompleted
                                  ? "text-emerald-500 hover:text-emerald-600"
                                  : "text-[#c0c8db] dark:text-gray-600 hover:text-emerald-500"
                              } disabled:opacity-40`}
                            >
                              {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </button>
                          </td>
                        )}

                        {/* WO Number — rowspan */}
                        {isFirstInWO && (
                          <td
                            rowSpan={woRowSpan}
                            className={`px-3 py-2.5 text-center align-middle border-r border-[#eef1f6] dark:border-gray-800/60`}
                          >
                            <span className={`font-bold font-mono text-xs ${
                              isCompleted ? "text-[#8892a8] line-through" : "text-viton-navy dark:text-white"
                            }`}>
                              {wo.wo_number}
                            </span>
                          </td>
                        )}

                        {/* Party Name — rowspan */}
                        {isFirstInWO && (
                          <td
                            rowSpan={woRowSpan}
                            className={`px-3 py-2.5 align-middle border-r border-[#eef1f6] dark:border-gray-800/60 max-w-[160px]`}
                          >
                            <span className={`text-xs font-semibold leading-tight block ${
                              isCompleted ? "text-[#8892a8] line-through" : "text-viton-navy dark:text-white"
                            }`}>
                              {wo.party_name || "—"}
                            </span>
                          </td>
                        )}

                        {/* PO SR NO */}
                        <td className={`px-3 py-2.5 text-center border-r border-[#eef1f6] dark:border-gray-800/60 text-xs font-mono ${textClass}`}>
                          {item.po_sr_no || "—"}
                        </td>

                        {/* Size */}
                        <td className={`px-3 py-2.5 text-center border-r border-[#eef1f6] dark:border-gray-800/60 text-xs font-semibold ${textClass}`}>
                          {item.size_mm ? `${item.size_mm}"` : "—"}
                        </td>

                        {/* Class / Rating */}
                        <td className={`px-3 py-2.5 text-center border-r border-[#eef1f6] dark:border-gray-800/60 text-xs font-semibold ${textClass}`}>
                          {item.rating || "—"}
                        </td>

                        {/* Valve Type */}
                        <td className={`px-3 py-2.5 text-center border-r border-[#eef1f6] dark:border-gray-800/60`}>
                          <span className={`text-xs font-bold uppercase ${
                            isCompleted ? "text-[#8892a8] line-through" : "text-viton-navy dark:text-white"
                          }`}>
                            {item.valve || "—"}
                          </span>
                        </td>

                        {/* Description */}
                        <td className={`px-3 py-2.5 border-r border-[#eef1f6] dark:border-gray-800/60 text-xs leading-snug max-w-xs ${textClass}`}>
                          {desc || "—"}
                        </td>

                        {/* Qty */}
                        <td className={`px-3 py-2.5 text-center border-r border-[#eef1f6] dark:border-gray-800/60 text-xs font-bold ${textClass}`}>
                          {item.qty || "—"}
                        </td>

                        {/* Due Date — rowspan */}
                        {isFirstInWO && (
                          <td
                            rowSpan={woRowSpan}
                            className={`px-3 py-2.5 text-center align-middle border-r border-[#eef1f6] dark:border-gray-800/60`}
                          >
                            <span className={`text-xs font-semibold ${
                              isCompleted
                                ? "text-[#8892a8]"
                                : wo.delivery_date
                                ? "text-viton-navy dark:text-white"
                                : "text-[#8892a8]"
                            }`}>
                              {wo.delivery_date || "—"}
                            </span>
                          </td>
                        )}

                        {/* Inspection — rowspan */}
                        {isFirstInWO && (
                          <td
                            rowSpan={woRowSpan}
                            className={`px-3 py-2.5 text-center align-middle border-r border-[#eef1f6] dark:border-gray-800/60`}
                          >
                            {wo.inspection_by && wo.inspection_by !== "NO" && wo.inspection_by !== "-" ? (
                              <span className={`text-[10px] font-semibold leading-snug block ${
                                isCompleted ? "text-[#8892a8]" : "text-[#4a5578] dark:text-gray-300"
                              }`}>
                                {wo.inspection_by}
                              </span>
                            ) : (
                              <span className="text-[#c0c8db] dark:text-gray-600 text-xs">—</span>
                            )}
                          </td>
                        )}

                        {/* P.O. NO. — rowspan */}
                        {isFirstInWO && (
                          <td
                            rowSpan={woRowSpan}
                            className={`px-3 py-2.5 align-middle border-r border-[#eef1f6] dark:border-gray-800/60`}
                          >
                            <span className={`text-xs font-mono leading-snug block ${
                              isCompleted ? "text-[#8892a8]" : "text-[#4a5578] dark:text-gray-300"
                            }`}>
                              {wo.po_no
                                ? `${wo.po_no}${wo.po_date ? ` dt. ${wo.po_date}` : ""}`
                                : "—"}
                            </span>
                          </td>
                        )}

                        {/* Actions — rowspan */}
                        {isFirstInWO && (
                          <td
                            rowSpan={woRowSpan}
                            className="px-2 py-2 text-center align-middle"
                          >
                            <div className="flex flex-col items-center gap-1.5">
                              <button
                                onClick={() => router.push(`/dashboard/wo/print/${wo.id}`)}
                                title="Preview / PDF"
                                className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-[#8892a8] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                <Printer size={14} />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => setDeleteWO(wo)}
                                  title="Delete"
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-[#8892a8] hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer summary */}
            <div className="px-5 py-3 border-t border-[#dde1ea] dark:border-gray-800 bg-[#f7f8fb] dark:bg-gray-800/30 flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-[#8892a8] dark:text-gray-500">
                Showing <strong className="text-viton-navy dark:text-white">{filtered.length}</strong> work order{filtered.length !== 1 ? "s" : ""} ·{" "}
                <strong className="text-viton-navy dark:text-white">{flatRows.filter((r) => r.item.qty).length}</strong> line items
              </span>
              <button
                onClick={() => exportAllCSV(filtered)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#8892a8] hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
              >
                <Download size={12} /> Export current view as CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
