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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-viton-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!req) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Requisition not found.</p>
      </div>
    );
  }

  const lines = (req.line_items ?? []) as ReqLineItem[];
  const date = new Date(req.created_at).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8" style={{ fontFamily: "Arial, sans-serif", fontSize: "12px" }}>
      {/* Letterhead */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "14px", borderBottom: "3px solid #5060AB", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1, minWidth: 0 }}>
          <img
            src="/Logo.JPG"
            alt="Viton Engineers"
            style={{ width: "52px", height: "52px", objectFit: "contain", flexShrink: 0 }}
            crossOrigin="anonymous"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "17px", fontWeight: "900", color: "#111", letterSpacing: "0.3px" }}>VITON ENGINEERS PVT. LTD.</div>
            <div style={{ fontSize: "10px", color: "#555", marginTop: "3px", lineHeight: "1.5" }}>
              WORKS: B40/1, ADDL. Ambernath MIDC, Anand Nagar, Opp. Hali Pad, Ambernath East, Dist. Thane - 421506
            </div>
            <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>
              Tel: 08779301215 / 9769639388&nbsp;&nbsp;|&nbsp;&nbsp;Email: info@vitonvalves.com&nbsp;&nbsp;|&nbsp;&nbsp;GSTIN: <strong>27AACCV7755N1ZK</strong>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "24px" }}>
          <div style={{ border: "2px solid #5060AB", borderRadius: "8px", padding: "6px 16px 8px 16px", display: "inline-block", minWidth: "210px" }}>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#fff", background: "#5060AB", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", padding: "4px 6px" }}>
              Material Requisition
            </div>
            <div style={{ fontSize: "11px", fontWeight: "500", color: "#666", fontFamily: "monospace", marginTop: "6px", textAlign: "center" }}>
              {req.req_number}
            </div>
          </div>
          <div style={{ fontSize: "10px", color: "#666", marginTop: "6px" }}>Date: {date}</div>
        </div>
      </div>

      {/* Meta Info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
        <div style={{ background: "#f8f8f8", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "10px 12px" }}>
          <div style={{ fontSize: "9px", color: "#aaa", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "5px" }}>Requested By</div>
          <div style={{ fontWeight: "700", fontSize: "13px", color: "#111" }}>{req.requested_by_name ?? "—"}</div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>
            {req.department ? `Department: ${req.department}` : ""}
            {req.required_by ? ` | Required by: ${new Date(req.required_by).toLocaleDateString("en-IN")}` : ""}
          </div>
        </div>
        <div style={{ background: "#f8f8f8", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "10px 12px" }}>
          <div style={{ fontSize: "9px", color: "#aaa", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "5px" }}>Status & Priority</div>
          <div style={{ fontSize: "11px", color: "#555" }}>
            <div>Priority: <strong style={{ color: req.priority === "urgent" ? "red" : req.priority === "high" ? "orange" : "#555" }}>{req.priority.toUpperCase()}</strong></div>
            <div>Status: <strong>{req.status.replace(/_/g, " ").toUpperCase()}</strong></div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr style={{ background: "#5060AB" }}>
            {["Sr.", "Serial ID", "Description", "Qty", "Unit", "Note"].map((h, i) => (
              <th key={h} style={{
                padding: "7px 8px", color: "white", fontWeight: "700",
                textAlign: i < 3 ? "left" : "center",
                width: i === 0 ? "32px" : i === 1 ? "110px" : "auto",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #ebebeb" }}>
              <td style={{ padding: "7px 8px", color: "#999", verticalAlign: "top" }}>{i + 1}</td>
              <td style={{ padding: "7px 8px", fontFamily: "monospace", fontSize: "10px", color: "#3a4a8a", fontWeight: "700", verticalAlign: "top" }}>{line.serial_id || "—"}</td>
              <td style={{ padding: "7px 8px", color: "#111", verticalAlign: "top" }}>{line.name}</td>
              <td style={{ padding: "7px 8px", textAlign: "center", verticalAlign: "top" }}>{line.qty_requested}</td>
              <td style={{ padding: "7px 8px", textAlign: "center", verticalAlign: "top" }}>{line.unit}</td>
              <td style={{ padding: "7px 8px", textAlign: "left", verticalAlign: "top", fontSize: "10px", color: "#666" }}>{line.custom_note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Notes */}
      {req.notes && (
        <div style={{ margin: "12px 0 0 0", padding: "10px 12px", background: "#f0f2ff", border: "1px solid #c7ccee", borderRadius: "6px", fontSize: "11px" }}>
          <div style={{ fontWeight: "700", marginBottom: "4px", color: "#5060AB" }}>Notes:</div>
          <div style={{ color: "#444", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{req.notes}</div>
        </div>
      )}

      {/* Approval Section */}
      <div style={{ marginTop: "40px", border: "1px solid #ddd", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ background: "#5060AB", color: "white", padding: "6px 10px", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
          For Office Use Only — Approval
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", fontSize: "11px" }}>
          <div style={{ padding: "10px 12px", borderRight: "1px solid #e5e5e5", borderBottom: "1px solid #e5e5e5" }}>
            <div style={{ color: "#888", fontSize: "10px", marginBottom: "4px" }}>APPROVED BY</div>
            <div style={{ fontWeight: "700", color: "#111" }}>{req.approved_by_name ?? "_______________________"}</div>
            <div style={{ color: "#888", fontSize: "10px", marginTop: "2px" }}>
              Date: {req.approved_at ? new Date(req.approved_at).toLocaleDateString("en-IN") : "_______________________"}
            </div>
          </div>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #e5e5e5" }}>
            <div style={{ color: "#888", fontSize: "10px", marginBottom: "4px" }}>REJECTED BY</div>
            <div style={{ fontWeight: "700", color: "#111" }}>_______________________</div>
            <div style={{ color: "#888", fontSize: "10px", marginTop: "2px" }}>Date: _______________________</div>
          </div>
          <div style={{ padding: "10px 12px", borderRight: "1px solid #e5e5e5" }}>
            <div style={{ color: "#888", fontSize: "10px", marginBottom: "4px" }}>PO NUMBER (if converted)</div>
            <div style={{ fontWeight: "700", color: "#111" }}>_______________________</div>
          </div>
          <div style={{ padding: "10px 12px" }}>
            <div style={{ color: "#888", fontSize: "10px", marginBottom: "4px" }}>REMARKS</div>
            <div style={{ fontWeight: "700", color: "#111" }}>_______________________</div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", fontSize: "11px" }}>
        <div style={{ borderTop: "1px solid #333", paddingTop: "8px" }}>
          <div style={{ fontWeight: "700", color: "#111" }}>Requester Signature</div>
          <div style={{ color: "#555", marginTop: "4px" }}>{req.requested_by_name ?? "_______________________"}</div>
        </div>
        <div style={{ borderTop: "1px solid #333", paddingTop: "8px" }}>
          <div style={{ fontWeight: "700", color: "#111" }}>Manager Signature</div>
          <div style={{ color: "#555", marginTop: "4px" }}>_______________________</div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: "30px", textAlign: "center", fontSize: "10px", color: "#777" }}>
        This is a computer generated Material Requisition and does not require a signature if digitally verified.
      </div>

      <style jsx>{`
        @media print {
          body { background: white; padding: 0; margin: 0; }
        }
      `}</style>
    </div>
  );
}
