"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { useRole, can, type UserRole, type PermissionAction } from "@/lib/roles";
import { usePushNotifications, useApprovalWatcher } from "@/lib/push-hooks";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Receipt,
  History,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ArrowRightLeft,
  PackageOpen,
  BarChart3,
  Activity,
  Shield,
  ClipboardList,
  CheckCircle,
  BellDot,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: PermissionAction;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function buildNavSections(role: UserRole | null, pendingReqs: number, pendingItemApprovals: number, pendingGrns: number, pendingStock: number): NavSection[] {
  const sections: NavSection[] = [
    {
      title: "Overview",
      items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Master Data",
      items: [
        { href: "/dashboard/catalog", label: "Item Catalog", icon: Package, badge: pendingItemApprovals },
        { href: "/dashboard/vendors", label: "Vendors", icon: Users, permission: "manage_vendors" },
        // BUYERS SECTION — hidden from all users (e-invoicing handled externally)
        // Uncomment to restore when needed.
        // { href: "/dashboard/buyers", label: "Buyers", icon: Users, permission: "manage_buyers" },
      ],
    },
    {
      title: "Requisitions",
      items: [
        { href: "/dashboard/requisitions/new", label: "New Requisition", icon: ClipboardList, permission: "create_requisition" },
        { href: "/dashboard/requisitions", label: "Requisition Queue", icon: ArrowRightLeft, badge: pendingReqs },
      ],
    },
    {
      title: "Purchase Orders",
      items: [
        { href: "/dashboard/po/new", label: "New PO", icon: FileText, permission: "create_po" },
        { href: "/dashboard/history", label: "PO History", icon: History, permission: "create_po" },
      ],
    },
    // INVOICES SECTION — hidden from all users (e-invoicing handled externally)
    // Uncomment to restore when needed.
    // {
    //   title: "Invoices",
    //   items: [
    //     { href: "/dashboard/invoices/new", label: "New Invoice", icon: Receipt, permission: "create_invoice" },
    //     { href: "/dashboard/invoices/history", label: "Invoice History", icon: History },
    //   ],
    // },
    {
      title: "Store & Stock",
      items: [
        { href: "/dashboard/grn", label: "Goods Receipt (GRN)", icon: PackageOpen, permission: "create_grn", badge: pendingGrns },
        { href: "/dashboard/stock", label: "Stock & Inventory", icon: BarChart3 },
        { href: "/dashboard/stock/adjustments", label: "Stock Approvals", icon: CheckCircle, permission: "approve_stock_adjustment", badge: pendingStock },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/dashboard/activity", label: "Activity Log", icon: Activity, permission: "view_activity" },
        { href: "/dashboard/users", label: "Team & Roles", icon: Shield, permission: "manage_users" },
      ],
    },
  ];

  // Filter items by permission
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.permission) return true; // visible to all logged-in users
        return can(role, item.permission);
      }),
    }))
    .filter((section) => section.items.length > 0);
}

function isRouteActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/requisitions") {
    return pathname === "/dashboard/requisitions";
  }
  if (href === "/dashboard/stock") {
    return pathname === "/dashboard/stock";
  }
  if (href === "/dashboard/stock/adjustments") {
    return pathname === "/dashboard/stock/adjustments";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { role, loading: roleLoading } = useRole();

  // ── Web Push Notifications ────────────────────────────────────────────
  const { subscribed } = usePushNotifications();
  useApprovalWatcher();

  const [pendingReqs, setPendingReqs] = useState(0);
  const [pendingItemApprovals, setPendingItemApprovals] = useState(0);
  const [pendingGrns, setPendingGrns] = useState(0);
  const [pendingStock, setPendingStock] = useState(0);

  useEffect(() => {
    if (roleLoading) return;
    const supabase = createClient();
    async function loadBadges() {
      const { count: reqCount } = await supabase
        .from("requisitions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      let itemApprovalCount = 0;
      const { count: itemApprovalRawCount, error: itemApprovalCountError } = await supabase
        .from("item_creation_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (!itemApprovalCountError) {
        itemApprovalCount = itemApprovalRawCount ?? 0;
      }
      const { count: grnCount } = await supabase
        .from("grn")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      const { count: stockCount } = await supabase
        .from("stock_adjustment_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingReqs(reqCount ?? 0);
      setPendingItemApprovals(itemApprovalCount ?? 0);
      setPendingGrns(grnCount ?? 0);
      setPendingStock(stockCount ?? 0);
    }
    loadBadges();
    const interval = setInterval(loadBadges, 30000);
    return () => clearInterval(interval);
  }, [roleLoading, role]);

  const navSections = useMemo(() => buildNavSections(role, pendingReqs, pendingItemApprovals, pendingGrns, pendingStock), [role, pendingReqs, pendingItemApprovals, pendingGrns, pendingStock]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/");
      } else {
        setAuthLoading(false);
      }
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-[#f1f3f8] dark:bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function NavLinks({ onLinkClick }: { onLinkClick?: () => void }) {
    return (
      <div className="space-y-5">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8892a8] dark:text-gray-600">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = isRouteActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-viton-red dark:bg-orange-500 text-white shadow-lg shadow-red-500/20 dark:shadow-orange-500/20"
                        : "text-[#4a5578] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white hover:bg-[#e8eaf2] dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className={`ml-auto text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center ${
                        isActive
                          ? "bg-white text-viton-red dark:bg-white dark:text-orange-500"
                          : "bg-viton-red text-white dark:bg-orange-500 dark:text-white"
                      }`}>
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f3f8] dark:bg-gray-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-gray-900 border-r border-[#dde1ea] dark:border-gray-800 fixed top-0 left-0 bottom-0 z-10">
        <div className="p-6 border-b border-[#dde1ea] dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white border border-[#dde1ea] dark:border-gray-700">
              <img src="/Logo.JPG" alt="Viton Engineering Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-viton-navy dark:text-white font-bold text-sm tracking-wide">Viton Engineering</p>
              <p className="text-[#8892a8] dark:text-gray-500 text-xs">Viton ERP</p>
            </div>
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="p-1.5 rounded-lg text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white hover:bg-[#e8eaf2] dark:hover:bg-gray-800 transition-all flex-shrink-0"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          {!role && !roleLoading && (
            <div className="mt-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-2 text-amber-700 dark:text-amber-300 text-xs font-medium">
              ⚠️ Role not assigned. Contact admin.
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-[#dde1ea] dark:border-gray-800">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#4a5578] dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-[#e8eaf2] dark:hover:bg-gray-800 transition-all w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 border-b border-[#dde1ea] dark:border-gray-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-white border border-[#dde1ea] dark:border-gray-700">
            <img src="/Logo.JPG" alt="Viton Engineering Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-viton-navy dark:text-white font-bold text-sm">Viton Engineering</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="p-1.5 rounded-lg text-[#8892a8] dark:text-gray-400 hover:bg-[#e8eaf2] dark:hover:bg-gray-800 transition-all"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-[#4a5578] dark:text-gray-400 hover:text-viton-navy dark:hover:text-white p-1"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50 dark:bg-black/70"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 border-r border-[#dde1ea] dark:border-gray-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#dde1ea] dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-white border border-[#dde1ea] dark:border-gray-700">
                  <img src="/Logo.JPG" alt="Viton Engineering Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-viton-navy dark:text-white font-bold text-sm">Viton Engineering</p>
                  <p className="text-[#8892a8] dark:text-gray-500 text-xs">Viton ERP</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4 overflow-y-auto">
              <NavLinks onLinkClick={() => setMobileOpen(false)} />
            </nav>

            <div className="p-4 border-t border-[#dde1ea] dark:border-gray-800">
              <p className="px-4 pb-3 text-[11px] text-[#8892a8] dark:text-gray-500">
                Made with <span className="text-red-500">❤</span> by Pranay Jain
              </p>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#4a5578] dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-[#e8eaf2] dark:hover:bg-gray-800 transition-all w-full"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Page Content */}
      <main className="flex-1 md:ml-72 pt-14 md:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
