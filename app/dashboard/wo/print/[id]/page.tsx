"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { WOPdfDocument } from "@/components/WOPdf";
import type { WorkOrder, WorkOrderItem } from "@/lib/types";
import { Printer, ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

export default function WOPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [wo, setWo] = useState<(WorkOrder & { items: WorkOrderItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, items:work_order_items(*)")
        .eq("id", id)
        .single();
      if (error || !data) {
        setError("Work order not found.");
      } else {
        setWo(data as unknown as WorkOrder & { items: WorkOrderItem[] });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f3f8] dark:bg-gray-950">
        <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !wo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f3f8] dark:bg-gray-950 px-6">
        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-8 text-center max-w-md">
          <FileText size={40} className="mx-auto text-[#8892a8] dark:text-gray-500 mb-4" />
          <h2 className="text-viton-navy dark:text-white text-lg font-bold mb-2">Not Found</h2>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mb-4">{error || "This work order does not exist."}</p>
          <Link
            href="/dashboard/wo"
            className="inline-flex items-center gap-2 text-viton-red dark:text-orange-400 hover:underline text-sm font-medium"
          >
            <ArrowLeft size={14} /> Back to Work Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f3f8] dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <Link
            href="/dashboard/wo"
            className="flex items-center gap-2 text-sm text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back to Work Orders
          </Link>
          <PDFDownloadLink
            document={<WOPdfDocument wo={wo} />}
            fileName={`WO-${wo.wo_number.replace(/\//g, "-")}.pdf`}
            className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            <Printer size={15} /> Download PDF
          </PDFDownloadLink>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <WOScreenRender wo={wo} />
        </div>
      </div>
    </div>
  );
}

function WOScreenRender({ wo }: { wo: WorkOrder & { items: WorkOrderItem[] } }) {
  const items = wo.items ?? [];
  const colStyle = (w: number): React.CSSProperties => ({
    width: w,
    minWidth: w,
    maxWidth: w,
    fontSize: "8px",
    padding: "3px 3px",
    borderRight: "1px solid #c0c0c0",
    textAlign: "center",
    wordBreak: "break-word",
    verticalAlign: "top",
  });

  const headerStyle = (w: number): React.CSSProperties => ({
    ...colStyle(w),
    background: "#1a2744",
    color: "white",
    fontWeight: 700,
    borderRight: "1px solid rgba(255,255,255,0.15)",
    padding: "4px 3px",
  });

  const COLS_RENDER = [
    { key: "sr_no", label: "Sr. No.", width: 20 },
    { key: "po_sr_no", label: "P.O. SR. NO.", width: 26 },
    { key: "material_no", label: "Material No.", width: 44 },
    { key: "valve", label: "Valve", width: 30 },
    { key: "type", label: "Type", width: 44 },
    { key: "bore", label: "Bore", width: 20 },
    { key: "size_mm", label: "Size MM", width: 24 },
    { key: "rating", label: "Rating", width: 24 },
    { key: "end_connection", label: "End Conn.", width: 32 },
    { key: "body_bonnet", label: "Body / Bonnet", width: 44 },
    { key: "wedge_disc_plug_ball", label: "Wedge / Disc / Plug / Ball", width: 54 },
    { key: "stem_hinge", label: "Stem / Hinge", width: 32 },
    { key: "seat", label: "Seat", width: 44 },
    { key: "gasket", label: "Gasket", width: 44 },
    { key: "gl_pkng", label: "GL. PKNG.", width: 30 },
    { key: "fasteners", label: "Fasteners", width: 30 },
    { key: "operation", label: "Operation", width: 32 },
    { key: "special_requirements", label: "Special Req.", width: 42 },
    { key: "remarks", label: "Remarks", width: 54 },
    { key: "drawing_no", label: "Drawing No.", width: 30 },
    { key: "qty", label: "Qty", width: 20 },
    { key: "delivery", label: "Delivery", width: 32 },
  ];

  return (
    <div
      className="bg-white text-gray-900"
      style={{ fontFamily: "Arial, sans-serif", fontSize: "10px", padding: "12px 16px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "6px", borderBottom: "2px solid #c41e3a", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <img src="/Logo.JPG" alt="Viton" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: 900 }}>VITON ENGINEERS PVT. LTD.</div>
            <div style={{ fontSize: "7.5px", color: "#555", lineHeight: 1.4 }}>
              WORKS: B40/1, ADDL. Ambernath MIDC, Anand Nagar, Opp. Hali Pad, Ambernath East, Dist. Thane - 421506
            </div>
            <div style={{ fontSize: "7.5px", color: "#555" }}>
              Tel: 08779301215 / 9769639388 | Email: info@vitonvalves.com | GSTIN: 27AACCV7755N1ZK
            </div>
          </div>
        </div>
        <div style={{ border: "2px solid #c41e3a", borderRadius: "4px", padding: "3px 10px", textAlign: "center" }}>
          <div style={{ background: "#c41e3a", color: "white", fontWeight: 800, fontSize: "10px", padding: "2px 4px", borderRadius: "2px" }}>
            WORK ORDER
          </div>
          <div style={{ fontSize: "8px", fontWeight: 700, marginTop: "2px" }}>{wo.wo_number}</div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "3px 12px", marginBottom: "6px", fontSize: "8px" }}>
        {[
          ["Party Name", wo.party_name],
          ["Delivery", wo.delivery_date],
          ["P.O. No.", wo.po_no],
          ["PO Date", wo.po_date],
          ["Inspection By", wo.inspection_by],
          ["QAP No.", wo.qap_no],
        ].map(([label, val]) => (
          <div key={label as string} style={{ display: "flex" }}>
            <span style={{ fontWeight: 700, color: "#c41e3a", width: "80px", textTransform: "uppercase" }}>{label}:</span>
            <span style={{ fontWeight: 600 }}>{val || "—"}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7px", border: "1px solid #a0a0a0" }}>
        <thead>
          <tr>
            {COLS_RENDER.map((c) => (
              <th key={c.key} style={headerStyle(c.width)}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #d8d8d8" }}>
              {COLS_RENDER.map((c) => (
                <td
                  key={c.key}
                  style={{
                    ...colStyle(c.width),
                    textAlign: ["type", "body_bonnet", "wedge_disc_plug_ball", "seat", "gasket", "remarks", "special_requirements"].includes(c.key) ? "left" : "center",
                  }}
                >
                  {String(item[c.key as keyof WorkOrderItem] || "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", borderTop: "1px solid #bbb", paddingTop: "4px" }}>
        {["Prepared By", "Checked By", "Approved By"].map((label) => (
          <div key={label} style={{ width: "28%", minHeight: "36px", borderTop: "1px solid #999", paddingTop: "2px" }}>
            <div style={{ fontSize: "7.5px", fontWeight: 700, color: "#555", textAlign: "center" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "6px", textAlign: "center", fontSize: "7px", color: "#888" }}>
        This is a computer generated Work Order and does not require a signature.
      </div>
    </div>
  );
}
