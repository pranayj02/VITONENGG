"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import {
  Search, Plus, Trash2, FileText, Save, X,
  CheckCircle, Printer, ChevronDown, ChevronUp,
} from "lucide-react";
import type { Item, Vendor, LineItem } from "@/lib/types";

// ─── Extended Types ───────────────────────────────────────────────────────────
interface LineItemWithNote extends LineItem {
  custom_note: string;
}

interface DispatchMeta {
  mode_of_dispatch: string;
  delivery: string;
  place_of_delivery: string;
  inspection: string;
  taxes: string;
  pf_mode: "nil" | "percent" | "fixed";
  pf_value: number;
}

const DEFAULT_DISPATCH: DispatchMeta = {
  mode_of_dispatch: "",
  delivery: "Urgent",
  place_of_delivery: "At Ambernath Works",
  inspection: "By VITON",
  taxes: "At Actual",
  pf_mode: "nil",
  pf_value: 0,
};

function computePF(subtotal: number, meta: DispatchMeta): number {
  if (meta.pf_mode === "nil" || meta.pf_value <= 0) return 0;
  if (meta.pf_mode === "percent") return Math.round((subtotal * meta.pf_value) / 100);
  return meta.pf_value;
}

// ─── PO Document (Print / Preview) ───────────────────────────────────────────
function PODocument({
  poNumber, vendor, lineItems, subtotal, pfAmount, grandTotal,
  notes, dispatch, date,
}: {
  poNumber: string;
  vendor: Vendor | null;
  lineItems: LineItemWithNote[];
  subtotal: number;
  pfAmount: number;
  grandTotal: number;
  notes: string;
  dispatch: DispatchMeta;
  date: string;
}) {
  return (
    <div
      className="po-preview-document bg-white text-gray-900"
      style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", padding: "28px 32px" }}
    >
      {/* ── Letterhead ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "14px", borderBottom: "3px solid #ea580c", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ width: "52px", height: "52px", background: "#ea580c", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "white", fontWeight: "900", fontSize: "22px", letterSpacing: "-1px" }}>V</span>
          </div>
          <div>
            <div style={{ fontSize: "17px", fontWeight: "900", color: "#111", letterSpacing: "0.3px" }}>VITON ENGINEERS PVT. LTD.</div>
            <div style={{ fontSize: "10px", color: "#555", marginTop: "3px", lineHeight: "1.5" }}>
              WORKS: B401, ADDL. Ambernath MIDC, Anand Nagar, Opp. Hali Pad, Ambernath East, Dist. Thane - 421506
            </div>
            <div style={{ fontSize: "10px", color: "#555" }}>
              OFFICE: 701, 7th Floor, Swastik Disa Corporate Park, LBS Marg, Ghatkopar W, Mumbai - 400086
            </div>
            <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>
              Tel: 08779301215 / 9769639388&nbsp;&nbsp;|&nbsp;&nbsp;Email: info@vitonvalves.com&nbsp;&nbsp;|&nbsp;&nbsp;GSTIN: <strong>27AACCV7755N1ZK</strong>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "24px" }}>
          <div style={{ border: "2px solid #ea580c", borderRadius: "8px", padding: "8px 16px", display: "inline-block" }}>
            <div style={{ fontSize: "9px", color: "#999", textTransform: "uppercase", letterSpacing: "1.5px" }}>Purchase Order</div>
            <div style={{ fontSize: "15px", fontWeight: "bold", color: "#ea580c", fontFamily: "monospace", marginTop: "2px" }}>{poNumber}</div>
          </div>
          <div style={{ fontSize: "10px", color: "#666", marginTop: "6px" }}>Date: {date}</div>
        </div>
      </div>

      {/* ── To + PO Meta ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
        <div style={{ background: "#f8f8f8", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "10px 12px" }}>
          <div style={{ fontSize: "9px", color: "#aaa", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "5px" }}>To</div>
          <div style={{ fontWeight: "700", fontSize: "13px", color: "#111" }}>{vendor?.name ?? "—"}</div>
          {vendor?.address && <div style={{ color: "#555", marginTop: "3px", fontSize: "11px", lineHeight: "1.4" }}>{vendor.address}</div>}
          {vendor?.gstin && <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>GSTIN: {vendor.gstin}</div>}
          {vendor?.contact_name && <div style={{ color: "#444", marginTop: "6px", fontSize: "11px" }}>Kind Attn: <strong>{vendor.contact_name}</strong></div>}
          {vendor?.contact_phone && <div style={{ color: "#555", fontSize: "11px" }}>Tel: {vendor.contact_phone}</div>}
        </div>
        <div style={{ background: "#f8f8f8", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "10px 12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <tbody>
              {[
                ["Your Quot. No.", "—"],
                ["Your Quot. Date", "—"],
                ["Payment Terms", vendor?.payment_terms ?? "60 Days"],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ color: "#888", paddingBottom: "5px", width: "45%" }}>{label}</td>
                  <td style={{ fontWeight: "600", color: "#111", paddingBottom: "5px" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Items Table ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr style={{ background: "#ea580c" }}>
            {["Sr.", "Serial ID", "Particulars", "Qty.", "Unit", "Rate Rs.", "Total Rs."].map((h, i) => (
              <th key={h} style={{
                padding: "7px 8px", color: "white", fontWeight: "700", textAlign: i < 3 ? "left" : (i >= 5 ? "right" : "center"),
                width: ["32px", "110px", "auto", "50px", "44px", "80px", "90px"][i],
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lineItems.map((line, i) => (
            <React.Fragment key={i}>
              <tr style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: line.custom_note ? "none" : "1px solid #ebebeb" }}>
                <td style={{ padding: "7px 8px", color: "#999", verticalAlign: "top" }}>{i + 1}</td>
                <td style={{ padding: "7px 8px", fontFamily: "monospace", fontSize: "10px", color: "#c2410c", fontWeight: "700", verticalAlign: "top" }}>{line.serial_id}</td>
                <td style={{ padding: "7px 8px", color: "#111", verticalAlign: "top" }}>{line.name}</td>
                <td style={{ padding: "7px 8px", textAlign: "center", verticalAlign: "top" }}>{line.quantity}</td>
                <td style={{ padding: "7px 8px", textAlign: "center", color: "#666", verticalAlign: "top" }}>{line.unit}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", verticalAlign: "top" }}>{line.unit_price.toLocaleString("en-IN")}</td>
                <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: "700", verticalAlign: "top" }}>{line.total.toLocaleString("en-IN")}</td>
              </tr>
              {line.custom_note && (
                <tr style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #ebebeb" }}>
                  <td></td>
                  <td colSpan={6} style={{ padding: "1px 8px 7px 8px", color: "#666", fontSize: "10px", fontStyle: "italic" }}>
                    ↳ {line.custom_note}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          {pfAmount > 0 && (
            <tr style={{ borderTop: "1px solid #ddd" }}>
              <td colSpan={6} style={{ padding: "6px 8px", textAlign: "right", color: "#555" }}>Subtotal</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{subtotal.toLocaleString("en-IN")}</td>
            </tr>
          )}
          {pfAmount > 0 && (
            <tr style={{ borderTop: "1px solid #ddd" }}>
              <td colSpan={6} style={{ padding: "6px 8px", textAlign: "right", color: "#555" }}>
                Packing &amp; Forwarding {dispatch.pf_mode === "percent" ? `(${dispatch.pf_value}%)` : ""}
              </td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{pfAmount.toLocaleString("en-IN")}</td>
            </tr>
          )}
          <tr style={{ background: "#111", color: "white" }}>
            <td colSpan={6} style={{ padding: "9px 8px", textAlign: "right", fontWeight: "700", letterSpacing: "1px" }}>TOTAL</td>
            <td style={{ padding: "9px 8px", textAlign: "right", fontWeight: "700", fontSize: "13px" }}>
              Rs.&nbsp;{grandTotal.toLocaleString("en-IN")}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ── Notes ── */}
      {notes && (
        <div style={{ margin: "12px 0 0 0", padding: "10px 12px", background: "#fffbf5", border: "1px solid #fde8c8", borderRadius: "6px", fontSize: "11px" }}>
          <div style={{ fontWeight: "700", marginBottom: "4px", color: "#c2410c" }}>Notes:</div>
          <div style={{ color: "#444", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{notes}</div>
        </div>
      )}

      {/* ── Dispatch Footer ── */}
      <div style={{ marginTop: "14px", border: "1px solid #ddd", borderRadius: "6px", overflow: "hidden", fontSize: "10px" }}>
        {[
          [
            { label: "DELIVERY", value: dispatch.delivery },
            { label: "INSPECTION", value: dispatch.inspection },
          ],
          [
            { label: "MODE OF DESPATCH", value: dispatch.mode_of_dispatch || "—" },
            {
              label: "PACKING & FORWARDING",
              value: dispatch.pf_mode === "nil"
                ? "Nil"
                : `Rs. ${pfAmount.toLocaleString("en-IN")}${dispatch.pf_mode === "percent" ? ` (${dispatch.pf_value}%)` : ""}`,
            },
          ],
          [
            { label: "PLACE OF DELIVERY", value: dispatch.place_of_delivery },
            { label: "TAXES", value: dispatch.taxes },
          ],
        ].map((row, ri) => (
          <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: ri < 2 ? "1px solid #e5e5e5" : "none" }}>
            {row.map((cell, ci) => (
              <div key={ci} style={{ padding: "6px 10px", borderRight: ci === 0 ? "1px solid #e5e5e5" : "none" }}>
                <span style={{ color: "#999" }}>{cell.label}: </span>
                <span style={{ fontWeight: "700", color: "#111" }}>{cell.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Signature ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "28px" }}>
        <div style={{ textAlign: "center", minWidth: "200px" }}>
          <div style={{ height: "40px" }}></div>
          <div style={{ borderTop: "1px solid #aaa", paddingTop: "6px" }}>
            <div style={{ fontWeight: "700", fontSize: "11px" }}>For VITON ENGINEERS PVT. LTD.</div>
            <div style={{ color: "#888", fontSize: "10px", marginTop: "2px" }}>Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ─────────────────────────────────────────────────────────────
function POPreviewModal({
  poNumber, vendor, lineItems, subtotal, pfAmount, grandTotal,
  notes, dispatch, onClose,
}: {
  poNumber: string; vendor: Vendor | null; lineItems: LineItemWithNote[];
  subtotal: number; pfAmount: number; grandTotal: number;
  notes: string; dispatch: DispatchMeta; onClose: () => void;
}) {
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          .po-print-wrapper { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; background: white; }
        }
        .po-print-wrapper { display: none; }
      `}</style>

      <div className="po-print-wrapper">
        <PODocument
          poNumber={poNumber} vendor={vendor} lineItems={lineItems}
          subtotal={subtotal} pfAmount={pfAmount} grandTotal={grandTotal}
          notes={notes} dispatch={dispatch} date={today}
        />
      </div>

      <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-3xl my-4 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <h2 className="font-bold text-gray-900 text-lg">Purchase Order Preview</h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
              >
                <Printer size={15} /> Print / Save PDF
              </button>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all">
                <X size={18} />
              </button>
            </div>
          </div>
          <PODocument
            poNumber={poNumber} vendor={vendor} lineItems={lineItems}
            subtotal={subtotal} pfAmount={pfAmount} grandTotal={grandTotal}
            notes={notes} dispatch={dispatch} date={today}
          />
        </div>
      </div>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function NewPOPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [lineItems, setLineItems] = useState<LineItemWithNote[]>([]);
  const [dispatch, setDispatch] = useState<DispatchMeta>(DEFAULT_DISPATCH);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemNote, setItemNote] = useState("");
  const [notes, setNotes] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedPoId, setSavedPoId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [error, setError] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId) ?? null;
  const subtotal = lineItems.reduce((s, l) => s + l.total, 0);
  const pfAmount = computePF(subtotal, dispatch);
  const grandTotal = subtotal + pfAmount;

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: vData } = await supabase.from("vendors").select("*").order("name");
      setVendors((vData ?? []) as unknown as Vendor[]);
      const { count } = await supabase.from("purchase_orders").select("*", { count: "exact", head: true });
      const nextNum = 170 + (count ?? 0);
      setPoNumber(`VEPL/PUR/${nextNum}/25-26`);
    }
    init();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchItems = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setShowSearch(false); return; }
    const supabase = createClient();
    const { data } = await supabase.from("items").select("*").or(`serial_id.ilike.%${q}%,name.ilike.%${q}%`).limit(8);
    const rows = (data ?? []) as unknown as Item[];
    setSearchResults(rows);
    setShowSearch(rows.length > 0);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchItems(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery, searchItems]);

  async function fetchLastPrice(itemId: string, vendorId: string) {
    if (!itemId || !vendorId) return;
    const supabase = createClient();
    const { data } = await supabase.from("vendor_items").select("last_price").eq("item_id", itemId).eq("vendor_id", vendorId).maybeSingle();
    if (data) {
      const row = data as unknown as { last_price: number };
      if (row.last_price) setItemPrice(row.last_price);
    }
  }

  function selectItem(item: Item) {
    setSelectedItem(item);
    setSearchQuery(item.serial_id);
    setShowSearch(false);
    setItemQty(1);
    setItemPrice(0);
    setItemNote("");
    if (selectedVendorId) fetchLastPrice(item.id, selectedVendorId);
  }

  function addLineItem() {
    if (!selectedItem) return;
    const line: LineItemWithNote = {
      item_id: selectedItem.id,
      serial_id: selectedItem.serial_id,
      name: selectedItem.name,
      hsn_code: selectedItem.hsn_code ?? "",
      unit: selectedItem.unit,
      quantity: itemQty,
      unit_price: itemPrice,
      total: itemQty * itemPrice,
      custom_note: itemNote.trim(),
    };
    setLineItems((prev) => [...prev, line]);
    setSelectedItem(null);
    setSearchQuery("");
    setItemQty(1);
    setItemPrice(0);
    setItemNote("");
  }

  function updateLineNote(idx: number, note: string) {
    setLineItems((prev) => prev.map((l, i) => i === idx ? { ...l, custom_note: note } : l));
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function setDispatchField<K extends keyof DispatchMeta>(key: K, value: DispatchMeta[K]) {
    setDispatch((d) => ({ ...d, [key]: value }));
  }

  async function handleSave(status: string) {
    if (!selectedVendorId) { setError("Please select a vendor first."); return; }
    if (lineItems.length === 0) { setError("Add at least one item to the PO."); return; }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error: saveErr } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: poNumber,
        vendor_id: selectedVendorId,
        status,
        line_items: lineItems,
        subtotal,
        total: grandTotal,
        notes: notes.trim() || null,
        dispatch_meta: dispatch,
      })
      .select("id")
      .single();
    if (saveErr) { setError(saveErr.message); setSaving(false); return; }
    const row = data as unknown as { id: string };
    setSavedPoId(row.id);
    setSaving(false);
  }

  if (savedPoId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-1">PO Created!</h2>
          <p className="text-gray-400 text-sm font-mono mb-6">{poNumber}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setShowPreview(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
            >
              <Printer size={15} /> Preview and Print
            </button>
            <a href="/dashboard/po/new" className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
              <Plus size={15} /> New PO
            </a>
            <a href="/dashboard/history" className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm">
              View History
            </a>
          </div>
        </div>
        {showPreview && (
          <POPreviewModal
            poNumber={poNumber} vendor={selectedVendor} lineItems={lineItems}
            subtotal={subtotal} pfAmount={pfAmount} grandTotal={grandTotal}
            notes={notes} dispatch={dispatch} onClose={() => setShowPreview(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">New Purchase Order</h1>
        <p className="text-gray-500 text-sm mt-1">
          PO No: <span className="text-orange-400 font-mono font-semibold">{poNumber}</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm">{error}</div>
      )}

      <div className="grid gap-5">

        {/* ── Vendor ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Vendor</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Select Vendor *</label>
              <select
                value={selectedVendorId}
                onChange={(e) => {
                  setSelectedVendorId(e.target.value);
                  const v = vendors.find((v) => v.id === e.target.value);
                  if (v?.payment_terms) setDispatchField("mode_of_dispatch", "");
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">— select vendor —</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">PO Number</label>
              <input
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          {selectedVendor && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {selectedVendor.address && <span>{selectedVendor.address}</span>}
              {selectedVendor.contact_name && <span>{selectedVendor.contact_name}</span>}
              {selectedVendor.contact_phone && <span>{selectedVendor.contact_phone}</span>}
              {selectedVendor.gstin && <span className="font-mono">GST: {selectedVendor.gstin}</span>}
            </div>
          )}
        </div>

        {/* ── Item Search ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Add Items</h2>
          <div className="relative" ref={searchContainerRef}>
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedItem(null); }}
              placeholder="Search by serial ID or item name..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden z-50 shadow-2xl">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectItem(item)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700 transition-colors text-left border-b border-gray-700/40 last:border-0"
                  >
                    <div>
                      <p className="text-orange-400 font-mono text-xs font-semibold">{item.serial_id}</p>
                      <p className="text-white text-sm mt-0.5">{item.name}</p>
                    </div>
                    <span className="text-gray-500 text-xs ml-4 flex-shrink-0 bg-gray-700 px-2 py-0.5 rounded-lg">{item.unit}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedItem && (
            <div className="mt-4 bg-gray-800/60 border border-orange-500/30 rounded-xl p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-orange-400 font-mono text-xs font-semibold">{selectedItem.serial_id}</p>
                  <p className="text-white font-medium mt-0.5">{selectedItem.name}</p>
                  {selectedItem.description && <p className="text-gray-500 text-xs mt-1">{selectedItem.description}</p>}
                </div>
                <button onClick={() => { setSelectedItem(null); setSearchQuery(""); }} className="text-gray-500 hover:text-white ml-3">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-gray-500 text-xs mb-1.5">Quantity</label>
                  <input type="number" min="1" value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs mb-1.5">Unit</label>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-400 text-sm">{selectedItem.unit}</div>
                </div>
                <div>
                  <label className="block text-gray-500 text-xs mb-1.5">
                    Unit Price (Rs.) {itemPrice > 0 && <span className="text-green-400 ml-1">↑ last price</span>}
                  </label>
                  <input type="number" min="0" step="0.01" value={itemPrice} onChange={(e) => setItemPrice(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-500 text-xs mb-1.5">Custom Note for this line item (optional)</label>
                <input
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="e.g. IGC Practice B test to be carried out. DPT with certificate in VEPL name."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">
                  Line Total: <span className="text-white font-bold text-base">Rs. {(itemQty * itemPrice).toLocaleString("en-IN")}</span>
                </p>
                <button onClick={addLineItem} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2">
                  <Plus size={15} /> Add to PO
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Line Items Table ── */}
        {lineItems.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">Line Items</h2>
              <span className="bg-orange-500/10 text-orange-400 text-xs font-semibold px-2.5 py-1 rounded-lg">
                {lineItems.length} item{lineItems.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-3">#</th>
                    <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-3">Item</th>
                    <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-3">Qty</th>
                    <th className="text-right text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-3">Rate</th>
                    <th className="text-right text-gray-500 text-xs font-semibold uppercase tracking-wider px-5 py-3">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((line, i) => (
                    <React.Fragment key={i}>
                      <tr className={`border-b border-gray-800/30 hover:bg-gray-800/30 transition-colors`}>
                        <td className="px-5 py-3 text-gray-500 align-top">{i + 1}</td>
                        <td className="px-5 py-3 align-top">
                          <p className="text-orange-400 font-mono text-xs font-semibold">{line.serial_id}</p>
                          <p className="text-white text-sm">{line.name}</p>
                        </td>
                        <td className="px-5 py-3 text-white align-top">{line.quantity} {line.unit}</td>
                        <td className="px-5 py-3 text-right text-gray-300 align-top">Rs. {line.unit_price.toLocaleString("en-IN")}</td>
                        <td className="px-5 py-3 text-right text-white font-semibold align-top">Rs. {line.total.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 align-top">
                          <button onClick={() => removeLineItem(i)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800/30">
                        <td></td>
                        <td colSpan={5} className="px-5 pb-3 pt-1">
                          <input
                            value={line.custom_note}
                            onChange={(e) => updateLineNote(i, e.target.value)}
                            placeholder="Add custom note for this line item..."
                            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-gray-300 text-xs placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  {pfAmount > 0 && (
                    <tr className="border-t border-gray-700">
                      <td colSpan={4} className="px-5 py-2 text-right text-gray-400 text-sm">Subtotal</td>
                      <td className="px-5 py-2 text-right text-gray-300">Rs. {subtotal.toLocaleString("en-IN")}</td>
                      <td></td>
                    </tr>
                  )}
                  {pfAmount > 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-2 text-right text-gray-400 text-sm">
                        P&F {dispatch.pf_mode === "percent" ? `(${dispatch.pf_value}%)` : ""}
                      </td>
                      <td className="px-5 py-2 text-right text-gray-300">Rs. {pfAmount.toLocaleString("en-IN")}</td>
                      <td></td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-gray-700">
                    <td colSpan={4} className="px-5 py-4 text-right text-gray-400 font-semibold text-sm">Grand Total</td>
                    <td className="px-5 py-4 text-right text-white font-bold text-xl">Rs. {grandTotal.toLocaleString("en-IN")}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Dispatch & Delivery ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowDispatch(!showDispatch)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-800/50 transition-colors"
          >
            <h2 className="text-white font-semibold">Dispatch, Delivery & Terms</h2>
            {showDispatch ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
          </button>
          {showDispatch && (
            <div className="px-6 pb-6 pt-0 border-t border-gray-800 grid sm:grid-cols-2 gap-4">
              {[
                { label: "Delivery", key: "delivery" as const, placeholder: "e.g. Urgent / Within 8-10 Days" },
                { label: "Inspection", key: "inspection" as const, placeholder: "e.g. By VITON" },
                { label: "Mode of Dispatch", key: "mode_of_dispatch" as const, placeholder: "e.g. Falcon Bus / By Road" },
                { label: "Place of Delivery", key: "place_of_delivery" as const, placeholder: "e.g. At Ambernath Works" },
                { label: "Taxes", key: "taxes" as const, placeholder: "e.g. At Actual / Inclusive" },
              ].map((f) => (
                <div key={f.key} className="mt-4">
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{f.label}</label>
                  <input
                    value={dispatch[f.key] as string}
                    onChange={(e) => setDispatchField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              ))}

              {/* P&F */}
              <div className="mt-4">
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Packing & Forwarding</label>
                <div className="flex gap-2">
                  <select
                    value={dispatch.pf_mode}
                    onChange={(e) => setDispatchField("pf_mode", e.target.value as DispatchMeta["pf_mode"])}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="nil">Nil</option>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (Rs.)</option>
                  </select>
                  {dispatch.pf_mode !== "nil" && (
                    <input
                      type="number" min="0" step="0.1"
                      value={dispatch.pf_value}
                      onChange={(e) => setDispatchField("pf_value", Number(e.target.value))}
                      placeholder={dispatch.pf_mode === "percent" ? "e.g. 1.5" : "e.g. 500"}
                      className="w-28 bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  )}
                </div>
                {pfAmount > 0 && (
                  <p className="text-orange-400 text-xs mt-1.5 font-mono">
                    P&F = Rs. {pfAmount.toLocaleString("en-IN")} → Total = Rs. {grandTotal.toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Notes ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">General Notes / Terms</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Material TC to be provided along with supply. Serial Nos to be hard-punched on body/bonnet."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-wrap gap-3 pb-10">
          <button
            onClick={() => setShowPreview(true)}
            disabled={lineItems.length === 0}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 font-semibold px-5 py-3 rounded-xl text-sm flex items-center gap-2"
          >
            <Printer size={15} /> Preview
          </button>
          <button
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 font-semibold px-5 py-3 rounded-xl text-sm flex items-center gap-2"
          >
            <Save size={15} /> Save Draft
          </button>
          <button
            onClick={() => handleSave("confirmed")}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <FileText size={15} /> {saving ? "Creating PO..." : "Create PO"}
          </button>
        </div>
      </div>

      {showPreview && (
        <POPreviewModal
          poNumber={poNumber} vendor={selectedVendor} lineItems={lineItems}
          subtotal={subtotal} pfAmount={pfAmount} grandTotal={grandTotal}
          notes={notes} dispatch={dispatch} onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
