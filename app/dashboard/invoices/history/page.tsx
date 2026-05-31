"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  Search, X, Receipt, ChevronDown, ChevronUp,
  Download, Printer, Pencil, Trash2, Copy,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import InvoicePrintModal from "@/components/InvoicePrintModal";
import type { InvoicePreview } from "@/components/InvoiceDocument";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date?: string | null;
  buyers_po_number?: string | null;
  fy_label?: string | null;
  fy_serial?: number | null;
  status?: string | null;
  buyer_id?: string | null;
  buyer_name?: string | null;
  buyer_display_name?: string | null;
  notes?: string | null;
  line_items?: any[];
  dispatch_meta?: Record<string, any> | null;
  subtotal?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  total?: number | null;
  created_at?: string | null;
};

function toPreview(invoice: InvoiceRow): InvoicePreview {
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date ?? invoice.created_at ?? new Date().toISOString(),
    buyers_po_number: invoice.buyers_po_number ?? null,
    fy_label: invoice.fy_label ?? null,
    fy_serial: invoice.fy_serial ?? null,
    status: invoice.status ?? "draft",
    buyer: {
      name: invoice.buyer_name ?? "Unknown Buyer",
      display_name: invoice.buyer_display_name ?? invoice.buyer_name ?? "Unknown Buyer",
    },
    line_items: Array.isArray(invoice.line_items) ? invoice.line_items : [],
    subtotal: Number(invoice.subtotal ?? 0),
    cgst: Number(invoice.cgst ?? 0),
    sgst: Number(invoice.sgst ?? 0),
    igst: Number(invoice.igst ?? 0),
    total: Number(invoice.total ?? 0),
    notes: invoice.notes ?? null,
    dispatch_meta: (invoice.dispatch_meta as any) ?? null,
  };
}

