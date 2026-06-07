"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import type { GRN, GRNLineItem, Vendor } from "@/lib/types";

interface PORef {
  po_number: string;
  created_at: string;
}

export default function GRNPrintPage({ params }: { params: { id: string } }) {
  const [grn, setGrn] = useState<GRN | null>(null);
  const [po, setPo] = useState<PORef | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
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
      const grnData = (data ?? null) as unknown as GRN | null;
      setGrn(grnData);

      if (grnData?.po_id) {
        const { data: poData } = await supabase
          .from("purchase_orders")
          .select("po_number, created_at")
          .eq("id", grnData.po_id)
          .single();
        setPo((poData as PORef | null) ?? null);
      }
      if (grnData?.vendor_id) {
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("*")
          .eq("id", grnData.vendor_id)
          .single();
        setVendor((vendorData as Vendor | null) ?? null);
      }
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
  const grnDate = new Date(grn.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });
  const poDate = po
    ? new Date(po.created_at).toLocaleDateString("en-IN", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : "—";

  const MIN_ROWS = 10;
  const paddedLines: (GRNLineItem | null)[] = [
    ...lines,
    ...Array(Math.max(0, MIN_ROWS - lines.length)).fill(null),
  ];

  const cellBase: React.CSSProperties = {
    border: "1px solid #000",
    padding: "4px 6px",
    fontSize: "8pt",
    verticalAlign: "top",
  };
  const labelCell: React.CSSProperties = {
    ...cellBase,
    fontWeight: "700",
    background: "#ebebeb",
    whiteSpace: "nowrap",
  };
  const valueCell: React.CSSProperties = {
    ...cellBase,
    fontWeight: "400",
  };
  const headerCell: React.CSSProperties = {
    ...cellBase,
    background: "#1a1a6e",
    color: "#fff",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  };
  const titleCell: React.CSSProperties = {
    border: "2px solid #000",
    padding: "6px 10px",
    background: "#1a1a6e",
    color: "#fff",
    fontSize: "12pt",
    fontWeight: "900",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    textAlign: "center",
  };
  const subTitleCell: React.CSSProperties = {
    fontSize: "8pt",
    letterSpacing: "0.8px",
    marginTop: "2px",
    opacity: 0.85,
    textAlign: "center",
  };

  const SlipDocument = () => (
    <div
      ref={printRef}
      style={{
        width: "210mm",
        minHeight: "297mm",
        background: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "9pt",
        color: "#000",
        padding: "5mm 8mm",
        boxSizing: "border-box",
      }}
    >
      {/* ── FLAT HEADER TABLE (matches Excel grid) ────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0" }}>
        <tbody>
          {/* Row 1: Document No + Title + Company */}
          <tr>
            <td style={{ ...labelCell, width: "15%" }}>Document No.</td>
            <td style={{ ...valueCell, width: "15%" }}>VT-STR-R-02</td>
            <td style={{ ...cellBase, textAlign: "center", width: "40%" }} rowSpan={3}>
              <div style={titleCell}>Goods Receipt Note</div>
              <div style={subTitleCell}>GRN</div>
              <div style={{ fontSize: "10pt", fontWeight: "900", marginTop: "6px", letterSpacing: "0.3px" }}>
                VITON ENGINEERS PVT LTD
              </div>
            </td>
            <td style={{ ...labelCell, width: "15%" }}>GRN No.</td>
            <td style={{ ...valueCell, width: "15%", fontWeight: "700" }}>{grn.grn_number}</td>
          </tr>
          {/* Row 2: Revision No + GRN Date */}
          <tr>
            <td style={labelCell}>Revision No.</td>
            <td style={valueCell}>00</td>
            <td style={labelCell}>GRN Date</td>
            <td style={valueCell}>{grnDate}</td>
          </tr>
          {/* Row 3: Revision Date + Status */}
          <tr>
            <td style={labelCell}>Revision Date</td>
            <td style={valueCell}>01/10/2025</td>
            <td style={labelCell}>Status</td>
            <td style={{ ...valueCell, fontWeight: "700", color: grn.status === "approved" ? "#006400" : grn.status === "rejected" ? "#cc0000" : "#000" }}>
              {grn.status.toUpperCase()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── SUPPLIER + RECEIVED TABLE (flat 5-col) ────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "4px" }}>
        <tbody>
          {/* Section headers */}
          <tr>
            <td colSpan={3} style={{ ...headerCell, width: "55%" }}>Supplier Details</td>
            <td colSpan={2} style={{ ...headerCell, width: "45%" }}>Received At</td>
          </tr>
          {/* Supplier name | Company */}
          <tr>
            <td style={{ ...labelCell, width: "18%" }}>Supplier Name</td>
            <td colSpan={2} style={{ ...valueCell, fontWeight: "700", width: "37%" }}>
              {grn.vendor_name ?? "—"}
            </td>
            <td style={{ ...labelCell, width: "22%" }}>Company</td>
            <td style={{ ...valueCell, width: "23%" }}>M/s. VITON ENGINEERS PVT LTD</td>
          </tr>
          {/* Supplier address | Address */}
          <tr>
            <td style={labelCell}>Supplier Address</td>
            <td colSpan={2} style={{ ...valueCell, fontSize: "7.5pt", lineHeight: 1.5 }}>
              {vendor?.address ?? "—"}
            </td>
            <td style={labelCell}>Address</td>
            <td style={{ ...valueCell, fontSize: "7.5pt", lineHeight: 1.5 }}>
              Plot No. B-40/1, Addl. Ambernath MIDC,<br />
              Anand Nagar, Ambernath E, Dist. Thane - 421506
            </td>
          </tr>
          {/* Supplier GSTIN | Email */}
          <tr>
            <td style={labelCell}>Supplier GSTIN</td>
            <td colSpan={2} style={{ ...valueCell, fontWeight: "700" }}>
              {vendor?.gstin ?? "—"}
            </td>
            <td style={labelCell}>Email</td>
            <td style={valueCell}>viton.engg@gmail.com</td>
          </tr>
          {/* Challan / Inv No. | GST No. */}
          <tr>
            <td style={labelCell}>Challan / Inv No.</td>
            <td colSpan={2} style={{ ...valueCell, fontWeight: "700" }}>
              {grn.challan_no ?? "—"}
            </td>
            <td style={labelCell}>GST No.</td>
            <td style={{ ...valueCell, fontWeight: "700" }}>27AACCV7755N1ZK</td>
          </tr>
          {/* Challan / Inv Date | Received By */}
          <tr>
            <td style={labelCell}>Challan / Inv Date</td>
            <td colSpan={2} style={valueCell}>
              {grn.challan_date ?? "—"}
            </td>
            <td style={labelCell}>Received By</td>
            <td style={valueCell}>{grn.received_by_name ?? "—"}</td>
          </tr>
          {/* PO No. | (empty) */}
          <tr>
            <td style={labelCell}>PO No.</td>
            <td colSpan={2} style={{ ...valueCell, fontFamily: "monospace", color: "#1a1a6e", fontWeight: "700" }}>
              {po?.po_number ?? (grn.po_id ? "Linked" : "Direct Receipt")}
            </td>
            <td style={labelCell} />
            <td style={valueCell} />
          </tr>
          {/* PO Date | (empty) */}
          <tr>
            <td style={labelCell}>PO Date</td>
            <td colSpan={2} style={valueCell}>{poDate}</td>
            <td style={labelCell} />
            <td style={valueCell} />
          </tr>
          {/* Inspected By | (empty) */}
          <tr>
            <td style={labelCell}>Inspected By</td>
            <td colSpan={2} style={valueCell}>{grn.inspected_by_name ?? "—"}</td>
            <td style={labelCell} />
            <td style={valueCell} />
          </tr>
        </tbody>
      </table>

      {/* ── ITEMS TABLE ───────────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "6px" }}>
        <thead>
          <tr style={{ background: "#1a1a6e", color: "#fff" }}>
            {[
              { label: "Sr No.", w: "5%", align: "center" as const },
              { label: "Description of Material", w: "32%", align: "left" as const },
              { label: "PO No.", w: "14%", align: "center" as const },
              { label: "PO Date", w: "10%", align: "center" as const },
              { label: "Challan Qty\n(Kgs/Mtr)", w: "9%", align: "center" as const },
              { label: "Challan Qty\n(Nos)", w: "8%", align: "center" as const },
              { label: "Counted Qty\n(Nos)", w: "8%", align: "center" as const },
              { label: "Accepted Qty\n(Nos)", w: "8%", align: "center" as const },
              { label: "Rejection Qty\n(Nos)", w: "8%", align: "center" as const },
              { label: "Remark", w: "10%", align: "left" as const },
            ].map((col) => (
              <th
                key={col.label}
                style={{
                  border: "1px solid #000",
                  padding: "4px 4px",
                  fontWeight: "700",
                  fontSize: "7.5pt",
                  textAlign: col.align,
                  width: col.w,
                  lineHeight: 1.3,
                  whiteSpace: "pre-line",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paddedLines.map((line, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", minHeight: "22px" }}>
              <td style={{ border: "1px solid #ccc", padding: "4px 5px", textAlign: "center", fontSize: "8pt", color: "#666" }}>
                {line ? i + 1 : ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "4px 5px", fontSize: "8pt" }}>
                {line?.name ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "4px 5px", textAlign: "center", fontSize: "7.5pt", fontFamily: "monospace", color: "#1a1a6e" }}>
                {line ? (po?.po_number ?? "—") : ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "4px 5px", textAlign: "center", fontSize: "7.5pt" }}>
                {line ? poDate : ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "4px 5px", textAlign: "center", fontSize: "8pt" }}>
                {line?.challan_weight ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "4px 5px", textAlign: "center", fontSize: "8pt" }}>
                {line?.challan_nos ?? line?.received_qty ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "4px 5px", textAlign: "center", fontSize: "8pt" }}>
                {line?.counted_nos ?? line?.received_qty ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "4px 5px", textAlign: "center", fontSize: "8pt", fontWeight: line && (line.accepted_qty ?? 0) > 0 ? "700" : "400", color: line && (line.accepted_qty ?? 0) > 0 ? "#006400" : "#000" }}>
                {line?.accepted_qty ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "4px 5px", textAlign: "center", fontSize: "8pt", fontWeight: line && (line.rejected_qty ?? 0) > 0 ? "700" : "400", color: line && (line.rejected_qty ?? 0) > 0 ? "#cc0000" : "#000" }}>
                {line?.rejected_qty !== undefined && line.rejected_qty > 0 ? line.rejected_qty : (line ? "" : "")}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "4px 5px", fontSize: "7.5pt", color: "#444" }}>
                {line?.rejection_reason ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── REMARK ROW ────────────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #ccc", padding: "5px 7px", fontSize: "8pt", fontWeight: "700", width: "12%" }}>
              Remark :
            </td>
            <td style={{ border: "1px solid #ccc", padding: "5px 7px", fontSize: "8pt" }}>
              {grn.inspection_notes ?? ""}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── SIGNATURES ────────────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "32px" }}>
        <tbody>
          <tr>
            <td style={{ width: "33%", paddingRight: "16px", verticalAlign: "bottom" }}>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "6px" }}>
                <div style={{ fontWeight: "700", fontSize: "9pt" }}>Prepared By</div>
                <div style={{ fontSize: "8pt", color: "#444", marginTop: "4px" }}>
                  {grn.received_by_name ?? ""}
                </div>
              </div>
            </td>
            <td style={{ width: "33%", padding: "0 16px", verticalAlign: "bottom" }}>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "6px" }}>
                <div style={{ fontWeight: "700", fontSize: "9pt" }}>Inspected By</div>
                <div style={{ fontSize: "8pt", color: "#444", marginTop: "4px" }}>
                  {grn.inspected_by_name ?? ""}
                </div>
              </div>
            </td>
            <td style={{ width: "33%", paddingLeft: "16px", verticalAlign: "bottom" }}>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "6px" }}>
                <div style={{ fontWeight: "700", fontSize: "9pt" }}>Approved By</div>
                <div style={{ fontSize: "8pt", color: "#444", marginTop: "4px" }}>
                  {grn.approved_by_name ?? ""}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <div style={{ marginTop: "18px", textAlign: "center", fontSize: "7pt", color: "#888", borderTop: "1px solid #ddd", paddingTop: "5px" }}>
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
          .print-wrapper { display: block !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          @page { size: A4 portrait; margin: 0; }
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
            <span style={{ fontSize: "13px", fontWeight: "700" }}>Print Preview — GRN</span>
            <span style={{ fontSize: "12px", marginLeft: "10px", opacity: 0.7 }}>{grn.grn_number}</span>
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
            borderRadius: "4px", overflow: "hidden",
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
