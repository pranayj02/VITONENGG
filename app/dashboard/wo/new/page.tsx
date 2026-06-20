"use client";

import React, { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { useRouter } from "next/navigation";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { WOPdfDocument } from "@/components/WOPdf";
import { DateInput } from "@/components/DateInput";
import type { WorkOrderItem, WorkOrder } from "@/lib/types";
import {
  Plus, Trash2, Save, Printer, X, Eye, ArrowLeft,
  ChevronDown, ChevronUp, Package, Settings, Wrench, AlignLeft,
  CheckCircle2, AlertCircle, Copy,
} from "lucide-react";

const EMPTY_ITEM = (): WorkOrderItem => ({
  sr_no: 1,
  po_sr_no: "",
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

const REQUIRED_ITEM_FIELDS: { key: keyof WorkOrderItem; label: string }[] = [
  { key: "valve", label: "Valve Type" },
  { key: "size_mm", label: "Size" },
  { key: "rating", label: "Rating" },
  { key: "end_connection", label: "End Connection" },
  { key: "body_bonnet", label: "Body / Bonnet" },
  { key: "wedge_disc_plug_ball", label: "Wedge / Disc / Plug / Ball" },
  { key: "qty", label: "Qty" },
];

// ── Field Groups ────────────────────────────────────────────────────────────
const FIELD_GROUPS = [
  {
    id: "identity",
    label: "Identity & Reference",
    icon: "package",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    fields: [
      { key: "po_sr_no", label: "P.O. Sr. No.", placeholder: "1", span: 1 },
      { key: "material_no", label: "Material No.", placeholder: "300905132", span: 1 },
      { key: "valve", label: "Valve Type", placeholder: "GATE VALVE", span: 1, required: true },
      { key: "drawing_no", label: "Drawing No.", placeholder: "DWG-001", span: 1 },
    ],
  },
  {
    id: "specs",
    label: "Valve Specifications",
    icon: "settings",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    fields: [
      { key: "type", label: "Type", placeholder: "RISING STEM, OS&Y", span: 2 },
      { key: "bore", label: "Bore", placeholder: "STD", span: 1 },
      { key: "size_mm", label: "Size (MM)", placeholder: "600", span: 1, required: true },
      { key: "rating", label: "Rating", placeholder: "150#", span: 1, required: true },
      { key: "end_connection", label: "End Connection", placeholder: "FE' RF", span: 1, required: true },
    ],
  },
  {
    id: "materials",
    label: "Materials of Construction",
    icon: "wrench",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    fields: [
      { key: "body_bonnet", label: "Body / Bonnet", placeholder: "ASTM A 216 GR. WCB", span: 2, required: true },
      { key: "wedge_disc_plug_ball", label: "Wedge / Disc / Plug / Ball", placeholder: "ASTM A 216 GR. WCB + 13% Cr. SS O/L", span: 2, required: true },
      { key: "stem_hinge", label: "Stem / Hinge", placeholder: "SS 410", span: 1 },
      { key: "seat", label: "Seat", placeholder: "ASTM A 216 GR. WCB + 13% Cr.", span: 2 },
      { key: "gasket", label: "Gasket", placeholder: "SPW SS 316 + GRAPHITE", span: 2 },
      { key: "gl_pkng", label: "Gland Packing", placeholder: "GRAPHITE", span: 1 },
      { key: "fasteners", label: "Fasteners", placeholder: "B7/2H", span: 1 },
    ],
  },
  {
    id: "operations",
    label: "Operations & Notes",
    icon: "align-left",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-500/10",
    fields: [
      { key: "operation", label: "Operation", placeholder: "BARE STEM", span: 1 },
      { key: "qty", label: "Qty", placeholder: "2", span: 1, required: true },
      { key: "special_requirements", label: "Special Requirements", placeholder: "Enter any special requirements...", span: 3, textarea: true },
      { key: "remarks", label: "Remarks", placeholder: "TORQUE=...\nTHRUST=...", span: 3, textarea: true },
    ],
  },
] as const;

function GroupIcon({ id, className }: { id: string; className?: string }) {
  if (id === "identity") return <Package size={14} className={className} />;
  if (id === "specs") return <Settings size={14} className={className} />;
  if (id === "materials") return <Wrench size={14} className={className} />;
  return <AlignLeft size={14} className={className} />;
}

function getMissingRequiredFields(item: WorkOrderItem) {
  return REQUIRED_ITEM_FIELDS.filter(({ key }) => !String(item[key] ?? "").trim());
}

// ── Item Card ───────────────────────────────────────────────────────────────
function ItemCard({
  item,
  idx,
  onUpdate,
  onRemove,
}: {
  item: WorkOrderItem;
  idx: number;
  onUpdate: (key: keyof WorkOrderItem, val: string | number) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(idx === 0);
  const [activeGroup, setActiveGroup] = useState<string>("identity");

  const hasContent = item.valve || item.valve_sr_no || item.material_no || item.type;
  const missingRequired = getMissingRequiredFields(item);
  const isComplete = missingRequired.length === 0;

  return (
    <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-700 rounded-xl overflow-hidden transition-all">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-[#f9fafc] dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-viton-navy dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{idx + 1}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {item.valve && (
                <span className="text-xs font-semibold text-viton-navy dark:text-white">
                  {item.valve}
                </span>
              )}
              {item.size_mm && (
                <span className="text-[11px] bg-[#f1f3f8] dark:bg-gray-700 text-[#4a5578] dark:text-gray-300 px-1.5 py-0.5 rounded font-medium">
                  {item.size_mm} MM
                </span>
              )}
              {item.rating && (
                <span className="text-[11px] bg-[#f1f3f8] dark:bg-gray-700 text-[#4a5578] dark:text-gray-300 px-1.5 py-0.5 rounded font-medium">
                  {item.rating}
                </span>
              )}
              {!hasContent && (
                <span className="text-[#8892a8] dark:text-gray-500 text-xs">
                  Line Item {idx + 1} — click to fill
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {item.valve_sr_no && (
                <div className="text-[11px] text-[#8892a8] dark:text-gray-500 truncate">
                  Sr. {item.valve_sr_no}
                </div>
              )}
              {hasContent && !isComplete && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  {missingRequired.length} required field{missingRequired.length > 1 ? "s" : ""} missing
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasContent && isComplete && (
            <CheckCircle2 size={14} className="text-emerald-500" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-[#8892a8] hover:text-red-500 transition-colors"
            title="Remove item"
          >
            <Trash2 size={13} />
          </button>
          {expanded ? (
            <ChevronUp size={15} className="text-[#8892a8]" />
          ) : (
            <ChevronDown size={15} className="text-[#8892a8]" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#dde1ea] dark:border-gray-700">
          <div className="flex border-b border-[#dde1ea] dark:border-gray-700 overflow-x-auto">
            {FIELD_GROUPS.map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveGroup(group.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeGroup === group.id
                    ? `border-viton-red dark:border-orange-500 text-viton-navy dark:text-white`
                    : `border-transparent text-[#8892a8] dark:text-gray-500 hover:text-[#4a5578] dark:hover:text-gray-300`
                }`}
              >
                <GroupIcon id={group.id} className={activeGroup === group.id ? group.color : ""} />
                {group.label}
              </button>
            ))}
          </div>

          {FIELD_GROUPS.map((group) => {
            if (group.id !== activeGroup) return null;
            return (
              <div key={group.id} className="p-4">
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                  {group.fields.map((f) => {
                    const val = item[f.key as keyof WorkOrderItem] ?? "";
                    const isTextarea = (f as any).textarea;
                    const span = (f as any).span ?? 1;
                    return (
                      <div
                        key={f.key}
                        className={`${span === 1 ? "col-span-1" : span === 2 ? "col-span-3 lg:col-span-2" : "col-span-3 lg:col-span-6"}`}
                      >
                        <label className="block text-[10px] font-semibold text-[#4a5578] dark:text-gray-400 mb-1 uppercase tracking-wide">
                          {f.label}
                          {(f as any).required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {isTextarea ? (
                          <textarea
                            value={String(val)}
                            onChange={(e) => onUpdate(f.key as keyof WorkOrderItem, e.target.value)}
                            placeholder={f.placeholder}
                            rows={2}
                            className="w-full bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red/20 dark:focus:ring-orange-500/20 focus:border-viton-red dark:focus:border-orange-500 transition-all resize-none"
                          />
                        ) : (
                          <input
                            type="text"
                            value={String(val)}
                            onChange={(e) => onUpdate(f.key as keyof WorkOrderItem, e.target.value)}
                            placeholder={f.placeholder}
                            className="w-full bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red/20 dark:focus:ring-orange-500/20 focus:border-viton-red dark:focus:border-orange-500 transition-all"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NewWOPage() {
  const router = useRouter();
  const [woNumber, setWoNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [poNo, setPoNo] = useState("");
  const [poDate, setPoDate] = useState("");
  const [inspectionBy, setInspectionBy] = useState("NO");
  const [qapNo, setQapNo] = useState("");
  const [items, setItems] = useState<WorkOrderItem[]>([{ ...EMPTY_ITEM(), sr_no: 1 }]);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [woExists, setWoExists] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!woNumber.trim()) { setWoExists(false); return; }
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("work_orders")
        .select("id")
        .eq("wo_number", woNumber.trim())
        .maybeSingle();
      setWoExists(!!data);
    }, 400);
    return () => clearTimeout(timer);
  }, [woNumber]);
  const [error, setError] = useState("");

  const addRow = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { ...EMPTY_ITEM(), sr_no: prev.length + 1 },
    ]);
  }, []);

  const duplicateLast = useCallback(() => {
    setItems((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [
        ...prev,
        {
          ...last,
          sr_no: prev.length + 1,
                  po_sr_no: "",
          delivery: "",
        },
      ];
    });
  }, []);

  const removeRow = useCallback((idx: number) => {
    setItems((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((item, i) => ({ ...item, sr_no: i + 1 }))
    );
  }, []);

  const updateItem = useCallback(
    (idx: number, key: keyof WorkOrderItem, value: string | number) => {
      setItems((prev) =>
        prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item))
      );
    },
    []
  );

  const buildWOPayload = useCallback(() => {
    return {
      wo_number: woNumber,
      party_name: customerName,
      delivery_date: deliveryDate || null,
      po_no: poNo || null,
      po_date: poDate || null,
      inspection_by: inspectionBy || null,
      qap_no: qapNo || null,
      items: items.map((it) => ({ ...it, delivery: "" })),
    };
  }, [woNumber, customerName, deliveryDate, poNo, poDate, inspectionBy, qapNo, items]);

  async function handleSave() {
    if (!woNumber.trim()) { setError("WO Number is required."); return; }
    if (woExists) { setError("A work order with this number already exists."); return; }
    if (!customerName.trim()) { setError("Customer is required."); return; }
    if (items.length === 0) { setError("Add at least one item."); return; }

    const firstInvalidIndex = items.findIndex((item) => getMissingRequiredFields(item).length > 0);
    if (firstInvalidIndex !== -1) {
      const missing = getMissingRequiredFields(items[firstInvalidIndex]).map((field) => field.label).join(", ");
      setError(`Line Item ${firstInvalidIndex + 1} is missing required fields: ${missing}.`);
      return;
    }

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
          party_name: customerName.trim(),
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
        delivery: null,
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

  const filledItems = items.filter((i) => i.valve || i.valve_sr_no || i.material_no).length;

  return (
    <div className="p-4 lg:p-6 max-w-[920px] mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push("/dashboard/wo")}
          className="flex items-center gap-1.5 text-xs text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft size={12} /> Back to Work Orders
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-viton-navy dark:text-white text-xl font-bold tracking-tight">
              New Work Order
            </h1>
            <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">
              All fields must be entered manually.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-700 text-viton-navy dark:text-white font-semibold px-3 py-2 rounded-lg text-xs hover:border-[#c0c8db] dark:hover:border-gray-600 transition-all"
            >
              <Eye size={14} /> Preview
            </button>
            {savedId && (
              <PDFDownloadLink
                document={<WOPdfDocument wo={woForPdf} />}
                fileName={`WO-${woNumber.replace(/\//g, "-")}.pdf`}
                className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-3 py-2 rounded-lg text-xs transition-all"
              >
                <Printer size={14} /> Download PDF
              </PDFDownloadLink>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-all disabled:opacity-60"
            >
              <Save size={14} />
              {saving ? "Saving..." : savedId ? "Update WO" : "Save Work Order"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 px-3 py-2.5 rounded-lg text-xs font-medium">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
      {savedId && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300 px-3 py-2.5 rounded-lg text-xs font-medium">
          <CheckCircle2 size={14} />
          Work order saved successfully — ID: {savedId}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 bg-viton-red dark:bg-orange-500 rounded-full" />
          <h2 className="text-xs font-bold text-viton-navy dark:text-white uppercase tracking-widest">
            Work Order Header
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { label: "WO Number", value: woNumber, setter: setWoNumber, placeholder: "e.g. 1092", required: true, isWoNumber: true },
            { label: "Customer", value: customerName, setter: setCustomerName, placeholder: "INDIA GLYCOLS LTD - GORAKHPUR", required: true, wide: true },
            { label: "Delivery Date", value: deliveryDate, setter: setDeliveryDate, isDate: true },
            { label: "P.O. No.", value: poNo, setter: setPoNo, placeholder: "4500061886" },
            { label: "PO Date", value: poDate, setter: setPoDate, isDate: true },
            { label: "Inspection By", value: inspectionBy, setter: setInspectionBy, placeholder: "NO" },
            { label: "QAP No.", value: qapNo, setter: setQapNo, placeholder: "—" },
          ].map((f) => (
            <div key={f.label} className={(f as any).wide ? "col-span-2 sm:col-span-3 lg:col-span-2" : ""}>
              {(f as any).isDate ? (
                <DateInput
                  label={f.label}
                  value={f.value}
                  onChange={(val) => f.setter(val)}
                  required={f.required}
                />
              ) : (
                <>
                  <label className="block text-[10px] font-semibold text-[#4a5578] dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    {f.label}
                    {f.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <input
                    type="text"
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    className={`w-full bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red/20 dark:focus:ring-orange-500/20 focus:border-viton-red dark:focus:border-orange-500 transition-all ${(f as any).isWoNumber && typeof woExists !== "undefined" && woExists ? "border-red-300 dark:border-red-500/40 focus:border-red-500" : ""}`}
                  />
                  {(f as any).formatHint && (
                    <p className="text-[10px] text-[#8892a8] dark:text-gray-500 mt-0.5">Format: {(f as any).formatHint}</p>
                  )}
                  {(f as any).isWoNumber && typeof woExists !== "undefined" && woExists && (
                    <p className="text-[10px] text-red-500 mt-0.5 font-medium">This WO number already exists.</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-viton-red dark:bg-orange-500 rounded-full" />
            <h2 className="text-xs font-bold text-viton-navy dark:text-white uppercase tracking-widest">
              Line Items
            </h2>
            <span className="text-[11px] font-semibold text-[#8892a8] dark:text-gray-500 bg-[#f1f3f8] dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {items.length} total{filledItems > 0 ? ` · ${filledItems} filled` : ""}
            </span>
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-semibold bg-viton-red/5 dark:bg-orange-500/10 text-viton-red dark:text-orange-400 hover:bg-viton-red/10 dark:hover:bg-orange-500/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={13} /> Add Item
          </button>
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-10 text-[#8892a8] dark:text-gray-500">
              <Package size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No items yet.</p>
              <p className="text-xs mt-0.5">Click "Add Item" to start building this work order.</p>
            </div>
          ) : (
            items.map((item, idx) => (
              <ItemCard
                key={idx}
                item={item}
                idx={idx}
                onUpdate={(key, val) => updateItem(idx, key, val)}
                onRemove={() => removeRow(idx)}
              />
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={addRow}
              className="flex items-center justify-center gap-2 border-2 border-dashed border-[#dde1ea] dark:border-gray-700 text-[#8892a8] dark:text-gray-500 hover:border-viton-red dark:hover:border-orange-500 hover:text-viton-red dark:hover:text-orange-400 py-3 rounded-xl text-xs font-semibold transition-all"
            >
              <Plus size={13} /> Add New Item
            </button>
            <button
              onClick={duplicateLast}
              className="flex items-center justify-center gap-2 border-2 border-dashed border-[#dde1ea] dark:border-gray-700 text-[#8892a8] dark:text-gray-500 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 py-3 rounded-xl text-xs font-semibold transition-all"
            >
              <Copy size={13} /> Duplicate Previous Item
            </button>
          </div>
        )}
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl px-4 py-3 shadow-lg">
          <span className="text-xs text-[#8892a8] dark:text-gray-500 mr-2">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-viton-navy dark:text-white border border-[#dde1ea] dark:border-gray-700 px-3 py-2 rounded-lg hover:bg-[#f6f8fc] dark:hover:bg-gray-800 transition-all"
          >
            <Eye size={13} /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-all disabled:opacity-60"
          >
            <Save size={13} />
            {saving ? "Saving..." : savedId ? "Update WO" : "Save Work Order"}
          </button>
        </div>
      </div>

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
    { key: "stem_hinge", label: "Stem / Hinge", width: 40 },
    { key: "seat", label: "Seat", width: 50 },
    { key: "gasket", label: "Gasket", width: 50 },
    { key: "gl_pkng", label: "Gland Packing", width: 40 },
    { key: "fasteners", label: "Fasteners", width: 36 },
    { key: "operation", label: "Operation", width: 36 },
    { key: "special_requirements", label: "Special Req.", width: 48 },
    { key: "remarks", label: "Remarks", width: 60 },
    { key: "drawing_no", label: "Drawing No.", width: 34 },
    { key: "qty", label: "Qty", width: 24 },
  ];

  return (
    <div
      className="bg-white text-gray-900"
      style={{ fontFamily: "Arial, sans-serif", fontSize: "10px", padding: "16px", minWidth: "900px" }}
    >
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
          <div style={{ background: "#c41e3a", color: "white", fontWeight: 800, fontSize: "11px", padding: "2px 4px", borderRadius: "2px" }}>WORK ORDER</div>
          <div style={{ fontSize: "9px", fontWeight: 700, marginTop: "3px" }}>{wo.wo_number}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 16px", marginBottom: "8px", fontSize: "9px" }}>
        {[["Customer", wo.party_name], ["Delivery", wo.delivery_date], ["P.O. No.", wo.po_no], ["PO Date", wo.po_date], ["Inspection By", wo.inspection_by], ["QAP No.", wo.qap_no]].map(([label, val]) => (
          <div key={label as string} style={{ display: "flex" }}>
            <span style={{ fontWeight: 700, color: "#c41e3a", width: "90px", textTransform: "uppercase" }}>{label}:</span>
            <span style={{ fontWeight: 600 }}>{val || "—"}</span>
          </div>
        ))}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px", border: "1px solid #b0b0b0" }}>
        <thead>
          <tr>{COLS_PREVIEW.map((c) => <th key={c.key} style={headerStyle(c.width)}>{c.label}</th>)}</tr>
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
