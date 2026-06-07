"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { StockSummary, StockLedgerEntry } from "@/lib/types";
import {
  Package,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default function StockPage() {
  const [stock, setStock] = useState<StockSummary[]>([]);
  const [filtered, setFiltered] = useState<StockSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);

  async function load() {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_stock_summary");
    if (error) {
      // Fallback if RPC not available yet
      const { data: items } = await supabase.from("items").select("id, serial_id, name, category, unit").order("serial_id");
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
      setStock(rows);
      setFiltered(rows);
    } else {
      const rows = (data ?? []) as unknown as StockSummary[];
      setStock(rows);
      setFiltered(rows);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(stock); return; }
    const q = search.toLowerCase();
    setFiltered(stock.filter((s) => s.serial_id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || (s.category ?? "").toLowerCase().includes(q)));
  }, [search, stock]);

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

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Stock & Inventory</h1>
        <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
          Real-time stock levels from GRN receipts and commitments.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Items", value: stock.length, icon: Package, accent: "blue" },
          { label: "In Stock", value: stock.filter((s) => s.balance > 0).length, icon: TrendingUp, accent: "green" },
          { label: "Out of Stock", value: stock.filter((s) => s.balance <= 0).length, icon: TrendingDown, accent: "red" },
          { label: "Low Stock (< 5)", value: stock.filter((s) => s.balance > 0 && s.balance < 5).length, icon: AlertTriangle, accent: "orange" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                card.accent === "blue" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" :
                card.accent === "green" ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" :
                card.accent === "red" ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" :
                "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
              }`}>
                <Icon size={20} />
              </div>
              <p className="text-viton-navy dark:text-white text-2xl font-bold tabular-nums">{card.value}</p>
              <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

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
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8892a8] dark:text-gray-600">
          {search ? "No items match your search." : "No stock records yet. Create a GRN to receive stock."}
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
                          {isOpen ? <ChevronUp size={14} className="text-[#8892a8] dark:text-gray-500" /> : <ChevronDown size={14} className="text-[#8892a8] dark:text-gray-500" />}
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
