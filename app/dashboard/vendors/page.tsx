"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Search, X, Save, Pencil } from "lucide-react";
import type { Vendor } from "@/lib/types";

const emptyVendor = {
  name: "",
  gstin: "",
  address: "",
  delivery_address: "",
  delivery_gstin: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  payment_terms: "60 Days",
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filtered, setFiltered] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(emptyVendor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadVendors() {
    const supabase = createClient();
    const { data, error } = await supabase.from("vendors").select("*").order("name");

    if (error) {
      setError(error.message);
      setVendors([]);
      setFiltered([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as Vendor[];
    setVendors(rows);
    setFiltered(rows);
    setLoading(false);
  }

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(vendors);
      return;
    }

    const q = search.toLowerCase();
    setFiltered(
      vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.gstin ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, vendors]);

  function openAdd() {
    setEditing(null);
    setForm(emptyVendor);
    setError("");
    setShowForm(true);
  }

  function openEdit(v: Vendor) {
    setEditing(v);
    setForm({
      name: v.name,
      gstin: v.gstin ?? "",
      address: v.address ?? "",
      delivery_address: v.delivery_address ?? "",
      delivery_gstin: v.delivery_gstin ?? "",
      contact_name: v.contact_name ?? "",
      contact_phone: v.contact_phone ?? "",
      contact_email: v.contact_email ?? "",
      payment_terms: v.payment_terms ?? "60 Days",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Vendor name is required.");
      return;
    }

    setSaving(true);
    setError("");

    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      gstin: form.gstin.trim() || null,
      address: form.address.trim() || null,
      delivery_address: form.delivery_address.trim() || null,
      delivery_gstin: form.delivery_gstin.trim() || null,
      contact_name: form.contact_name.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      payment_terms: form.payment_terms.trim() || null,
    };

    let saveError = null;

    if (editing) {
      const { error } = await supabase.from("vendors").update(payload).eq("id", editing.id);
      saveError = error;
    } else {
      const { error } = await supabase.from("vendors").insert(payload);
      saveError = error;
    }

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    await loadVendors();
    setShowForm(false);
    setSaving(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Vendors</h1>
          <p className="text-gray-500 text-sm mt-1">{vendors.length} vendors registered</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus size={16} />
          Add Vendor
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or GSTIN..."
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

      {error && !showForm && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 flex items-center justify-between hover:border-gray-700 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-white font-semibold">{v.name}</p>
                  {v.gstin && (
                    <span className="text-xs font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded-lg">
                      {v.gstin}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-1 flex-wrap">
                  {v.contact_name && <p className="text-gray-500 text-xs">{v.contact_name}</p>}
                  {v.contact_phone && <p className="text-gray-500 text-xs">{v.contact_phone}</p>}
                  {v.payment_terms && <p className="text-gray-500 text-xs">Payment: {v.payment_terms}</p>}
                </div>
              </div>
              <button
                onClick={() => openEdit(v)}
                className="text-gray-500 hover:text-orange-400 transition-colors p-1 ml-4"
              >
                <Pencil size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-white font-bold">{editing ? "Edit Vendor" : "Add Vendor"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {[
                { label: "Vendor Name *", key: "name", placeholder: "e.g. Evolve Industries" },
                { label: "GSTIN", key: "gstin", placeholder: "e.g. 27AACCV7755N1ZK" },
                { label: "Address", key: "address", placeholder: "City, State" },
                { label: "Delivery Address", key: "delivery_address", placeholder: "Used by default in PO To section" },
                { label: "Delivery GSTIN", key: "delivery_gstin", placeholder: "Used by default in PO To section" },
                { label: "Contact Person", key: "contact_name", placeholder: "e.g. Mr. Krishna" },
                { label: "Phone", key: "contact_phone", placeholder: "e.g. 9876543210" },
                { label: "Email", key: "contact_email", placeholder: "e.g. vendor@email.com" },
                { label: "Payment Terms", key: "payment_terms", placeholder: "e.g. 60 Days" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    {field.label}
                  </label>
                  <input
                    value={(form as Record<string, string>)[field.key]}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                <Save size={15} />
                {saving ? "Saving..." : "Save Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
