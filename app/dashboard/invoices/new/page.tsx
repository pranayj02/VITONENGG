"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Eye,
  FileText,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  X,
  History,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getCurrentFY } from "@/lib/fy";
import InvoicePrintModal from "@/components/InvoicePrintModal";
import { useSearchParams } from "next/navigation";

// ─── State code lookup (for fallback when buyer.state_code is null) ──────────

const STATE_CODES: Record<string, string> = {
  "Andhra Pradesh": "37", "Arunachal Pradesh": "12", "Assam": "18",
  "Bihar": "10", "Chhattisgarh": "22", "Goa": "30", "Gujarat": "24",
  "Haryana": "06", "Himachal Pradesh": "02", "Jharkhand": "20",
  "Karnataka": "29", "Kerala": "32", "Madhya Pradesh": "23",
  "Maharashtra": "27", "Manipur": "14", "Meghalaya": "17",
  "Mizoram": "15", "Nagaland": "13", "Odisha": "21", "Punjab": "03",
  "Rajasthan": "08", "Sikkim": "11", "Tamil Nadu": "33",
  "Telangana": "36", "Tripura": "16", "Uttar Pradesh": "09",
  "Uttarakhand": "05", "West Bengal": "19", "Delhi": "07",
  "Jammu and Kashmir": "01", "Ladakh": "38", "Chandigarh": "04",
  "Dadra and Nagar Haveli and Daman and Diu": "26",
  "Lakshadweep": "31", "Andaman and Nicobar Islands": "35",
  "Puducherry": "34",
};

const MAHARASHTRA_STATE_CODE = "27";

// ─── Types ───────────────────────────────────────────────────────────────────

type BuyerRow = {
  id: string;
  name?: string | null;
  company_name?: string | null;
  branch_name?: string | null;
  display_name?: string | null;
  address?: string | null;
  gstin?: string | null;
  state?: string | null;
  state_code?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  payment_terms?: string | null;
  created_at?: string;
};

