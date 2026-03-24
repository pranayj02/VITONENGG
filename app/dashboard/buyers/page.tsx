"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  Search,
  X,
  Users,
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
} from "lucide-react";

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
  name: string;
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

const emptyBuyerForm: BuyerFormState = {
  name: "",
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

function getStateFromGSTIN(gstin: string) {
  const prefix = gstin.trim().slice(0, 2);

  const map: Record<string, { state: string; state_code: string }> = {
    "27": { state: "Maharashtra", state_code: "27" },
    "06": { state: "Haryana", state_code: "06" },
    "05": { state: "Uttarakhand", state_code: "05" },
    "24": { state: "Gujarat", state_code: "24" },
    "29": { state: "Karnataka", state_code: "29" },
    "33": { state: "Tamil Nadu", state_code: "33" },
    "07": { state: "Delhi", state_code: "07" },
  };

  return map[prefix] || { state: "", state_code: prefix || "" };
}

function normalizeBuyerForm(buyer: Buyer): BuyerFormState {
  return {
    name: buyer.name ?? "",
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

export default function BuyersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [filteredBuyers, setFilteredBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [buyerModalOpen, setBuyerModalOpen] = useState(false);
  const [buyerModalMode, setBuyerModalMode] = useState<"add" | "edit">("add");
  const [buyerForm, setBuyerForm] = useState<BuyerFormState>(emptyBuyerForm);
  const [editingBuyerId, setEditingBuyerId] = useState<string | null>(null);
  const [savingBuyer, setSavingBuyer] = useState(false);

  const [detailBuyer, setDetailBuyer] = useState<Buyer | null>(null);
  const [buyerItems, setBuyerItems] = useState<BuyerItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemForm, setNewItemForm] = useState<BuyerItemFormState>(emptyItemForm);
  const [savingItem, setSavingItem] = useState(false);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemForm, setEditingItemForm] = useState<BuyerItemFormState>(emptyItemForm);

  const [confirmDeleteBuyer, setConfirmDeleteBuyer] = useState<Buyer | null>(null);
  const [deletingBuyerId, setDeletingBuyerId] = useState<string | null>(null);

  async function loadBuyers() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("buyers")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as Buyer[];
    setBuyers(rows);
    setFilteredBuyers(rows);
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
    loadBuyers();
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

  function openAddBuyer() {
    setBuyerModalMode("add");
    setEditingBuyerId(null);
    setBuyerForm(emptyBuyerForm);
    setBuyerModalOpen(true);
    setError(null);
  }

  function openEditBuyer(buyer: Buyer) {
    setBuyerModalMode("edit");
    setEditingBuyerId(buyer.id);
    setBuyerForm(normalizeBuyerForm(buyer));
    setBuyerModalOpen(true);
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

  function updateBuyerField<K extends keyof BuyerFormState>(
    key: K,
    value: BuyerFormState[K]
  ) {
    const next = { ...buyerForm, [key]: value };

    if (key === "gstin") {
      const gst = String(value).toUpperCase();
      next.gstin = gst;

      if (gst.length >= 2) {
        const meta = getStateFromGSTIN(gst);
        if (!next.state) next.state = meta.state;
        next.state_code = meta.state_code;
      }
    }

    setBuyerForm(next);
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

  async function handleSaveBuyer(e: React.FormEvent) {
    e.preventDefault();
    setSavingBuyer(true);
    setError(null);
    setSuccess(null);

    if (!buyerForm.name.trim()) {
      setError("Buyer name is required.");
      setSavingBuyer(false);
      return;
    }

    const payload = {
      name: buyerForm.name.trim(),
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

      if (error) {
        setError(error.message);
        setSavingBuyer(false);
        return;
      }

      setSuccess("Buyer added successfully.");
    } else {
      const { error } = await supabase
        .from("buyers")
        .update(payload)
        .eq("id", editingBuyerId);

      if (error) {
        setError(error.message);
        setSavingBuyer(false);
        return;
      }

      setSuccess("Buyer updated successfully.");

      if (detailBuyer && editingBuyerId === detailBuyer.id) {
        setDetailBuyer({
          ...detailBuyer,
          ...payload,
        });
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

    if (error) {
      setError(error.message);
      setDeletingBuyerId(null);
      return;
    }

    if (detailBuyer?.id === id) {
      setDetailBuyer(null);
    }

    setConfirmDeleteBuyer(null);
    setDeletingBuyerId(null);
    setSuccess("Buyer deleted successfully.");
    await loadBuyers();
  }

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

    if (error) {
      setError(error.message);
      setSavingItem(false);
      return;
    }

    setSuccess("Buyer item added successfully.");
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
      gst_rate: editingItemForm.gst_rate.trim()
        ? Number(editingItemForm.gst_rate)
        : null,
      last_price: editingItemForm.last_price.trim()
        ? Number(editingItemForm.last_price)
        : null,
    };

    const { error } = await supabase
      .from("buyer_items")
      .update(payload)
      .eq("id", itemId);

    if (error) {
      setError(error.message);
      setSavingItem(false);
      return;
    }

    setSuccess("Buyer item updated successfully.");
    setEditingItemId(null);
    setEditingItemForm(emptyItemForm);
    setSavingItem(false);

    if (detailBuyer) {
      await loadBuyerItems(detailBuyer.id);
    }
  }

  async function handleDeleteItem(itemId: string) {
    const ok = window.confirm("Delete this buyer item?");
    if (!ok || !detailBuyer) return;

    setError(null);

    const { error } = await supabase.from("buyer_items").delete().eq("id", itemId);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Buyer item deleted successfully.");
    await loadBuyerItems(detailBuyer.id);
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {buyerModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div>
                <h2 className="text-white font-bold text-lg">
                  {buyerModalMode === "add" ? "Add Buyer" : "Edit Buyer"}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {buyerModalMode === "add"
                    ? "Create a customer master for invoicing."
                    : "Update buyer details."}
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
              <div>
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  Buyer Name *
                </label>
                <input
                  value={buyerForm.name}
                  onChange={(e) => updateBuyerField("name", e.target.value)}
                  placeholder="BPCL / VVF India / Mahadhan..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">
                    State
                  </label>
                  <input
                    value={buyerForm.state}
                    onChange={(e) => updateBuyerField("state", e.target.value)}
                    placeholder="Maharashtra"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">
                    State Code
                  </label>
                  <input
                    value={buyerForm.state_code}
                    onChange={(e) => updateBuyerField("state_code", e.target.value)}
                    placeholder="27"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  Address
                </label>
                <textarea
                  value={buyerForm.address}
                  onChange={(e) => updateBuyerField("address", e.target.value)}
                  placeholder="Full billing address"
                  className="w-full min-h-[110px] bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 font-medium mb-2">
                    Contact Name
                  </label>
                  <input
                    value={buyerForm.contact_name}
                    onChange={(e) =>
                      updateBuyerField("contact_name", e.target.value)
                    }
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
                    onChange={(e) =>
                      updateBuyerField("contact_phone", e.target.value)
                    }
                    placeholder="+91..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  Payment Terms
                </label>
                <input
                  value={buyerForm.payment_terms}
                  onChange={(e) =>
                    updateBuyerField("payment_terms", e.target.value)
                  }
                  placeholder="30 Days / Advance / Immediate"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

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
                    ? "Save Buyer"
                    : "Update Buyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteBuyer && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-center text-lg mb-1">
              Delete Buyer?
            </h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              This will remove{" "}
              <span className="text-white font-medium">
                {confirmDeleteBuyer.name}
              </span>
              .
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteBuyer(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBuyer(confirmDeleteBuyer.id)}
                disabled={deletingBuyerId === confirmDeleteBuyer.id}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-all"
              >
                {deletingBuyerId === confirmDeleteBuyer.id
                  ? "Deleting..."
                  : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailBuyer && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-6xl my-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <div>
                <h2 className="text-white font-bold text-lg">{detailBuyer.name}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Buyer details and per-buyer item memory
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditBuyer(detailBuyer)}
                  className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 hover:border-yellow-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                >
                  <Pencil size={14} />
                  Edit Buyer
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
              <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 h-fit">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Building2 size={18} className="text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Buyer Details</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Master information used in invoices
                    </p>
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
                      {detailBuyer.state_code
                        ? ` (${detailBuyer.state_code})`
                        : ""}
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
                      {detailBuyer.contact_phone
                        ? ` · ${detailBuyer.contact_phone}`
                        : ""}
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-gray-500 mb-1">Payment Terms</div>
                    <div className="text-gray-300">
                      {detailBuyer.payment_terms || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-white font-bold text-lg">Item History</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Editable memory for repeat invoicing
                    </p>
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
                        onChange={(e) =>
                          updateItemForm("buyer_item_code", e.target.value)
                        }
                        placeholder="Buyer Item Code"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        value={newItemForm.unit}
                        onChange={(e) => updateItemForm("unit", e.target.value)}
                        placeholder="Unit"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <textarea
                      value={newItemForm.description}
                      onChange={(e) =>
                        updateItemForm("description", e.target.value)
                      }
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
                        placeholder="GST Rate"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        value={newItemForm.last_price}
                        onChange={(e) =>
                          updateItemForm("last_price", e.target.value)
                        }
                        placeholder="Last Price"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowNewItemForm(false);
                          setNewItemForm(emptyItemForm);
                        }}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddBuyerItem}
                        disabled={savingItem}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
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
                  <div className="text-center py-16 text-gray-600">
                    No buyer items yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {buyerItems.map((item) => {
                      const isEditing = editingItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          className="bg-gray-900 border border-gray-800 rounded-2xl p-4"
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                  value={editingItemForm.buyer_item_code}
                                  onChange={(e) =>
                                    updateEditingItemForm(
                                      "buyer_item_code",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Buyer Item Code"
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <input
                                  value={editingItemForm.unit}
                                  onChange={(e) =>
                                    updateEditingItemForm("unit", e.target.value)
                                  }
                                  placeholder="Unit"
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>

                              <textarea
                                value={editingItemForm.description}
                                onChange={(e) =>
                                  updateEditingItemForm(
                                    "description",
                                    e.target.value
                                  )
                                }
                                placeholder="Description *"
                                className="w-full min-h-[90px] bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              />

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                  value={editingItemForm.hsn_code}
                                  onChange={(e) =>
                                    updateEditingItemForm(
                                      "hsn_code",
                                      e.target.value
                                    )
                                  }
                                  placeholder="HSN Code"
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <input
                                  value={editingItemForm.gst_rate}
                                  onChange={(e) =>
                                    updateEditingItemForm(
                                      "gst_rate",
                                      e.target.value
                                    )
                                  }
                                  placeholder="GST Rate"
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <input
                                  value={editingItemForm.last_price}
                                  onChange={(e) =>
                                    updateEditingItemForm(
                                      "last_price",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Last Price"
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                              </div>

                              <div className="flex justify-end gap-3">
                                <button
                                  onClick={cancelEditingItem}
                                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveEditedItem(item.id)}
                                  disabled={savingItem}
                                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
                                >
                                  <Save size={14} />
                                  {savingItem ? "Saving..." : "Update Item"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                    <Package
                                      size={16}
                                      className="text-orange-400"
                                    />
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
                                      Last Price: Rs.{" "}
                                      {Number(item.last_price).toLocaleString(
                                        "en-IN"
                                      )}
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

      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Buyers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage customer companies used in the Invoice Creator.
          </p>
        </div>

        <button
          onClick={openAddBuyer}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-3 rounded-xl text-sm transition-all"
        >
          <Plus size={16} />
          Add Buyer
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-300 text-sm flex items-center justify-between gap-3">
          <span>{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="text-green-200 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by buyer name, GSTIN, state or contact..."
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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredBuyers.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          {search ? "No buyers match your search." : "No buyers added yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBuyers.map((buyer) => {
            const isIntra = buyer.state_code === "27";

            return (
              <div
                key={buyer.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all"
              >
                <div className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-orange-400" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold text-base">
                          {buyer.name}
                        </p>

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

                      <div className="mt-2 space-y-1.5">
                        {buyer.gstin && (
                          <div className="flex items-start gap-2 text-sm text-gray-300">
                            <Users
                              size={14}
                              className="text-gray-500 mt-0.5 flex-shrink-0"
                            />
                            <span className="font-mono text-orange-300 break-all">
                              {buyer.gstin}
                            </span>
                          </div>
                        )}

                        {(buyer.state || buyer.state_code) && (
                          <div className="flex items-start gap-2 text-sm text-gray-400">
                            <MapPin
                              size={14}
                              className="text-gray-500 mt-0.5 flex-shrink-0"
                            />
                            <span>
                              {buyer.state || "—"}
                              {buyer.state_code ? ` (${buyer.state_code})` : ""}
                            </span>
                          </div>
                        )}

                        {buyer.address && (
                          <div className="flex items-start gap-2 text-sm text-gray-400">
                            <MapPin
                              size={14}
                              className="text-gray-500 mt-0.5 flex-shrink-0"
                            />
                            <span className="leading-6">{buyer.address}</span>
                          </div>
                        )}

                        {(buyer.contact_name || buyer.contact_phone) && (
                          <div className="flex items-start gap-2 text-sm text-gray-400">
                            <Phone
                              size={14}
                              className="text-gray-500 mt-0.5 flex-shrink-0"
                            />
                            <span>
                              {buyer.contact_name || "—"}
                              {buyer.contact_phone
                                ? ` · ${buyer.contact_phone}`
                                : ""}
                            </span>
                          </div>
                        )}

                        {buyer.payment_terms && (
                          <div className="flex items-start gap-2 text-sm text-gray-400">
                            <BadgeIndianRupee
                              size={14}
                              className="text-gray-500 mt-0.5 flex-shrink-0"
                            />
                            <span>{buyer.payment_terms}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

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
