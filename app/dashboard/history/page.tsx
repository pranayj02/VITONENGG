"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { FileText, Copy, ChevronDown, ChevronUp, Search, X, Trash2, Download } from "lucide-react";
import type { PurchaseOrder, Vendor, LineItem } from "@/lib/types";
import { useRouter } from "next/navigation";

type POWithVendor = PurchaseOrder & { vendors: Vendor };

function exportToExcel(po: POWithVendor) {
  const lineItems = po.line_items as unknown as LineItem[];
  const vendorName = po.vendors?.name ?? "Unknown";
  const date = new Date(po.created_at).toLocaleDateString("en-IN");

  // Build CSV content (opens perfectly in Excel)
  const rows: string[][] = [];

  rows.push(["VITON ENGINEERS PVT. LTD."]);
  rows.push(["B401, ADDL. Ambernath MIDC, Ambernath East, Dist. Thane - 421506"]);
  rows.push([]);
  rows.push(["Purchase Order No.", po.po_number, "", "Date:", date]);
  rows.push(["Vendor:", vendorName]);
  if (po.vendors?.address) rows.push(["Address:", po.vendors.address]);
  if (po.vendors?.gstin) rows.push(["GSTIN:", po.vendors.gstin]);
  if (po.vendors?.contact_name) rows.push(["Attn:", po.vendors.contact_name]);
  rows.push(["Payment Terms:", po.vendors?.payment_terms ?? "60 Days"]);
  rows.push([]);
  rows.push(["#", "Serial ID", "Description", "Qty", "Unit", "Unit Rate (Rs.)", "Total (Rs.)", "Note"]);

  lineItems.forEach((line, i) => {
    rows.push([
      String(i + 1),
      line.serial_id,
      line.name,
      String(line.quantity),
      line.unit,
      String(line.unit_price),
      String(line.total),
      line.custom_note ?? "",
    ]);
  });

  rows.push([]);

  const dispatch = po.dispatch_meta as Record<string, string> | null;
  if (dispatch) {
    if (po.subtotal !== po.total) {
      rows.push(["", "", "", "", "", "Subtotal", String(po.subtotal)]);
      rows.push(["", "", "", "", "", "Packing & Forwarding", String(po.total - po.subtotal)]);
    }
  }
  rows.push(["", "", "", "", "", "TOTAL (Rs.)", String(po.total)]);
  rows.push([]);

  if (po.notes) {
    rows.push(["Notes:", po.notes]);
    rows.push([]);
  }

  if (dispatch) {
    rows.push(["Delivery:", dispatch.delivery ?? ""]);
    rows.push(["Inspection:", dispatch.inspection ?? ""]);
    rows.push(["Mode of Dispatch:", dispatch.mode_of_dispatch ?? ""]);
    rows.push(["Place of Delivery:", dispatch.place_of_delivery ?? ""]);
    rows.push(["Taxes:", dispatch.taxes ?? ""]);
  }

  rows.push([]);
  rows.push(["", "", "", "", "", "For VITON ENGINEERS PVT. LTD."]);
  rows.push(["", "", "", "", "", "Authorised Signatory"]);

  // Convert to CSV string
  const csv = rows
    .map((row) =>
      row.map((cell) => {
        const val = String(cell ?? "").replace(/"/g, '""');
        return val.includes(",") || val.includes("\n") || val.includes('"') ? `"${val}"` : val;
      }).join(",")
    )
    .join("\n");

  // Add BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${po.po_number.replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  const [pos, setPos] = useState<POWithVendor[]>([]);
  const [filtered, setFiltered] = useState<POWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("purchase_orders")
      .select("*, vendors(*)")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as unknown as POWithVendor[];
    setPos(rows);
    setFiltered(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(pos); return; }
    const q = search.toLowerCase();
    setFiltered(
      pos.filter(
        (p) =>
          p.po_number.toLowerCase().includes(q) ||
          (p.vendors?.name ?? "").toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q)
      )
    );
  }, [search, pos]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    await supabase.from("purchase_orders").delete().eq("id", id);
    setConfirmId(null);
    setDeletingId(null);
    await load();
  }

  function handleDuplicate(po: POWithVendor) {
    const params = new URLSearchParams({
      duplicate: "1",
      vendor: po.vendor_id,
      items: JSON.stringify(po.line_items),
      notes: po.notes ?? "",
    });
    router.push(`/dashboard/po/new?${params.toString()}`);
  }

  const statusColors: Record<string, string> = {
    confirmed: "bg-green-500/10 text-green-400",
    draft: "bg-yellow-500/10 text-yellow-400",
    cancelled: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Delete Confirmation Modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-center text-lg mb-1">Delete PO?</h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              This cannot be undone. The PO record will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={deletingId === confirmId}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-all"
              >
                {deletingId === confirmId ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">PO History</h1>
        <p className="text-gray-500 text-sm mt-1">{pos.length} purchase orders total</p>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by PO number, vendor or status..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          {search ? "No POs match your search." : "No purchase orders yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((po) => {
            const isOpen = expanded === po.id;
            const lineItems = po.line_items as unknown as LineItem[];
            const date = new Date(po.created_at).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
            });

            return (
              <div key={po.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all">
                <div
                  className="px-5 py-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : po.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold font-mono text-sm">{po.po_number}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{po.vendors?.name ?? "Unknown Vendor"} · {date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <p className="text-white font-semibold text-sm hidden sm:block">
                      Rs. {po.total.toLocaleString("en-IN")}
                    </p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${statusColors[po.status] ?? "bg-gray-500/10 text-gray-400"}`}>
                      {po.status}
                    </span>
                    {isOpen
                      ? <ChevronUp size={16} className="text-gray-500" />
                      : <ChevronDown size={16} className="text-gray-500" />
                    }
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-800">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 bg-gray-800/40">
                            <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">#</th>
                            <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Serial ID</th>
                            <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Description</th>
                            <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Qty</th>
                            <th className="text-right text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((line, i) => (
                            <tr key={i} className="border-b border-gray-800/40 last:border-0">
                              <td className="px-5 py-2.5 text-gray-500 text-xs">{i + 1}</td>
                              <td className="px-5 py-2.5 text-orange-400 font-mono text-xs font-semibold">{line.serial_id}</td>
                              <td className="px-5 py-2.5">
                                <p className="text-white text-sm">{line.name}</p>
                                {line.custom_note && (
                                  <p className="text-gray-500 text-xs mt-0.5 italic">↳ {line.custom_note}</p>
                                )}
                              </td>
                              <td className="px-5 py-2.5 text-gray-400">{line.quantity} {line.unit}</td>
                              <td className="px-5 py-2.5 text-right text-white font-medium">Rs. {line.total.toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-5 py-4 border-t border-gray-800">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <span className="text-gray-500 text-sm">Total: </span>
                          <span className="text-white font-bold">Rs. {po.total.toLocaleString("en-IN")}</span>
                          {po.notes && <p className="text-gray-500 text-xs mt-1">{po.notes}</p>}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {/* Excel Export */}
                          <button
                            onClick={() => exportToExcel(po)}
                            className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/30 hover:border-green-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                          >
                            <Download size={14} /> Export CSV
                          </button>
                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(po)}
                            className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 hover:border-orange-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                          >
                            <Copy size={14} /> Duplicate
                          </button>
                          {/* Delete */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmId(po.id); }}
                            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
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
  );
}
