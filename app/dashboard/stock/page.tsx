"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { can, isAdmin, useRole } from "@/lib/roles";
import type { StockSummary, StockLedgerEntry, Item } from "@/lib/types";
import {
  Package,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Save,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Clock,
  Trash2,
} from "lucide-react";

export default function StockPage() {
  const { role, loading: roleLoading } = useRole();
  const [stock, setStock] = useState<StockSummary[]>([]);
  const [filtered, setFiltered] = useState<StockSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);

  // Adjustment modal state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<"in" | "out">("in");
  const [adjustItem, setAdjustItem] = useState<StockSummary | null>(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");
  // "applied" = admin direct apply, "pending" = sent for approval
  const [adjustResult, setAdjustResult] = useState<"applied" | "pending" | null>(null);

  // Item search for adjustment
  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<Item[]>([]);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const itemSearchRef = useRef<HTMLDivElement>(null);

  function sortStockRows(rows: StockSummary[]) {
    return [...rows].sort((a, b) => {
      const catA = (a.category?.trim() || "Uncategorized").toLowerCase();
      const catB = (b.category?.trim() || "Uncategorized").toLowerCase();

      const categoryCompare = catA.localeCompare(catB, undefined, {
        sensitivity: "base",
        numeric: true,
      });
      if (categoryCompare !== 0) return categoryCompare;

      const nameCompare = (a.name || "").localeCompare(b.name || "", undefined, {
        sensitivity: "base",
        numeric: true,
      });
      if (nameCompare !== 0) return nameCompare;

      return (a.serial_id || "").localeCompare(b.serial_id || "", undefined, {
        sensitivity: "base",
        numeric: true,
      });
    });
  }

  function sanitizeStockRows(rows: StockSummary[]) {
    return rows.map((row) => ({
      ...row,
      total_in: Math.max(0, Number(row.total_in ?? 0)),
      total_out: Math.max(0, Number(row.total_out ?? 0)),
      balance: Math.max(0, Number(row.balance ?? 0)),
    }));
  }

  async function load() {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_stock_summary");
    if (error) {
      // Fallback if RPC not available yet
      const { data: items } = await supabase.from("items").select("id, serial_id, name, category, unit").order("category", { ascending: true }).order("name", { ascending: true }).order("serial_id", { ascending: true });
      const { data: ledgerData } = await supabase.from("stock_ledger").select("*").order("created_at", { ascending: true });
      const lRows = (ledgerData ?? []) as unknown as StockLedgerEntry[];
      const balances = new Map<string, number>();
      for (const row of lRows) {
        balances.set(row.item_id, row.balance);
      }
      const rows: StockSummary[] = (items ?? []).map((i: any) => ({
        item_id: i.id,
        serial_id: i.serial_id,
        name: i.name,
        category: i.category,
        unit: i.unit,
        total_in: 0,
        total_out: 0,
        balance: balances.get(i.id) ?? 0,
      }));
      const sanitizedRows = sanitizeStockRows(rows);
      const sortedRows = sortStockRows(sanitizedRows);
      setStock(sortedRows);
      setFiltered(sortedRows);
    } else {
      const rows = (data ?? []) as unknown as StockSummary[];
      const sanitizedRows = sanitizeStockRows(rows);
      const sortedRows = sortStockRows(sanitizedRows);
      setStock(sortedRows);
      setFiltered(sortedRows);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(sortStockRows(stock));
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      sortStockRows(
        stock.filter((s) =>
          s.serial_id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (s.category ?? "").toLowerCase().includes(q)
        )
      )
    );
  }, [search, stock]);

  // Item search for adjustment modal
  useEffect(() => {
    if (!itemSearch.trim()) { setItemResults([]); setShowItemSearch(false); return; }
    const q = itemSearch.toLowerCase();
    const supabase = createClient();
    supabase.from("items").select("*").or(`serial_id.ilike.%${q}%,name.ilike.%${q}%`).limit(8).then(({ data }) => {
      const rows = (data ?? []) as unknown as Item[];
      setItemResults(rows);
      setShowItemSearch(rows.length > 0);
    });
  }, [itemSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (itemSearchRef.current && !itemSearchRef.current.contains(e.target as Node)) {
        setShowItemSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadLedger(itemId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("stock_ledger")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false })
      .limit(20);
    setLedger((data ?? []) as unknown as StockLedgerEntry[]);
  }

  function openAdjust(item?: StockSummary) {
    setAdjustOpen(true);
    setAdjustItem(item ?? null);
    setAdjustMode("in");
    setAdjustQty(1);
    setAdjustNote("");
    setAdjustError("");
    setAdjustResult(null);
    setItemSearch("");
    setItemResults([]);
    setShowItemSearch(false);
  }

  function selectAdjustItem(item: Item) {
    const stockItem = stock.find((s) => s.item_id === item.id);
    setAdjustItem(stockItem ?? {
      item_id: item.id,
      serial_id: item.serial_id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      total_in: 0,
      total_out: 0,
      balance: 0,
    });
    setItemSearch("");
    setShowItemSearch(false);
  }

  async function handleAdjustSave() {
    if (!adjustItem) { setAdjustError("Select an item first."); return; }
    if (adjustQty <= 0) { setAdjustError("Quantity must be greater than 0."); return; }
    if (adjustMode === "out" && adjustQty > Math.max(0, adjustItem.balance)) { setAdjustError("Cannot remove more than current balance."); return; }
    setAdjustSaving(true); setAdjustError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    const name = (profile as any)?.full_name ?? user?.email ?? "Unknown";
    const note = adjustNote.trim() || `Manual adjustment: ${adjustMode === "in" ? "added" : "removed"} ${adjustQty} ${adjustItem.unit}`;

    // ── ADMIN: apply directly to stock_ledger ───────────────────────────────
    if (isAdmin(role)) {
      const currentBalance = Math.max(0, adjustItem.balance);
      const newBalance = adjustMode === "in"
        ? currentBalance + adjustQty
        : Math.max(0, currentBalance - adjustQty);

      const { error: saveErr } = await supabase.from("stock_ledger").insert({
        item_id: adjustItem.item_id,
        transaction_type: adjustMode === "in" ? "adjustment_in" : "adjustment_out",
        reference_type: "manual",
        reference_code: "STOCK-ADJ",
        qty_in: adjustMode === "in" ? adjustQty : 0,
        qty_out: adjustMode === "out" ? adjustQty : 0,
        balance: newBalance,
        unit: adjustItem.unit,
        notes: note,
        created_by: user?.id ?? null,
        created_by_name: name,
      });

      if (saveErr) { setAdjustError(saveErr.message); setAdjustSaving(false); return; }

      // Log activity
      await supabase.from("activity_logs").insert({
        action: adjustMode === "in" ? "stock_adjusted_in" : "stock_adjusted_out",
        entity_type: "stock",
        entity_code: adjustItem.serial_id,
        entity_id: adjustItem.item_id,
        details: {
          item_name: adjustItem.name,
          qty: adjustQty,
          unit: adjustItem.unit,
          note: note,
          new_balance: newBalance,
        },
        user_id: user?.id ?? null,
        user_name: name,
      });

      setAdjustResult("applied");
      setAdjustSaving(false);
      await load();
      if (adjustItem) loadLedger(adjustItem.item_id);
      return;
    }

    // ── NON-ADMIN: submit pending approval request ──────────────────────────
    const { error: reqErr } = await supabase.from("stock_adjustment_requests").insert({
      item_id: adjustItem.item_id,
      item_serial_id: adjustItem.serial_id,
      item_name: adjustItem.name,
      item_unit: adjustItem.unit,
      adjustment_type: adjustMode === "in" ? "adjustment_in" : "adjustment_out",
      qty: adjustQty,
      balance_at_request: Math.max(0, adjustItem.balance),
      notes: note,
      status: "pending",
      requested_by: user?.id ?? null,
      requested_by_name: name,
    });

    if (reqErr) { setAdjustError(reqErr.message); setAdjustSaving(false); return; }

    // Log activity for pending request
    await supabase.from("activity_logs").insert({
      action: "stock_adjustment_requested",
      entity_type: "stock",
      entity_code: adjustItem.serial_id,
      entity_id: adjustItem.item_id,
      details: {
        item_name: adjustItem.name,
        qty: adjustQty,
        unit: adjustItem.unit,
        note: note,
        adjustment_type: adjustMode === "in" ? "adjustment_in" : "adjustment_out",
      },
      user_id: user?.id ?? null,
      user_name: name,
    });

    setAdjustResult("pending");
    setAdjustSaving(false);
  }

  const canAdjust = role && can(role, "adjust_stock");

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Stock & Inventory</h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
            Real-time stock levels from GRN receipts and commitments.
          </p>
        </div>
        {canAdjust && (
          <button
            onClick={() => openAdjust()}
            className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <Plus size={16} /> Adjust Stock
          </button>
        )}
      </div>

      {/* Adjustment Modal */}
      {adjustOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto my-8 shadow-2xl">
            <div className="px-6 py-4 border-b border-[#dde1ea] dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-viton-navy dark:text-white font-bold">Manual Stock Adjustment</h2>
                <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">
                  {adjustItem ? `${adjustItem.serial_id} — ${adjustItem.name}` : "Select an item to adjust"}
                </p>
              </div>
              <button onClick={() => setAdjustOpen(false)} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* ── Success: Admin applied directly ── */}
              {adjustResult === "applied" && (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={28} className="text-green-500 dark:text-green-400" />
                  </div>
                  <h3 className="text-viton-navy dark:text-white font-bold text-lg mb-1">Adjustment Recorded!</h3>
                  <p className="text-[#8892a8] dark:text-gray-500 text-sm mb-6">
                    {adjustItem?.name}: {adjustMode === "in" ? "Added" : "Removed"} {adjustQty} {adjustItem?.unit}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => openAdjust()}
                      className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
                    >
                      Another Adjustment
                    </button>
                    <button
                      onClick={() => setAdjustOpen(false)}
                      className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* ── Success: Non-admin sent for approval ── */}
              {adjustResult === "pending" && (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock size={28} className="text-amber-500" />
                  </div>
                  <h3 className="text-viton-navy dark:text-white font-bold text-lg mb-1">Sent for Approval</h3>
                  <p className="text-[#8892a8] dark:text-gray-500 text-sm mb-1">
                    Your request to {adjustMode === "in" ? "add" : "remove"} <span className="font-semibold text-viton-navy dark:text-white">{adjustQty} {adjustItem?.unit}</span> of <span className="font-semibold text-viton-navy dark:text-white">{adjustItem?.name}</span> has been submitted.
                  </p>
                  <p className="text-[#8892a8] dark:text-gray-500 text-xs mb-6">
                    An admin will review and apply this adjustment.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => openAdjust()}
                      className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
                    >
                      Another Request
                    </button>
                    <button
                      onClick={() => setAdjustOpen(false)}
                      className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {adjustResult === null && (
                <>
                  {adjustError && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 text-red-600 dark:text-red-300 text-sm">{adjustError}</div>
                  )}

                  {/* Non-admin info banner */}
                  {!isAdmin(role) && (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
                      <Clock size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-amber-700 dark:text-amber-300 text-xs">
                        Your adjustment will be sent to an admin for approval before it is applied to stock.
                      </p>
                    </div>
                  )}

                  {/* Item Selection */}
                  {!adjustItem && (
                    <div className="relative" ref={itemSearchRef}>
                      <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Search Item</label>
                      <Search size={16} className="absolute left-4 top-[46px] text-[#8892a8] dark:text-gray-500" />
                      <input
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder="Search by serial ID or name..."
                        className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                      />
                      {showItemSearch && itemResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-60 overflow-y-auto">
                          {itemResults.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => selectAdjustItem(item)}
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
                  )}

                  {adjustItem && (
                    <>
                      {/* Current Balance */}
                      <div className="bg-[#f7f8fb] dark:bg-gray-800/50 border border-[#dde1ea] dark:border-gray-700 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider">Current Balance</p>
                          <p className="text-viton-navy dark:text-white text-xl font-bold mt-1">
                            {adjustItem.balance} <span className="text-sm font-normal text-[#4a5578] dark:text-gray-400">{adjustItem.unit}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => setAdjustItem(null)}
                          className="text-xs text-viton-red dark:text-orange-400 font-semibold hover:underline"
                        >
                          Change Item
                        </button>
                      </div>

                      {/* In / Out Toggle */}
                      <div>
                        <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Adjustment Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setAdjustMode("in")}
                            className={`py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
                              adjustMode === "in"
                                ? "bg-green-500 border-green-500 text-white dark:bg-green-500 dark:border-green-500"
                                : "bg-[#f7f8fb] dark:bg-gray-800 border-[#dde1ea] dark:border-gray-700 text-[#4a5578] dark:text-gray-400 hover:text-green-600"
                            }`}
                          >
                            <ArrowDown size={16} /> Add Stock
                          </button>
                          <button
                            onClick={() => setAdjustMode("out")}
                            className={`py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
                              adjustMode === "out"
                                ? "bg-red-500 border-red-500 text-white dark:bg-red-500 dark:border-red-500"
                                : "bg-[#f7f8fb] dark:bg-gray-800 border-[#dde1ea] dark:border-gray-700 text-[#4a5578] dark:text-gray-400 hover:text-red-500"
                            }`}
                          >
                            <ArrowUp size={16} /> Remove Stock
                          </button>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={adjustQty}
                          onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
                        />
                        {isAdmin(role) && (
                          <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-2">
                            New balance will be: <span className={`font-semibold ${
                              adjustMode === "in" ? "text-green-600" : "text-red-500"
                            }`}>
                              {adjustMode === "in" ? adjustItem.balance + adjustQty : adjustItem.balance - adjustQty}
                            </span> {adjustItem.unit}
                          </p>
                        )}
                      </div>

                      {/* Reason */}
                      <div>
                        <label className="block text-[#4a5578] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Reason / Note</label>
                        <textarea
                          value={adjustNote}
                          onChange={(e) => setAdjustNote(e.target.value)}
                          placeholder={adjustMode === "in" ? "e.g. Physical stock count correction, found extra items..." : "e.g. Damaged in storage, issued to job site, scrap..."}
                          rows={3}
                          className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 resize-none"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setAdjustOpen(false)} className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-5 py-3 rounded-xl text-sm">
                          Cancel
                        </button>
                        <button
                          onClick={handleAdjustSave}
                          disabled={adjustSaving}
                          className={`font-semibold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-all ${
                            adjustMode === "in"
                              ? "bg-green-500 hover:bg-green-600 text-white"
                              : "bg-red-500 hover:bg-red-600 text-white"
                          }`}
                        >
                          {isAdmin(role) ? <Save size={15} /> : <Clock size={15} />}
                          {adjustSaving
                            ? "Saving..."
                            : isAdmin(role)
                              ? (adjustMode === "in" ? "Add to Stock" : "Remove from Stock")
                              : "Submit for Approval"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by serial ID, name, or category..."
          className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
            <ChevronUp size={14} />
          </button>
        )}
      </div>

      {/* Stock Table */}
      {loading || roleLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8892a8] dark:text-gray-600">
          {search ? "No items match your search." : "No stock records yet. Create a GRN or make a manual adjustment to start."}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#dde1ea] dark:border-gray-800">
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Serial ID</th>
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Category</th>
                  <th className="text-right text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">In</th>
                  <th className="text-right text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Out</th>
                  <th className="text-right text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Balance</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isOpen = expanded === item.item_id;
                  const low = item.balance > 0 && item.balance < 5;
                  const zero = item.balance <= 0;
                  return (
                    <>
                      <tr
                        key={item.item_id}
                        className={`border-b border-[#eef1f6] dark:border-gray-800/50 hover:bg-[#f7f8fb] dark:hover:bg-gray-800/40 transition-colors cursor-pointer ${isOpen ? "bg-[#f7f8fb] dark:bg-gray-800/60" : ""}`}
                        onClick={() => {
                          if (isOpen) { setExpanded(null); }
                          else { setExpanded(item.item_id); loadLedger(item.item_id); }
                        }}
                      >
                        <td className="px-5 py-3.5 font-mono text-viton-red dark:text-orange-400 text-xs font-semibold">{item.serial_id}</td>
                        <td className="px-5 py-3.5 text-viton-navy dark:text-white">{item.name}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-[#4a5578] dark:text-gray-400 bg-[#f1f3f8] dark:bg-gray-800 px-2 py-1 rounded-lg">{item.category ?? "—"}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-[#4a5578] dark:text-gray-400 tabular-nums">{item.total_in}</td>
                        <td className="px-5 py-3.5 text-right text-[#4a5578] dark:text-gray-400 tabular-nums">{item.total_out}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`font-bold tabular-nums ${
                            zero ? "text-red-500" : low ? "text-orange-500" : "text-green-600 dark:text-green-400"
                          }`}>
                            {item.balance}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            {canAdjust && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openAdjust(item); }}
                                className="text-[#8892a8] dark:text-gray-500 hover:text-viton-red dark:hover:text-orange-400 transition-colors p-1"
                                title="Adjust stock"
                              >
                                <Plus size={14} />
                              </button>
                            )}
                            {isOpen ? <ChevronUp size={14} className="text-[#8892a8] dark:text-gray-500" /> : <ChevronDown size={14} className="text-[#8892a8] dark:text-gray-500" />}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[#f7f8fb] dark:bg-gray-800/30">
                          <td colSpan={7} className="px-5 py-4">
                            <p className="text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Recent Transactions</p>
                            {ledger.length === 0 ? (
                              <p className="text-[#8892a8] dark:text-gray-600 text-sm">No transactions yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {ledger.map((l) => (
                                  <div key={l.id} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                      <span className={`w-2 h-2 rounded-full ${
                                        l.qty_in > 0 ? "bg-green-500" : l.qty_out > 0 ? "bg-red-500" : "bg-gray-400"
                                      }`} />
                                      <span className="text-[#4a5578] dark:text-gray-400 capitalize">{l.transaction_type.replace(/_/g, " ")}</span>
                                      <span className="text-[#8892a8] dark:text-gray-500 text-xs">{l.reference_code ?? l.reference_type ?? "—"}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className={`font-mono text-xs ${l.qty_in > 0 ? "text-green-600" : l.qty_out > 0 ? "text-red-500" : ""}`}>
                                        {l.qty_in > 0 ? `+${l.qty_in}` : l.qty_out > 0 ? `-${l.qty_out}` : "0"}
                                      </span>
                                      <span className="text-[#8892a8] dark:text-gray-500 text-xs">{new Date(l.created_at).toLocaleDateString("en-IN")}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
