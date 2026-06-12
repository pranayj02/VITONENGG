"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { ActivityLog } from "@/lib/types";
import {
  FileText,
  Receipt,
  Package,
  User,
  Search,
  X,
  Clock,
  ArrowRightLeft,
  AlertCircle,
  Pencil,
  Trash2,
  CheckCircle,
  Plus,
} from "lucide-react";

const ENTITY_ICONS: Record<string, React.ElementType> = {
  purchase_order: FileText,
  invoice: Receipt,
  item: Package,
  requisition: ArrowRightLeft,
  grn: Package,
  vendor: User,
  buyer: User,
  user: User,
  stock: Package,
};

const ACTION_COLORS: Record<string, string> = {
  po_created: "text-blue-600 dark:text-blue-400",
  po_updated: "text-violet-600 dark:text-violet-400",
  po_deleted: "text-red-600 dark:text-red-400",
  po_confirmed: "text-emerald-600 dark:text-emerald-400",
  mr_requested: "text-blue-600 dark:text-blue-400",
  mr_approved: "text-emerald-600 dark:text-emerald-400",
  mr_rejected: "text-red-600 dark:text-red-400",
  mr_stock_issued: "text-orange-600 dark:text-orange-400",
  requisition_fulfilled_from_stock: "text-emerald-600 dark:text-emerald-400",
  grn_created: "text-blue-600 dark:text-blue-400",
  grn_inspected: "text-amber-600 dark:text-amber-400",
  grn_approved: "text-emerald-600 dark:text-emerald-400",
  grn_partial: "text-amber-600 dark:text-amber-400",
  grn_rejected: "text-red-600 dark:text-red-400",
  stock_received: "text-emerald-600 dark:text-emerald-400",
  stock_issued: "text-orange-600 dark:text-orange-400",
  stock_adjusted_in: "text-emerald-600 dark:text-emerald-400",
  stock_adjusted_out: "text-orange-600 dark:text-orange-400",
  stock_adjustment_requested: "text-amber-600 dark:text-amber-400",
  invoice_created: "text-blue-600 dark:text-blue-400",
  invoice_updated: "text-violet-600 dark:text-violet-400",
  invoice_deleted: "text-red-600 dark:text-red-400",
  item_created: "text-blue-600 dark:text-blue-400",
  item_updated: "text-violet-600 dark:text-violet-400",
  item_deleted: "text-red-600 dark:text-red-400",
  vendor_created: "text-blue-600 dark:text-blue-400",
  vendor_updated: "text-violet-600 dark:text-violet-400",
  vendor_deleted: "text-red-600 dark:text-red-400",
  buyer_created: "text-blue-600 dark:text-blue-400",
  buyer_updated: "text-violet-600 dark:text-violet-400",
  buyer_deleted: "text-red-600 dark:text-red-400",
  user_profile_updated: "text-violet-600 dark:text-violet-400",
  user_role_updated: "text-orange-600 dark:text-orange-400",
  user_deleted: "text-red-600 dark:text-red-400",
};

function getActionTone(action: string): string {
  const normalized = action.toLowerCase();

  if (normalized.includes("deleted") || normalized.includes("rejected")) {
    return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
  }

  if (
    normalized.includes("approved") ||
    normalized.includes("confirmed") ||
    normalized.includes("fulfilled") ||
    normalized.includes("received")
  ) {
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  }

  if (normalized.includes("issued") || normalized.includes("role")) {
    return "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400";
  }

  if (normalized.includes("adjusted_in")) {
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  }

  if (normalized.includes("adjusted_out") || normalized.includes("adjustment_requested")) {
    return "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400";
  }

  if (
    normalized.includes("updated") ||
    normalized.includes("inspected") ||
    normalized.includes("partial")
  ) {
    return "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400";
  }

  if (normalized.includes("created") || normalized.includes("requested")) {
    return "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";
  }

  return "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bPo\b/g, "PO")
    .replace(/\bMr\b/g, "MR")
    .replace(/\bGrn\b/g, "GRN");
}

function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filtered, setFiltered] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = (data ?? []) as unknown as ActivityLog[];
    setLogs(rows);
    setFiltered(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let out = logs;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (l) =>
          (l.user_name ?? "").toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          (l.entity_code ?? "").toLowerCase().includes(q)
      );
    }
    if (entityFilter) {
      out = out.filter((l) => l.entity_type === entityFilter);
    }
    setFiltered(out);
  }, [search, entityFilter, logs]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Activity Log</h1>
        <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
          System audit trail — who did what, and when.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, action, or document..."
            className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="appearance-none bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl px-4 py-3 pr-10 text-sm text-viton-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 cursor-pointer"
          >
            <option value="">All Entities</option>
            <option value="purchase_order">Purchase Order</option>
            <option value="invoice">Invoice</option>
            <option value="requisition">Requisition</option>
            <option value="grn">GRN</option>
            <option value="item">Item</option>
            <option value="vendor">Vendor</option>
            <option value="buyer">Buyer</option>
            <option value="user">User</option>
            <option value="stock">Stock</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8892a8] dark:text-gray-600">
          {search || entityFilter ? "No logs match your filters." : "No activity yet."}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-[#eef1f6] dark:divide-gray-800">
            {filtered.map((log) => {
              const Icon = ENTITY_ICONS[log.entity_type] ?? AlertCircle;
              return (
                <div key={log.id} className="px-5 py-4 flex items-start gap-4 hover:bg-[#f7f8fb] dark:hover:bg-gray-800/40 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${getActionTone(log.action)}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-viton-navy dark:text-white font-semibold text-sm">
                        {log.user_name ?? log.user_email ?? "System"}
                      </span>
                      <span className={`text-sm ${ACTION_COLORS[log.action] ?? "text-[#4a5578] dark:text-gray-400"}`}>
                        {formatAction(log.action)}
                      </span>
                      {log.entity_code && (
                        <span className="font-mono text-xs text-viton-red dark:text-orange-400 bg-red-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-lg">
                          {log.entity_code}
                        </span>
                      )}
                    </div>
                    <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1 capitalize">
                      {log.entity_type.replace(/_/g, " ")} · {new Date(log.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-[#8892a8] dark:text-gray-600 text-xs flex items-center gap-1">
                    <Clock size={12} />
                    {timeAgo(log.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
