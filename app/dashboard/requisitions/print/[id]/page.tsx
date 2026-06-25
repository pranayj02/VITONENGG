"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Requisition, ReqLineItem } from "@/lib/types";

export default function MRPrintPage({ params }: { params: { id: string } }) {
  const [req, setReq] = useState<Requisition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("requisitions")
        .select("*")
        .eq("id", decodeURIComponent(params.id))
        .single();
      setReq((data ?? null) as unknown as Requisition | null);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Requisition not found.</p>
      </div>
    );
  }

  const lines = (req.line_items ?? []) as ReqLineItem[];
  const date = new Date(req.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  const MIN_ROWS = 8;
  const paddedLines: (ReqLineItem | null)[] = [
    ...lines,
    ...Array(Math.max(0, MIN_ROWS - lines.length)).fill(null),
  ];

  return (
    <div
      style={{
        width: "210mm",
        minHeight: "297mm",
        background: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "10pt",
        color: "#000",
        padding: "10mm 12mm",
        boxSizing: "border-box",
        margin: "0 auto",
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────── */}
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
                    <td colSpan={4} style={{ background: "#1a1a6e", color: "#fff", textAlign: "center", fontWeight: "900", fontSize: "11pt", letterSpacing: "1.5px", padding: "5px 8px", textTransform: "uppercase" }}>
                      Requisition Slip
                    </td>
                  </tr>
                  <tr style={{ borderTop: "1px solid #000" }}>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>Doc No.</td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", borderRight: "1px solid #000" }}>VT-PPC-R-04</td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>Rev No.</td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt" }}>00</td>
                  </tr>
                  <tr style={{ borderTop: "1px solid #000" }}>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>Rev Date</td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", borderRight: "1px solid #000" }}>01/06/26</td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000", whiteSpace: "nowrap" }}>Req No.</td>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700" }}>{req.req_number}</td>
                  </tr>
                  <tr style={{ borderTop: "1px solid #000" }}>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000" }}>Date</td>
                    <td colSpan={3} style={{ padding: "3px 6px", fontSize: "7.5pt" }}>{date}</td>
                  </tr>
                  <tr style={{ borderTop: "1px solid #000" }}>
                    <td style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", borderRight: "1px solid #000" }}>Priority</td>
                    <td colSpan={3} style={{ padding: "3px 6px", fontSize: "7.5pt", fontWeight: "700", color: req.priority === "urgent" ? "#cc0000" : req.priority === "high" ? "#cc6600" : "#000" }}>
                      {req.priority.toUpperCase()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── DESCRIPTION / WO ROW ───────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "1.5px solid #000", marginTop: "6px" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "15%", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>Description</td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "55%", fontSize: "8.5pt" }}>{req.notes ?? ""}</td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "12%", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>WO No.</td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "18%", fontSize: "8.5pt" }}>{req.po_id ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>Dept.</td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8.5pt" }}>{req.department ?? ""}</td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "700", fontSize: "8.5pt", background: "#f5f5f5" }}>Req. By</td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8.5pt" }}>{req.requested_by_name ?? req.requested_by}</td>
          </tr>
        </tbody>
      </table>

      {/* ── ITEMS TABLE ────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "6px" }}>
        <thead>
          <tr style={{ background: "#1a1a6e", color: "#fff" }}>
            {[
              { label: "Sr No.", w: "5%", align: "center" as const },
              { label: "Item / Description", w: "40%", align: "left" as const },
              { label: "Serial ID", w: "18%", align: "center" as const },
              { label: "Valve Size / Unit", w: "16%", align: "center" as const },
              { label: "Quantity", w: "10%", align: "center" as const },
              { label: "Remarks", w: "11%", align: "left" as const },
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
                {line?.unit ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "5px 6px", textAlign: "center", fontSize: "8.5pt", fontWeight: line ? "700" : "400" }}>
                {line?.qty_requested ?? ""}
              </td>
              <td style={{ border: "1px solid #ccc", padding: "5px 6px", fontSize: "8pt", color: "#444" }}>
                {line?.custom_note ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── APPROVAL SECTION ───────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "6px" }}>
        <tbody>
          <tr style={{ background: "#1a1a6e" }}>
            <td colSpan={4} style={{ color: "#fff", fontWeight: "700", fontSize: "8.5pt", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 8px", border: "1px solid #000" }}>
              For Office Use Only — Approval
            </td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "20%", fontWeight: "700", fontSize: "8pt", background: "#f5f5f5" }}>Approved By</td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "30%", fontSize: "8pt" }}>{req.approved_by_name ?? ""}</td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "20%", fontWeight: "700", fontSize: "8pt", background: "#f5f5f5" }}>PO Number</td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", width: "30%", fontSize: "8pt" }}>{req.po_id ?? ""}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "700", fontSize: "8pt", background: "#f5f5f5" }}>Approved Date</td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8pt" }}>
              {req.approved_at ? new Date(req.approved_at).toLocaleDateString("en-IN") : ""}
            </td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: "700", fontSize: "8pt", background: "#f5f5f5" }}>Remarks</td>
            <td style={{ border: "1px solid #000", padding: "4px 8px", fontSize: "8pt" }}>{req.rejected_reason ?? ""}</td>
          </tr>
        </tbody>
      </table>

      {/* ── SIGNATURES ─────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "30px" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", padding: "0 20px 0 0", verticalAlign: "bottom" }}>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "6px" }}>
                <div style={{ fontWeight: "700", fontSize: "9pt" }}>Prepared By</div>
                <div style={{ fontSize: "8.5pt", color: "#444", marginTop: "4px" }}>
                  {req.requested_by_name ?? req.requested_by}
                </div>
              </div>
            </td>
            <td style={{ width: "50%", padding: "0 0 0 20px", verticalAlign: "bottom" }}>
              <div style={{ borderTop: "1.5px solid #000", paddingTop: "6px" }}>
                <div style={{ fontWeight: "700", fontSize: "9pt" }}>Approved By</div>
                <div style={{ fontSize: "8.5pt", color: "#444", marginTop: "4px" }}>
                  {req.approved_by_name ?? ""}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "7.5pt", color: "#888", borderTop: "1px solid #ddd", paddingTop: "6px" }}>
        This is a computer generated Requisition Slip and does not require a signature if digitally verified.
      </div>
    </div>
  );
}
