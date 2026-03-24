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

type FormState = {
  name: string;
  address: string;
  gstin: string;
  state: string;
  state_code: string;
  contact_name: string;
  contact_phone: string;
  payment_terms: string;
};

const emptyForm: FormState = {
  name: "",
  address: "",
  gstin: "",
  state: "",
  state_code: "",
  contact_name: "",
  contact_phone: "",
  payment_terms: "",
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

export default function BuyersPage() {
  const supabase = useMemo(() => createClient(), []);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [filteredBuyers, setFilteredBuyers] = useState<Buyer[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Buyer | null>(null);

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
  }, [search, buyers]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    const next = { ...form, [key]: value };

    if (key === "gstin") {
      const gst = String(value).toUpperCase();
      next.gstin = gst;

      if (gst.length >= 2) {
        const gstMeta = getStateFromGSTIN(gst);
        if (!next.state) next.state = gstMeta.state;
        next.state_code = gstMeta.state_code;
      }
    }

    setForm(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    if (!form.name.trim()) {
      setError("Buyer name is required.");
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      gstin: form.gstin.trim().toUpperCase() || null,
      state: form.state.trim() || null,
      state_code: form.state_code.trim() || null,
      contact_name: form.contact_name.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      payment_terms: form.payment_terms.trim() || null,
    };

    const { error } = await supabase.from("buyers").insert(payload);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSuccess("Buyer added successfully.");
    setForm(emptyForm);
    await loadBuyers();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);

    const { error } = await supabase.from("buyers").delete().eq("id", id);

    if (error) {
      setError(error.message);
      setDeletingId(null);
      return;
    }

    setConfirmDelete(null);
    setDeletingId(null);
    await loadBuyers();
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-center text-lg mb-1">
              Delete Buyer?
            </h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              This will remove <span className="text-white font-medium">{confirmDelete.name}</span> from
              your buyer master.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-all"
              >
                {deletingId === confirmDelete.id ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Buyers</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage customer companies used in the Invoice Creator.
        </p>
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

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Plus size={18} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Add Buyer</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Create a customer master for invoicing.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 font-medium mb-2">
                Buyer Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="BPCL / VVF India / Mahadhan..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 font-medium mb-2">
                GSTIN
              </label>
              <input
                value={form.gstin}
                onChange={(e) => updateField("gstin", e.target.value)}
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
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  placeholder="Maharashtra"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  State Code
                </label>
                <input
                  value={form.state_code}
                  onChange={(e) => updateField("state_code", e.target.value)}
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
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
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
                  value={form.contact_name}
                  onChange={(e) => updateField("contact_name", e.target.value)}
                  placeholder="Mr. Sharma"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 font-medium mb-2">
                  Contact Phone
                </label>
                <input
                  value={form.contact_phone}
                  onChange={(e) => updateField("contact_phone", e.target.value)}
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
                value={form.payment_terms}
                onChange={(e) => updateField("payment_terms", e.target.value)}
                placeholder="30 Days / Advance / Immediate"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-4 py-3 rounded-xl text-sm transition-all"
            >
              <Plus size={16} />
              {saving ? "Saving..." : "Save Buyer"}
            </button>
          </form>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-white font-bold text-lg">Buyer List</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {buyers.length} buyers in master
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search buyers, GSTIN, state..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              {filteredBuyers.map((buyer) => (
                <div
                  key={buyer.id}
                  className="bg-gray-950 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-orange-400" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-semibold text-base">
                            {buyer.name}
                          </h3>
                          {buyer.state_code === "27" ? (
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                              Intra-state
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Inter-state
                            </span>
                          )}
                        </div>

                        <div className="mt-2 space-y-1.5">
                          {buyer.gstin && (
                            <div className="flex items-start gap-2 text-sm text-gray-300">
                              <Users size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                              <span className="font-mono text-orange-300">{buyer.gstin}</span>
                            </div>
                          )}

                          {(buyer.state || buyer.state_code) && (
                            <div className="flex items-start gap-2 text-sm text-gray-400">
                              <MapPin size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                              <span>
                                {buyer.state || "—"}
                                {buyer.state_code ? ` (${buyer.state_code})` : ""}
                              </span>
                            </div>
                          )}

                          {buyer.address && (
                            <div className="flex items-start gap-2 text-sm text-gray-400">
                              <MapPin size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                              <span className="leading-6">{buyer.address}</span>
                            </div>
                          )}

                          {(buyer.contact_name || buyer.contact_phone) && (
                            <div className="flex items-start gap-2 text-sm text-gray-400">
                              <Phone size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                              <span>
                                {buyer.contact_name || "—"}
                                {buyer.contact_phone ? ` · ${buyer.contact_phone}` : ""}
                              </span>
                            </div>
                          )}

                          {buyer.payment_terms && (
                            <div className="flex items-start gap-2 text-sm text-gray-400">
                              <BadgeIndianRupee size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                              <span>{buyer.payment_terms}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setConfirmDelete(buyer)}
                      className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 font-semibold px-3 py-2 rounded-xl text-sm transition-all flex-shrink-0"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
