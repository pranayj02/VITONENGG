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
} from "lucide-react";
import Link from "next/link";

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
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getPODate(row: PurchaseOrderRow): Date | null {
  const candidates = [
    row.po_date,
    row.date,
    row.created_at,
    row.order_date,
    row.issue_date,
    row.raised_on,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function getLineItems(row: PurchaseOrderRow): any[] {
  const candidates = [
    row.items,
    row.line_items,
    row.po_items,
    row.products,
    row.materials,
  ];

  for (const candidate of candidates) {
    const parsed = parseMaybeJson(candidate);

    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    if (parsed && Array.isArray(parsed.line_items)) return parsed.line_items;
  }

  return [];
}

function getItemName(item: any): string | null {
  const candidates = [
    item.item_name,
    item.name,
    item.description,
    item.product_name,
    item.title,
    item.item_code,
    item.code,
    item.serial_id,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function getPOAmount(row: PurchaseOrderRow): number {
  const directKeys = [
    "grand_total",
    "total_amount",
    "total",
    "po_total",
    "final_total",
    "amount",
    "net_total",
  ];

  for (const key of directKeys) {
    const value = toNumber(row[key]);
    if (value > 0) return value;
  }

  const items = getLineItems(row);

  if (!items.length) return 0;

  return items.reduce((sum, item) => {
    const directItemKeys = [
      "amount",
      "line_total",
      "total",
      "value",
      "net_amount",
    ];

    for (const key of directItemKeys) {
      const itemValue = toNumber(item[key]);
      if (itemValue > 0) return sum + itemValue;
    }

    const qty = toNumber(item.qty ?? item.quantity ?? item.units ?? 1);
    const rate = toNumber(
      item.rate ?? item.unit_price ?? item.price ?? item.basic_rate ?? 0
    );

    return sum + qty * rate;
  }, 0);
}

function buildPOYearInsights(rows: PurchaseOrderRow[]) {
  const currentYear = new Date().getFullYear();
  const currentYearPOs = rows.filter((row) => {
    const date = getPODate(row);
    return date?.getFullYear() === currentYear;
  });

  const totalValue = currentYearPOs.reduce((sum, row) => sum + getPOAmount(row), 0);
  const avgValue = currentYearPOs.length ? totalValue / currentYearPOs.length : 0;

  const itemFrequency = new Map<string, number>();

  currentYearPOs.forEach((row) => {
    const items = getLineItems(row);

    items.forEach((item) => {
      const name = getItemName(item);
      if (!name) return;
      itemFrequency.set(name, (itemFrequency.get(name) ?? 0) + 1);
    });
  });

  const topItems: TopItem[] = Array.from(itemFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    year: currentYear,
    count: currentYearPOs.length,
    totalValue,
    avgValue,
    topItems,
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    items: 0,
    vendors: 0,
    pos: 0,
    invoices: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [poYearInsights, setPoYearInsights] = useState({
    year: new Date().getFullYear(),
    count: 0,
    totalValue: 0,
    avgValue: 0,
    topItems: [] as TopItem[],
  });
  const [poYearLoading, setPoYearLoading] = useState(true);

  const { text: greetingText, Icon: GreetingIcon } = getGreeting();

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [a, b, c, d, poRowsResponse] = await Promise.all([
        supabase.from("items").select("id", { count: "exact", head: true }),
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase.from("purchase_orders").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("id", { count: "exact", head: true }),
        supabase.from("purchase_orders").select("*"),
      ]);

      setStats({
        items: a.count ?? 0,
        vendors: b.count ?? 0,
        pos: c.count ?? 0,
        invoices: d.count ?? 0,
      });
      setStatsLoading(false);

      const poRows = poRowsResponse.data ?? [];
      setPoYearInsights(buildPOYearInsights(poRows));
      setPoYearLoading(false);
    }

    load();
  }, []);

  const statCards = [
    {
      label: "Items in Catalog",
      value: stats.items,
      icon: Package,
      href: "/dashboard/catalog",
      accent: "orange",
    },
    {
      label: "Vendors",
      value: stats.vendors,
      icon: Users,
      href: "/dashboard/vendors",
      accent: "blue",
    },
    {
      label: "Purchase Orders",
      value: stats.pos,
      icon: FileText,
      href: "/dashboard/history",
      accent: "green",
    },
    {
      label: "Invoices Raised",
      value: stats.invoices,
      icon: Receipt,
      href: "/dashboard/invoices/history",
      accent: "purple",
    },
  ];

  const iconColors: Record<string, string> = {
    orange: "bg-orange-500/10 text-orange-500",
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    purple: "bg-purple-500/10 text-purple-400",
  };

  const quickActions = [
    {
      label: "New Purchase Order",
      desc: "Auto-fill from serial ID",
      href: "/dashboard/po/new",
      icon: FileText,
      bg: "bg-orange-500",
    },
    {
      label: "New Invoice",
      desc: "Generate GST-compliant invoice",
      href: "/dashboard/invoices/new",
      icon: Receipt,
      bg: "bg-blue-500",
    },
    {
      label: "Add Item to Catalog",
      desc: "Register a new item or product",
      href: "/dashboard/catalog",
      icon: Package,
      bg: "bg-green-500",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Greeting Header */}
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GreetingIcon size={16} className="text-orange-400" />
            <span className="text-orange-400 text-xs font-semibold uppercase tracking-widest">
              {greetingText}
            </span>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">
            Hello, Yatish <span className="wave">👋</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">{getFormattedDate()}</p>
        </div>

        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 self-start">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-gray-400 text-xs font-medium">Portal Active</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link href={card.href} key={card.label}>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all group">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconColors[card.accent]}`}
                >
                  <Icon size={20} />
                </div>
                <p className="text-white text-2xl font-bold tabular-nums">
                  {statsLoading ? (
                    <span className="inline-block w-8 h-6 bg-gray-800 rounded animate-pulse" />
                  ) : (
                    card.value
                  )}
                </p>
                <p className="text-gray-500 text-xs mt-1">{card.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* PO Insights */}
      <div className="mb-10">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">
              POs Raised This Year
            </p>
            <h2 className="text-white text-xl font-semibold tracking-tight">
              Purchase order snapshot for {poYearInsights.year}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Volume, value, and item trends from POs raised this year
            </p>
          </div>

          <Link
            href="/dashboard/history"
            className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
          >
            View PO History →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 xl:col-span-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-orange-500/10 text-orange-400">
              <FileText size={20} />
            </div>
            <p className="text-white text-2xl font-bold tabular-nums">
              {poYearLoading ? (
                <span className="inline-block w-12 h-6 bg-gray-800 rounded animate-pulse" />
              ) : (
                poYearInsights.count
              )}
            </p>
            <p className="text-gray-500 text-xs mt-1">POs raised in {poYearInsights.year}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 xl:col-span-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-emerald-500/10 text-emerald-400">
              <IndianRupee size={20} />
            </div>
            <p className="text-white text-2xl font-bold tabular-nums leading-tight">
              {poYearLoading ? (
                <span className="inline-block w-24 h-6 bg-gray-800 rounded animate-pulse" />
              ) : (
                formatCurrency(poYearInsights.totalValue)
              )}
            </p>
            <p className="text-gray-500 text-xs mt-1">Collective PO value</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 xl:col-span-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-blue-500/10 text-blue-400">
              <TrendingUp size={20} />
            </div>
            <p className="text-white text-2xl font-bold tabular-nums leading-tight">
              {poYearLoading ? (
                <span className="inline-block w-24 h-6 bg-gray-800 rounded animate-pulse" />
              ) : (
                formatCurrency(poYearInsights.avgValue)
              )}
            </p>
            <p className="text-gray-500 text-xs mt-1">Average PO value</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 xl:col-span-2">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-purple-500/10 text-purple-400">
                  <BarChart3 size={20} />
                </div>
                <p className="text-white text-base font-semibold">Most Common Items</p>
                <p className="text-gray-500 text-xs mt-1">
                  Based on line items found inside this year's POs
                </p>
              </div>
            </div>

            {poYearLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 animate-pulse" />
                    <div className="flex-1 h-4 rounded bg-gray-800 animate-pulse" />
                    <div className="w-10 h-4 rounded bg-gray-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : poYearInsights.topItems.length > 0 ? (
              <div className="space-y-3">
                {poYearInsights.topItems.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 text-gray-300 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm text-gray-200 truncate">{item.name}</p>
                    </div>
                    <span className="text-xs font-medium text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-1 flex-shrink-0">
                      {item.count} {item.count === 1 ? "PO" : "POs"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950/50 p-4">
                <p className="text-sm text-gray-400">
                  No item-level PO trend data found for this year yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link href={action.href} key={action.label}>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-orange-500/40 transition-all cursor-pointer">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${action.bg}`}
                >
                  <Icon size={22} className="text-white" />
                </div>
                <p className="text-white font-semibold text-sm">{action.label}</p>
                <p className="text-gray-500 text-xs mt-1">{action.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        .wave {
          display: inline-block;
          animation: wave 2.5s ease-in-out infinite;
          transform-origin: 70% 70%;
        }
        @keyframes wave {
          0%,
          60%,
          100% {
            transform: rotate(0deg);
          }
          10%,
          30% {
            transform: rotate(20deg);
          }
          20% {
            transform: rotate(-10deg);
          }
          40% {
            transform: rotate(10deg);
          }
          50% {
            transform: rotate(-5deg);
          }
        }
      `}</style>
    </div>
  );
}
