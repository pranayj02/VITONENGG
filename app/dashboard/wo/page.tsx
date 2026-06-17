"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { WorkOrder } from "@/lib/types";
import { useRole, can } from "@/lib/roles";
import {
  Plus, Search, FileText, Printer, ArrowLeft,
} from "lucide-react";

export default function WOListPage() {
  const router = useRouter();
  const { role } = useRole();
  const canCreate = can(role, "create_work_order");
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("work_orders")
        .select("*, items:work_order_items(*)")
        .order("created_at", { ascending: false });
      if (!error) {
        setOrders((data ?? []) as unknown as WorkOrder[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.wo_number.toLowerCase().includes(q) ||
      (o.party_name || "").toLowerCase().includes(q) ||
      (o.po_no || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1 text-sm text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <h1 className="text-viton-navy dark:text-white text-2xl font-bold tracking-tight">
            Work Orders
          </h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
            {orders.length} work order{orders.length !== 1 ? "s" : ""} on record.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => router.push("/dashboard/wo/new")}
            className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
          >
            <Plus size={15} /> New Work Order
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-4 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8892a8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by WO number, party name, or PO number..."
            className="w-full bg-[#f6f8fc] dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-viton-navy dark:text-white placeholder:text-[#8892a8] dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red/20 dark:focus:ring-orange-500/20 focus:border-viton-red dark:focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[#8892a8] dark:text-gray-500 text-sm">
            Loading work orders...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-[#8892a8] dark:text-gray-500 text-sm">
            {search ? "No work orders match your search." : "No work orders yet. Create your first one."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f6f8fc] dark:bg-gray-800 border-b border-[#dde1ea] dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">WO Number</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">Party Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">P.O. No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">Delivery</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#8892a8] dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((wo) => (
                  <tr
                    key={wo.id}
                    className="border-b border-[#dde1ea] dark:border-gray-700 last:border-b-0 hover:bg-[#f9fafc] dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-viton-navy dark:text-white font-semibold">{wo.wo_number}</td>
                    <td className="px-4 py-3 text-viton-navy dark:text-white">{wo.party_name}</td>
                    <td className="px-4 py-3 text-[#4a5578] dark:text-gray-400">{wo.po_no || "—"}</td>
                    <td className="px-4 py-3 text-[#4a5578] dark:text-gray-400">{wo.delivery_date || "—"}</td>
                    <td className="px-4 py-3 text-[#4a5578] dark:text-gray-400">{wo.items?.length ?? 0}</td>
                    <td className="px-4 py-3 text-[#8892a8] dark:text-gray-500 text-xs">
                      {new Date(wo.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/wo/print/${wo.id}`)}
                          className="p-1.5 rounded-lg hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#8892a8] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white transition-all"
                          title="Print"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
