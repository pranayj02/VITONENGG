"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  Package,
  Users,
  FileText,
  Receipt,
  Sun,
  Sunset,
  Moon,
  IndianRupee,
  TrendingUp,
  BarChart3,
  ArrowRightLeft,
  PackageOpen,
  AlertTriangle,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ActivityLog, Requisition, StockSummary } from "@/lib/types";
import { useRole, can } from "@/lib/roles";

type PurchaseOrderRow = Record<string, any>;
type TopItem = { name: string; count: number };

function getGreeting(): { text: string; Icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good morning", Icon: Sun };
  if (hour >= 12 && hour < 18) return { text: "Good afternoon", Icon: Sunset };
  return { text: "Good evening", Icon: Moon };
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function toNumber(value: any): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").replace(/[^\d.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseMaybeJson(value: any) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}

function getPODate(row: PurchaseOrderRow): Date | null {
  const candidates = [row.po_date, row.date, row.created_at, row.order_date, row.issue_date, row.raised_on];
  for (const value of candidates) {
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function getLineItems(row: PurchaseOrderRow): any[] {
  const candidates = [row.items, row.line_items, row.po_items, row.products, row.materials];
  for (const candidate of candidates) {
    const parsed = parseMaybeJson(candidate);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    if (parsed && Array.isArray(parsed.line_items)) return parsed.line_items;
  }
  return [];
}

function getItemName(item: any): string | null {
  const candidates = [item.item_name, item.name, item.description, item.product_name, item.title, item.item_code, item.code, item.serial_id];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getPOAmount(row: PurchaseOrderRow): number {
  const directKeys = ["grand_total", "total_amount", "total", "po_total", "final_total", "amount", "net_total"];
  for (const key of directKeys) {
    const value = toNumber(row[key]);
    if (value > 0) return value;
  }
  const items = getLineItems(row);
  if (!items.length) return 0;
  return items.reduce((sum, item) => {
    const directItemKeys = ["amount", "line_total", "total", "value", "net_amount"];
    for (const key of directItemKeys) {
      const itemValue = toNumber(item[key]);
      if (itemValue > 0) return sum + itemValue;
    }
    const qty = toNumber(item.qty ?? item.quantity ?? item.units ?? 1);
    const rate = toNumber(item.rate ?? item.unit_price ?? item.price ?? item.basic_rate ?? 0);
    return sum + qty * rate;
  }, 0);
}

function getCurrentFY(): { label: string; start: Date; end: Date } {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const fyStartYear = month < 3 ? year - 1 : year;
  const fyEndYear = fyStartYear + 1;
  return {
    label: `FY${String(fyEndYear).slice(-2)}`,
    start: new Date(fyStartYear, 3, 1),
    end: new Date(fyEndYear, 2, 31, 23, 59, 59, 999),
  };
}

function buildPOYearInsights(rows: PurchaseOrderRow[]) {
  const { label: fyLabel, start: fyStart, end: fyEnd } = getCurrentFY();
  const currentFYPOs = rows.filter((row) => {
    const date = getPODate(row);
    if (!date) return false;
    return date >= fyStart && date <= fyEnd;
  });
  const totalValue = currentFYPOs.reduce((sum, row) => sum + getPOAmount(row), 0);
  const avgValue = currentFYPOs.length ? totalValue / currentFYPOs.length : 0;
  const itemFrequency = new Map<string, number>();
  currentFYPOs.forEach((row) => {
    const items = getLineItems(row);
    items.forEach((item) => {
      const name = getItemName(item);
      if (!name) return;
      itemFrequency.set(name, (itemFrequency.get(name) ?? 0) + 1);
    });
  });
  const topItems: TopItem[] = Array.from(itemFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));
  return { fyLabel, count: currentFYPOs.length, totalValue, avgValue, topItems };
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ items: 0, vendors: 0, pos: 0, grns: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [poYearInsights, setPoYearInsights] = useState({
    fyLabel: getCurrentFY().label,
    count: 0,
    totalValue: 0,
    avgValue: 0,
    topItems: [] as TopItem[],
  });
  const [poYearLoading, setPoYearLoading] = useState(true);

  // ERP Widget State
  const [pendingReqs, setPendingReqs] = useState<Requisition[]>([]);
  const [pendingReqsLoading, setPendingReqsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [stockAlerts, setStockAlerts] = useState<StockSummary[]>([]);
  const [stockAlertsLoading, setStockAlertsLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userName, setUserName] = useState("");

  const { text: greetingText, Icon: GreetingIcon } = getGreeting();
  const { role } = useRole();
  const canAccessPO = can(role, "create_po");

  useEffect(() => {
    async function load() {
      setInitialLoading(true);
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
          setUserName((profile as any)?.full_name?.trim() || "");
        } else {
          setUserName("");
        }

        const [a, b, c, d, poRowsResponse, reqRes, activityRes, stockRpc] = await Promise.all([
          supabase.from("items").select("id", { count: "exact", head: true }),
          supabase.from("vendors").select("id", { count: "exact", head: true }),
          supabase.from("purchase_orders").select("id", { count: "exact", head: true }),
          supabase.from("grn").select("id", { count: "exact", head: true }),
          supabase.from("purchase_orders").select("*"),
          supabase.from("requisitions").select("*").in("status", ["pending", "under_review"]).order("created_at", { ascending: false }).limit(5),
          supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(6),
          supabase.rpc("get_stock_summary"),
        ]);

        setStats({ items: a.count ?? 0, vendors: b.count ?? 0, pos: c.count ?? 0, grns: d.count ?? 0 });
        setStatsLoading(false);

        const poRows = poRowsResponse.data ?? [];
        setPoYearInsights(buildPOYearInsights(poRows));
        setPoYearLoading(false);

        setPendingReqs((reqRes.data ?? []) as unknown as Requisition[]);
        setPendingReqsLoading(false);
        setRecentActivity((activityRes.data ?? []) as unknown as ActivityLog[]);
        setActivityLoading(false);

        const stockRows = ((stockRpc.data ?? []) as unknown as StockSummary[]);
        setStockAlerts(stockRows.filter((s: StockSummary) => s.balance >= 0 && s.balance < 5));
        setStockAlertsLoading(false);
      } catch {
        setStockAlerts([]);
        setStockAlertsLoading(false);
        setStatsLoading(false);
        setPoYearLoading(false);
        setPendingReqsLoading(false);
        setActivityLoading(false);
      } finally {
        setInitialLoading(false);
      }
    }
    load();
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-[calc(100vh-96px)] flex items-center justify-center px-6">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-3xl shadow-sm px-8 py-10 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-2xl bg-viton-red/10 dark:bg-orange-500/10 blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-2xl bg-white dark:bg-gray-950 border border-[#dde1ea] dark:border-gray-800 flex items-center justify-center shadow-sm overflow-hidden">
                <img src="/Logo.JPG" alt="Viton Engineers" className="w-12 h-12 object-contain" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-viton-red dark:text-orange-400 mb-3">
              <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-[0.24em]">Loading workspace</span>
            </div>
            <h2 className="text-viton-navy dark:text-white text-xl font-semibold tracking-tight mb-2">Preparing your dashboard</h2>
            <p className="text-[#8892a8] dark:text-gray-500 text-sm max-w-xs mb-6">
              Loading your ERP snapshot, activity feed, approvals, and stock alerts.
            </p>
            <div className="w-full space-y-3">
              <div className="h-3 rounded-full bg-[#eef1f6] dark:bg-gray-800 overflow-hidden">
                <div className="h-full w-1/2 rounded-full bg-viton-red/70 dark:bg-orange-500/70 animate-[pulse_1.2s_ease-in-out_infinite]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="h-20 rounded-2xl bg-[#f6f8fc] dark:bg-gray-800/80 animate-pulse" />
                <div className="h-20 rounded-2xl bg-[#f6f8fc] dark:bg-gray-800/80 animate-pulse [animation-delay:120ms]" />
                <div className="h-20 rounded-2xl bg-[#f6f8fc] dark:bg-gray-800/80 animate-pulse [animation-delay:240ms]" />
              </div>
              <div className="h-24 rounded-2xl bg-[#f6f8fc] dark:bg-gray-800/80 animate-pulse [animation-delay:180ms]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Items in Catalog", value: stats.items, icon: Package, href: "/dashboard/catalog", accent: "orange" },
    { label: "Vendors", value: stats.vendors, icon: Users, href: "/dashboard/vendors", accent: "blue" },
    ...(canAccessPO ? [{ label: "Purchase Orders", value: stats.pos, icon: FileText, href: "/dashboard/history", accent: "green" }] : []),
    { label: "GRNs Received", value: stats.grns, icon: Receipt, href: "/dashboard/grn", accent: "purple" },
  ];

  // Light mode icon bg/text, dark mode icon bg/text
  const iconColors: Record<string, string> = {
    orange: "bg-red-50 text-viton-red dark:bg-orange-500/10 dark:text-orange-500",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  };

  const quickActions = [
    { label: "New Requisition", desc: "Request material for your department", href: "/dashboard/requisitions/new", icon: ArrowRightLeft, bg: "bg-viton-red dark:bg-orange-500" },
    ...(canAccessPO ? [{ label: "New Purchase Order", desc: "Auto-fill from serial ID", href: "/dashboard/po/new", icon: FileText, bg: "bg-blue-600 dark:bg-blue-500" }] : []),
    { label: "Receive GRN", desc: "Record incoming stock against PO", href: "/dashboard/grn", icon: PackageOpen, bg: "bg-green-600 dark:bg-green-500" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Greeting Header */}
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GreetingIcon size={16} className="text-viton-red dark:text-orange-400" />
            <span className="text-viton-red dark:text-orange-400 text-xs font-semibold uppercase tracking-widest">
              {greetingText}
            </span>
          </div>
          <h1 className="text-viton-navy dark:text-white text-3xl font-bold tracking-tight">
            Hello, {userName} <span className="wave">👋</span>
          </h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">{getFormattedDate()}</p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl px-4 py-3 self-start">
          <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
          <span className="text-[#4a5578] dark:text-gray-400 text-xs font-medium">Portal Active</span>
        </div>
      </div>

      {/* Quick Actions */}
      <section className="mb-10">
        <div className="mb-4">
          <p className="text-[#8892a8] dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
            Quick Actions
          </p>
          <h2 className="text-viton-navy dark:text-white text-xl font-semibold tracking-tight">
            Start a new workflow
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link href={action.href} key={action.label}>
                <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-6 hover:border-[#c0c8db] dark:hover:border-orange-500/40 hover:shadow-md dark:hover:shadow-none transition-all cursor-pointer h-full">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${action.bg}`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <p className="text-viton-navy dark:text-white font-semibold text-sm">{action.label}</p>
                  <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">{action.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Stats */}
      <section className="mb-10">
        <div className="mb-4">
          <p className="text-[#8892a8] dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
            Overview
          </p>
          <h2 className="text-viton-navy dark:text-white text-xl font-semibold tracking-tight">
            Core ERP snapshot
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link href={card.href} key={card.label}>
              <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-5 hover:border-[#c0c8db] dark:hover:border-gray-700 hover:shadow-md dark:hover:shadow-none transition-all group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconColors[card.accent]}`}>
                  <Icon size={20} />
                </div>
                <p className="text-viton-navy dark:text-white text-2xl font-bold tabular-nums">
                  {statsLoading ? (
                    <span className="inline-block w-8 h-6 bg-[#e8eaf2] dark:bg-gray-800 rounded animate-pulse" />
                  ) : (
                    card.value
                  )}
                </p>
                <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1">{card.label}</p>
              </div>
            </Link>
          );
        })}
        </div>
      </section>

      {/* PO Insights */}
      {canAccessPO && (
      <div className="mb-10">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
          <div>
            <p className="text-[#8892a8] dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
              POs Raised This Financial Year
            </p>
            <h2 className="text-viton-navy dark:text-white text-xl font-semibold tracking-tight">
              Purchase order snapshot for {poYearInsights.fyLabel}
            </h2>
          </div>
          <Link
            href="/dashboard/history"
            className="text-viton-red dark:text-orange-400 hover:text-viton-red-hover dark:hover:text-orange-300 text-sm font-medium transition-colors"
          >
            View PO History →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {/* PO Count */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-4 xl:col-span-1 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 text-viton-red dark:bg-orange-500/10 dark:text-orange-400">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-viton-navy dark:text-white text-xl font-bold tabular-nums leading-tight">
                {poYearLoading ? <span className="inline-block w-10 h-5 bg-[#e8eaf2] dark:bg-gray-800 rounded animate-pulse" /> : poYearInsights.count}
              </p>
              <p className="text-[#8892a8] dark:text-gray-500 text-xs">POs in {poYearInsights.fyLabel}</p>
            </div>
          </div>

          {/* Total Value */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-4 xl:col-span-1 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <IndianRupee size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-viton-navy dark:text-white text-xl font-bold tabular-nums leading-tight truncate">
                {poYearLoading ? <span className="inline-block w-20 h-5 bg-[#e8eaf2] dark:bg-gray-800 rounded animate-pulse" /> : formatCurrency(poYearInsights.totalValue)}
              </p>
              <p className="text-[#8892a8] dark:text-gray-500 text-xs">Total PO value</p>
            </div>
          </div>

          {/* Avg Value */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-4 xl:col-span-1 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <TrendingUp size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-viton-navy dark:text-white text-xl font-bold tabular-nums leading-tight truncate">
                {poYearLoading ? <span className="inline-block w-20 h-5 bg-[#e8eaf2] dark:bg-gray-800 rounded animate-pulse" /> : formatCurrency(poYearInsights.avgValue)}
              </p>
              <p className="text-[#8892a8] dark:text-gray-500 text-xs">Avg PO value</p>
            </div>
          </div>

          {/* Most Common Items */}
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-4 xl:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                <BarChart3 size={13} />
              </div>
              <p className="text-viton-navy dark:text-white text-sm font-semibold">Top Items</p>
              <span className="text-[#8892a8] dark:text-gray-600 text-xs ml-auto">{poYearInsights.fyLabel}</span>
            </div>

            {poYearLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#e8eaf2] dark:bg-gray-800 animate-pulse flex-shrink-0" />
                    <div className="flex-1 h-3.5 rounded bg-[#e8eaf2] dark:bg-gray-800 animate-pulse" />
                    <div className="w-8 h-3.5 rounded bg-[#e8eaf2] dark:bg-gray-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : poYearInsights.topItems.length > 0 ? (
              <div className="space-y-2">
                {poYearInsights.topItems.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-[#e8eaf2] dark:bg-gray-800 text-[#4a5578] dark:text-gray-400 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm text-viton-navy dark:text-gray-200 truncate">{item.name}</p>
                    </div>
                    <span className="text-xs font-medium text-viton-red dark:text-orange-300 bg-red-50 dark:bg-orange-500/10 border border-red-200 dark:border-orange-500/20 rounded-full px-2 py-0.5 flex-shrink-0">
                      {item.count} {item.count === 1 ? "PO" : "POs"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8892a8] dark:text-gray-500">
                No trend data for {poYearInsights.fyLabel} yet.
              </p>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ERP Widgets */}
      <section className="mb-10">
        <div className="mb-4">
          <p className="text-[#8892a8] dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
            Operations
          </p>
          <h2 className="text-viton-navy dark:text-white text-xl font-semibold tracking-tight">
            Live workflow status
          </h2>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Pending Requisitions */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 flex items-center justify-center">
                <ArrowRightLeft size={13} />
              </div>
              <p className="text-viton-navy dark:text-white text-sm font-semibold">Pending Requisitions</p>
            </div>
            <Link href="/dashboard/requisitions" className="text-viton-red dark:text-orange-400 text-xs font-medium hover:underline">
              View All
            </Link>
          </div>
          {pendingReqsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-[#e8eaf2] dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : pendingReqs.length === 0 ? (
            <p className="text-[#8892a8] dark:text-gray-500 text-xs">No pending requisitions. Good job!</p>
          ) : (
            <div className="space-y-2">
              {pendingReqs.slice(0, 4).map((req) => (
                <div key={req.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="text-viton-navy dark:text-white font-medium truncate">{req.req_number}</p>
                    <p className="text-[#8892a8] dark:text-gray-500 text-xs">By {req.requested_by_name ?? "—"} · {req.line_items?.length ?? 0} items</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    req.priority === "urgent" ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" :
                    req.priority === "high" ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400" :
                    "bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400"
                  }`}>{req.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock Alerts */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 flex items-center justify-center">
                <AlertTriangle size={13} />
              </div>
              <p className="text-viton-navy dark:text-white text-sm font-semibold">Stock Alerts</p>
            </div>
            <Link href="/dashboard/stock" className="text-viton-red dark:text-orange-400 text-xs font-medium hover:underline">
              View Stock
            </Link>
          </div>
          {stockAlertsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-[#e8eaf2] dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : stockAlerts.length === 0 ? (
            <p className="text-[#8892a8] dark:text-gray-500 text-xs">All items are well stocked.</p>
          ) : (
            <div className="space-y-2">
              {stockAlerts.slice(0, 5).map((item) => (
                <div key={item.item_id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="text-viton-navy dark:text-white font-medium truncate">{item.serial_id}</p>
                    <p className="text-[#8892a8] dark:text-gray-500 text-xs truncate">{item.name}</p>
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${item.balance <= 0 ? "text-red-500" : "text-orange-500"}`}>
                    {item.balance} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center">
                <Activity size={13} />
              </div>
              <p className="text-viton-navy dark:text-white text-sm font-semibold">Recent Activity</p>
            </div>
            <Link href="/dashboard/activity" className="text-viton-red dark:text-orange-400 text-xs font-medium hover:underline">
              View All
            </Link>
          </div>
          {activityLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-[#e8eaf2] dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-[#8892a8] dark:text-gray-500 text-xs">No recent activity.</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-sm">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    log.action.includes("created") ? "bg-green-500" :
                    log.action.includes("deleted") ? "bg-red-500" : "bg-blue-500"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-viton-navy dark:text-white text-xs truncate">
                      <span className="font-medium">{log.user_name ?? "System"}</span>{" "}
                      <span className="text-[#4a5578] dark:text-gray-400">{log.action.replace(/_/g, " ")}</span>
                      {log.entity_code && <span className="font-mono text-viton-red dark:text-orange-400 ml-1">{log.entity_code}</span>}
                    </p>
                    <p className="text-[#8892a8] dark:text-gray-600 text-[10px]">
                      {new Date(log.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </section>

      <style jsx>{`
        .wave {
          display: inline-block;
          animation: wave 2.5s ease-in-out infinite;
          transform-origin: 70% 70%;
        }
        @keyframes wave {
          0%, 60%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(20deg); }
          20% { transform: rotate(-10deg); }
          40% { transform: rotate(10deg); }
          50% { transform: rotate(-5deg); }
        }
      `}</style>
    </div>
  );
}
