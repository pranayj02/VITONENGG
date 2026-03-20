"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Package, Users, FileText, Receipt } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState({ items: 0, vendors: 0, pos: 0, invoices: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

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
    { label: "Invoices Raised", value: stats.invoices, icon: Receipt, href: "/dashboard/history", accent: "purple" },
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
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">VITONENGG Procurement Portal</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link href={card.href} key={card.label}>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconColors[card.accent]}`}>
                  <Icon size={20} />
                </div>
                <p className="text-white text-2xl font-bold">
                  {statsLoading ? "—" : card.value}
                </p>
                <p className="text-gray-500 text-xs mt-1">{card.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="text-white text-lg font-semibold mb-4">Quick Actions</h2>
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
    </div>
  );
}
