"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Package, Users, FileText, Receipt, Sun, Sunset, Moon } from "lucide-react";
import Link from "next/link";

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

export default function DashboardPage() {
  const [stats, setStats] = useState({ items: 0, vendors: 0, pos: 0, invoices: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const { text: greetingText, Icon: GreetingIcon } = getGreeting();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [a, b, c, d] = await Promise.all([
        supabase.from("items").select("id", { count: "exact", head: true }),
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        supabase.from("purchase_orders").select("id", { count: "exact", head: true }),
        supabase.from("invoices").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        items: a.count ?? 0,
        vendors: b.count ?? 0,
        pos: c.count ?? 0,
        invoices: d.count ?? 0,
      });
      setStatsLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { label: "Items in Catalog", value: stats.items, icon: Package, href: "/dashboard/catalog", accent: "orange" },
    { label: "Vendors", value: stats.vendors, icon: Users, href: "/dashboard/vendors", accent: "blue" },
    { label: "Purchase Orders", value: stats.pos, icon: FileText, href: "/dashboard/history", accent: "green" },
    { label: "Invoices Raised", value: stats.invoices, icon: Receipt, href: "/dashboard/invoices/history", accent: "purple" },
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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconColors[card.accent]}`}>
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

      {/* Quick Actions */}
      <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link href={action.href} key={action.label}>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-orange-500/40 transition-all cursor-pointer">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${action.bg}`}>
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
