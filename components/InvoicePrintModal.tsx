"use client";

import React, { useMemo, useRef } from "react";
import { X, Printer } from "lucide-react";

type InvoiceLine = {
  buyer_po_sr_no?: string;
  buyer_item_code?: string;
  description: string;
  hsn_code?: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  taxable_value: number;
  gst_rate: number;
};

type BuyerSnapshot = {
  name: string;
  address?: string | null;
  gstin?: string | null;
  state?: string | null;
  state_code?: string | null;
};

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

type InvoicePreviewData = {
  invoice_number: string;
  invoice_date: string;
  buyers_po_number?: string | null;
  fy_label?: string | null;
  fy_serial?: number | null;
  status: string;
  buyer: BuyerSnapshot;
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

function formatDate(date?: string | null) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(date?: string | null) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function numberToWords(num: number) {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(n: number): string {
    if (n < 20) return a[n];
    return `${b[Math.floor(n / 10)]}${n % 10 ? " " + a[n % 10] : ""}`.trim();
  }

  function threeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let out = "";
    if (hundred) out += `${a[hundred]} Hundred`;
    if (rest) out += `${out ? " " : ""}${twoDigits(rest)}`;
    return out;
  }

  if (num === 0) return "Zero Rupees Only";

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundredPart = num;

  const parts = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundredPart) parts.push(threeDigits(hundredPart));

  return `${parts.join(" ").trim()} Rupees Only`;
}

function renderPrintHtml(node: HTMLElement) {
  return `
    <html>
      <head>
        <title>Invoice Print</title>
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            background: #ffffff;
          }
          .print-root {
            width: 100%;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="print-root">${node.outerHTML}</div>
      </body>
    </html>
  `;
}

