"use client";

import { Printer, X } from "lucide-react";
import InvoiceDocument, { type InvoicePreview } from "@/components/InvoiceDocument";

export default function InvoicePrintModal({
  open,
  onClose,
  invoice,
}: {
  open: boolean;
  onClose: () => void;
  invoice: InvoicePreview | null;
}) {
  if (!open || !invoice) return null;

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          .invoice-print-root,
          .invoice-print-root * {
            visibility: visible !important;
          }

          .invoice-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .invoice-preview-shell {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      <div className="invoice-print-root" style={{ display: "none" }}>
        <InvoiceDocument invoice={invoice} />
      </div>

      <div className="invoice-preview-shell fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-5xl my-4 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Invoice Preview</h2>
              <p className="text-gray-500 text-sm mt-0.5">{invoice.invoice_number}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
              >
                <Printer size={15} />
                Print
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div style={{ background: "#f3f4f6", padding: "20px", overflowX: "auto" }}>
            <InvoiceDocument invoice={invoice} />
          </div>
        </div>
      </div>
    </>
  );
}
