"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { FileText, Copy, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import type { PurchaseOrder, Vendor, LineItem } from "@/lib/types";
import { useRouter } from "next/navigation";

type POWithVendor = PurchaseOrder & { vendors: Vendor };

export default function HistoryPage() {
  const [pos, setPos] = useState<POWithVendor[]>([]);
  const [filtered, setFiltered] = useState<POWithVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("purchase_orders")
        .select("*, vendors(*)")
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as POWithVendor[];
      setPos(rows);
      setFiltered(rows);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(pos); return; }
    const q = search.toLowerCase();
    setFiltered(
      pos.filter(
        (p) =>
          p.po_number.toLowerCase().includes(q) ||
          (p.vendors?.name ?? "").toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q)
      )
    );
  }, [search, pos]);

  function handleDuplicate(po: POWithVendor) {
    const params = new URLSearchParams({
      duplicate: "1",
      vendor: po.vendor_id,
      items: JSON.stringify(po.line_items),
      notes: po.notes ?? "",
    });
    router.push(`/dashboard/po/new?${params.toString()}`);
  }

  const statusColors: Record<string, string> = {
    confirmed: "bg-green-500/10 text-green-400",
    draft: "bg-yellow-500/10 text-yellow-400",
    cancelled: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">PO History</h1>
        <p className="text-gray-500 text-sm mt-1">{pos.length} purchase orders total</p>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by PO number, vendor or status..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          {search ? "No POs match your search." : "No purchase orders yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((po) => {
            const isOpen = expanded === po.id;
            const lineItems = po.line_items as unknown as LineItem[];
            const date = new Date(po.created_at).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
            });
            return (
              <div key={po.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all">
                <div
                  className="px-5 py-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : po.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold font-mono text-sm">{po.po_number}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{po.vendors?.name ?? "Unknown Vendor"} · {date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <p className="text-white font-semibold text-sm hidden sm:block">
                      Rs. {po.total.toLocaleString("en-IN")}
                    </p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${statusColors[po.status] ?? "bg-gray-500/10 text-gray-400"}`}>
                      {po.status}
                    </span>
                    {isOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-800">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 bg-gray-800/40">
                            <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">#</th>
                            <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Serial ID</th>
                            <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Description</th>
                            <th className="text-left text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Qty</th>
                            <th className="text-right text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((line, i) => (
                            <tr key={i} className="border-b border-gray-800/40 last:border-0">
                              <td className="px-5 py-2.5 text-gray-500 text-xs">{i + 1}</td>
                              <td className="px-5 py-2.5 text-orange-400 font-mono text-xs font-semibold">{line.serial_id}</td>
                              <td className="px-5 py-2.5 text-white text-sm">{line.name}</td>
                              <td className="px-5 py-2.5 text-gray-400">{line.quantity} {line.unit}</td>
                              <td className="px-5 py-2.5 text-right text-white font-medium">Rs. {line.total.toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-gray-500">Total: </span>
                        <span className="text-white font-bold">Rs. {po.total.toLocaleString("en-IN")}</span>
                        {po.notes && (
                          <p className="text-gray-500 text-xs mt-1">{po.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDuplicate(po)}
                        className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 hover:border-orange-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                      >
                        <Copy size={14} /> Duplicate PO
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