type Buyer = {
  id: string;
  company_name: string;
  branch_name: string | null;
  display_name: string;
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
  id?: string | null;
  invoice_number: string;
  invoice_date: string;
  buyers_po_number?: string | null;
  fy_label?: string | null;
  fy_serial?: number | null;
  status: string;
  buyer: {
    name: string;
    display_name?: string | null;
    company_name?: string | null;
    branch_name?: string | null;
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

type InvoiceRecord = {
  id: string;
  invoice_number: string;
  invoice_date?: string | null;
  buyers_po_number?: string | null;
  fy_label?: string | null;
  fy_serial?: number | null;
  status?: string | null;
  buyer_id?: string | null;
  buyer_name?: string | null;
  buyer_display_name?: string | null;
  notes?: string | null;
  line_items?: unknown;
  dispatch_meta?: unknown;
  subtotal?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  total?: number | null;
  created_at?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function defaultDispatchMeta(): DispatchMeta {
  return {
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
  };
}

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeBuyer(row: BuyerRow): Buyer {
  const companyName = row.company_name?.trim() || row.name?.trim() || "Unnamed Buyer";
  const branchName = row.branch_name?.trim() || null;
  const displayName =
    row.display_name?.trim() || (branchName ? `${companyName} - ${branchName}` : companyName);

  const state = row.state ?? null;
  const stateCode =
    row.state_code?.trim() || (state ? STATE_CODES[state] ?? null : null);

  return {
    id: row.id,
    company_name: companyName,
    branch_name: branchName,
    display_name: displayName,
    address: row.address ?? null,
    gstin: row.gstin ?? null,
    state,
    state_code: stateCode,
    contact_name: row.contact_name ?? null,
    contact_phone: row.contact_phone ?? null,
    payment_terms: row.payment_terms ?? null,
    created_at: row.created_at,
  };
}

function normalizeLine(row: any): InvoiceLine {
  const quantity = Number(row?.quantity ?? 1);
  const unitRate = Number(row?.unit_rate ?? 0);
  const taxableValue =
    row?.taxable_value !== undefined && row?.taxable_value !== null
      ? Number(row.taxable_value)
      : Number((quantity * unitRate).toFixed(2));

  return {
    buyer_po_sr_no: String(row?.buyer_po_sr_no ?? ""),
    buyer_item_code: String(row?.buyer_item_code ?? ""),
    description: String(row?.description ?? ""),
    hsn_code: String(row?.hsn_code ?? "84818030"),
    quantity,
    unit: String(row?.unit ?? "Nos."),
    unit_rate: unitRate,
    taxable_value: taxableValue,
    gst_rate: Number(row?.gst_rate ?? 18),
  };
}

function normalizeDispatchMeta(row: any): DispatchMeta {
  const fallback = defaultDispatchMeta();
  return {
    place_of_supply: String(row?.place_of_supply ?? fallback.place_of_supply),
    po_date: String(row?.po_date ?? fallback.po_date),
    date_time_of_supply: String(row?.date_time_of_supply ?? fallback.date_time_of_supply),
    documents_through: String(row?.documents_through ?? fallback.documents_through),
    transportation: String(row?.transportation ?? fallback.transportation),
    lr_no: String(row?.lr_no ?? fallback.lr_no),
    mode_of_dispatch: String(row?.mode_of_dispatch ?? fallback.mode_of_dispatch),
    vehicle_no: String(row?.vehicle_no ?? fallback.vehicle_no),
    freight_packing: Number(row?.freight_packing ?? fallback.freight_packing),
    other_charges: Number(row?.other_charges ?? fallback.other_charges),
    billed_to: String(row?.billed_to ?? fallback.billed_to),
    shipped_to: String(row?.shipped_to ?? fallback.shipped_to),
  };
}

function openInvoicePrint(id: string) {
  window.open(
    `/dashboard/invoices/print/${encodeURIComponent(id)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

// ─── Shared input/textarea class helpers ─────────────────────────────────────
const inputCls = "w-full bg-[#f1f3f8] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-800 rounded-xl px-4 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500";
const cardCls = "bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl";
const innerCardCls = "bg-[#f7f8fb] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-800 rounded-2xl";
const labelCls = "block text-sm text-[#4a5578] dark:text-gray-300 font-medium mb-2";
const labelSmCls = "block text-xs text-[#8892a8] dark:text-gray-500 mb-1";
const headingCls = "text-viton-navy dark:text-white font-bold text-lg mb-4";
const subTextCls = "text-[#8892a8] dark:text-gray-500 text-sm";

// ─── Component ───────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const supabase = useMemo(() => createClient(), []);

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyerItems, setBuyerItems] = useState<BuyerItem[]>([]);
  const [buyerSearch, setBuyerSearch] = useState("");
  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [buyersPoNumber, setBuyersPoNumber] = useState("");
  const [fyLabel, setFyLabel] = useState("");
  const [fySerial, setFySerial] = useState(1);
  const [invoiceStatus, setInvoiceStatus] = useState<"draft" | "confirmed">("confirmed");

  const [lineItems, setLineItems] = useState<InvoiceLine[]>([createEmptyLine()]);
  const [dispatchMeta, setDispatchMeta] = useState<DispatchMeta>(defaultDispatchMeta());
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<SavedInvoicePreview | null>(null);
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    void initializePage();
  }, [editId]);

  async function initializePage() {
    try {
      setLoading(true);
      setError("");
      const loadedBuyers = await loadBuyers();
      if (editId) {
        await loadExistingInvoice(loadedBuyers, editId);
      } else {
        await generateNextInvoiceNumber(invoiceDate);
      }
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
      .order("display_name", { ascending: true });

    if (error) throw error;

    const rows = ((data || []) as BuyerRow[]).map(normalizeBuyer);
    setBuyers(rows);
    return rows;
  }

  async function loadExistingInvoice(buyerRows: Buyer[], id: string) {
    const { data, error } = await supabase.from("invoices").select("*").eq("id", id).single();
    if (error) throw error;

    const invoice = data as InvoiceRecord;
    const existingBuyer = buyerRows.find((b) => b.id === invoice.buyer_id) ?? null;

    if (existingBuyer) {
      setSelectedBuyer(existingBuyer);
      setBuyerSearch(existingBuyer.display_name);
      await loadBuyerItems(existingBuyer.id);
    } else {
      setBuyerSearch(invoice.buyer_display_name || invoice.buyer_name || "");
    }

    const invoiceDateValue =
      invoice.invoice_date ||
      (invoice.created_at ? new Date(invoice.created_at).toISOString().slice(0, 10) : "");

    setInvoiceNumber(invoice.invoice_number || "");
    setInvoiceDate(invoiceDateValue || new Date().toISOString().slice(0, 10));
    setBuyersPoNumber(invoice.buyers_po_number || "");
    setFyLabel(invoice.fy_label || getCurrentFY(new Date(invoiceDateValue || new Date())));
    setFySerial(Number(invoice.fy_serial || 1));
    setInvoiceStatus(invoice.status === "draft" ? "draft" : "confirmed");
    setNotes(invoice.notes || "");
    setDispatchMeta(normalizeDispatchMeta(invoice.dispatch_meta));
    setLineItems(
      Array.isArray(invoice.line_items) && invoice.line_items.length > 0
        ? invoice.line_items.map(normalizeLine)
        : [createEmptyLine()]
    );
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

  function handleSelectBuyer(buyer: Buyer) {
    setSelectedBuyer(buyer);
    setBuyerSearch(buyer.display_name);
    setBuyerDropdownOpen(false);
    setDispatchMeta((prev) => ({
      ...prev,
      place_of_supply: buyer.state || "",
      billed_to: buyer.address || "",
      shipped_to: buyer.address || "",
    }));
    void loadBuyerItems(buyer.id).catch((e) => {
      setError(e instanceof Error ? e.message : "Failed to load buyer item memory.");
    });
  }

  const filteredBuyers = buyers.filter((buyer) =>
    [buyer.display_name, buyer.company_name, buyer.branch_name || "", buyer.gstin || "", buyer.state || ""]
      .join(" ")
      .toLowerCase()
      .includes(buyerSearch.toLowerCase())
  );

  const taxMode =
    selectedBuyer?.state_code && selectedBuyer.state_code !== MAHARASHTRA_STATE_CODE
      ? "inter"
      : "intra";

  const subtotal = lineItems.reduce((sum, line) => sum + Number(line.taxable_value || 0), 0);
  const freightPacking = Number(dispatchMeta.freight_packing || 0);
  const otherCharges = Number(dispatchMeta.other_charges || 0);
  const taxableBase = Number((subtotal + freightPacking + otherCharges).toFixed(2));

  const lineGstRate = lineItems.find((l) => Number(l.gst_rate) > 0)?.gst_rate ?? 18;
  const halfRate = lineGstRate / 2 / 100;
  const fullRate = lineGstRate / 100;

  const cgst = taxMode === "intra" ? Number((taxableBase * halfRate).toFixed(2)) : 0;
  const sgst = taxMode === "intra" ? Number((taxableBase * halfRate).toFixed(2)) : 0;
  const igst = taxMode === "inter" ? Number((taxableBase * fullRate).toFixed(2)) : 0;
  const total = Number((taxableBase + cgst + sgst + igst).toFixed(2));

  function updateLine(index: number, patch: Partial<InvoiceLine>) {
    setLineItems((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        next.taxable_value = Number(
          (Number(next.quantity || 0) * Number(next.unit_rate || 0)).toFixed(2)
        );
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

  function buildPreviewData(status: "draft" | "confirmed") {
    if (!selectedBuyer) {
      setError("Please select a buyer branch.");
      return null;
    }

    const validLines = lineItems.filter(
      (line) => line.description.trim() && Number(line.quantity) > 0
    );

    if (validLines.length === 0) {
      setError("Please add at least one valid line item.");
      return null;
    }

    const previewData: SavedInvoicePreview = {
      id: savedInvoiceId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      buyers_po_number: buyersPoNumber.trim() || null,
      fy_label: fyLabel,
      fy_serial: fySerial,
      status,
      buyer: {
        name: selectedBuyer.company_name,
        display_name: selectedBuyer.display_name,
        company_name: selectedBuyer.company_name,
        branch_name: selectedBuyer.branch_name,
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
      notes: notes.trim() || null,
      signed_by: "Authorised Signatory",
      signed_at: new Date().toISOString(),
      dispatch_meta: {
        ...dispatchMeta,
        place_of_supply: dispatchMeta.place_of_supply || selectedBuyer.state || "",
        billed_to: dispatchMeta.billed_to || selectedBuyer.address || "",
        shipped_to: dispatchMeta.shipped_to || selectedBuyer.address || "",
      },
    };

    return previewData;
  }

  async function handleSaveInvoice(status: "draft" | "confirmed") {
    try {
      setError("");
      setSaving(true);

      const previewData = buildPreviewData(status);
      if (!previewData || !selectedBuyer) {
        setSaving(false);
        return;
      }

      const payload = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        buyer_id: selectedBuyer.id,
        buyer_name: selectedBuyer.display_name,
        buyer_display_name: selectedBuyer.display_name,
        buyer_company_name: selectedBuyer.company_name,
        buyer_branch_name: selectedBuyer.branch_name,
        buyer_gstin: selectedBuyer.gstin,
        buyer_address: selectedBuyer.address,
        buyer_state: selectedBuyer.state,
        buyer_state_code: selectedBuyer.state_code,
        buyers_po_number: buyersPoNumber.trim() || null,
        status,
        fy_label: fyLabel,
        fy_serial: fySerial,
        line_items: previewData.line_items,
        subtotal: taxableBase,
        cgst,
        sgst,
        igst,
        total,
        notes: notes.trim() || null,
        dispatch_meta: previewData.dispatch_meta,
        signed_by: "Authorised Signatory",
        signed_at: new Date().toISOString(),
      };

      const result = editId
        ? await supabase.from("invoices").update(payload).eq("id", editId).select("id").single()
        : await supabase.from("invoices").insert(payload).select("id").single();

      if (result.error) throw result.error;

      for (const line of previewData.line_items) {
        if (!line.description.trim()) continue;

        const existing = buyerItems.find(
          (bi) =>
            bi.description.trim().toLowerCase() === line.description.trim().toLowerCase() &&
            bi.buyer_id === selectedBuyer.id
        );

        if (existing) {
          if (existing.last_price !== Number(line.unit_rate)) {
            await supabase
              .from("buyer_items")
              .update({
                last_price: Number(line.unit_rate),
                buyer_item_code: line.buyer_item_code.trim() || existing.buyer_item_code,
                hsn_code: line.hsn_code.trim() || existing.hsn_code,
                gst_rate: Number(line.gst_rate || 18),
                unit: line.unit.trim() || existing.unit,
              })
              .eq("id", existing.id);
          }
        } else {
          await supabase.from("buyer_items").insert({
            buyer_id: selectedBuyer.id,
            buyer_item_code: line.buyer_item_code.trim() || null,
            description: line.description.trim(),
            unit: line.unit.trim() || "Nos.",
            hsn_code: line.hsn_code.trim() || null,
            gst_rate: Number(line.gst_rate || 18),
            last_price: Number(line.unit_rate || 0),
          });
        }
      }

      const row = result.data as { id: string };
      setInvoiceStatus(status);
      setSavedInvoiceId(row.id);
      setPreviewInvoice({ ...previewData, id: row.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save invoice.");
    } finally {
      setSaving(false);
    }
  }

  // ─── Success screen ──────────────────────────────────────────────────────────

  if (savedInvoiceId && previewInvoice) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-lg">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-500 dark:text-green-400" />
            </div>

            <h2 className="text-viton-navy dark:text-white text-xl font-bold mb-1">
              {editId ? "Invoice Updated!" : "Invoice Created!"}
            </h2>
            <p className="text-viton-red dark:text-orange-400 text-sm font-mono mb-2">{invoiceNumber}</p>
            <p className="text-[#8892a8] dark:text-gray-500 text-sm mb-6">
              Saved as {invoiceStatus === "draft" ? "draft" : "confirmed"} · {selectedBuyer?.display_name}
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => savedInvoiceId && openInvoicePrint(savedInvoiceId)}
                className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
              >
                <Printer size={15} />
                Print Invoice
              </button>

              <a
                href="/dashboard/invoices/new"
                className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
              >
                <Plus size={15} />
                New Invoice
              </a>

              <a
                href="/dashboard/invoices/history"
                className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
              >
                <History size={15} />
                View History
              </a>
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-7 h-7 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#8892a8] dark:text-gray-400 text-sm">Loading invoice builder...</p>
        </div>
      </div>
    );
  }

  const previewable = !!selectedBuyer && lineItems.some((line) => line.description.trim());

  return (
    <>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-viton-navy dark:text-white text-2xl font-bold">
              {editId ? "Edit Invoice" : "New Invoice"}
            </h1>
            <p className={subTextCls + " mt-1"}>
              Fast entry for invoice creation with buyer branch memory and print preview.
            </p>
          </div>

          <div className={cardCls + " px-4 py-3 min-w-[240px]"}>
            <p className="text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider">Invoice Number</p>
            <p className="text-viton-navy dark:text-white font-semibold font-mono mt-1">{invoiceNumber || "—"}</p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 text-red-600 dark:text-red-300 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-6">

            {/* ── Buyer Branch ── */}
            <div className={cardCls + " p-5"}>
              <h2 className={headingCls}>Buyer Branch</h2>

              <div className="relative">
                <label className={labelCls}>
                  Select Buyer *
                </label>

                <Search size={16} className="absolute left-4 top-[46px] text-[#8892a8] dark:text-gray-500" />

                <input
                  value={buyerSearch}
                  onChange={(e) => {
                    setBuyerSearch(e.target.value);
                    setBuyerDropdownOpen(true);
                    if (selectedBuyer?.display_name !== e.target.value) {
                      setSelectedBuyer(null);
                      setBuyerItems([]);
                    }
                  }}
                  onFocus={() => setBuyerDropdownOpen(true)}
                  placeholder="Search company, branch, GSTIN or state"
                  className={inputCls + " pl-10 pr-10"}
                />

                {buyerSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setBuyerSearch("");
                      setSelectedBuyer(null);
                      setBuyerItems([]);
                      setBuyerDropdownOpen(false);
                    }}
                    className="absolute right-4 top-[45px] text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white"
                  >
                    <X size={16} />
                  </button>
                ) : null}

                {buyerDropdownOpen && buyerSearch.trim() && filteredBuyers.length > 0 ? (
                  <div className="absolute z-20 mt-2 w-full bg-white dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden shadow-2xl max-h-80 overflow-y-auto">
                    {filteredBuyers.slice(0, 10).map((buyer) => (
                      <button
                        key={buyer.id}
                        type="button"
                        onClick={() => handleSelectBuyer(buyer)}
                        className="w-full text-left px-4 py-3 hover:bg-[#f1f3f8] dark:hover:bg-gray-900 border-b border-[#dde1ea] dark:border-gray-800 last:border-0"
                      >
                        <p className="text-viton-navy dark:text-white font-medium">{buyer.company_name}</p>
                        <p className="text-[#8892a8] dark:text-gray-400 text-xs mt-1">
                          {buyer.branch_name || buyer.state || "Main Branch"} ·{" "}
                          {buyer.gstin || "No GSTIN"}
                          {buyer.state_code ? ` · Code ${buyer.state_code}` : ""}
                        </p>
                        {buyer.address ? (
                          <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1 line-clamp-2">{buyer.address}</p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {selectedBuyer ? (
                <div className={innerCardCls + " mt-4 p-4 space-y-2"}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-viton-navy dark:text-white font-semibold">{selectedBuyer.company_name}</p>
                      <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">
                        {selectedBuyer.branch_name || "Main Branch"}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        taxMode === "intra"
                          ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                          : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {taxMode === "intra"
                        ? `CGST ${lineGstRate / 2}% + SGST ${lineGstRate / 2}%`
                        : `IGST ${lineGstRate}%`}
                    </span>
                  </div>

                  <p className="text-[#4a5578] dark:text-gray-400 text-sm whitespace-pre-line">
                    {selectedBuyer.address || "No address"}
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#4a5578] dark:text-gray-400">
                    <span>GSTIN: {selectedBuyer.gstin || "—"}</span>
                    <span>
                      State: {selectedBuyer.state || "—"}{" "}
                      {selectedBuyer.state_code ? `(${selectedBuyer.state_code})` : ""}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={labelCls}>Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => {
                      setInvoiceDate(e.target.value);
                      if (!editId) {
                        void generateNextInvoiceNumber(e.target.value).catch(() => null);
                      }
                    }}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Buyer PO No.</label>
                  <input
                    value={buyersPoNumber}
                    onChange={(e) => setBuyersPoNumber(e.target.value)}
                    placeholder="Customer PO reference"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* ── Line Items ── */}
            <div className={cardCls + " overflow-hidden"}>
              <div className="px-5 py-4 border-b border-[#dde1ea] dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-viton-navy dark:text-white font-bold text-lg">Line Items</h2>
                  <p className={subTextCls + " mt-1"}>
                    Description stays wide for readability and printing.
                  </p>
                </div>

                <button
                  onClick={addLine}
                  className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
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
                    <div
                      key={index}
                      className={innerCardCls + " p-4"}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-viton-navy dark:text-white font-semibold">Line {index + 1}</p>

                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border border-red-200 dark:border-red-500/30 hover:border-red-500 font-semibold px-3 py-2 rounded-xl text-sm transition"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <div>
                          <label className={labelSmCls}>Buyer PO Sr. No.</label>
                          <input
                            value={line.buyer_po_sr_no}
                            onChange={(e) => updateLine(index, { buyer_po_sr_no: e.target.value })}
                            placeholder="00010"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelSmCls}>Buyer Item Code</label>
                          <input
                            value={line.buyer_item_code}
                            onChange={(e) => updateLine(index, { buyer_item_code: e.target.value })}
                            placeholder="Optional"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelSmCls}>HSN Code</label>
                          <input
                            value={line.hsn_code}
                            onChange={(e) => updateLine(index, { hsn_code: e.target.value })}
                            placeholder="84818030"
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelSmCls}>GST %</label>
                          <input
                            type="number"
                            value={line.gst_rate}
                            onChange={(e) =>
                              updateLine(index, { gst_rate: Number(e.target.value) })
                            }
                            className={inputCls}
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className={labelSmCls}>Description of Goods</label>
                        <textarea
                          value={line.description}
                          onChange={(e) => updateLine(index, { description: e.target.value })}
                          placeholder="Type the full item description here"
                          className={inputCls + " min-h-[120px] resize-y"}
                        />
                      </div>

                      {selectedBuyer && line.description.trim() && suggestions.length > 0 ? (
                        <div className={cardCls + " mb-3 overflow-hidden"}>
                          {suggestions.slice(0, 5).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => applyBuyerItem(index, item)}
                              className="w-full text-left px-4 py-3 hover:bg-[#f1f3f8] dark:hover:bg-gray-800 border-b border-[#dde1ea] dark:border-gray-800 last:border-0"
                            >
                              <p className="text-viton-navy dark:text-white text-sm font-medium">
                                {item.buyer_item_code || "No code"}
                              </p>
                              <p className="text-[#8892a8] dark:text-gray-400 text-xs mt-1 line-clamp-2">
                                {item.description}
                              </p>
                              {item.last_price ? (
                                <p className="text-viton-red dark:text-orange-400 text-xs mt-0.5 font-mono">
                                  Last: Rs. {item.last_price.toLocaleString("en-IN")}
                                </p>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className={labelSmCls}>Quantity</label>
                          <input
                            type="number"
                            min="0"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(index, { quantity: Number(e.target.value) })
                            }
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelSmCls}>Unit</label>
                          <input
                            value={line.unit}
                            onChange={(e) => updateLine(index, { unit: e.target.value })}
                            placeholder="Nos."
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelSmCls}>Unit Rate (Rs.)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_rate}
                            onChange={(e) =>
                              updateLine(index, { unit_rate: Number(e.target.value) })
                            }
                            className={inputCls}
                          />
                        </div>

                        <div>
                          <label className={labelSmCls}>Taxable Value</label>
                          <input
                            type="number"
                            readOnly
                            value={line.taxable_value}
                            className="w-full bg-[#eceef4] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-800 rounded-xl px-4 py-3 text-[#4a5578] dark:text-white text-sm cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="space-y-6">
            <div className={cardCls + " p-5"}>
              <h2 className={headingCls}>Dispatch and Notes</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Place of Supply", key: "place_of_supply", placeholder: "" },
                  { label: "PO Date", key: "po_date", type: "date" },
                  { label: "Date / Time of Supply", key: "date_time_of_supply", placeholder: "24.03.2026 AT 13.00 Hr." },
                  { label: "Documents Through", key: "documents_through", placeholder: "" },
                  { label: "Transportation", key: "transportation", placeholder: "VEPL Scope / VRL / Self" },
                  { label: "L.R. No.", key: "lr_no", placeholder: "" },
                  { label: "Mode of Dispatch", key: "mode_of_dispatch", placeholder: "" },
                  { label: "Vehicle No.", key: "vehicle_no", placeholder: "" },
                  { label: "Freight / Packing", key: "freight_packing", type: "number" },
                  { label: "Other Charges", key: "other_charges", type: "number" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className={labelCls}>{field.label}</label>
                    <input
                      type={field.type || "text"}
                      min={field.type === "number" ? "0" : undefined}
                      step={field.type === "number" ? "0.01" : undefined}
                      value={(dispatchMeta as any)[field.key]}
                      onChange={(e) =>
                        setDispatchMeta((prev) => ({
                          ...prev,
                          [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value,
                        }))
                      }
                      placeholder={field.placeholder}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-4">
                {[
                  { label: "Billed To", key: "billed_to" },
                  { label: "Shipped To", key: "shipped_to" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className={labelCls}>{field.label}</label>
                    <textarea
                      value={(dispatchMeta as any)[field.key]}
                      onChange={(e) =>
                        setDispatchMeta((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className={inputCls + " min-h-[88px] resize-none"}
                    />
                  </div>
                ))}

                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes..."
                    className={inputCls + " min-h-[110px] resize-none"}
                  />
                </div>
              </div>
            </div>

            {/* ── Totals ── */}
            <div className={cardCls + " p-5"}>
              <h2 className={headingCls}>Totals</h2>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-[#4a5578] dark:text-gray-400">
                  <span>Items Subtotal</span>
                  <span>Rs. {money(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[#4a5578] dark:text-gray-400">
                  <span>Freight / Packing</span>
                  <span>Rs. {money(freightPacking)}</span>
                </div>
                <div className="flex items-center justify-between text-[#4a5578] dark:text-gray-400">
                  <span>Other Charges</span>
                  <span>Rs. {money(otherCharges)}</span>
                </div>
                <div className="flex items-center justify-between text-[#4a5578] dark:text-gray-300 border-t border-[#dde1ea] dark:border-gray-800 pt-2">
                  <span>Taxable Base</span>
                  <span>Rs. {money(taxableBase)}</span>
                </div>
                <div className="flex items-center justify-between text-[#4a5578] dark:text-gray-400">
                  <span>CGST ({lineGstRate / 2}%)</span>
                  <span>Rs. {money(cgst)}</span>
                </div>
                <div className="flex items-center justify-between text-[#4a5578] dark:text-gray-400">
                  <span>SGST ({lineGstRate / 2}%)</span>
                  <span>Rs. {money(sgst)}</span>
                </div>
                <div className="flex items-center justify-between text-[#4a5578] dark:text-gray-400">
                  <span>IGST ({lineGstRate}%)</span>
                  <span>Rs. {money(igst)}</span>
                </div>
                <div className="flex items-center justify-between text-viton-navy dark:text-white font-bold text-base pt-2 border-t border-[#dde1ea] dark:border-gray-800">
                  <span>Total</span>
                  <span>Rs. {money(total)}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    const previewData = buildPreviewData(invoiceStatus);
                    if (!previewData) return;
                    setPreviewInvoice(previewData);
                    setPreviewOpen(true);
                  }}
                  disabled={!previewable}
                  className="flex items-center gap-2 bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 disabled:opacity-50 text-[#4a5578] dark:text-white font-semibold px-5 py-3 rounded-xl text-sm transition"
                >
                  <Eye size={15} />
                  Preview
                </button>

                <button
                  type="button"
                  onClick={() => void handleSaveInvoice("draft")}
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 disabled:opacity-60 text-[#4a5578] dark:text-white font-semibold px-5 py-3 rounded-xl text-sm transition"
                >
                  <Save size={15} />
                  {saving ? "Saving..." : "Save Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => void handleSaveInvoice("confirmed")}
                  disabled={saving}
                  className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl text-sm transition"
                >
                  <FileText size={15} />
                  {saving ? "Saving..." : editId ? "Save Changes" : "Create Invoice"}
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
