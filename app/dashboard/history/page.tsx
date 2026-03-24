"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  FileText, Copy, ChevronDown, ChevronUp,
  Search, X, Trash2, Download, Printer, Pencil,
} from "lucide-react";
import type { PurchaseOrder, Vendor, LineItem } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { POPdfDocument } from "@/components/POPdf";

type POWithVendor = PurchaseOrder & { vendors: Vendor };

function exportToExcel(po: POWithVendor) {
  const lineItems = po.line_items as unknown as LineItem[];
  const vendorName = po.vendors?.name ?? "Unknown";
  const date = new Date(po.created_at).toLocaleDateString("en-IN");
  const rows: string[][] = [];
  rows.push(["VITON ENGINEERS PVT. LTD."]);
  rows.push(["B40/1, ADDL. Ambernath MIDC, Ambernath East, Dist. Thane - 421506"]);
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
      String(i + 1), line.serial_id, line.name,
      String(line.quantity), line.unit,
      String(line.unit_price), String(line.total),
      line.custom_note ?? "",
    ]);
  });
  rows.push([]);
  const pfAmount = po.total - po.subtotal;
  if (pfAmount > 0) {
    rows.push(["", "", "", "", "", "Subtotal", String(po.subtotal)]);
    rows.push(["", "", "", "", "", "Packing & Forwarding", String(pfAmount)]);
  }
  rows.push(["", "", "", "", "", "TOTAL (Rs.)", String(po.total)]);
  rows.push([]);
  if (po.notes) { rows.push(["Notes:", po.notes]); rows.push([]); }
  const dispatch = po.dispatch_meta as Record<string, string> | null;
  if (dispatch) {
    rows.push(["Delivery:", dispatch.delivery ?? ""]);
    rows.push(["Inspection:", dispatch.inspection ?? ""]);
    rows.push(["Mode of Dispatch:", dispatch.mode_of_dispatch ?? ""]);
    rows.push(["Place of Delivery:", dispatch.place_of_delivery ?? ""]);
    rows.push(["Taxes:", dispatch.taxes ?? ""]);
    rows.push(["Payment Terms:", po.vendors?.payment_terms ?? "60 Days"]);
  }
  rows.push([]);
  rows.push(["", "", "", "", "", "For VITON ENGINEERS PVT. LTD."]);
  rows.push(["", "", "", "", "", "Authorised Signatory"]);
  const csv = rows.map((row) =>
    row.map((cell) => {
      const val = String(cell ?? "").replace(/"/g, '""');
      return val.includes(",") || val.includes("\n") || val.includes('"') ? `"${val}"` : val;
    }).join(",")
  ).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${po.po_number.replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function HistoryPODocument({ po }: { po: POWithVendor }) {
  const lineItems = po.line_items as unknown as LineItem[];
  const dispatch = po.dispatch_meta as {
    delivery?: string;
    inspection?: string;
    mode_of_dispatch?: string;
    place_of_delivery?: string;
    taxes?: string;
    payment_date?: string;
    pf_mode?: string;
    pf_value?: number;
  } | null;

  const date = new Date(po.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  const pfAmount = po.total - po.subtotal;
  const pfMode = dispatch?.pf_mode ?? "nil";
  const pfValue = dispatch?.pf_value ?? 0;

  const displayAddress = (po.vendors as any)?.delivery_address || po.vendors?.address;
  const displayGstin = (po.vendors as any)?.delivery_gstin || po.vendors?.gstin;
  const paymentTerms = po.vendors?.payment_terms ?? "60 Days";

  const pfDisplay =
    pfMode === "nil" || pfAmount <= 0
      ? "Nil"
      : `Rs. ${pfAmount.toLocaleString("en-IN")}${pfMode === "percent" ? ` (${pfValue}%)` : ""}`;

  const dispatchRows = [
    [
      { label: "DELIVERY", value: dispatch?.delivery || "—" },
      { label: "INSPECTION", value: dispatch?.inspection || "—" },
    ],
    [
      { label: "MODE OF DESPATCH", value: dispatch?.mode_of_dispatch || "—" },
      { label: "PACKING & FORWARDING", value: pfDisplay },
    ],
    [
      { label: "PLACE OF DELIVERY", value: dispatch?.place_of_delivery || "—" },
      { label: "TAXES", value: dispatch?.taxes || "—" },
    ],
    [
      { label: "PAYMENT TERMS", value: paymentTerms },
      { label: "PAYMENT DATE", value: dispatch?.payment_date || "—" },
    ],
  ];

  return (
    <div
      className="po-history-doc bg-white text-gray-900"
      style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", padding: "28px 32px" }}
    >
      {/* Letterhead */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "14px", borderBottom: "3px solid #5060AB", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1, minWidth: 0 }}>
          <img
            src="/Logo.jpg"
            alt="Viton Engineers"
            crossOrigin="anonymous"
            style={{ width: "52px", height: "52px", objectFit: "contain", flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "17px", fontWeight: "900", color: "#111" }}>VITON ENGINEERS PVT. LTD.</div>
            <div style={{ fontSize: "10px", color: "#555", marginTop: "3px", lineHeight: "1.5" }}>
              WORKS: B40/1, ADDL. Ambernath MIDC, Anand Nagar, Opp. Hali Pad, Ambernath East, Dist. Thane - 421506
            </div>
            <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>
              Tel: 08779301215 / 9769639388&nbsp;&nbsp;|&nbsp;&nbsp;Email: info@vitonvalves.com&nbsp;&nbsp;|&nbsp;&nbsp;GSTIN:{" "}
              <strong>27AACCV7755N1ZK</strong>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "24px" }}>
          <div style={{ border: "2px solid #5060AB", borderRadius: "8px", padding: "6px 16px 8px 16px", display: "inline-block", minWidth: "210px" }}>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#fff", background: "#5060AB", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", padding: "4px 6px" }}>
              Purchase Order
            </div>
            <div style={{ fontSize: "11px", fontWeight: "500", color: "#666", fontFamily: "monospace", marginTop: "6px", textAlign: "center" }}>
              {po.po_number}
            </div>
          </div>
          <div style={{ fontSize: "10px", color: "#666", marginTop: "6px" }}>Date: {date}</div>
        </div>
      </div>

      {/* To + Meta */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
        <div style={{ background: "#f8f8f8", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "10px 12px" }}>
          <div style={{ fontSize: "9px", color: "#aaa", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "5px" }}>To</div>
          <div style={{ fontWeight: "700", fontSize: "13px", color: "#111" }}>{po.vendors?.name ?? "—"}</div>
          {displayAddress && (
            <div style={{ color: "#555", marginTop: "3px", fontSize: "11px", lineHeight: "1.4", whiteSpace: "pre-wrap" }}>
              {displayAddress}
            </div>
          )}
          {displayGstin && (
            <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>GSTIN: {displayGstin}</div>
          )}
          {po.vendors?.contact_name && (
            <div style={{ color: "#444", marginTop: "6px", fontSize: "11px" }}>
              Kind Attn: <strong>{po.vendors.contact_name}</strong>
            </div>
          )}
          {po.vendors?.contact_phone && (
            <div style={{ color: "#555", fontSize: "11px" }}>Tel: {po.vendors.contact_phone}</div>
          )}
        </div>

        <div style={{ background: "#f8f8f8", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "10px 12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <tbody>
              {/* Quot details would live here if stored — empty for now */}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr style={{ background: "#5060AB" }}>
            {["Sr.", "Serial ID", "Particulars", "Qty.", "Unit", "Rate Rs.", "Total Rs."].map((h, i) => (
              <th key={h} style={{
                padding: "7px 8px", color: "white", fontWeight: "700",
                textAlign: i < 3 ? "left" : i >= 5 ? "right" : "center",
                width: ["32px", "110px", "auto", "50px", "44px", "80px", "90px"][i],
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineItems.map((line, i) => (
            <>
              <tr key={`row-${i}`} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: line.custom_note ? "none" : "1px solid #ebebeb" }}>
                <td style={{ padding: "7px 8px", color: "#999", verticalAlign: "top" }}>{i + 1}</td>
                <td style={{ padding: "7px 8px", fontFamily: "monospace", fontSize: "10px", color: "#3a4a8a", fontWeight: "700", verticalAlign: "top" }}>{line.serial_id}</td>
                <td style={{ padding: "7px 8px", color: "#111", verticalAlign: "top" }}>{line.name}</td>
                <td style={{ padding: "7px 8px", textAlign: "center", verticalAlign: "top" }}>{line.quantity}</td>
                <td style={{ padding: "7px 8px", textAlign: "center", color: "#666", verticalAlign: "top" }}>{line.unit}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", verticalAlign: "top" }}>{Number(line.unit_price || 0).toLocaleString("en-IN")}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: "700", verticalAlign: "top" }}>{Number(line.total || 0).toLocaleString("en-IN")}</td>
              </tr>
              {line.custom_note && (
                <tr key={`note-${i}`} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #ebebeb" }}>
                  <td></td>
                  <td colSpan={6} style={{ padding: "1px 8px 7px 8px", color: "#666", fontSize: "11px", fontStyle: "italic" }}>
                    Note: {line.custom_note}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
        <tfoot>
          {pfAmount > 0 && (
            <>
              <tr style={{ borderTop: "1px solid #ddd" }}>
                <td colSpan={6} style={{ padding: "6px 8px", textAlign: "right", color: "#555" }}>Subtotal</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{po.subtotal.toLocaleString("en-IN")}</td>
              </tr>
              <tr>
                <td colSpan={6} style={{ padding: "6px 8px", textAlign: "right", color: "#555" }}>
                  Packing &amp; Forwarding {pfMode === "percent" ? `(${pfValue}%)` : ""}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>{pfAmount.toLocaleString("en-IN")}</td>
              </tr>
            </>
          )}
          <tr style={{ background: "#5060AB", color: "white" }}>
            <td colSpan={6} style={{ padding: "9px 8px", textAlign: "right", fontWeight: "700", letterSpacing: "1px" }}>TOTAL</td>
            <td style={{ padding: "9px 8px", textAlign: "right", fontWeight: "700", fontSize: "13px" }}>
              Rs.&nbsp;{po.total.toLocaleString("en-IN")}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Notes */}
      {po.notes && (
        <div style={{ margin: "12px 0 0 0", padding: "10px 12px", background: "#f0f2ff", border: "1px solid #c7ccee", borderRadius: "6px", fontSize: "11px" }}>
          <div style={{ fontWeight: "700", marginBottom: "4px", color: "#5060AB" }}>Notes:</div>
          <div style={{ color: "#444", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{po.notes}</div>
        </div>
      )}

      {/* Dispatch Footer */}
      {dispatch && (
        <div style={{ marginTop: "14px", border: "1px solid #ddd", borderRadius: "6px", overflow: "hidden", fontSize: "10px" }}>
          {dispatchRows.map((row, ri) => (
            <div
              key={ri}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: ri < dispatchRows.length - 1 ? "1px solid #e5e5e5" : "none" }}
            >
              {row.map((cell, ci) => (
                <div key={ci} style={{ padding: "6px 10px", borderRight: ci === 0 ? "1px solid #e5e5e5" : "none" }}>
                  <span style={{ color: "#999" }}>{cell.label ? `${cell.label}: ` : ""}</span>
                  <span style={{ fontWeight: "700", color: "#111" }}>{cell.value || ""}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ marginTop: "14px", textAlign: "center", fontSize: "10px", color: "#777" }}>
        This is a computer generated Purchase Order and does not require a signature.
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const [pos, setPos] = useState<POWithVendor[]>([]);
  const [filtered, setFiltered] = useState<POWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [printPO, setPrintPO] = useState<POWithVendor | null>(null);
  const [showUpdatedToast, setShowUpdatedToast] = useState(false);
  const [updatedPoNumber, setUpdatedPoNumber] = useState("");
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
    const wasUpdated = searchParams.get("updated") === "1";
    const po = searchParams.get("po") ?? "";
    setShowUpdatedToast(wasUpdated);
    setUpdatedPoNumber(po);
  }, [searchParams]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(pos); return; }
    const q = search.toLowerCase();
    setFiltered(pos.filter((p) =>
      p.po_number.toLowerCase().includes(q) ||
      (p.vendors?.name ?? "").toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
    ));
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

  function handleEdit(po: POWithVendor) {
    router.push(`/dashboard/po/new?id=${po.id}`);
  }

  const statusColors: Record<string, string> = {
    confirmed: "bg-green-500/10 text-green-400",
    draft: "bg-yellow-500/10 text-yellow-400",
    cancelled: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Preview Modal */}
      {printPO && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl my-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <h2 className="font-bold text-gray-900 text-lg">{printPO.po_number}</h2>
              <div className="flex gap-2">
                <PDFDownloadLink
                  document={<POPdfDocument po={printPO} />}
                  fileName={`${printPO.po_number.replace(/\//g, "-")}.pdf`}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                >
                  <Printer size={15} /> Download PDF
                </PDFDownloadLink>
                <button
                  onClick={() => setPrintPO(null)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <HistoryPODocument po={printPO} />
          </div>
        </div>
      )}

      {showUpdatedToast && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-300 text-sm flex items-center justify-between gap-3">
          <span>
            PO updated successfully{updatedPoNumber ? `: ${updatedPoNumber}` : ""}.
          </span>
          <button
            onClick={() => setShowUpdatedToast(false)}
            className="text-green-200 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Delete Confirm Modal */}
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
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
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
            const updatedDate = po.updated_at
              ? new Date(po.updated_at).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                })
              : null;

            return (
              <div
                key={po.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all"
              >
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
                      <p className="text-gray-500 text-xs mt-0.5">
                        {po.vendors?.name ?? "Unknown Vendor"} · Created: {date}
                        {updatedDate ? ` · Updated: ${updatedDate}` : ""}
                      </p>
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
                              <td className="px-5 py-2.5 text-right text-white font-medium">
                                Rs. {Number(line.total || 0).toLocaleString("en-IN")}
                              </td>
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
                          <button
                            onClick={(e) => { e.stopPropagation(); exportToExcel(po); }}
                            className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/30 hover:border-green-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                          >
                            <Download size={14} /> Export CSV
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); setPrintPO(po); }}
                            className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                          >
                            <Printer size={14} /> Preview / PDF
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(po); }}
                            className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 hover:border-yellow-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                          >
                            <Pencil size={14} /> Edit
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(po); }}
                            className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 hover:border-orange-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                          >
                            <Copy size={14} /> Duplicate
                          </button>

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
