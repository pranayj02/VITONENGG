"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import InvoicePrintModal from "@/components/InvoicePrintModal";

type DispatchMeta = {
  place_of_supply?: string;
  po_date?: string;
  date_time_of_supply?: string;
  documents_through?: string;
  transportation?: string;
  lr_no?: string;
  mode_of_dispatch?: string;
  vehicle_no?: string;
  freight_packing?: number;
  other_charges?: number;
  billed_to?: string;
  shipped_to?: string;
};

type InvoiceLine = {
  buyer_po_sr_no: string;
  buyer_item_code: string;
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  taxable_value: number;
  gst_rate: number;
};

type InvoicePreview = {
  id?: string | null;
  invoice_number: string;
  invoice_date: string;
  buyers_po_number?: string | null;
  fy_label?: string | null;
  fy_serial?: number | null;
  status: string;
  buyer: {
    name: string;
    display_name?: string | null;
    company_name?: string | null;
    branch_name?: string | null;
    address?: string | null;
    gstin?: string | null;
    state?: string | null;
    state_code?: string | null;
  };
  line_items: InvoiceLine[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  notes?: string | null;
  signed_by?: string | null;
  signed_at?: string | null;
  dispatch_meta?: DispatchMeta | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  buyers_po_number?: string | null;
  fy_label?: string | null;
  fy_serial?: number | null;
  status?: string | null;
  buyer_id?: string | null;
  buyer_name?: string | null;
  buyer_display_name?: string | null;
  buyer_company_name?: string | null;
  buyer_branch_name?: string | null;
  buyer_gstin?: string | null;
  buyer_address?: string | null;
  buyer_state?: string | null;
  buyer_state_code?: string | null;
  notes?: string | null;
  line_items?: unknown;
  dispatch_meta?: unknown;
  subtotal?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  total?: number | null;
  signed_by?: string | null;
  signed_at?: string | null;
  created_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMoney(value?: number | null) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeLine(row: any): InvoiceLine {
  const quantity = Number(row?.quantity ?? 1);
  const unitRate = Number(row?.unit_rate ?? 0);

  return {
    buyer_po_sr_no: String(row?.buyer_po_sr_no ?? ""),
    buyer_item_code: String(row?.buyer_item_code ?? ""),
    description: String(row?.description ?? ""),
    hsn_code: String(row?.hsn_code ?? "84818030"),
    quantity,
    unit: String(row?.unit ?? "Nos."),
    unit_rate: unitRate,
    taxable_value: Number(
      row?.taxable_value !== undefined && row?.taxable_value !== null
        ? row.taxable_value
        : quantity * unitRate
    ),
    gst_rate: Number(row?.gst_rate ?? 18),
  };
}

function normalizeDispatchMeta(row: any): DispatchMeta {
  return {
    place_of_supply: String(row?.place_of_supply ?? ""),
    po_date: String(row?.po_date ?? ""),
    date_time_of_supply: String(row?.date_time_of_supply ?? ""),
    documents_through: String(row?.documents_through ?? ""),
    transportation: String(row?.transportation ?? ""),
    lr_no: String(row?.lr_no ?? ""),
    mode_of_dispatch: String(row?.mode_of_dispatch ?? ""),
    vehicle_no: String(row?.vehicle_no ?? ""),
    freight_packing: Number(row?.freight_packing ?? 0),
    other_charges: Number(row?.other_charges ?? 0),
    billed_to: String(row?.billed_to ?? ""),
    shipped_to: String(row?.shipped_to ?? ""),
  };
}

function toPreviewInvoice(row: InvoiceRow): InvoicePreview {
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    invoice_date: row.invoice_date || "",
    buyers_po_number: row.buyers_po_number || null,
    fy_label: row.fy_label || null,
    fy_serial: row.fy_serial || null,
    status: row.status || "draft",
    buyer: {
      name:
        row.buyer_company_name ||
        row.buyer_display_name ||
        row.buyer_name ||
        "—",
      display_name: row.buyer_display_name || row.buyer_name || null,
      company_name:
        row.buyer_company_name ||
        row.buyer_display_name ||
        row.buyer_name ||
        null,
      branch_name: row.buyer_branch_name || null,
      address: row.buyer_address || null,
      gstin: row.buyer_gstin || null,
      state: row.buyer_state || null,
      state_code: row.buyer_state_code || null,
    },
    line_items: Array.isArray(row.line_items) ? row.line_items.map(normalizeLine) : [],
    subtotal: Number(row.subtotal || 0),
    cgst: Number(row.cgst || 0),
    sgst: Number(row.sgst || 0),
    igst: Number(row.igst || 0),
    total: Number(row.total || 0),
    notes: row.notes || null,
    signed_by: row.signed_by || "Authorised Signatory",
    signed_at: row.signed_at || null,
    dispatch_meta: normalizeDispatchMeta(row.dispatch_meta),
  };
}

export default function InvoiceHistoryPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "confirmed">("all");
  const [previewInvoice, setPreviewInvoice] = useState<InvoicePreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void loadInvoices();
  }, []);

  async function loadInvoices() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("invoice_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRows((data || []) as InvoiceRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, invoiceNumber: string) {
    const confirmed = window.confirm(`Delete invoice ${invoiceNumber}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;

      setRows((prev) => prev.filter((row) => row.id !== id));

      if (previewInvoice?.id === id) {
        setPreviewInvoice(null);
        setPreviewOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete invoice.");
    } finally {
      setDeletingId(null);
    }
  }

  function openPrintPage(id: string) {
    window.open(
      `/dashboard/invoices/print/${encodeURIComponent(id)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const filteredRows = rows.filter((row) => {
    const matchesStatus = statusFilter === "all" ? true : (row.status || "draft") === statusFilter;
    const haystack = [
      row.invoice_number || "",
      row.buyers_po_number || "",
      row.buyer_display_name || "",
      row.buyer_company_name || "",
      row.buyer_branch_name || "",
      row.buyer_name || "",
      row.buyer_gstin || "",
      row.buyer_state || "",
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = haystack.includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-white text-2xl font-bold">Invoice History</h1>
            <p className="text-gray-500 text-sm mt-1">
              Preview, edit, and manage saved invoices.
            </p>
          </div>

          <a
            href="/dashboard/invoices/new"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-3 rounded-xl text-sm transition"
          >
            <Plus size={15} />
            New Invoice
          </a>
        </div>

        {error ? (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
            {error}
          </div>
        ) : null}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_120px] gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search invoice number, buyer, GSTIN, PO number"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "draft" | "confirmed")}
              className="bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
            </select>

            <button
              type="button"
              onClick={() => void loadInvoices()}
              className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-4 py-3 rounded-xl text-sm transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">
              <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading invoice history...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-white font-semibold">No invoices found</p>
              <p className="text-gray-500 text-sm mt-1">
                Try a different search or create a new invoice.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-4">
                      Invoice
                    </th>
                    <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-4">
                      Date
                    </th>
                    <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-4">
                      Buyer
                    </th>
                    <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-4">
                      PO No.
                    </th>
                    <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-4">
                      Status
                    </th>
                    <th className="text-right text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-4">
                      Total
                    </th>
                    <th className="text-right text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => {
                    const preview = toPreviewInvoice(row);
                    const buyerLabel =
                      row.buyer_display_name ||
                      row.buyer_company_name ||
                      row.buyer_name ||
                      "—";

                    return (
                      <tr
                        key={row.id}
                        className="border-b border-gray-800/60 hover:bg-gray-800/30 transition"
                      >
                        <td className="px-5 py-4 align-top">
                          <p className="text-white font-semibold font-mono">
                            {row.invoice_number}
                          </p>
                          {row.fy_label ? (
                            <p className="text-gray-500 text-xs mt-1">
                              FY {row.fy_label}
                              {row.fy_serial ? ` · Serial ${row.fy_serial}` : ""}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 align-top text-gray-300">
                          {formatDate(row.invoice_date)}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <p className="text-white">{buyerLabel}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            {[row.buyer_branch_name, row.buyer_gstin].filter(Boolean).join(" · ") ||
                              row.buyer_state ||
                              "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4 align-top text-gray-300">
                          {row.buyers_po_number || "—"}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              (row.status || "draft") === "confirmed"
                                ? "bg-green-500/10 text-green-400"
                                : "bg-yellow-500/10 text-yellow-400"
                            }`}
                          >
                            {(row.status || "draft") === "confirmed" ? "Confirmed" : "Draft"}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-top text-right text-white font-semibold">
                          Rs. {formatMoney(row.total)}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewInvoice(preview);
                                setPreviewOpen(true);
                              }}
                              className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition"
                            >
                              <Eye size={14} />
                              Preview
                            </button>

                            <button
                              type="button"
                              onClick={() => openPrintPage(row.id)}
                              className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition"
                            >
                              <Printer size={14} />
                              Print
                            </button>

                            <a
                              href={`/dashboard/invoices/new?id=${encodeURIComponent(row.id)}`}
                              className="inline-flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-500 px-3 py-2 rounded-xl text-xs font-semibold transition"
                            >
                              <Pencil size={14} />
                              Edit
                            </a>

                            <button
                              type="button"
                              disabled={deletingId === row.id}
                              onClick={() => void handleDelete(row.id, row.invoice_number)}
                              className="inline-flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 disabled:opacity-50 px-3 py-2 rounded-xl text-xs font-semibold transition"
                            >
                              <Trash2 size={14} />
                              {deletingId === row.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <InvoicePrintModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        invoice={previewInvoice}
      />
    </>
  );
}
