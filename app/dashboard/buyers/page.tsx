"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  Search,
  X,
  Building2,
  Trash2,
  Plus,
  Phone,
  MapPin,
  BadgeIndianRupee,
  Pencil,
  Eye,
  Package,
  Save,
  GitBranch,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Buyer = {
  id: string;
  name: string;
  company_name: string | null;
  branch_name: string | null;
  display_name: string | null;
  address: string | null;
  gstin: string | null;
  state: string | null;
  state_code: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  payment_terms: string | null;
  created_at: string | null;
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
  created_at: string | null;
};

type BuyerFormState = {
  company_name: string;
  branch_name: string;
  address: string;
  gstin: string;
  state: string;
  state_code: string;
  contact_name: string;
  contact_phone: string;
  payment_terms: string;
};

type BuyerItemFormState = {
  buyer_item_code: string;
  description: string;
  unit: string;
  hsn_code: string;
  gst_rate: string;
  last_price: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const INDIA_STATES: { state: string; code: string }[] = [
  { state: "Andhra Pradesh", code: "37" },
  { state: "Arunachal Pradesh", code: "12" },
  { state: "Assam", code: "18" },
  { state: "Bihar", code: "10" },
  { state: "Chhattisgarh", code: "22" },
  { state: "Goa", code: "30" },
  { state: "Gujarat", code: "24" },
  { state: "Haryana", code: "06" },
  { state: "Himachal Pradesh", code: "02" },
  { state: "Jharkhand", code: "20" },
  { state: "Karnataka", code: "29" },
  { state: "Kerala", code: "32" },
  { state: "Madhya Pradesh", code: "23" },
  { state: "Maharashtra", code: "27" },
  { state: "Manipur", code: "14" },
  { state: "Meghalaya", code: "17" },
  { state: "Mizoram", code: "15" },
  { state: "Nagaland", code: "13" },
  { state: "Odisha", code: "21" },
  { state: "Punjab", code: "03" },
  { state: "Rajasthan", code: "08" },
  { state: "Sikkim", code: "11" },
  { state: "Tamil Nadu", code: "33" },
  { state: "Telangana", code: "36" },
  { state: "Tripura", code: "16" },
  { state: "Uttar Pradesh", code: "09" },
  { state: "Uttarakhand", code: "05" },
  { state: "West Bengal", code: "19" },
  { state: "Andaman and Nicobar Islands", code: "35" },
  { state: "Chandigarh", code: "04" },
  { state: "Dadra and Nagar Haveli and Daman and Diu", code: "26" },
  { state: "Delhi", code: "07" },
  { state: "Jammu and Kashmir", code: "01" },
  { state: "Ladakh", code: "38" },
  { state: "Lakshadweep", code: "31" },
  { state: "Puducherry", code: "34" },
];

const STATE_CODE_MAP: Record<string, { state: string; code: string }> = {};
INDIA_STATES.forEach((s) => {
  STATE_CODE_MAP[s.code] = s;
});

const emptyBuyerForm: BuyerFormState = {
  company_name: "",
  branch_name: "",
  address: "",
  gstin: "",
  state: "",
  state_code: "",
  contact_name: "",
  contact_phone: "",
  payment_terms: "",
};

const emptyItemForm: BuyerItemFormState = {
  buyer_item_code: "",
  description: "",
  unit: "",
  hsn_code: "",
  gst_rate: "",
  last_price: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStateFromGSTIN(gstin: string): { state: string; code: string } | null {
  const prefix = gstin.trim().slice(0, 2);
  return STATE_CODE_MAP[prefix] || null;
}

function composeDisplayName(companyName: string, branchName: string): string {
  const c = companyName.trim();
  const b = branchName.trim();
  if (c && b) return `${c} - ${b}`;
  return c || b;
}

function normalizeBuyerForm(buyer: Buyer): BuyerFormState {
  return {
    company_name: buyer.company_name ?? buyer.name ?? "",
    branch_name: buyer.branch_name ?? "",
    address: buyer.address ?? "",
    gstin: buyer.gstin ?? "",
    state: buyer.state ?? "",
    state_code: buyer.state_code ?? "",
    contact_name: buyer.contact_name ?? "",
    contact_phone: buyer.contact_phone ?? "",
    payment_terms: buyer.payment_terms ?? "",
  };
}

function normalizeItemForm(item: BuyerItem): BuyerItemFormState {
  return {
    buyer_item_code: item.buyer_item_code ?? "",
    description: item.description ?? "",
    unit: item.unit ?? "",
    hsn_code: item.hsn_code ?? "",
    gst_rate: item.gst_rate != null ? String(item.gst_rate) : "",
    last_price: item.last_price != null ? String(item.last_price) : "",
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BuyersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [filteredBuyers, setFilteredBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Distinct company names for combobox
  const [companyNames, setCompanyNames] = useState<string[]>([]);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  // Buyer modal
  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [buyerModalMode, setBuyerModalMode] = useState<"add" | "edit">("add");
  const [buyerForm, setBuyerForm] = useState<BuyerFormState>(emptyBuyerForm);
  const [editingBuyerId, setEditingBuyerId] = useState<string | null>(null);
  const [savingBuyer, setSavingBuyer] = useState(false);

  // Detail panel
  const [detailBuyer, setDetailBuyer] = useState<Buyer | null>(null);
  const [buyerItems, setBuyerItems] = useState<BuyerItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Item forms
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemForm, setNewItemForm] = useState<BuyerItemFormState>(emptyItemForm);
  const [savingItem, setSavingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemForm, setEditingItemForm] = useState<BuyerItemFormState>(emptyItemForm);

  // Delete confirmation
  const [confirmDeleteBuyer, setConfirmDeleteBuyer] = useState<Buyer | null>(null);
  const [deletingBuyerId, setDeletingBuyerId] = useState<string | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

  async function loadBuyers() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("buyers")
      .select("*")
      .order("company_name", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as Buyer[];
    setBuyers(rows);
    setFilteredBuyers(rows);

    // Build distinct company names for combobox
    const names = Array.from(
      new Set(
        rows
          .map((b) => b.company_name?.trim() || b.name?.trim())
          .filter(Boolean) as string[]
      )
    ).sort();
    setCompanyNames(names);

    setLoading(false);
  }

  async function loadBuyerItems(buyerId: string) {
    setItemsLoading(true);
    const { data, error } = await supabase
      .from("buyer_items")
      .select("*")
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setBuyerItems([]);
      setItemsLoading(false);
      return;
    }

    setBuyerItems((data || []) as BuyerItem[]);
    setItemsLoading(false);
  }

  useEffect(() => {
    void loadBuyers();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredBuyers(buyers);
      return;
    }
    const q = search.toLowerCase();
    setFilteredBuyers(
      buyers.filter((buyer) =>
        [
          buyer.company_name,
          buyer.branch_name,
          buyer.display_name,
          buyer.name,
          buyer.gstin,
          buyer.state,
          buyer.state_code,
          buyer.contact_name,
          buyer.contact_phone,
          buyer.payment_terms,
          buyer.address,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [buyers, search]);

  // ── Modal helpers ───────────────────────────────────────────────────────────

  function openAddBuyer() {
    setBuyerModalMode("add");
    setEditingBuyerId(null);
    setBuyerForm(emptyBuyerForm);
    setBuyerModalOpen(true);
    setCompanyDropdownOpen(false);
    setError(null);
  }

  function openEditBuyer(buyer: Buyer) {
    setBuyerModalMode("edit");
    setEditingBuyerId(buyer.id);
    setBuyerForm(normalizeBuyerForm(buyer));
    setBuyerModalOpen(true);
    setCompanyDropdownOpen(false);
    setError(null);
  }

  async function openBuyerDetail(buyer: Buyer) {
    setDetailBuyer(buyer);
    setBuyerItems([]);
    setShowNewItemForm(false);
    setEditingItemId(null);
    setNewItemForm(emptyItemForm);
    setEditingItemForm(emptyItemForm);
    await loadBuyerItems(buyer.id);
  }

  // ── Form field updates ──────────────────────────────────────────────────────

  function updateBuyerField<K extends keyof BuyerFormState>(
    key: K,
    value: BuyerFormState[K]
  ) {
    setBuyerForm((prev) => {
      const next = { ...prev, [key]: value };

      // GSTIN typed → auto-fill state + state_code
      if (key === "gstin") {
        const gst = String(value).toUpperCase();
        next.gstin = gst;
        if (gst.length >= 2) {
          const meta = getStateFromGSTIN(gst);
          if (meta) {
            next.state = meta.state;
            next.state_code = meta.code;
          }
        }
      }

      // State selected → auto-fill state_code
      if (key === "state") {
        const match = INDIA_STATES.find((s) => s.state === value);
        if (match) next.state_code = match.code;
      }

      return next;
    });
  }

  function updateItemForm<K extends keyof BuyerItemFormState>(
    key: K,
    value: BuyerItemFormState[K]
  ) {
    setNewItemForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateEditingItemForm<K extends keyof BuyerItemFormState>(
    key: K,
    value: BuyerItemFormState[K]
  ) {
    setEditingItemForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── Save / delete buyers ────────────────────────────────────────────────────

  async function handleSaveBuyer(e: React.FormEvent) {
    e.preventDefault();
    setSavingBuyer(true);
    setError(null);
    setSuccess(null);

    if (!buyerForm.company_name.trim()) {
      setError("Company name is required.");
      setSavingBuyer(false);
      return;
    }

    const displayName = composeDisplayName(buyerForm.company_name, buyerForm.branch_name);

    const payload = {
      company_name: buyerForm.company_name.trim(),
      branch_name: buyerForm.branch_name.trim() || null,
      display_name: displayName,
      name: displayName, // backward-compat
      address: buyerForm.address.trim() || null,
      gstin: buyerForm.gstin.trim().toUpperCase() || null,
      state: buyerForm.state.trim() || null,
      state_code: buyerForm.state_code.trim() || null,
      contact_name: buyerForm.contact_name.trim() || null,
      contact_phone: buyerForm.contact_phone.trim() || null,
      payment_terms: buyerForm.payment_terms.trim() || null,
    };

    if (buyerModalMode === "add") {
      const { error } = await supabase.from("buyers").insert(payload);
      if (error) { setError(error.message); setSavingBuyer(false); return; }
      setSuccess("Buyer branch added successfully.");
    } else {
      if (!editingBuyerId) { setError("Missing buyer ID."); setSavingBuyer(false); return; }
      const { error } = await supabase.from("buyers").update(payload).eq("id", editingBuyerId);
      if (error) { setError(error.message); setSavingBuyer(false); return; }
      setSuccess("Buyer branch updated successfully.");
      if (detailBuyer && editingBuyerId === detailBuyer.id) {
        setDetailBuyer({ ...detailBuyer, ...payload });
      }
    }

    setBuyerModalOpen(false);
    setBuyerForm(emptyBuyerForm);
    setEditingBuyerId(null);
    setSavingBuyer(false);
    await loadBuyers();
  }

  async function handleDeleteBuyer(id: string) {
    setDeletingBuyerId(id);
    setError(null);
    const { error } = await supabase.from("buyers").delete().eq("id", id);
    if (error) { setError(error.message); setDeletingBuyerId(null); return; }
    if (detailBuyer?.id === id) setDetailBuyer(null);
    setConfirmDeleteBuyer(null);
    setDeletingBuyerId(null);
    setSuccess("Buyer branch deleted.");
    await loadBuyers();
  }

  // ── Buyer items ─────────────────────────────────────────────────────────────

  async function handleAddBuyerItem() {
    if (!detailBuyer) return;
    setSavingItem(true);
    setError(null);

    if (!newItemForm.description.trim()) {
      setError("Item description is required.");
      setSavingItem(false);
      return;
    }

    const payload = {
      buyer_id: detailBuyer.id,
      buyer_item_code: newItemForm.buyer_item_code.trim() || null,
      description: newItemForm.description.trim(),
      unit: newItemForm.unit.trim() || null,
      hsn_code: newItemForm.hsn_code.trim() || null,
      gst_rate: newItemForm.gst_rate.trim() ? Number(newItemForm.gst_rate) : null,
      last_price: newItemForm.last_price.trim() ? Number(newItemForm.last_price) : null,
    };

    const { error } = await supabase.from("buyer_items").insert(payload);
    if (error) { setError(error.message); setSavingItem(false); return; }

    setSuccess("Item added.");
    setShowNewItemForm(false);
    setNewItemForm(emptyItemForm);
    setSavingItem(false);
    await loadBuyerItems(detailBuyer.id);
  }

  function startEditingItem(item: BuyerItem) {
    setEditingItemId(item.id);
    setEditingItemForm(normalizeItemForm(item));
  }

  function cancelEditingItem() {
    setEditingItemId(null);
    setEditingItemForm(emptyItemForm);
  }

  async function handleSaveEditedItem(itemId: string) {
    setSavingItem(true);
    setError(null);

    if (!editingItemForm.description.trim()) {
      setError("Item description is required.");
      setSavingItem(false);
      return;
    }

    const payload = {
      buyer_item_code: editingItemForm.buyer_item_code.trim() || null,
      description: editingItemForm.description.trim(),
      unit: editingItemForm.unit.trim() || null,
      hsn_code: editingItemForm.hsn_code.trim() || null,
      gst_rate: editingItemForm.gst_rate.trim() ? Number(editingItemForm.gst_rate) : null,
      last_price: editingItemForm.last_price.trim() ? Number(editingItemForm.last_price) : null,
    };

    const { error } = await supabase.from("buyer_items").update(payload).eq("id", itemId);
    if (error) { setError(error.message); setSavingItem(false); return; }

    setSuccess("Item updated.");
    setEditingItemId(null);
    setEditingItemForm(emptyItemForm);
    setSavingItem(false);
    if (detailBuyer) await loadBuyerItems(detailBuyer.id);
  }

  async function handleDeleteItem(itemId: string) {
    const ok = window.confirm("Delete this item?");
    if (!ok || !detailBuyer) return;
    const { error } = await supabase.from("buyer_items").delete().eq("id", itemId);
    if (error) { setError(error.message); return; }
    setSuccess("Item deleted.");
    await loadBuyerItems(detailBuyer.id);
  }

  // ── Filtered company suggestions for combobox ───────────────────────────────

  const companySuggestions = companyNames.filter((name) =>
    name.toLowerCase().includes(buyerForm.company_name.toLowerCase()) &&
    name.toLowerCase() !== buyerForm.company_name.toLowerCase()
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">

      {/* ── Add / Edit Buyer Modal ── */}
      {buyerModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <div>
                <h2 className="text-white font-bold text-lg">
                  {buyerModalMode === "add" ? "Add Buyer Branch" : "Edit Buyer Branch"}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {buyerModalMode === "add"
                    ? "Each branch has its own GSTIN, address, and state."
                    : "Update this branch's details."}
                </p>
              </div>
              <button
                onClick={() => setBuyerModalOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-800 text-gray-500 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBuyer} className="p-6 space-y-4">

              {/* Company name combobox */}
              <div className="relative">
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  Company Name *
                </label>
                <input
                  value={buyerForm.company_name}
                  onChange={(e) => {
                    updateBuyerField("company_name", e.target.value);
                    setCompanyDropdownOpen(true);
                  }}
                  onFocus={() => setCompanyDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setCompanyDropdownOpen(false), 150)}
                  placeholder="BPCL, VVF India, Mahadhan..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {companyDropdownOpen && buyerForm.company_name.trim() && companySuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-gray-950 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                    {companySuggestions.slice(0, 8).map((name) => (
                      <button
                        key={name}
                        type="button"
                        onMouseDown={() => {
                          updateBuyerField("company_name", name);
                          setCompanyDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-white text-sm hover:bg-gray-800 border-b border-gray-800 last:border-0"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-gray-600 text-xs mt-1.5">
                  Select an existing company or type a new one.
                </p>
              </div>

              {/* Branch name */}
              <div>
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  Branch / Location Name
                  <span className="text-gray-600 font-normal ml-2">(optional)</span>
                </label>
                <input
                  value={buyerForm.branch_name}
                  onChange={(e) => updateBuyerField("branch_name", e.target.value)}
                  placeholder="Maharashtra, Kerala, Head Office..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {(buyerForm.company_name || buyerForm.branch_name) && (
                  <p className="text-gray-500 text-xs mt-1.5">
                    Display name:{" "}
                    <span className="text-orange-400 font-medium">
                      {composeDisplayName(buyerForm.company_name, buyerForm.branch_name) || "—"}
                    </span>
                  </p>
                )}
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  GSTIN
                </label>
                <input
                  value={buyerForm.gstin}
                  onChange={(e) => updateBuyerField("gstin", e.target.value)}
                  placeholder="27ABCDE1234F1Z5"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm uppercase placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-gray-600 text-xs mt-1.5">
                  State and code auto-fill from the first 2 digits.
                </p>
              </div>

              {/* State dropdown + code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">
                    State
                  </label>
                  <select
                    value={buyerForm.state}
                    onChange={(e) => updateBuyerField("state", e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">— Select State —</option>
                    {INDIA_STATES.map((s) => (
                      <option key={s.code} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">
                    State Code
                  </label>
                  <input
                    value={buyerForm.state_code}
                    readOnly
                    placeholder="Auto-filled"
                    className="w-full bg-gray-800 border border-gray-800 rounded-xl px-4 py-3 text-gray-300 text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  Address
                </label>
                <textarea
                  value={buyerForm.address}
                  onChange={(e) => updateBuyerField("address", e.target.value)}
                  placeholder="Full billing address for this branch"
                  className="w-full min-h-[110px] bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">
                    Contact Name
                  </label>
                  <input
                    value={buyerForm.contact_name}
                    onChange={(e) => updateBuyerField("contact_name", e.target.value)}
                    placeholder="Mr. Sharma"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">
                    Contact Phone
                  </label>
                  <input
                    value={buyerForm.contact_phone}
                    onChange={(e) => updateBuyerField("contact_phone", e.target.value)}
                    placeholder="+91..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Payment terms */}
              <div>
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  Payment Terms
                </label>
                <input
                  value={buyerForm.payment_terms}
                  onChange={(e) => updateBuyerField("payment_terms", e.target.value)}
                  placeholder="30 Days / Advance / Immediate"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBuyerModalOpen(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBuyer}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-all"
                >
                  <Save size={16} />
                  {savingBuyer
                    ? "Saving..."
                    : buyerModalMode === "add"
                    ? "Save Branch"
                    : "Update Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {confirmDeleteBuyer && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-center text-lg mb-1">Delete Branch?</h3>
            <p className="text-gray-400 text-sm text-center mb-1">
              This will remove{" "}
              <span className="text-white font-medium">
                {confirmDeleteBuyer.display_name || confirmDeleteBuyer.company_name || confirmDeleteBuyer.name}
              </span>.
            </p>
            <p className="text-gray-600 text-xs text-center mb-6">
              Other branches of the same company are not affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteBuyer(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBuyer(confirmDeleteBuyer.id)}
                disabled={deletingBuyerId === confirmDeleteBuyer.id}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm"
              >
                {deletingBuyerId === confirmDeleteBuyer.id ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Panel Modal ── */}
      {detailBuyer && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-6xl my-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <div>
                <h2 className="text-white font-bold text-lg">
                  {detailBuyer.company_name || detailBuyer.name}
                </h2>
                {detailBuyer.branch_name && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <GitBranch size={12} className="text-orange-400" />
                    <p className="text-orange-400 text-sm font-medium">{detailBuyer.branch_name}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditBuyer(detailBuyer)}
                  className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 hover:border-yellow-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                >
                  <Pencil size={14} />
                  Edit Branch
                </button>
                <button
                  onClick={() => setDetailBuyer(null)}
                  className="p-2 rounded-xl hover:bg-gray-800 text-gray-500 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
              {/* Branch details sidebar */}
              <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 h-fit">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Building2 size={18} className="text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Branch Details</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Used on invoices for this branch</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="text-gray-500 mb-1">GSTIN</div>
                    <div className="text-orange-300 font-mono break-all">
                      {detailBuyer.gstin || "—"}
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500 mb-1">State</div>
                    <div className="text-white">
                      {detailBuyer.state || "—"}
                      {detailBuyer.state_code ? ` (${detailBuyer.state_code})` : ""}
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500 mb-1">Address</div>
                    <div className="text-gray-300 whitespace-pre-wrap leading-6">
                      {detailBuyer.address || "—"}
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500 mb-1">Contact</div>
                    <div className="text-gray-300">
                      {detailBuyer.contact_name || "—"}
                      {detailBuyer.contact_phone ? ` · ${detailBuyer.contact_phone}` : ""}
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="text-gray-500 mb-1">Payment Terms</div>
                    <div className="text-gray-300">{detailBuyer.payment_terms || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Items panel */}
              <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-white font-bold text-lg">Item History</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Editable memory for repeat invoicing</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowNewItemForm((prev) => !prev);
                      setEditingItemId(null);
                      setNewItemForm(emptyItemForm);
                    }}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
                  >
                    <Plus size={14} />
                    {showNewItemForm ? "Close" : "Add Item"}
                  </button>
                </div>

                {showNewItemForm && (
                  <div className="mb-5 bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={newItemForm.buyer_item_code}
                        onChange={(e) => updateItemForm("buyer_item_code", e.target.value)}
                        placeholder="Buyer Item Code"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        value={newItemForm.unit}
                        onChange={(e) => updateItemForm("unit", e.target.value)}
                        placeholder="Unit (Nos., Set...)"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <textarea
                      value={newItemForm.description}
                      onChange={(e) => updateItemForm("description", e.target.value)}
                      placeholder="Description *"
                      className="w-full min-h-[90px] bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        value={newItemForm.hsn_code}
                        onChange={(e) => updateItemForm("hsn_code", e.target.value)}
                        placeholder="HSN Code"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        value={newItemForm.gst_rate}
                        onChange={(e) => updateItemForm("gst_rate", e.target.value)}
                        placeholder="GST Rate %"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        value={newItemForm.last_price}
                        onChange={(e) => updateItemForm("last_price", e.target.value)}
                        placeholder="Last Price (Rs.)"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => { setShowNewItemForm(false); setNewItemForm(emptyItemForm); }}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-4 py-2.5 rounded-xl text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddBuyerItem}
                        disabled={savingItem}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl text-sm"
                      >
                        <Save size={14} />
                        {savingItem ? "Saving..." : "Save Item"}
                      </button>
                    </div>
                  </div>
                )}

                {itemsLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : buyerItems.length === 0 ? (
                  <div className="text-center py-16 text-gray-600">No items yet for this branch.</div>
                ) : (
                  <div className="space-y-3">
                    {buyerItems.map((item) => {
                      const isEditing = editingItemId === item.id;
                      return (
                        <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                  value={editingItemForm.buyer_item_code}
                                  onChange={(e) => updateEditingItemForm("buyer_item_code", e.target.value)}
                                  placeholder="Buyer Item Code"
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <input
                                  value={editingItemForm.unit}
                                  onChange={(e) => updateEditingItemForm("unit", e.target.value)}
                                  placeholder="Unit"
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>
                              <textarea
                                value={editingItemForm.description}
                                onChange={(e) => updateEditingItemForm("description", e.target.value)}
                                placeholder="Description *"
                                className="w-full min-h-[90px] bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              />
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                  value={editingItemForm.hsn_code}
                                  onChange={(e) => updateEditingItemForm("hsn_code", e.target.value)}
                                  placeholder="HSN Code"
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <input
                                  value={editingItemForm.gst_rate}
                                  onChange={(e) => updateEditingItemForm("gst_rate", e.target.value)}
                                  placeholder="GST Rate %"
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <input
                                  value={editingItemForm.last_price}
                                  onChange={(e) => updateEditingItemForm("last_price", e.target.value)}
                                  placeholder="Last Price (Rs.)"
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>
                              <div className="flex justify-end gap-3">
                                <button onClick={cancelEditingItem} className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-4 py-2.5 rounded-xl text-sm">
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEditedItem(item.id)}
                                  disabled={savingItem}
                                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl text-sm"
                                >
                                  <Save size={14} />
                                  {savingItem ? "Saving..." : "Update Item"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                    <Package size={16} className="text-orange-400" />
                                  </div>
                                  <div className="text-white font-semibold">
                                    {item.buyer_item_code || "No buyer item code"}
                                  </div>
                                </div>
                                <div className="mt-3 text-gray-300 text-sm leading-6 whitespace-pre-wrap">
                                  {item.description}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {item.unit && (
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300">
                                      Unit: {item.unit}
                                    </span>
                                  )}
                                  {item.hsn_code && (
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300">
                                      HSN: {item.hsn_code}
                                    </span>
                                  )}
                                  {item.gst_rate != null && (
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300">
                                      GST: {item.gst_rate}%
                                    </span>
                                  )}
                                  {item.last_price != null && (
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300">
                                      Last Price: Rs. {Number(item.last_price).toLocaleString("en-IN")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button
                                  onClick={() => startEditingItem(item)}
                                  className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 hover:border-yellow-500 font-semibold px-3 py-2 rounded-xl text-sm transition-all"
                                >
                                  <Pencil size={14} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 font-semibold px-3 py-2 rounded-xl text-sm transition-all"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Buyers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Each card is one branch. One company can have multiple branches with different GSTINs.
          </p>
        </div>
        <button
          onClick={openAddBuyer}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-3 rounded-xl text-sm transition-all"
        >
          <Plus size={16} />
          Add Branch
        </button>
      </div>

      {/* ── Toasts ── */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-300 text-sm flex items-center justify-between gap-3">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-200 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, branch, GSTIN, state or contact..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Buyer cards ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredBuyers.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          {search ? "No branches match your search." : "No buyer branches added yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBuyers.map((buyer) => {
            const isIntra = buyer.state_code === "27";
            const displayName = buyer.display_name || buyer.company_name || buyer.name;

            return (
              <div
                key={buyer.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all"
              >
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 size={18} className="text-orange-400" />
                    </div>

                    <div className="min-w-0">
                      {/* Company + branch + tax mode badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold text-base">
                          {buyer.company_name || buyer.name}
                        </p>
                        {buyer.branch_name && (
                          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg bg-gray-800 text-gray-300">
                            <GitBranch size={11} />
                            {buyer.branch_name}
                          </span>
                        )}
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                            isIntra
                              ? "bg-green-500/10 text-green-400"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {isIntra ? "Intra-state" : "Inter-state"}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="mt-2 space-y-1.5">
                        {buyer.gstin && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-orange-300">{buyer.gstin}</span>
                          </div>
                        )}
                        {(buyer.state || buyer.state_code) && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <MapPin size={13} className="text-gray-500 flex-shrink-0" />
                            <span>
                              {buyer.state || "—"}
                              {buyer.state_code ? ` (${buyer.state_code})` : ""}
                            </span>
                          </div>
                        )}
                        {buyer.address && (
                          <div className="flex items-start gap-2 text-sm text-gray-500">
                            <MapPin size={13} className="text-gray-600 flex-shrink-0 mt-0.5" />
                            <span className="leading-5 line-clamp-2">{buyer.address}</span>
                          </div>
                        )}
                        {(buyer.contact_name || buyer.contact_phone) && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Phone size={13} className="text-gray-500 flex-shrink-0" />
                            <span>
                              {buyer.contact_name || "—"}
                              {buyer.contact_phone ? ` · ${buyer.contact_phone}` : ""}
                            </span>
                          </div>
                        )}
                        {buyer.payment_terms && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <BadgeIndianRupee size={13} className="text-gray-500 flex-shrink-0" />
                            <span>{buyer.payment_terms}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap justify-end flex-shrink-0">
                    <button
                      onClick={() => openBuyerDetail(buyer)}
                      className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                    >
                      <Eye size={14} />
                      View
                    </button>
                    <button
                      onClick={() => openEditBuyer(buyer)}
                      className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 hover:border-yellow-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteBuyer(buyer)}
                      className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
