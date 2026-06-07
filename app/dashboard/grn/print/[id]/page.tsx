"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import type { GRN, GRNLineItem } from "@/lib/types";

export default function GRNPrintPage({ params }: { params: { id: string } }) {
  const [grn, setGrn] = useState<GRN | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("grn")
        .select("*")
        .eq("id", decodeURIComponent(params.id))
        .single();
      setGrn((data ?? null) as unknown as GRN | null);
      setLoading(false);
    }
    load();
  }, [params.id]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">GRN not found.</p>
      </div>
    );
  }

  const lines = (grn.line_items ?? []) as GRNLineItem[];
  const date = new Date(grn.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  const revDate = new Date(grn.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });

  const MIN_ROWS = 8;
  const paddedLines: (GRNLineItem | null)[] = [
    ...lines,
    ...Array(Math.max(0, MIN_ROWS - lines.length)).fill(null),
  ];

  const SlipDocument = () => (
    <div
      ref={printRef}
      style={{
        width: "210mm",
        minHeight: "297mm",
        background: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "10pt",
        color: "#000",
        padding: "10mm 12mm",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0" }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "top", width: "55%", paddingRight: "8px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <img
                  src="/Logo.JPG"
                  alt="Viton Engineers"
                  style={{ width: "54px", height: "54px", objectFit: "contain", flexShrink: 0 }}
                  crossOrigin="anonymous"
                />
                <div>
                  <div style={{ fontSize: "13pt", fontWeight: "900", letterSpacing: "0.3px", lineHeight: 1.2 }}>
                    VITON ENGINEERS PVT. LTD.
                  </div>
                  <div style={{ fontSize: "7.5pt", color: "#333", marginTop: "3px", lineHeight: 1.5 }}>
                    WORKS: B40/1, ADDL. Ambernath MIDC, Anand Nagar,<br />
                    Opp. Hali Pad, Ambernath East, Dist. Thane - 421506
                  </div>
                  <div style={{ fontSize: "7.5pt", color: "#333", marginTop: "2px" }}>
                    Tel: 08779301215 / 9769639388 | Email: info@vitonvalves.com
                  </div>
                  <div style={{ fontSize: "7.5pt", color: "#333" }}>
                    GSTIN: <strong>27AACCV7755N1ZK</strong>
                  </div>
                </div>
              </div>
            </td>

            <td style={{ verticalAlign: "top", width: "45%" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000" }}>
                <tbody>
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        background: "#1a1a6e",
                        color: "#fff",
                        textAlign: "center",
                        fontWeight: "900",
                        fontSize: "11pt",
                        letterSpacing: "1.5px",
                        padding: "5px 8px",
                        textTransform: "uppercase",
                      }}
                    >
                      Goods Receipt Note
                    </td>
                  </tr>
                  <tr style={{ borderTop: "1px solid #000" }}>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>
                      Doc No.
                    </td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", borderRight: "1px solid #000" }}>
                      VT-PPC-G-05
                    </td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>
                      Rev No.
                    </td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt" }}>00</td>
                  </tr>
                  <tr style={{ borderTop: "1px solid #000" }}>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>
                      Rev Date
                    </td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", borderRight: "1px solid #000" }}>
                      {revDate}
                    </td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>
                      GRN No.
                    </td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700" }}>
                      {grn.grn_number}
                    </td>
                  </tr>
                  <tr style={{ borderTop: "1px solid #000" }}>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000" }}>
                      Date
                    </td>
                    <td colSpan={3} style={{ padding: "3px 6px", fontSize: "7.5pt" }}>
                      {date}
                    </td>
                  </tr>
                  <tr style={{ borderTop: "1px solid #000" }}>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000" }}>
                      Status
                    </td>
                    <td colSpan={3} style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700",
                      color: grn.status === "approved" ? "green" : grn.status === "rejected" ? "red" : "#000" }}>
                      {grn.status.toUpperCase()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* VENDOR + RECEIPT ROWS */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "1.5px solid #000", marginTop: "6px" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "15%", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>
              Vendor
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "40%", fontSize: "8.5pt" }}>
              {grn.vendor_name ?? "—"}
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "15%", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>
              PO Ref
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "30%", fontSize: "8.5pt" }}>
              {grn.po_id ? "Linked" : "Direct Receipt"}
            </td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>
              Received By
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8.5pt" }}>
              {grn.received_by_name ?? "—"}
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>
              Inspected By
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8.5pt" }}>
              {grn.inspected_by_name ?? "—"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ITEMS TABLE */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "6px" }}>
        <thead>
          <tr style={{ background: "#1a1a6e", color: "#fff" }}>
            {[
              { label: "Sr No.", w: "5%", align: "center" as const },
              { label: "Item / Description", w: "35%", align: "left" as const },
              { label: "Serial ID", w: "15%", align: "center" as const },
              { label: "PO Qty", w: "10%", align: "center" as const },
              { label: "Received", w: "10%", align: "center" as const },
              { label: "Accepted", w: "10%", align: "center" as const },
              { label: "Rejected", w: "10%", align: "center" as const },
              { label: "Reason", w: "15%", align: "left" as const },
            ].map((col) => (
              <th
                key={col.label}
                style={{
                  border: "1px solid #000",
                  padding: "5px 6px",
                  fontWeight: "700",
                  fontSize: "8.5pt",
                  textAlign: col.align,
                  width: col.w,
                  letterSpacing: "0.3px",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paddedLines.map((line, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td style={{ border: "1px solid #ccc", padding: "5px 6px", textAlign: "center", fontSize: "8.5pt", color: "#666" }}>
                {line ? i + 1 : ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "5px 6px", fontSize: "8.5pt" }}>
                {line?.name ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "5px 6px", textAlign: "center", fontSize: "8pt", fontFamily: "monospace", color: "#1a1a6e", fontWeight: "700" }}>
                {line?.serial_id ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "5px 6px", textAlign: "center", fontSize: "8.5pt" }}>
                {line?.po_qty ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "5px 6px", textAlign: "center", fontSize: "8.5pt" }}>
                {line?.received_qty ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "5px 6px", textAlign: "center", fontSize: "8.5pt", fontWeight: line ? "700" : "400", color: line ? "green" : "#666" }}>
                {line?.accepted_qty ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "5px 6px", textAlign: "center", fontSize: "8.5pt", fontWeight: line ? "700" : "400", color: line ? "red" : "#666" }}>
                {line?.rejected_qty ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "5px 6px", fontSize: "8pt", color: "#444" }}>
                {line?.rejection_reason ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* INSPECTION NOTES */}
      {grn.inspection_notes && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "6px" }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5", width: "15%" }}>
                Inspection Notes
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8.5pt" }}>
                {grn.inspection_notes}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* SIGNATURES */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "30px" }}>
        <tbody>
          <tr>
            <td style={{ width: "33%", padding: "0 20px 0 0", verticalAlign: "bottom" }}>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "6px" }}>
                <div style={{ fontWeight: "700", fontSize: "9pt" }}>Received By</div>
                <div style={{ fontSize: "8.5pt", color: "#444", marginTop: "4px" }}>
                  {grn.received_by_name ?? "_______________________"}
                </div>
              </div>
            </td>
            <td style={{ width: "33%", padding: "0 20px", verticalAlign: "bottom" }}>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "6px" }}>
                <div style={{ fontWeight: "700", fontSize: "9pt" }}>Inspected By</div>
                <div style={{ fontSize: "8.5pt", color: "#444", marginTop: "4px" }}>
                  {grn.inspected_by_name ?? "_______________________"}
                </div>
              </div>
            </td>
            <td style={{ width: "33%", padding: "0 0 0 20px", verticalAlign: "bottom" }}>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "6px" }}>
                <div style={{ fontWeight: "700", fontSize: "9pt" }}>Approved By</div>
                <div style={{ fontSize: "8.5pt", color: "#444", marginTop: "4px" }}>
                  _______________________
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* FOOTER */}
      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "7.5pt", color: "#888", borderTop: "1px solid #ddd", paddingTop: "6px" }}>
        This is a computer generated Goods Receipt Note and does not require a signature if digitally verified.
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          html, body { margin: 0; padding: 0; background: white; }
          .no-print { display: none !important; }
          .print-wrapper {
            display: block !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      <div
        className="no-print"
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "flex-start",
          overflowY: "auto", zIndex: 50, padding: "24px 16px 40px",
        }}
      >
        <div
          style={{
            width: "210mm", maxWidth: "100%",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "12px", color: "#fff",
          }}
        >
          <div>
            <span style={{ fontSize: "13px", fontWeight: "700" }}>Print Preview</span>
            <span style={{ fontSize: "12px", marginLeft: "10px", opacity: 0.7 }}>
              {grn.grn_number}
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => window.close()}
              style={{
                background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff", padding: "7px 18px", borderRadius: "6px",
                fontSize: "12px", cursor: "pointer",
              }}
            >
              ✕ Close
            </button>
            <button
              onClick={handlePrint}
              style={{
                background: "#1a1a6e", border: "none",
                color: "#fff", padding: "7px 22px", borderRadius: "6px",
                fontSize: "12px", fontWeight: "700", cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              🖨 Print / Save PDF
            </button>
          </div>
        </div>

        <div
          className="print-wrapper"
          style={{
            width: "210mm", maxWidth: "100%",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <SlipDocument />
        </div>
      </div>

      <div className="print-wrapper" style={{ display: "none" }}>
        <SlipDocument />
      </div>
    </>
  );
}
