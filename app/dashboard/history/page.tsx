"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Search, X, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";

interface POSummary {
  id: string;
  po_number: string;
  vendor_id?: string | null;
  grand_total?: number | null;
  po_date?: string | null;
  created_at?: string | null;
  status?: string | null;
}

export default function POHistoryPage() {
  const [rows, setRows] = useState<POSummary[]>([]);
  const [filtered, setFiltered] = useState<POSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, po_number, vendor_id, grand_total, po_date, created_at, status")
        .order("created_at", { ascending: false });
      if (error) { setError(error.message); setLoading(false); return; }
      const rows = (data ?? []) as unknown as POSummary[];
      setRows(rows);
      setFiltered(rows);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(rows); return; }
    const q = search.toLowerCase();
    setFiltered(rows.filter((r) =>
      (r.po_number ?? "").toLowerCase().includes(q) ||
      (r.vendor_id ?? "").toLowerCase().includes(q)
    ));
  }, [search, rows]);

  function formatDate(val?: string | null) {
    if (!val) return "—";
    try { return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return val; }
  }

  function formatCurrency(val?: number | null) {
    if (val == null) return "—";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-viton-navy dark:text-white text-2xl font-bold">PO History</h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">{rows.length} purchase orders</p>
        </div>
        <Link href="/dashboard/po/new" className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
          <FileText size={16} />
          New PO
        </Link>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by PO number or vendor..."
          className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white"><X size={14} /></button>
        )}
      </div>

      {error && <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-red-600 dark:text-red-400 text-sm mb-6">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={40} className="text-[#dde1ea] dark:text-gray-700 mx-auto mb-4" />
          <p className="text-[#4a5578] dark:text-gray-400 font-medium">No purchase orders found</p>
          <p className="text-[#8892a8] dark:text-gray-600 text-sm mt-1">Create your first PO to get started</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f1f3f8] dark:bg-gray-800/50 border-b border-[#dde1ea] dark:border-gray-800">
                  {["PO Number", "Vendor", "Date", "Amount", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-[#4a5578] dark:text-gray-400 font-semibold text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row.id} className={`border-b border-[#dde1ea] dark:border-gray-800 last:border-0 hover:bg-[#f7f8fb] dark:hover:bg-gray-800/30 transition-colors ${i % 2 === 0 ? "" : "bg-[#fafbfd] dark:bg-transparent"}` }>
                    <td className="px-5 py-4">
                      <span className="font-mono text-viton-red dark:text-orange-400 font-semibold text-xs">{row.po_number}</span>
                    </td>
                    <td className="px-5 py-4 text-viton-navy dark:text-gray-200">{row.vendor_id ?? "—"}</td>
                    <td className="px-5 py-4 text-[#4a5578] dark:text-gray-400">{formatDate(row.po_date ?? row.created_at)}</td>
                    <td className="px-5 py-4 text-viton-navy dark:text-gray-200 tabular-nums font-medium">{formatCurrency(row.grand_total)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        row.status === "approved"
                          ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                          : row.status === "cancelled"
                          ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-[#f1f3f8] dark:bg-gray-800 text-[#4a5578] dark:text-gray-400"
                      }`}>
                        {row.status ?? "draft"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/po/${row.id}`} className="text-[#8892a8] dark:text-gray-500 hover:text-viton-red dark:hover:text-orange-400 transition-colors">
                        <ExternalLink size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