export default function InvoicePrintModal({
  open,
  onClose,
  invoice,
}: {
  open: boolean;
  onClose: () => void;
  invoice: InvoicePreviewData | null;
}) {
  const previewRef = useRef<HTMLDivElement | null>(null);

  const taxMode = useMemo(() => {
    if (!invoice) return "intra";
    return invoice.igst > 0 ? "inter" : "intra";
  }, [invoice]);

  if (!open || !invoice) return null;

  const dispatch = invoice.dispatch_meta || {};
  const billedTo = dispatch.billed_to || invoice.buyer.address || "—";
  const shippedTo = dispatch.shipped_to || invoice.buyer.address || "—";

  function handlePrint() {
    if (!previewRef.current) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(renderPrintHtml(previewRef.current));
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-7xl h-[92vh] bg-[#111827] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-white text-xl font-bold">Invoice Preview</h2>
            <p className="text-gray-400 text-sm mt-1">
              Review, print, or save as PDF from the browser print dialog.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition"
            >
              <Printer size={16} />
              Print / Save PDF
            </button>

            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-950 p-6">
          <div className="mx-auto max-w-[920px]">
            <div
              ref={previewRef}
              className="bg-white text-gray-900 rounded-2xl shadow-xl p-8 leading-relaxed"
            >
              <div className="flex items-start justify-between gap-6 border-b-2 border-[#5060AB] pb-4">
                <div className="flex items-start gap-4">
                  <img src="/Logo.JPG" alt="Viton Logo" className="w-14 h-14 object-contain" />
                  <div>
                    <h1 className="text-[22px] font-bold tracking-wide">
                      VITON ENGINEERS PVT. LTD.
                    </h1>
                    <p className="text-[12px] text-gray-600 mt-1">
                      Office: 701, Swastik Disa Corporate Park, Opp. Shreyas Cinema, LBS Marg, Ghatkopar West, Mumbai - 400086
                    </p>
                    <p className="text-[12px] text-gray-600">
                      Works: B-40/1, Addl. Ambernath MIDC, Anand Nagar, Opp. Hali Pad, Ambernath East, Dist. Thane - 421506
                    </p>
                    <p className="text-[12px] text-gray-600">
                      Phone: 08779301215 / 9769639388 | GSTIN: 27AACCV7755N1ZK | Email: info@vitonvalves.com
                    </p>
                  </div>
                </div>

                <div className="min-w-[220px] border-2 border-[#5060AB] rounded-xl overflow-hidden">
                  <div className="bg-[#5060AB] text-white font-bold uppercase text-center py-2 text-sm tracking-wider">
                    Tax Invoice
                  </div>
                  <div className="p-3">
                    <div className="text-sm text-gray-600">Invoice No.</div>
                    <div className="font-bold text-lg">{invoice.invoice_number}</div>
                    <div className="mt-3 text-sm text-gray-600">Date</div>
                    <div className="font-semibold">{formatDate(invoice.invoice_date)}</div>
                    <div className="mt-3 text-sm text-gray-600">Status</div>
                    <div className="font-semibold capitalize">{invoice.status}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-2">
                    Billed To
                  </div>
                  <div className="text-[15px] font-bold">{invoice.buyer.name}</div>
                  <div className="text-[13px] text-gray-700 whitespace-pre-line mt-1">{billedTo}</div>
                  <div className="text-[13px] text-gray-700 mt-1">
                    GSTIN: {invoice.buyer.gstin || "—"}
                  </div>
                  <div className="text-[13px] text-gray-700">
                    State: {invoice.buyer.state || "—"} {invoice.buyer.state_code ? `(${invoice.buyer.state_code})` : ""}
                  </div>
                  <div className="text-[13px] text-gray-700 mt-2">
                    Buyer PO No.: {invoice.buyers_po_number || "—"}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-2">
                    Shipped To / Supply
                  </div>
                  <div className="text-[13px] text-gray-700 whitespace-pre-line">{shippedTo}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[13px]">
                    <div><span className="text-gray-500">Place of Supply:</span> {dispatch.place_of_supply || invoice.buyer.state || "—"}</div>
                    <div><span className="text-gray-500">PO Date:</span> {formatDate(dispatch.po_date)}</div>
                    <div><span className="text-gray-500">Date/Time of Supply:</span> {dispatch.date_time_of_supply || formatDateTime(invoice.invoice_date)}</div>
                    <div><span className="text-gray-500">Tax Mode:</span> {taxMode === "intra" ? "CGST + SGST" : "IGST"}</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 border border-gray-200 rounded-xl overflow-hidden avoid-break">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#5060AB] text-white">
                      <th className="text-left text-[12px] font-bold px-3 py-3 w-[46px]">Sr.</th>
                      <th className="text-left text-[12px] font-bold px-3 py-3 w-[120px]">PO Sr. No.</th>
                      <th className="text-left text-[12px] font-bold px-3 py-3 w-[120px]">Buyer Code</th>
                      <th className="text-left text-[12px] font-bold px-3 py-3">Description</th>
                      <th className="text-left text-[12px] font-bold px-3 py-3 w-[90px]">HSN</th>
                      <th className="text-right text-[12px] font-bold px-3 py-3 w-[70px]">Qty</th>
                      <th className="text-left text-[12px] font-bold px-3 py-3 w-[70px]">Unit</th>
                      <th className="text-right text-[12px] font-bold px-3 py-3 w-[100px]">Rate</th>
                      <th className="text-right text-[12px] font-bold px-3 py-3 w-[120px]">Taxable Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((line, index) => (
                      <tr key={index} className={index % 2 ? "bg-gray-50" : "bg-white"}>
                        <td className="px-3 py-3 text-[12px] border-t border-gray-200 align-top">{index + 1}</td>
                        <td className="px-3 py-3 text-[12px] border-t border-gray-200 align-top">{line.buyer_po_sr_no || "—"}</td>
                        <td className="px-3 py-3 text-[12px] border-t border-gray-200 align-top">{line.buyer_item_code || "—"}</td>
                        <td className="px-3 py-3 text-[12px] border-t border-gray-200 align-top whitespace-pre-line">{line.description}</td>
                        <td className="px-3 py-3 text-[12px] border-t border-gray-200 align-top">{line.hsn_code || "—"}</td>
                        <td className="px-3 py-3 text-[12px] border-t border-gray-200 align-top text-right">{line.quantity}</td>
                        <td className="px-3 py-3 text-[12px] border-t border-gray-200 align-top">{line.unit}</td>
                        <td className="px-3 py-3 text-[12px] border-t border-gray-200 align-top text-right">{money(line.unit_rate)}</td>
                        <td className="px-3 py-3 text-[12px] border-t border-gray-200 align-top text-right font-semibold">{money(line.taxable_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-5 avoid-break">
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-2">
                      Dispatch Details
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                      <div><span className="text-gray-500">Documents Through:</span> {dispatch.documents_through || "Direct"}</div>
                      <div><span className="text-gray-500">Transportation:</span> {dispatch.transportation || "—"}</div>
                      <div><span className="text-gray-500">L.R. No.:</span> {dispatch.lr_no || "—"}</div>
                      <div><span className="text-gray-500">Mode of Dispatch:</span> {dispatch.mode_of_dispatch || "By Road"}</div>
                      <div><span className="text-gray-500">Vehicle No.:</span> {dispatch.vehicle_no || "—"}</div>
                      <div><span className="text-gray-500">Freight / Packing:</span> {money(dispatch.freight_packing || 0)}</div>
                    </div>
                  </div>

                  {invoice.notes ? (
                    <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4">
                      <div className="text-[11px] uppercase tracking-wider text-indigo-500 font-bold mb-2">
                        Notes
                      </div>
                      <div className="text-[13px] text-gray-700 whitespace-pre-line">
                        {invoice.notes}
                      </div>
                    </div>
                  ) : null}

                  <div className="text-[12px] text-gray-600">
                    Invoice Value In Words: <span className="font-semibold text-gray-900">{numberToWords(Math.round(invoice.total))}</span>
                  </div>
                </div>

                <div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex justify-between px-4 py-3 text-[13px] border-b border-gray-200">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">{money(invoice.subtotal)}</span>
                    </div>

                    <div className="flex justify-between px-4 py-3 text-[13px] border-b border-gray-200">
                      <span className="text-gray-600">CGST</span>
                      <span className="font-medium">{money(invoice.cgst)}</span>
                    </div>

                    <div className="flex justify-between px-4 py-3 text-[13px] border-b border-gray-200">
                      <span className="text-gray-600">SGST</span>
                      <span className="font-medium">{money(invoice.sgst)}</span>
                    </div>

                    <div className="flex justify-between px-4 py-3 text-[13px] border-b border-gray-200">
                      <span className="text-gray-600">IGST</span>
                      <span className="font-medium">{money(invoice.igst)}</span>
                    </div>

                    <div className="flex justify-between px-4 py-4 bg-[#5060AB] text-white">
                      <span className="font-bold tracking-wide">TOTAL</span>
                      <span className="font-bold text-[16px]">Rs. {money(invoice.total)}</span>
                    </div>
                  </div>

                  <div className="mt-8 pt-8 text-right">
                    <div className="text-[13px] text-gray-700 font-semibold">
                      For VITON ENGINEERS PVT. LTD.
                    </div>
                    <div className="h-16" />
                    <div className="text-[13px] font-bold">
                      {invoice.signed_by || "Authorised Signatory"}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      Signature to be applied by hand
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-[11px] text-gray-500">
                SUBJECT TO MUMBAI JURISDICTION
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
