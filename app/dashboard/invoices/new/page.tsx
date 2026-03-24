"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Trash2, Save, FileText, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getCurrentFY } from "@/lib/fy";
import InvoicePrintModal from "@/components/InvoicePrintModal";

type Buyer = {
  id: string;
  name: string;
  address: string | null;
  gstin: string | null;
  state: string | null;
  state_code: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  payment_terms: string | null;
  created_at?: string;
};

type BuyerItem = {
  id: string;
  buyer_id: string;
  buyer_item_code: string | null;
  description: string;
  unit: string | null;
  hsn_code: string | null;
  gst_rate: number | null;
  last_price: number | null;
  created_at?: string;
};

type InvoiceLine = {
  buyer_po_sr_no: string;
  buyer_item_code: string;
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  taxable_value: number;
  gst_rate: number;
};

type DispatchMeta = {
  place_of_supply: string;
  po_date: string;
  date_time_of_supply: string;
  documents_through: string;
  transportation: string;
  lr_no: string;
  mode_of_dispatch: string;
  vehicle_no: string;
  freight_packing: number;
  other_charges: number;
  billed_to: string;
  shipped_to: string;
};

type SavedInvoicePreview = {
  invoice_number: string;
  invoice_date: string;
  buyers_po_number?: string | null;
  fy_label?: string | null;
  fy_serial?: number | null;
  status: string;
  buyer: {
    name: string;
    address?: string | null;
    gstin?: string | null;
    state?: string | null;
    state_code?: string | null;
  };
  line_items: InvoiceLine[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  notes?: string | null;
  signed_by?: string | null;
  signed_at?: string | null;
  dispatch_meta?: Partial<DispatchMeta> | null;
};

function createEmptyLine(): InvoiceLine {
  return {
    buyer_po_sr_no: "",
    buyer_item_code: "",
    description: "",
    hsn_code: "84818030",
    quantity: 1,
    unit: "Nos.",
    unit_rate: 0,
    taxable_value: 0,
    gst_rate: 18,
  };
}

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export default function NewInvoicePage() {
  const supabase = useMemo(() => createClient(), []);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyerItems, setBuyerItems] = useState<BuyerItem[]>([]);
  const [buyerSearch, setBuyerSearch] = useState("");
  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [fyLabel, setFyLabel] = useState("");
  const [fySerial, setFySerial] = useState(1);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [buyersPoNumber, setBuyersPoNumber] = useState("");
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [notes, setNotes] = useState("");

  const [dispatchMeta, setDispatchMeta] = useState<DispatchMeta>({
    place_of_supply: "",
    po_date: "",
    date_time_of_supply: "",
    documents_through: "Direct",
    transportation: "",
    lr_no: "",
    mode_of_dispatch: "By Road",
    vehicle_no: "",
    freight_packing: 0,
    other_charges: 0,
    billed_to: "",
    shipped_to: "",
  });

  const [lineItems, setLineItems] = useState<InvoiceLine[]>([createEmptyLine()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<SavedInvoicePreview | null>(null);

  useEffect(() => {
    void initializePage();
  }, []);

  useEffect(() => {
    if (!selectedBuyer) return;
    setDispatchMeta((prev) => ({
      ...prev,
      place_of_supply: selectedBuyer.state || "",
      billed_to: selectedBuyer.address || "",
      shipped_to: selectedBuyer.address || "",
    }));
  }, [selectedBuyer]);

  async function initializePage() {
    try {
      setLoading(true);
      await Promise.all([loadBuyers(), generateNextInvoiceNumber()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to initialize invoice page.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBuyers() {
    const { data, error } = await supabase
      .from("buyers")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    setBuyers((data || []) as Buyer[]);
  }

  async function loadBuyerItems(buyerId: string) {
    const { data, error } = await supabase
      .from("buyer_items")
      .select("*")
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setBuyerItems((data || []) as BuyerItem[]);
  }

  async function generateNextInvoiceNumber(dateOverride?: string) {
    const baseDate = dateOverride ? new Date(dateOverride) : new Date();
    const currentFy = getCurrentFY(baseDate);

    const { data, error } = await supabase
      .from("invoices")
      .select("fy_label, fy_serial")
      .eq("fy_label", currentFy)
      .order("fy_serial", { ascending: false })
      .limit(1);

    if (error) throw error;

    const nextSerial = data?.[0]?.fy_serial ? Number(data[0].fy_serial) + 1 : 1;
    setFyLabel(currentFy);
    setFySerial(nextSerial);
    setInvoiceNumber(`${currentFy}/${String(nextSerial).padStart(3, "0")}`);
  }

  const filteredBuyers = buyers.filter((buyer) =>
    [buyer.name, buyer.gstin, buyer.address, buyer.state]
      .join(" ")
      .toLowerCase()
      .includes(buyerSearch.toLowerCase())
  );

  const taxMode =
    selectedBuyer?.state_code && selectedBuyer.state_code !== "27" ? "inter" : "intra";

  const subtotal = lineItems.reduce((sum, line) => sum + Number(line.taxable_value || 0), 0);
  const freightPacking = Number(dispatchMeta.freight_packing || 0);
  const otherCharges = Number(dispatchMeta.other_charges || 0);
  const taxableBase = subtotal + freightPacking + otherCharges;
  const cgst = taxMode === "intra" ? Number((taxableBase * 0.09).toFixed(2)) : 0;
  const sgst = taxMode === "intra" ? Number((taxableBase * 0.09).toFixed(2)) : 0;
  const igst = taxMode === "inter" ? Number((taxableBase * 0.18).toFixed(2)) : 0;
  const total = Number((taxableBase + cgst + sgst + igst).toFixed(2));

  function updateLine(index: number, patch: Partial<InvoiceLine>) {
    setLineItems((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        next.taxable_value = Number(next.quantity || 0) * Number(next.unit_rate || 0);
        return next;
      })
    );
  }

  function addLine() {
    setLineItems((prev) => [...prev, createEmptyLine()]);
  }

  function removeLine(index: number) {
    setLineItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleSelectBuyer(buyer: Buyer) {
    setSelectedBuyer(buyer);
    setBuyerSearch(buyer.name);
    setBuyerDropdownOpen(false);
    void loadBuyerItems(buyer.id).catch((e) => {
      setError(e instanceof Error ? e.message : "Failed to load buyer items.");
    });
  }

  function applyBuyerItem(index: number, item: BuyerItem) {
    updateLine(index, {
      buyer_item_code: item.buyer_item_code || "",
      description: item.description || "",
      hsn_code: item.hsn_code || "84818030",
      unit: item.unit || "Nos.",
      unit_rate: Number(item.last_price || 0),
      gst_rate: Number(item.gst_rate || 18),
    });
  }

  function resetFormKeepBuyer() {
    setBuyersPoNumber("");
    setNotes("");
    setSaveAsDraft(false);
    setLineItems([createEmptyLine()]);
    setDispatchMeta((prev) => ({
      place_of_supply: selectedBuyer?.state || "",
      po_date: "",
      date_time_of_supply: "",
      documents_through: "Direct",
      transportation: "",
      lr_no: "",
      mode_of_dispatch: "By Road",
      vehicle_no: "",
      freight_packing: 0,
      other_charges: 0,
      billed_to: selectedBuyer?.address || prev.billed_to || "",
      shipped_to: selectedBuyer?.address || prev.shipped_to || "",
    }));
  }

  async function handleSaveInvoice(openPreviewAfterSave = true) {
    try {
      setError("");
      setSuccess("");

      if (!selectedBuyer) {
        setError("Please select a buyer.");
        return;
      }

      const validLines = lineItems.filter(
        (line) => line.description.trim() && Number(line.quantity) > 0
      );

      if (validLines.length === 0) {
        setError("Please add at least one valid line item.");
        return;
      }

      setSaving(true);

      const payload = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        buyer_name: selectedBuyer.name,
        buyer_gstin: selectedBuyer.gstin,
        buyer_address: selectedBuyer.address,
        line_items: validLines,
        subtotal: taxableBase,
        cgst,
        sgst,
        igst,
        total,
        notes: notes.trim() || null,
        buyer_id: selectedBuyer.id,
        buyers_po_number: buyersPoNumber.trim() || null,
        status: saveAsDraft ? "draft" : "confirmed",
        fy_label: fyLabel,
        fy_serial: fySerial,
        dispatch_meta: {
          ...dispatchMeta,
          place_of_supply: dispatchMeta.place_of_supply || selectedBuyer.state || "",
          billed_to: dispatchMeta.billed_to || selectedBuyer.address || "",
          shipped_to: dispatchMeta.shipped_to || selectedBuyer.address || "",
        },
        signed_by: "Authorised Signatory",
        signed_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from("invoices").insert(payload);

      if (insertError) throw insertError;

      const buyerMemoryPayload = validLines.map((line) => ({
        buyer_id: selectedBuyer.id,
        buyer_item_code: line.buyer_item_code.trim() || null,
        description: line.description.trim(),
        unit: line.unit.trim() || "Nos.",
        hsn_code: line.hsn_code.trim() || null,
        gst_rate: Number(line.gst_rate || 18),
        last_price: Number(line.unit_rate || 0),
      }));

      await supabase.from("buyer_items").insert(buyerMemoryPayload);

      const previewData: SavedInvoicePreview = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        buyers_po_number: buyersPoNumber || null,
        fy_label: fyLabel,
        fy_serial: fySerial,
        status: saveAsDraft ? "draft" : "confirmed",
        buyer: {
          name: selectedBuyer.name,
          address: selectedBuyer.address,
          gstin: selectedBuyer.gstin,
          state: selectedBuyer.state,
          state_code: selectedBuyer.state_code,
        },
        line_items: validLines,
        subtotal: taxableBase,
        cgst,
        sgst,
        igst,
        total,
        notes: notes || null,
        signed_by: "Authorised Signatory",
        signed_at: new Date().toISOString(),
        dispatch_meta: {
          ...dispatchMeta,
          place_of_supply: dispatchMeta.place_of_supply || selectedBuyer.state || "",
          billed_to: dispatchMeta.billed_to || selectedBuyer.address || "",
          shipped_to: dispatchMeta.shipped_to || selectedBuyer.address || "",
        },
      };

      setPreviewInvoice(previewData);
      setSuccess(`Invoice ${invoiceNumber} saved successfully.`);
      if (openPreviewAfterSave) setPreviewOpen(true);

      resetFormKeepBuyer();
      await loadBuyerItems(selectedBuyer.id);
      await generateNextInvoiceNumber(invoiceDate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-white text-2xl font-bold">New Invoice</h1>
            <p className="text-gray-400 text-sm mt-1">
              Create, confirm, preview, and print invoices without leaving the page.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 min-w-[230px]">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Invoice Number</p>
            <p className="text-white font-semibold font-mono mt-1">
              {loading ? "Generating..." : invoiceNumber}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-300 text-sm">
            {success}
          </div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-white font-bold text-lg mb-4">Buyer</h2>

              <div className="relative">
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  Select Buyer *
                </label>
                <Search size={16} className="absolute left-4 top-[46px] text-gray-500" />
                <input
                  value={buyerSearch}
                  onChange={(e) => {
                    setBuyerSearch(e.target.value);
                    setBuyerDropdownOpen(true);
                    if (selectedBuyer?.name !== e.target.value) setSelectedBuyer(null);
                  }}
                  onFocus={() => setBuyerDropdownOpen(true)}
                  placeholder="Search buyer by name / GSTIN"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                {buyerDropdownOpen && buyerSearch.trim() && filteredBuyers.length > 0 ? (
                  <div className="absolute z-20 mt-2 w-full bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl max-h-72 overflow-y-auto">
                    {filteredBuyers.slice(0, 8).map((buyer) => (
                      <button
                        key={buyer.id}
                        type="button"
                        onClick={() => handleSelectBuyer(buyer)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-900 border-b border-gray-800 last:border-0"
                      >
                        <p className="text-white font-medium">{buyer.name}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {buyer.gstin || "No GSTIN"} · {buyer.state || "No state"}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {selectedBuyer ? (
                <div className="mt-4 bg-gray-950 border border-gray-800 rounded-2xl p-4 space-y-2">
                  <p className="text-white font-semibold">{selectedBuyer.name}</p>
                  <p className="text-gray-400 text-sm whitespace-pre-line">{selectedBuyer.address || "No address"}</p>
                  <p className="text-gray-400 text-sm">GSTIN: {selectedBuyer.gstin || "—"}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300">
                      State: {selectedBuyer.state || "—"} {selectedBuyer.state_code ? `(${selectedBuyer.state_code})` : ""}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        taxMode === "intra"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {taxMode === "intra" ? "CGST + SGST" : "IGST"}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => {
                      setInvoiceDate(e.target.value);
                      void generateNextInvoiceNumber(e.target.value).catch(() => null);
                    }}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Buyer PO No.</label>
                  <input
                    value={buyersPoNumber}
                    onChange={(e) => setBuyersPoNumber(e.target.value)}
                    placeholder="Customer PO reference"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <label className="mt-4 inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsDraft}
                  onChange={(e) => setSaveAsDraft(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-700 bg-gray-950 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-300">Save as draft instead of confirmed</span>
              </label>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">Line Items</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Use buyer memory suggestions or type fresh descriptions.
                  </p>
                </div>

                <button
                  onClick={addLine}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
                >
                  <Plus size={14} />
                  Add Line
                </button>
              </div>

              <div className="p-5 space-y-4">
                {lineItems.map((line, index) => {
                  const suggestions = buyerItems.filter((item) =>
                    [item.description, item.buyer_item_code || "", item.hsn_code || ""]
                      .join(" ")
                      .toLowerCase()
                      .includes(line.description.toLowerCase())
                  );

                  return (
                    <div key={index} className="bg-gray-950 border border-gray-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-white font-semibold">Line {index + 1}</p>
                        <button
                          onClick={() => removeLine(index)}
                          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 font-semibold px-3 py-2 rounded-xl text-sm transition"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
                        <input
                          value={line.buyer_po_sr_no}
                          onChange={(e) => updateLine(index, { buyer_po_sr_no: e.target.value })}
                          placeholder="Buyer PO Sr. No."
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          value={line.buyer_item_code}
                          onChange={(e) => updateLine(index, { buyer_item_code: e.target.value })}
                          placeholder="Buyer Item Code"
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          value={line.hsn_code}
                          onChange={(e) => updateLine(index, { hsn_code: e.target.value })}
                          placeholder="HSN Code"
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="number"
                          value={line.gst_rate}
                          onChange={(e) => updateLine(index, { gst_rate: Number(e.target.value) })}
                          placeholder="GST %"
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <textarea
                        value={line.description}
                        onChange={(e) => updateLine(index, { description: e.target.value })}
                        placeholder="Item description"
                        className="w-full min-h-[90px] bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      />

                      {selectedBuyer && line.description.trim() && suggestions.length > 0 ? (
                        <div className="mt-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                          {suggestions.slice(0, 5).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => applyBuyerItem(index, item)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-800 border-b border-gray-800 last:border-0"
                            >
                              <p className="text-white text-sm font-medium">
                                {item.buyer_item_code || "No code"}
                              </p>
                              <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                          placeholder="Qty"
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          value={line.unit}
                          onChange={(e) => updateLine(index, { unit: e.target.value })}
                          placeholder="Unit"
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="number"
                          value={line.unit_rate}
                          onChange={(e) => updateLine(index, { unit_rate: Number(e.target.value) })}
                          placeholder="Unit Rate"
                          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="number"
                          value={line.taxable_value}
                          readOnly
                          placeholder="Taxable Value"
                          className="w-full bg-gray-800 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-white font-bold text-lg mb-4">Dispatch Meta</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Place of Supply</label>
                  <input
                    value={dispatchMeta.place_of_supply}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, place_of_supply: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">PO Date</label>
                  <input
                    type="date"
                    value={dispatchMeta.po_date}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, po_date: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Date/Time of Supply</label>
                  <input
                    value={dispatchMeta.date_time_of_supply}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, date_time_of_supply: e.target.value }))}
                    placeholder="24.03.2026 AT 13.00 Hr."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Documents Through</label>
                  <input
                    value={dispatchMeta.documents_through}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, documents_through: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Transportation</label>
                  <input
                    value={dispatchMeta.transportation}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, transportation: e.target.value }))}
                    placeholder="VEPL Scope / VRL / Self"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">L.R. No.</label>
                  <input
                    value={dispatchMeta.lr_no}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, lr_no: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Mode of Dispatch</label>
                  <input
                    value={dispatchMeta.mode_of_dispatch}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, mode_of_dispatch: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Vehicle No.</label>
                  <input
                    value={dispatchMeta.vehicle_no}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, vehicle_no: e.target.value }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Freight / Packing</label>
                  <input
                    type="number"
                    value={dispatchMeta.freight_packing}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, freight_packing: Number(e.target.value) }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Other Charges</label>
                  <input
                    type="number"
                    value={dispatchMeta.other_charges}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, other_charges: Number(e.target.value) }))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Billed To Override</label>
                  <textarea
                    value={dispatchMeta.billed_to}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, billed_to: e.target.value }))}
                    className="w-full min-h-[88px] bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Shipped To Override</label>
                  <textarea
                    value={dispatchMeta.shipped_to}
                    onChange={(e) => setDispatchMeta((p) => ({ ...p, shipped_to: e.target.value }))}
                    className="w-full min-h-[88px] bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className="w-full min-h-[110px] bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h2 className="text-white font-bold text-lg mb-4">Totals</h2>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-400">
                  <span>Items Subtotal</span>
                  <span>Rs. {money(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Freight / Packing</span>
                  <span>Rs. {money(freightPacking)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>Other Charges</span>
                  <span>Rs. {money(otherCharges)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-300 border-t border-gray-800 pt-2">
                  <span>Taxable Base</span>
                  <span>Rs. {money(taxableBase)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>CGST</span>
                  <span>Rs. {money(cgst)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>SGST</span>
                  <span>Rs. {money(sgst)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-400">
                  <span>IGST</span>
                  <span>Rs. {money(igst)}</span>
                </div>
                <div className="flex items-center justify-between text-white font-bold text-base pt-2 border-t border-gray-800">
                  <span>Total</span>
                  <span>Rs. {money(total)}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => void handleSaveInvoice(true)}
                  disabled={saving}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl text-sm transition"
                >
                  <Save size={15} />
                  {saving ? "Saving..." : saveAsDraft ? "Save Draft + Preview" : "Save Confirmed + Preview"}
                </button>

                <button
                  onClick={() => setPreviewOpen(true)}
                  disabled={!previewInvoice}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl text-sm transition"
                >
                  <Eye size={15} />
                  Open Last Preview
                </button>

                <button
                  onClick={() => {
  setPreviewInvoice({
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    buyers_po_number: buyersPoNumber || null,
    fy_label: fyLabel,
    fy_serial: fySerial,
    status: saveAsDraft ? "draft" : "confirmed",
    buyer: {
      name: selectedBuyer?.name || "—",
      address: selectedBuyer?.address || "",
      gstin: selectedBuyer?.gstin || "",
      state: selectedBuyer?.state || "",
      state_code: selectedBuyer?.state_code || "",
    },
    line_items: lineItems.filter((l) => l.description.trim()),
    subtotal: taxableBase,
    cgst,
    sgst,
    igst,
    total,
    notes: notes || null,
    signed_by: "Authorised Signatory",
    signed_at: new Date().toISOString(),
    dispatch_meta: dispatchMeta,
  });

  setPreviewOpen(true);
}}

                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-5 py-3 rounded-xl text-sm transition"
                >
                  <FileText size={15} />
                  Build Unsaved Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <InvoicePrintModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        invoice={previewInvoice}
      />
    </>
  );
}
