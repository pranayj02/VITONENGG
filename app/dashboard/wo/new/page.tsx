"use client";

import React, { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { useRouter } from "next/navigation";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { WOPdfDocument } from "@/components/WOPdf";
import type { WorkOrderItem, WorkOrder } from "@/lib/types";
import {
  Plus, Trash2, Save, Printer, X, FileText, Eye, ArrowLeft,
} from "lucide-react";

const EMPTY_ITEM = (): WorkOrderItem => ({
  sr_no: 1,
  po_sr_no: "",
  valve_sr_no: "",
  material_no: "",
  valve: "",
  type: "",
  bore: "",
  size_mm: "",
  rating: "",
  end_connection: "",
  body_bonnet: "",
  wedge_disc_plug_ball: "",
  stem_hinge: "",
  seat: "",
  gasket: "",
  gl_pkng: "",
  fasteners: "",
  operation: "",
  special_requirements: "",
  remarks: "",
  drawing_no: "",
  qty: "",
  delivery: "",
});

const COL_DEFS: { key: keyof WorkOrderItem; label: string; placeholder: string; width: number }[] = [
  { key: "sr_no", label: "Sr. No.", placeholder: "", width: 40 },
  { key: "po_sr_no", label: "P.O. SR. NO.", placeholder: "1", width: 50 },
  { key: "valve_sr_no", label: "VALVE SR.NO.", placeholder: "V123-1 TO V123-2", width: 110 },
  { key: "material_no", label: "Material No.", placeholder: "300905132", width: 90 },
  { key: "valve", label: "Valve", placeholder: "GATE VALVE", width: 70 },
  { key: "type", label: "Type", placeholder: "RISING STEM...", width: 100 },
  { key: "bore", label: "Bore", placeholder: "STD", width: 45 },
  { key: "size_mm", label: "Size MM", placeholder: "600", width: 50 },
  { key: "rating", label: "Rating", placeholder: "150#", width: 50 },
  { key: "end_connection", label: "End Conn.", placeholder: "FE' RF", width: 70 },
  { key: "body_bonnet", label: "Body / Bonnet", placeholder: "ASTM A 216 GR. WCB", width: 110 },
  { key: "wedge_disc_plug_ball", label: "Wedge / Disc / Plug / Ball", placeholder: "ASTM A 216 GR. WCB + 13% Cr. SS O/L", width: 130 },
  { key: "stem_hinge", label: "Stem / Hinge", placeholder: "SS 410", width: 70 },
  { key: "seat", label: "Seat", placeholder: "ASTM A 216 GR. WCB + 13% Cr. SS O/L", width: 110 },
  { key: "gasket", label: "Gasket", placeholder: "SPW SS 316 + GRAPHITE", width: 110 },
  { key: "gl_pkng", label: "GL. PKNG.", placeholder: "GRAPHITE", width: 70 },
  { key: "fasteners", label: "Fasteners", placeholder: "B7/2H", width: 60 },
  { key: "operation", label: "Operation", placeholder: "BARE STEM", width: 70 },
  { key: "special_requirements", label: "Special Req.", placeholder: "", width: 90 },
  { key: "remarks", label: "Remarks", placeholder: "TORQUE=...\nTHRUST=...", width: 120 },
  { key: "drawing_no", label: "Drawing No.", placeholder: "", width: 70 },
  { key: "qty", label: "Qty", placeholder: "2", width: 40 },
  { key: "delivery", label: "Delivery", placeholder: "08 - 10 WEEKS", width: 90 },
];

export default function NewWOPage() {
  const router = useRouter();
  const [woNumber, setWoNumber] = useState("");
  const [partyName, setPartyName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [poNo, setPoNo] = useState("");
  const [poDate, setPoDate] = useState("");
  const [inspectionBy, setInspectionBy] = useState("NO");
  const [qapNo, setQapNo] = useState("");
  const [items, setItems] = useState<WorkOrderItem[]>([{ ...EMPTY_ITEM(), sr_no: 1 }]);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");

  const addRow = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { ...EMPTY_ITEM(), sr_no: prev.length + 1 },
    ]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setItems((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((item, i) => ({ ...item, sr_no: i + 1 }))
    );
  }, []);

  const updateItem = useCallback((idx: number, key: keyof WorkOrderItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item))
    );
  }, []);

  const buildWOPayload = useCallback(() => {
    return {
      wo_number: woNumber,
      party_name: partyName,
      delivery_date: deliveryDate || null,
      po_no: poNo || null,
      po_date: poDate || null,
      inspection_by: inspectionBy || null,
      qap_no: qapNo || null,
      items: items.map((it) => ({ ...it })),
    };
  }, [woNumber, partyName, deliveryDate, poNo, poDate, inspectionBy, qapNo, items]);

  async function handleSave() {
    if (!woNumber.trim()) { setError("WO Number is required."); return; }
    if (!partyName.trim()) { setError("Party Name is required."); return; }
    if (items.length === 0) { setError("Add at least one item."); return; }
    setSaving(true);
    setError("");

    const supabase = createClient();
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      const { data: woRow, error: woErr } = await supabase
        .from("work_orders")
        .insert({
          wo_number: woNumber.trim(),
          party_name: partyName.trim(),
          delivery_date: deliveryDate || null,
          po_no: poNo || null,
          po_date: poDate || null,
          inspection_by: inspectionBy || null,
          qap_no: qapNo || null,
          created_by: user?.id ?? null,
          created_by_name: user?.email ?? null,
        })
        .select("id")
        .single();

      if (woErr || !woRow) throw woErr || new Error("Failed to create work order");

      const woId = woRow.id;

      const itemRows = items.map((it) => ({
        work_order_id: woId,
        sr_no: it.sr_no,
        po_sr_no: it.po_sr_no || null,
        valve_sr_no: it.valve_sr_no || null,
        material_no: it.material_no || null,
        valve: it.valve || null,
        type: it.type || null,
        bore: it.bore || null,
        size_mm: it.size_mm || null,
        rating: it.rating || null,
        end_connection: it.end_connection || null,
        body_bonnet: it.body_bonnet || null,
        wedge_disc_plug_ball: it.wedge_disc_plug_ball || null,
        stem_hinge: it.stem_hinge || null,
        seat: it.seat || null,
        gasket: it.gasket || null,
        gl_pkng: it.gl_pkng || null,
        fasteners: it.fasteners || null,
        operation: it.operation || null,
        special_requirements: it.special_requirements || null,
        remarks: it.remarks || null,
        drawing_no: it.drawing_no || null,
        qty: it.qty || null,
        delivery: it.delivery || null,
      }));

      const { error: itemsErr } = await supabase.from("work_order_items").insert(itemRows);
      if (itemsErr) throw itemsErr;

      setSavedId(woId as string);
      await audit({ action: "created", entity_type: "work_order", entity_id: woId as string, entity_code: woNumber.trim() });
    } catch (e: any) {
      setError(e?.message || "Failed to save work order.");
    } finally {
      setSaving(false);
    }
  }

  const woPayload = buildWOPayload();
  const woForPdf = {
    id: savedId || "preview",
    wo_number: woPayload.wo_number,
    party_name: woPayload.party_name,
    delivery_date: woPayload.delivery_date,
    po_no: woPayload.po_no,
    po_date: woPayload.po_date,
    inspection_by: woPayload.inspection_by,
    qap_no: woPayload.qap_no,
    created_by: null,
    created_by_name: null,
    created_at: new Date().toISOString(),
    items: woPayload.items,
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <button
            onClick={() => router.push("/dashboard/wo")}
            className="flex items-center gap-1 text-sm text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft size={12} /> Back to Work Orders
          </button>
          <h1 className="text-viton-navy dark:text-white text-xl font-bold tracking-tight">
            New Work Order
          </h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">
            Manually enter all fields. Nothing is auto-filled.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-700 text-viton-navy dark:text-white font-semibold px-3 py-2 rounded-lg text-xs hover:border-[#c0c8db] dark:hover:border-gray-600 transition-all"
          >
            <Eye size={15} /> Preview
          </button>
          {savedId && (
            <PDFDownloadLink
              document={<WOPdfDocument wo={woForPdf} />}
              fileName={`WO-${woNumber.replace(/\//g, "-")}.pdf`}
              className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-3 py-2 rounded-lg text-xs transition-all"
            >
              <Printer size={15} /> Download PDF
            </PDFDownloadLink>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? "Saving..." : savedId ? "Update" : "Save Work Order"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      {savedId && (
        <div className="mb-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2">
          <FileText size={15} />
          Work order saved successfully. WO ID: {savedId}
        </div>
      )}

      {/* ── Header Form ── */}
      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl p-4 mb-4">
        <p className="text-[#8892a8] dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
          Work Order Header
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {[
            { label: "WO Number", value: woNumber, setter: setWoNumber, placeholder: "e.g. 1092", required: true },
            { label: "Party Name", value: partyName, setter: setPartyName, placeholder: "INDIA GLYCOLS LTD - GORAKHPUR", required: true },
            { label: "Delivery", value: deliveryDate, setter: setDeliveryDate, placeholder: "30.06.2026" },
            { label: "P.O. No.", value: poNo, setter: setPoNo, placeholder: "4500061886" },
            { label: "PO Date", value: poDate, setter: setPoDate, placeholder: "26.05.2026" },
            { label: "Inspection By", value: inspectionBy, setter: setInspectionBy, placeholder: "NO" },
            { label: "QAP No.", value: qapNo, setter: setQapNo, placeholder: "—" },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-[10px] font-semibold text-[#4a5578] dark:text-gray-400 mb-1">
                {f.label} {f.required ? <span className="text-red-500">*</span> : null}
              </label>
              <input
                type="text"
                value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red/20 dark:focus:ring-orange-500/20 focus:border-viton-red dark:focus:border-orange-500 transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Items Table ── */}
      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[#8892a8] dark:text-gray-400 text-xs font-semibold uppercase tracking-widest">
            Line Items
          </p>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-semibold text-viton-red dark:text-orange-400 hover:text-viton-red-hover dark:hover:text-orange-300 transition-colors"
          >
            <Plus size={13} /> Add Row
          </button>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <div className="min-w-[1600px]">
            {/* Table Header */}
            <div className="grid bg-viton-navy dark:bg-gray-800 rounded-t-xl overflow-hidden">
              <div className="flex">
                {COL_DEFS.map((col) => (
                  <div
                    key={col.key}
                    style={{ width: col.width, minWidth: col.width }}
                    className="px-1.5 py-1.5 text-[9px] font-bold text-white uppercase tracking-wider text-center border-r border-white/10 last:border-r-0 flex-shrink-0 leading-tight"
                  >
                    {col.label}
                  </div>
                ))}
                <div className="w-10 px-1 py-2 flex-shrink-0" />
              </div>
            </div>

            {/* Table Rows */}
            <div className="border border-t-0 border-[#dde1ea] dark:border-gray-700 rounded-b-xl overflow-hidden">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start border-b border-[#dde1ea] dark:border-gray-700 last:border-b-0 ${idx % 2 === 1 ? "bg-[#f9fafc] dark:bg-gray-800/40" : "bg-white dark:bg-gray-900"}`}
                >
                  {COL_DEFS.map((col) => {
                    const isTextarea = col.key === "remarks" || col.key === "special_requirements" || col.key === "type" || col.key === "body_bonnet" || col.key === "wedge_disc_plug_ball" || col.key === "seat" || col.key === "gasket";
                    const val = item[col.key] ?? "";
                    return (
                      <div
                        key={col.key}
                        style={{ width: col.width, minWidth: col.width }}
                        className="px-1 py-1 border-r border-[#dde1ea] dark:border-gray-700 last:border-r-0 flex-shrink-0"
                      >
                        {isTextarea ? (
                          <textarea
                            value={String(val)}
                            onChange={(e) => updateItem(idx, col.key, e.target.value)}
                            placeholder={col.placeholder}
                            rows={1}
                            className="w-full bg-transparent text-[10px] text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-600 focus:outline-none resize-none leading-tight"
                          />
                        ) : (
                          <input
                            type={col.key === "sr_no" ? "number" : "text"}
                            value={String(val)}
                            onChange={(e) =>
                              updateItem(
                                idx,
                                col.key,
                                col.key === "sr_no" ? Number(e.target.value) || 0 : e.target.value
                              )
                            }
                            placeholder={col.placeholder}
                            className="w-full bg-transparent text-[10px] text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-600 focus:outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                  <div className="w-8 px-1 py-1 flex items-center justify-center flex-shrink-0">
                    <button
                      onClick={() => removeRow(idx)}
                      className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 hover:text-red-600 transition-colors"
                      title="Remove row"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {items.length === 0 && (
          <div className="text-center py-6 text-[#8892a8] dark:text-gray-500 text-sm">
            No items yet. Click "Add Row" to start.
          </div>
        )}
      </div>

      {/* ── Preview Modal ── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/80">
          <div className="bg-white rounded-2xl w-full max-w-5xl my-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
              <h2 className="font-bold text-gray-900 text-lg">Work Order Preview</h2>
              <div className="flex gap-2">
                {savedId && (
                  <PDFDownloadLink
                    document={<WOPdfDocument wo={woForPdf} />}
                    fileName={`WO-${woNumber.replace(/\//g, "-")}.pdf`}
                    className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                  >
                    <Printer size={15} /> Download PDF
                  </PDFDownloadLink>
                )}
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-[#8892a8] transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 bg-gray-100 overflow-x-auto">
              <WOScreenPreview wo={woForPdf} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Screen Preview (HTML, not PDF) ───────────────────────────────────────────
function WOScreenPreview({ wo }: { wo: WorkOrder & { items: WorkOrderItem[] } }) {
  const items = wo.items ?? [];
  const colStyle = (w: number): React.CSSProperties => ({
    width: w,
    minWidth: w,
    maxWidth: w,
    fontSize: "9px",
    padding: "3px 4px",
    borderRight: "1px solid #d0d0d0",
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
  });

  const COLS_PREVIEW = [
    { key: "sr_no", label: "Sr. No.", width: 22 },
    { key: "po_sr_no", label: "P.O. SR. NO.", width: 30 },
    { key: "valve_sr_no", label: "VALVE SR.NO.", width: 60 },
    { key: "material_no", label: "Material No.", width: 50 },
    { key: "valve", label: "Valve", width: 35 },
    { key: "type", label: "Type", width: 50 },
    { key: "bore", label: "Bore", width: 22 },
    { key: "size_mm", label: "Size MM", width: 26 },
    { key: "rating", label: "Rating", width: 26 },
    { key: "end_connection", label: "End Conn.", width: 36 },
    { key: "body_bonnet", label: "Body / Bonnet", width: 50 },
    { key: "wedge_disc_plug_ball", label: "Wedge / Disc / Plug / Ball", width: 60 },
    { key: "stem_hinge", label: "Stem / Hinge", width: 36 },
    { key: "seat", label: "Seat", width: 50 },
    { key: "gasket", label: "Gasket", width: 50 },
    { key: "gl_pkng", label: "GL. PKNG.", width: 34 },
    { key: "fasteners", label: "Fasteners", width: 34 },
    { key: "operation", label: "Operation", width: 36 },
    { key: "special_requirements", label: "Special Req.", width: 48 },
    { key: "remarks", label: "Remarks", width: 60 },
    { key: "drawing_no", label: "Drawing No.", width: 34 },
    { key: "qty", label: "Qty", width: 24 },
    { key: "delivery", label: "Delivery", width: 36 },
  ];

  return (
    <div
      className="bg-white text-gray-900"
      style={{ fontFamily: "Arial, sans-serif", fontSize: "10px", padding: "16px", minWidth: "900px" }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "8px", borderBottom: "2px solid #c41e3a", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <img src="/Logo.JPG" alt="Viton" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: "14px", fontWeight: 900 }}>VITON ENGINEERS PVT. LTD.</div>
            <div style={{ fontSize: "8px", color: "#555", lineHeight: 1.4 }}>
              WORKS: B40/1, ADDL. Ambernath MIDC, Anand Nagar, Opp. Hali Pad, Ambernath East, Dist. Thane - 421506
            </div>
            <div style={{ fontSize: "8px", color: "#555" }}>
              Tel: 08779301215 / 9769639388 | Email: info@vitonvalves.com | GSTIN: 27AACCV7755N1ZK
            </div>
          </div>
        </div>
        <div style={{ border: "2px solid #c41e3a", borderRadius: "4px", padding: "4px 12px", textAlign: "center" }}>
          <div style={{ background: "#c41e3a", color: "white", fontWeight: 800, fontSize: "11px", padding: "2px 4px", borderRadius: "2px" }}>
            WORK ORDER
          </div>
          <div style={{ fontSize: "9px", fontWeight: 700, marginTop: "3px" }}>{wo.wo_number}</div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 16px", marginBottom: "8px", fontSize: "9px" }}>
        {[
          ["Party Name", wo.party_name],
          ["Delivery", wo.delivery_date],
          ["P.O. No.", wo.po_no],
          ["PO Date", wo.po_date],
          ["Inspection By", wo.inspection_by],
          ["QAP No.", wo.qap_no],
        ].map(([label, val]) => (
          <div key={label as string} style={{ display: "flex" }}>
            <span style={{ fontWeight: 700, color: "#c41e3a", width: "90px", textTransform: "uppercase" }}>{label}:</span>
            <span style={{ fontWeight: 600 }}>{val || "—"}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px", border: "1px solid #b0b0b0" }}>
        <thead>
          <tr>
            {COLS_PREVIEW.map((c) => (
              <th key={c.key} style={headerStyle(c.width)}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#fafafa", borderBottom: "1px solid #e0e0e0" }}>
              {COLS_PREVIEW.map((c) => (
                <td key={c.key} style={{ ...colStyle(c.width), textAlign: c.key === "type" || c.key.includes("body") || c.key.includes("wedge") || c.key.includes("seat") || c.key.includes("gasket") || c.key === "remarks" || c.key === "special_requirements" ? "left" : "center" }}>
                  {String(item[c.key as keyof WorkOrderItem] || "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "8px", textAlign: "center", fontSize: "8px", color: "#888" }}>
        This is a computer generated Work Order and does not require a signature.
      </div>
    </div>
  );
}