function exportInvoiceCSV(invoice: InvoiceRow) {
  const rows: string[][] = [];
  rows.push(["VITON ENGINEERS PVT. LTD."]);
  rows.push([]);
  rows.push(["Invoice No.", invoice.invoice_number]);
  rows.push(["Date", invoice.invoice_date ?? invoice.created_at ?? ""]);
  rows.push(["Buyer", invoice.buyer_display_name ?? invoice.buyer_name ?? "Unknown Buyer"]);
  if (invoice.buyers_po_number) rows.push(["Buyer PO No.", invoice.buyers_po_number]);
  rows.push([]);
  rows.push(["#", "Buyer PO Sr No", "Buyer Item Code", "Description", "HSN", "Qty", "Unit", "Rate", "Taxable Value", "GST %"]);
  (Array.isArray(invoice.line_items) ? invoice.line_items : []).forEach((line: any, i: number) => {
    rows.push([
      String(i + 1),
      String(line?.buyer_po_sr_no ?? ""),
      String(line?.buyer_item_code ?? ""),
      String(line?.description ?? ""),
      String(line?.hsn_code ?? ""),
      String(line?.quantity ?? ""),
      String(line?.unit ?? ""),
      String(line?.unit_rate ?? ""),
      String(line?.taxable_value ?? ""),
      String(line?.gst_rate ?? ""),
    ]);
  });
  rows.push([]);
  rows.push(["", "", "", "", "", "", "Subtotal", String(invoice.subtotal ?? 0)]);
  rows.push(["", "", "", "", "", "", "CGST", String(invoice.cgst ?? 0)]);
  rows.push(["", "", "", "", "", "", "SGST", String(invoice.sgst ?? 0)]);
  rows.push(["", "", "", "", "", "", "IGST", String(invoice.igst ?? 0)]);
  rows.push(["", "", "", "", "", "", "TOTAL", String(invoice.total ?? 0)]);
  if (invoice.notes) {
    rows.push([]);
    rows.push(["Notes", invoice.notes]);
  }
  const csv = rows.map((row) =>
    row.map((cell) => {
      const val = String(cell ?? "").replace(/"/g, '""');
      return val.includes(",") || val.includes("\n") || val.includes('"') ? `"${val}"` : val;
    }).join(",")
  ).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.invoice_number.replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InvoiceHistoryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [filtered, setFiltered] = useState<InvoiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [printInvoice, setPrintInvoice] = useState<InvoicePreview | null>(null);
  const [showUpdatedToast, setShowUpdatedToast] = useState(false);
  const [updatedInvoiceNumber, setUpdatedInvoiceNumber] = useState("");

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, invoice_date, buyers_po_number, fy_label, fy_serial, status, buyer_id, buyer_name, buyer_display_name, notes, line_items, dispatch_meta, subtotal, cgst, sgst, igst, total, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const mapped = (data ?? []).map((row: any) => ({
      id: String(row.id),
      invoice_number: String(row.invoice_number ?? ""),
      invoice_date: row.invoice_date ?? null,
      buyers_po_number: row.buyers_po_number ?? null,
      fy_label: row.fy_label ?? null,
      fy_serial: row.fy_serial ?? null,
      status: row.status ?? null,
      buyer_id: row.buyer_id ?? null,
      buyer_name: row.buyer_name ?? null,
      buyer_display_name: row.buyer_display_name ?? null,
      notes: row.notes ?? null,
      line_items: Array.isArray(row.line_items) ? row.line_items : [],
      dispatch_meta: row.dispatch_meta ?? null,
      subtotal: row.subtotal ?? null,
      cgst: row.cgst ?? null,
      sgst: row.sgst ?? null,
      igst: row.igst ?? null,
      total: row.total ?? null,
      created_at: row.created_at ?? null,
    })) as InvoiceRow[];
    setRows(mapped);
    setFiltered(mapped);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const wasUpdated = searchParams.get("updated") === "1";
    const inv = searchParams.get("invoice") ?? "";
    setShowUpdatedToast(wasUpdated);
    setUpdatedInvoiceNumber(inv);
  }, [searchParams]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(rows); return; }
    const q = search.toLowerCase();
    setFiltered(rows.filter((r) =>
      (r.invoice_number ?? "").toLowerCase().includes(q) ||
      (r.buyer_display_name ?? r.buyer_name ?? "").toLowerCase().includes(q) ||
      (r.status ?? "").toLowerCase().includes(q)
    ));
  }, [search, rows]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      setError(error.message);
      setDeletingId(null);
      return;
    }
    setConfirmId(null);
    setDeletingId(null);
    await load();
  }

  function handleEdit(invoice: InvoiceRow) {
    router.push(`/dashboard/invoices/new?id=${invoice.id}`);
  }

  function handleDuplicate(invoice: InvoiceRow) {
    const params = new URLSearchParams({
      duplicate: "1",
      buyer: invoice.buyer_id ?? "",
      items: JSON.stringify(invoice.line_items ?? []),
      notes: invoice.notes ?? "",
    });
    router.push(`/dashboard/invoices/new?${params.toString()}`);
  }

  function formatDate(val?: string | null) {
    if (!val) return "—";
    try { return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return val; }
  }

  const statusColors: Record<string, string> = {
    paid: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    draft: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
    cancelled: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <InvoicePrintModal open={!!printInvoice} onClose={() => setPrintInvoice(null)} invoice={printInvoice} />

      {showUpdatedToast && (
        <div className="mb-4 bg-green-50 border border-green-200 dark:bg-green-500/10 dark:border-green-500/30 rounded-xl p-3 text-green-700 dark:text-green-300 text-sm flex items-center justify-between gap-3">
          <span>
            Invoice updated successfully{updatedInvoiceNumber ? `: ${updatedInvoiceNumber}` : ""}.
          </span>
          <button onClick={() => setShowUpdatedToast(false)} className="text-green-700 dark:text-green-200 hover:text-black dark:hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-viton-navy dark:text-white font-bold text-center text-lg mb-1">Delete Invoice?</h3>
            <p className="text-[#8892a8] dark:text-gray-400 text-sm text-center mb-6">
              This cannot be undone. The invoice record will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)} className="flex-1 bg-[#f1f3f8] hover:bg-[#e7ebf3] dark:bg-gray-800 dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold py-3 rounded-xl text-sm transition-all">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmId)} disabled={deletingId === confirmId} className="flex-1 bg-viton-red hover:bg-viton-red-hover dark:bg-red-500 dark:hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-all">
                {deletingId === confirmId ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Invoice History</h1>
        <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">{rows.length} invoices raised</p>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice number, buyer or status..."
          className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm mb-6">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Receipt size={40} className="text-[#dde1ea] dark:text-gray-700 mx-auto mb-4" />
          <p className="text-[#4a5578] dark:text-gray-400 font-medium">No invoices found</p>
          <p className="text-[#8892a8] dark:text-gray-600 text-sm mt-1">Create your first invoice to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((invoice) => {
            const isOpen = expanded === invoice.id;
            const lines = Array.isArray(invoice.line_items) ? invoice.line_items : [];
            const previewInvoice = toPreview(invoice);
            return (
              <div key={invoice.id} className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden hover:border-[#cfd5e2] dark:hover:border-gray-700 transition-all">
                <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(isOpen ? null : invoice.id)}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-viton-red/10 dark:bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Receipt size={16} className="text-viton-red dark:text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-viton-navy dark:text-white font-semibold font-mono text-sm">{invoice.invoice_number}</p>
                      <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">
                        {invoice.buyer_display_name ?? invoice.buyer_name ?? "Unknown Buyer"} · Date: {formatDate(invoice.invoice_date ?? invoice.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <p className="text-viton-navy dark:text-white font-semibold text-sm hidden sm:block">
                      Rs. {Number(invoice.total ?? 0).toLocaleString("en-IN")}
                    </p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${statusColors[invoice.status ?? ""] ?? "bg-[#f1f3f8] text-[#4a5578] dark:bg-gray-800 dark:text-gray-400"}`}>
                      {invoice.status ?? "draft"}
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
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Buyer PO Sr No</th>
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Item Code</th>
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Description</th>
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Qty</th>
                            <th className="text-right text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Taxable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line: any, i: number) => (
                            <tr key={i} className="border-b border-[#eef1f6] dark:border-gray-800/40 last:border-0">
                              <td className="px-5 py-2.5 text-[#8892a8] dark:text-gray-500 text-xs">{i + 1}</td>
                              <td className="px-5 py-2.5 text-viton-red dark:text-orange-400 font-mono text-xs font-semibold">{line?.buyer_po_sr_no ?? "—"}</td>
                              <td className="px-5 py-2.5 text-[#4a5578] dark:text-gray-400 text-xs font-mono">{line?.buyer_item_code ?? "—"}</td>
                              <td className="px-5 py-2.5 text-viton-navy dark:text-white text-sm">{line?.description ?? "—"}</td>
                              <td className="px-5 py-2.5 text-[#4a5578] dark:text-gray-400">{line?.quantity ?? 0} {line?.unit ?? ""}</td>
                              <td className="px-5 py-2.5 text-right text-viton-navy dark:text-white font-medium">Rs. {Number(line?.taxable_value ?? 0).toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-5 py-4 border-t border-[#dde1ea] dark:border-gray-800">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <span className="text-[#8892a8] dark:text-gray-500 text-sm">Total: </span>
                          <span className="text-viton-navy dark:text-white font-bold">Rs. {Number(invoice.total ?? 0).toLocaleString("en-IN")}</span>
                          {invoice.notes && <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">{invoice.notes}</p>}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <button onClick={(e) => { e.stopPropagation(); exportInvoiceCSV(invoice); }} className="flex items-center gap-2 bg-green-50 hover:bg-green-500 text-green-700 hover:text-white border border-green-200 hover:border-green-500 dark:bg-green-500/10 dark:hover:bg-green-500 dark:text-green-400 dark:hover:text-white dark:border-green-500/30 hover:dark:border-green-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                            <Download size={14} /> Export CSV
                          </button>

                          <button onClick={(e) => { e.stopPropagation(); setPrintInvoice(previewInvoice); }} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-500 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-500 dark:bg-blue-500/10 dark:hover:bg-blue-500 dark:text-blue-400 dark:hover:text-white dark:border-blue-500/30 hover:dark:border-blue-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                            <Printer size={14} /> Preview / Print
                          </button>

                          <button onClick={(e) => { e.stopPropagation(); handleEdit(invoice); }} className="flex items-center gap-2 bg-yellow-50 hover:bg-yellow-500 text-yellow-700 hover:text-white border border-yellow-200 hover:border-yellow-500 dark:bg-yellow-500/10 dark:hover:bg-yellow-500 dark:text-yellow-400 dark:hover:text-white dark:border-yellow-500/30 hover:dark:border-yellow-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                            <Pencil size={14} /> Edit
                          </button>

                          <button onClick={(e) => { e.stopPropagation(); handleDuplicate(invoice); }} className="flex items-center gap-2 bg-viton-red/10 hover:bg-viton-red text-viton-red hover:text-white border border-viton-red/20 hover:border-viton-red dark:bg-orange-500/10 dark:hover:bg-orange-500 dark:text-orange-400 dark:hover:text-white dark:border-orange-500/30 hover:dark:border-orange-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                            <Copy size={14} /> Duplicate
                          </button>

                          <button onClick={(e) => { e.stopPropagation(); setConfirmId(invoice.id); }} className="flex items-center gap-2 bg-red-50 hover:bg-red-500 text-red-700 hover:text-white border border-red-200 hover:border-red-500 dark:bg-red-500/10 dark:hover:bg-red-500 dark:text-red-400 dark:hover:text-white dark:border-red-500/30 hover:dark:border-red-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all">
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
