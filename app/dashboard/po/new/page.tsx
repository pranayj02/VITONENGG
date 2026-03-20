"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { Search, Plus, Trash2, FileText, Save, X, CheckCircle, Printer } from "lucide-react";
import type { Item, Vendor, LineItem } from "@/lib/types";

function PODocument({
  poNumber, vendor, lineItems, subtotal, notes, paymentTerms, date,
}: {
  poNumber: string; vendor: Vendor | null; lineItems: LineItem[];
  subtotal: number; notes: string; paymentTerms: string; date: string;
}) {
  return (
    <div className="po-preview-document p-8 text-gray-900 bg-white" style={{ fontFamily: "Arial, sans-serif" }}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">VITON ENGINEERS PVT. LTD.</h1>
          <p className="text-gray-600 text-xs mt-1">B401, ADDL. Ambernath MIDC, Ambernath East, Dist. Thane - 421506</p>
          <p className="text-gray-600 text-xs">GSTIN: 27AACCV7755N1ZK | Tel: 08779301215</p>
        </div>
        <div className="text-right">
          <div className="border-2 border-orange-400 rounded-lg px-4 py-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Purchase Order</p>
            <p className="text-base font-bold text-orange-600 font-mono">{poNumber}</p>
          </div>
          <p className="text-gray-500 text-xs mt-2">Date: {date}</p>
        </div>
      </div>
      <hr className="border-gray-300 mb-5" />
      <div className="mb-5 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">To</p>
        <p className="font-bold text-gray-900">{vendor?.name ?? "—"}</p>
        {vendor?.address && <p className="text-gray-600 text-sm">{vendor.address}</p>}
        {vendor?.gstin && <p className="text-gray-600 text-sm">GSTIN: {vendor.gstin}</p>}
        {vendor?.contact_name && <p className="text-gray-600 text-sm">Attn: {vendor.contact_name}</p>}
        {vendor?.contact_phone && <p className="text-gray-600 text-sm">Tel: {vendor.contact_phone}</p>}
      </div>
      <table className="w-full text-sm mb-5" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f3f4f6" }}>
            <th className="text-left px-3 py-2 text-gray-700 font-semibold border border-gray-200">#</th>
            <th className="text-left px-3 py-2 text-gray-700 font-semibold border border-gray-200">Serial ID</th>
            <th className="text-left px-3 py-2 text-gray-700 font-semibold border border-gray-200">Description</th>
            <th className="text-center px-3 py-2 text-gray-700 font-semibold border border-gray-200">Qty</th>
            <th className="text-center px-3 py-2 text-gray-700 font-semibold border border-gray-200">Unit</th>
            <th className="text-right px-3 py-2 text-gray-700 font-semibold border border-gray-200">Rate (Rs.)</th>
            <th className="text-right px-3 py-2 text-gray-700 font-semibold border border-gray-200">Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((line, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
              <td className="px-3 py-2 text-gray-500 border border-gray-200">{i + 1}</td>
              <td className="px-3 py-2 border border-gray-200" style={{ fontFamily: "monospace", fontSize: "11px", color: "#c2410c", fontWeight: "600" }}>{line.serial_id}</td>
              <td className="px-3 py-2 text-gray-900 border border-gray-200">{line.name}</td>
              <td className="px-3 py-2 text-center border border-gray-200">{line.quantity}</td>
              <td className="px-3 py-2 text-center text-gray-600 border border-gray-200">{line.unit}</td>
              <td className="px-3 py-2 text-right border border-gray-200">{line.unit_price.toLocaleString("en-IN")}</td>
              <td className="px-3 py-2 text-right font-semibold border border-gray-200">{line.total.toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: "#f3f4f6" }}>
            <td colSpan={6} className="px-3 py-3 text-right font-bold text-gray-900 border border-gray-200">TOTAL</td>
            <td className="px-3 py-3 text-right font-bold text-gray-900 border border-gray-200">
              Rs. {subtotal.toLocaleString("en-IN")}
            </td>
          </tr>
        </tfoot>
      </table>
      <div className="grid grid-cols-2 gap-6 text-sm mt-4">
        <div>
          <p className="text-gray-700"><span className="font-semibold">Payment:</span> {paymentTerms}</p>
          <p className="text-gray-700 mt-1"><span className="font-semibold">Delivery:</span> At Ambernath Works</p>
          <p className="text-gray-700 mt-1"><span className="font-semibold">Inspection:</span> By VITON</p>
          {notes && (
            <div className="mt-3">
              <p className="font-semibold text-gray-700">Notes:</p>
              <p className="text-gray-600 text-xs mt-1 whitespace-pre-wrap">{notes}</p>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="mt-10 pt-4 border-t border-gray-400 inline-block min-w-48">
            <p className="text-gray-600 text-sm">For VITON ENGINEERS PVT. LTD.</p>
            <p className="text-gray-400 text-xs mt-8">Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function POPreviewModal({
  poNumber, vendor, lineItems, subtotal, notes, paymentTerms, onClose,
}: {
  poNumber: string; vendor: Vendor | null; lineItems: LineItem[];
  subtotal: number; notes: string; paymentTerms: string; onClose: () => void;
}) {
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          .po-print-wrapper { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; }
        }
        .po-print-wrapper { display: none; }
      `}</style>

      <div className="po-print-wrapper">
        <PODocument poNumber={poNumber} vendor={vendor} lineItems={lineItems} subtotal={subtotal} notes={notes} paymentTerms={paymentTerms} date={today} />
      </div>

      <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-3xl my-4 shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-lg">Purchase Order Preview</h2>
            <div className="flex gap-2">
              <button onClick={handlePrint}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all">
                <Printer size={15} /> Print / PDF
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-all">
                <X size={18} />
              </button>
            </div>
          </div>
          <PODocument poNumber={poNumber} vendor={vendor} lineItems={lineItems} subtotal={subtotal} notes={notes} paymentTerms={paymentTerms} date={today} />
        </div>
      </div>
    </>
  );
}

export default function NewPOPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("60 Days");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);
  const [notes, setNotes] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedPoId, setSavedPoId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId) ?? null;
  const subtotal = lineItems.reduce((s, l) => s + l.total, 0);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: vData } = await supabase.from("vendors").select("*").order("name");
      setVendors((vData ?? []) as unknown as Vendor[]);
      const { count } = await supabase
        .from("purchase_orders")
        .select("*", { count: "exact", head: true });
      const nextNum = 170 + (count ?? 0);
      setPoNumber(`VEPLPUR${nextNum}25-26`);
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
    if (!q.trim()) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("items")
      .select("*")
      .or(`serial_id.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(8);
    const rows = (data ?? []) as unknown as Item[];
    setSearchResults(rows);
    setShowSearch(rows.length > 0);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchItems(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery, searchItems]);

  async function fetchLastPrice(itemId: string, vendorId: string) {
    if (!itemId || !vendorId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("vendor_items")
      .select("last_price")
      .eq("item_id", itemId)
      .eq("vendor_id", vendorId)
      .maybeSingle();
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
    if (selectedVendorId) fetchLastPrice(item.id, selectedVendorId);
  }

  function addLineItem() {
    if (!selectedItem) return;
    const line: LineItem = {
      item_id: selectedItem.id,
      serial_id: selectedItem.serial_id,
      name: selectedItem.name,
      hsn_code: selectedItem.hsn_code ?? "",
      unit: selectedItem.unit,
      quantity: itemQty,
      unit_price: itemPrice,
      total: itemQty * itemPrice,
    };
    setLineItems((prev) => [...prev, line]);
    setSelectedItem(null);
    setSearchQuery("");
    setItemQty(1);
    setItemPrice(0);
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
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
        total: subtotal,
        notes: notes.trim() || null,
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-1">PO Created!</h2>
          <p className="text-gray-400 text-sm font-mono mb-6">{poNumber}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setShowPreview(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
            >
              <Printer size={15} /> Preview and Print
            </button>
            <a
              href="/dashboard/po/new"
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
            >
              <Plus size={15} /> New PO
            </a>
            <a
              href="/dashboard/history"
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
            >
              View History
            </a>
          </div>
        </div>
        {showPreview && (
          <POPreviewModal
            poNumber={poNumber}
            vendor={selectedVendor}
            lineItems={lineItems}
            subtotal={subtotal}
            notes={notes}
            paymentTerms={paymentTerms}
            onClose={() => setShowPreview(false)}
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
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-5">
        {/* Vendor */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Vendor</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Select Vendor *
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => {
                  setSelectedVendorId(e.target.value);
                  const v = vendors.find((v) => v.id === e.target.value);
                  if (v && v.payment_terms) setPaymentTerms(v.payment_terms);
                }}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">— select vendor —</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Payment Terms
              </label>
              <input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          {selectedVendor && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
              {selectedVendor.contact_name && <span>{selectedVendor.contact_name}</span>}
              {selectedVendor.contact_phone && <span>{selectedVendor.contact_phone}</span>}
              {selectedVendor.gstin && <span className="font-mono">GST: {selectedVendor.gstin}</span>}
            </div>
          )}
        </div>

        {/* Item Search */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Add Items</h2>
          <div className="relative" ref={searchContainerRef}>
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedItem(null);
              }}
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
                    <span className="text-gray-500 text-xs ml-4 flex-shrink-0 bg-gray-700 px-2 py-0.5 rounded-lg">
                      {item.unit}
                    </span>
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
                  {selectedItem.description && (
                    <p className="text-gray-500 text-xs mt-1">{selectedItem.description}</p>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedItem(null); setSearchQuery(""); }}
                  className="text-gray-500 hover:text-white ml-3 flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-gray-500 text-xs mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs mb-1.5">Unit</label>
                  <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-400 text-sm">
                    {selectedItem.unit}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-500 text-xs mb-1.5">
                    Unit Price (Rs.)
                    {itemPrice > 0 && (
                      <span className="text-green-400 ml-1 normal-case">last price</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">
                  Line Total:{" "}
                  <span className="text-white font-bold text-base">
                    Rs. {(itemQty * itemPrice).toLocaleString("en-IN")}
                  </span>
                </p>
                <button
                  onClick={addLineItem}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2"
                >
                  <Plus size={15} /> Add to PO
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Line Items */}
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
                    <tr key={i} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${i === lineItems.length - 1 ? "border-0" : ""}`}>
                      <td className="px-5 py-3.5 text-gray-500">{i + 1}</td>
                      <td className="px-5 py-3.5">
                        <p className="text-orange-400 font-mono text-xs font-semibold">{line.serial_id}</p>
                        <p className="text-white text-sm">{line.name}</p>
                      </td>
                      <td className="px-5 py-3.5 text-white">{line.quantity} {line.unit}</td>
                      <td className="px-5 py-3.5 text-right text-gray-300">Rs. {line.unit_price.toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3.5 text-right text-white font-semibold">Rs. {line.total.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => removeLineItem(i)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-700">
                    <td colSpan={4} className="px-5 py-4 text-right text-gray-400 font-semibold text-sm">
                      Total Amount
                    </td>
                    <td className="px-5 py-4 text-right text-white font-bold text-xl">
                      Rs. {subtotal.toLocaleString("en-IN")}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
            Notes / Special Terms
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Material TC to be provided along with supply. Serial Nos to be hard-punched on body/bonnet."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pb-10">
          <button
            onClick={() => handleSave("draft")}
            disabled={saving}
            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 font-semibold px-5 py-3 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            <Save size={15} /> Save Draft
          </button>
          <button
            onClick={() => handleSave("confirmed")}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-all text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <FileText size={15} /> {saving ? "Creating PO..." : "Create PO"}
          </button>
        </div>
      </div>
    </div>
  );
}
