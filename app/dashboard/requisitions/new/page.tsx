"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { getCurrentFY } from "@/lib/fy";
import type { Item, ReqLineItem } from "@/lib/types";
import {
  Search,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  X,
  ArrowLeft,
} from "lucide-react";

interface LineForm extends ReqLineItem {
  tempId: number;
}

export default function NewRequisitionPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [lines, setLines] = useState<LineForm[]>([]);
  const [notes, setNotes] = useState("");
  const [department, setDepartment] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [requiredBy, setRequiredBy] = useState("");
  const [reqNumber, setReqNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data } = await supabase.from("items").select("*").order("serial_id");
      setItems((data ?? []) as unknown as Item[]);

      const fy = getCurrentFY();
      const { data: rows } = await supabase
        .from("requisitions")
        .select("fy_serial")
        .eq("fy_label", fy)
        .order("fy_serial", { ascending: false })
        .limit(1);

      const nextSerial = (Number((rows as any)?.[0]?.fy_serial) || 0) + 1;
      setReqNumber(`MR/${String(nextSerial).padStart(3, "0")}/${fy}`);
    }
    init();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); setShowSearch(false); return; }
    const q = search.toLowerCase();
    const res = items
      .filter((i) => i.serial_id.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
      .slice(0, 8);
    setSearchResults(res);
    setShowSearch(res.length > 0);
  }, [search, items]);

  function addLine(item: Item) {
    setLines((prev) => [
      ...prev,
      {
        tempId: nextId.current++,
        item_id: item.id,
        serial_id: item.serial_id,
        name: item.name,
        unit: item.unit,
        qty_requested: 1,
        custom_note: "",
      },
    ]);
    setSearch("");
    setShowSearch(false);
  }

  function updateLine(tempId: number, patch: Partial<LineForm>) {
    setLines((prev) => prev.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l)));
  }

  function removeLine(tempId: number) {
    setLines((prev) => prev.filter((l) => l.tempId !== tempId));
  }

  async function handleSave() {
    if (lines.length === 0) { setError("Add at least one item."); return; }
    setSaving(true); setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("full_name, department").eq("id", user.id).single()
      : { data: null };
    const profileData = profile as any;

    const payload = {
      req_number: reqNumber,
      fy_label: getCurrentFY(),
      fy_serial: Number(reqNumber.split("/")[1]),
      requested_by: user?.id ?? null,
      requested_by_name: profileData?.full_name ?? user?.email ?? "Unknown",
      department: department.trim() || profileData?.department || null,
      priority,
      status: "pending",
      line_items: lines.map(({ tempId, ...rest }) => rest),
      notes: notes.trim() || null,
      required_by: requiredBy || null,
    };

    const { error: saveErr } = await supabase.from("requisitions").insert(payload);
    if (saveErr) { setError(saveErr.message); setSaving(false); return; }

    setSaved(true);
    setSaving(false);
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500 dark:text-green-400" />
          </div>
          <h2 className="text-viton-navy dark:text-white text-xl font-bold mb-1">Requisition Raised!</h2>
          <p className="text-viton-red dark:text-orange-400 text-sm font-mono mb-6">{reqNumber}</p>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mb-6">
            Your manager will be notified for approval.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="/dashboard/requisitions/new" className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
              <Plus size={15} /> Another MR
            </a>
            <a href="/dashboard/requisitions" className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm">
              View Requisitions
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <a href="/dashboard/requisitions" className="text-sm text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Back to Requisitions
        </a>
        <h1 className="text-viton-navy dark:text-white text-2xl font-bold">New Material Requisition</h1>
        <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
          MR No: <span className="text-viton-red dark:text-orange-400 font-mono font-semibold">{reqNumber}</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 text-red-600 dark:text-red-300 text-sm mb-6">{error}</div>
      )}

      <div className="grid gap-5">
        {/* Meta */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-6">
          <h2 className="text-viton-navy dark:text-white font-semibold mb-4">Details</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Department</label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Production, Assembly"
                className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Priority</label>
              <div className="grid grid-cols-4 gap-2">
                {(["low", "normal", "high", "urgent"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      priority === p
                        ? "bg-viton-red border-viton-red text-white dark:bg-orange-500 dark:border-orange-500"
                        : "bg-[#f7f8fb] dark:bg-gray-800 border-[#dde1ea] dark:border-gray-700 text-[#4a5578] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Required By</label>
              <input
                type="date"
                value={requiredBy}
                onChange={(e) => setRequiredBy(e.target.value)}
                className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Item Search */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-6">
          <h2 className="text-viton-navy dark:text-white font-semibold mb-4">Add Items</h2>
          <div className="relative" ref={searchRef}>
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by serial ID or item name..."
              className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
            />
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden shadow-2xl z-50">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addLine(item)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f1f3f8] dark:hover:bg-gray-900 transition-colors text-left border-b border-[#dde1ea] dark:border-gray-800 last:border-0"
                  >
                    <div>
                      <p className="text-viton-red dark:text-orange-400 font-mono text-xs font-semibold">{item.serial_id}</p>
                      <p className="text-viton-navy dark:text-white text-sm mt-0.5">{item.name}</p>
                    </div>
                    <span className="text-[#8892a8] dark:text-gray-500 text-xs bg-[#f1f3f8] dark:bg-gray-800 px-2 py-0.5 rounded-lg">{item.unit}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lines */}
        {lines.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#dde1ea] dark:border-gray-800">
              <h2 className="text-viton-navy dark:text-white font-semibold">Requested Items</h2>
            </div>
            <div className="p-6 space-y-4">
              {lines.map((line) => (
                <div key={line.tempId} className="bg-[#f7f8fb] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-viton-red dark:text-orange-400 font-mono text-xs font-semibold">{line.serial_id}</p>
                      <p className="text-viton-navy dark:text-white font-medium text-sm">{line.name}</p>
                    </div>
                    <button onClick={() => removeLine(line.tempId)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-[#8892a8] dark:text-gray-500 text-xs mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={line.qty_requested}
                        onChange={(e) => updateLine(line.tempId, { qty_requested: Number(e.target.value) })}
                        className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-viton-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8892a8] dark:text-gray-500 text-xs mb-1">Unit</label>
                      <div className="bg-[#eceef4] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-[#4a5578] dark:text-gray-400">{line.unit}</div>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[#8892a8] dark:text-gray-500 text-xs mb-1">Note</label>
                      <input
                        value={line.custom_note ?? ""}
                        onChange={(e) => updateLine(line.tempId, { custom_note: e.target.value })}
                        placeholder="Specific requirement..."
                        className="w-full bg-white dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-6">
          <label className="block text-viton-navy dark:text-white font-semibold mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Purpose of requisition, project reference, special instructions..."
            rows={3}
            className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <a href="/dashboard/requisitions" className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-5 py-3 rounded-xl text-sm">
            Cancel
          </a>
          <button
            onClick={handleSave}
            disabled={saving || lines.length === 0}
            className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-all"
          >
            <Save size={15} />
            {saving ? "Saving..." : "Submit Requisition"}
          </button>
        </div>
      </div>
    </div>
  );
}
