"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { isAdmin, useRole } from "@/lib/roles";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  ArrowDown,
  ArrowUp,
  Search,
  AlertTriangle,
  Loader2,
  ChevronUp,
} from "lucide-react";

interface AdjustmentRequest {
  id: string;
  item_id: string;
  item_serial_id: string;
  item_name: string;
  item_unit: string;
  adjustment_type: "adjustment_in" | "adjustment_out";
  qty: number;
  balance_at_request: number;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  requested_by: string | null;
  requested_by_name: string | null;
  created_at: string;
  review_note?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
}

export default function StockAdjustmentsPage() {
  const { role, loading: roleLoading } = useRole();
  const router = useRouter();
  const [requests, setRequests] = useState<AdjustmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  async function loadRequests() {
    setLoading(true);
    setError("");
    const supabase = createClient();

    const { data, error } = await supabase
      .from("stock_adjustment_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setRequests(((data ?? []) as unknown) as AdjustmentRequest[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!roleLoading) {
      loadRequests();
    }
  }, [roleLoading]);

  const filtered = requests.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.item_serial_id.toLowerCase().includes(q) ||
      r.item_name.toLowerCase().includes(q) ||
      (r.requested_by_name ?? "").toLowerCase().includes(q);

    const matchesTab = activeTab === "all" || r.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  async function getReviewerName() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    return {
      user,
      reviewerName: (profile as any)?.full_name ?? user?.email ?? "Unknown",
    };
  }

  async function getCurrentBalance(itemId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("stock_ledger")
      .select("balance")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return Math.max(0, Number(data?.balance ?? 0));
  }

  async function handleApprove(req: AdjustmentRequest) {
    setProcessingId(req.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      const supabase = createClient();
      const { user, reviewerName } = await getReviewerName();

      const currentBalance = await getCurrentBalance(req.item_id);

      if (req.adjustment_type === "adjustment_out" && req.qty > currentBalance) {
        setActionError(
          `Cannot approve removal of ${req.qty} ${req.item_unit}. Current balance is only ${currentBalance} ${req.item_unit}.`
        );
        setProcessingId(null);
        return;
      }

      const newBalance =
        req.adjustment_type === "adjustment_in"
          ? currentBalance + req.qty
          : Math.max(0, currentBalance - req.qty);

      const { error: ledgerErr } = await supabase.from("stock_ledger").insert({
        item_id: req.item_id,
        transaction_type: req.adjustment_type,
        reference_type: "manual",
        reference_code: `STOCK-ADJ-${req.id.slice(0, 8).toUpperCase()}`,
        qty_in: req.adjustment_type === "adjustment_in" ? req.qty : 0,
        qty_out: req.adjustment_type === "adjustment_out" ? req.qty : 0,
        balance: newBalance,
        unit: req.item_unit,
        notes:
          req.notes?.trim() ||
          `Approved manual adjustment request: ${
            req.adjustment_type === "adjustment_in" ? "added" : "removed"
          } ${req.qty} ${req.item_unit}`,
        created_by: req.requested_by,
        created_by_name: req.requested_by_name ?? "Unknown",
      });

      if (ledgerErr) {
        setActionError(ledgerErr.message);
        setProcessingId(null);
        return;
      }

      const { error: updateErr } = await supabase
        .from("stock_adjustment_requests")
        .update({
          status: "approved",
          reviewed_by: user?.id ?? null,
          reviewed_by_name: reviewerName,
          reviewed_at: new Date().toISOString(),
          review_note: null,
        })
        .eq("id", req.id)
        .eq("status", "pending");

      if (updateErr) {
        setActionError(updateErr.message);
        setProcessingId(null);
        return;
      }

      setActionSuccess(
        `Approved ${req.qty} ${req.item_unit} ${
          req.adjustment_type === "adjustment_in" ? "added to" : "removed from"
        } ${req.item_name}`
      );
      setProcessingId(null);
      loadRequests();
    } catch (e: any) {
      setActionError(e.message ?? "Failed to approve request.");
      setProcessingId(null);
    }
  }

  async function handleReject(req: AdjustmentRequest) {
    setProcessingId(req.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      const supabase = createClient();
      const { user, reviewerName } = await getReviewerName();

      const { error: updateErr } = await supabase
        .from("stock_adjustment_requests")
        .update({
          status: "rejected",
          reviewed_by: user?.id ?? null,
          reviewed_by_name: reviewerName,
          reviewed_at: new Date().toISOString(),
          review_note: rejectNote.trim() || null,
        })
        .eq("id", req.id)
        .eq("status", "pending");

      if (updateErr) {
        setActionError(updateErr.message);
        setProcessingId(null);
        return;
      }

      setRejectingId(null);
      setRejectNote("");
      setActionSuccess(`Rejected adjustment for ${req.item_name}`);
      setProcessingId(null);
      loadRequests();
    } catch (e: any) {
      setActionError(e.message ?? "Failed to reject request.");
      setProcessingId(null);
    }
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h2 className="text-viton-navy dark:text-white font-bold text-xl mb-2">Admin Access Required</h2>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mb-6">
            This page is only available to administrators.
          </p>
          <button
            onClick={() => router.push("/dashboard/stock")}
            className="bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
          >
            Back to Stock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => router.push("/dashboard/stock")}
          className="text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Stock Adjustment Requests</h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
            Review, approve, or reject manual stock adjustments submitted by team members.
          </p>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 text-red-600 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle size={14} />
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="mb-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl p-3 text-green-600 dark:text-green-300 text-sm flex items-center gap-2">
          <CheckCircle size={14} />
          {actionSuccess}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setActiveTab("pending")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === "pending"
              ? "bg-white dark:bg-gray-900 border-viton-red dark:border-orange-500 shadow-sm"
              : "bg-white dark:bg-gray-900 border-[#dde1ea] dark:border-gray-800 hover:border-[#bcc2d4]"
          }`}
        >
          <p className="text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider">Pending</p>
          <p className="text-viton-navy dark:text-white text-2xl font-bold mt-1">{pendingCount}</p>
        </button>

        <button
          onClick={() => setActiveTab("approved")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === "approved"
              ? "bg-white dark:bg-gray-900 border-green-500 shadow-sm"
              : "bg-white dark:bg-gray-900 border-[#dde1ea] dark:border-gray-800 hover:border-[#bcc2d4]"
          }`}
        >
          <p className="text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider">Approved</p>
          <p className="text-green-600 dark:text-green-400 text-2xl font-bold mt-1">{approvedCount}</p>
        </button>

        <button
          onClick={() => setActiveTab("rejected")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === "rejected"
              ? "bg-white dark:bg-gray-900 border-red-500 shadow-sm"
              : "bg-white dark:bg-gray-900 border-[#dde1ea] dark:border-gray-800 hover:border-[#bcc2d4]"
          }`}
        >
          <p className="text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider">Rejected</p>
          <p className="text-red-500 text-2xl font-bold mt-1">{rejectedCount}</p>
        </button>

        <button
          onClick={() => setActiveTab("all")}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === "all"
              ? "bg-white dark:bg-gray-900 border-viton-navy dark:border-white shadow-sm"
              : "bg-white dark:bg-gray-900 border-[#dde1ea] dark:border-gray-800 hover:border-[#bcc2d4]"
          }`}
        >
          <p className="text-[#8892a8] dark:text-gray-500 text-xs font-semibold uppercase tracking-wider">All</p>
          <p className="text-viton-navy dark:text-white text-2xl font-bold mt-1">{requests.length}</p>
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by item, serial ID, or requester..."
          className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8892a8] dark:text-gray-600">
          {activeTab === "pending" ? "No pending adjustment requests." : "No requests found."}
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── Desktop Table ──────────────────────────────────────── */}
          <div className="hidden sm:block bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#dde1ea] dark:border-gray-800">
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Serial ID</th>
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Item</th>
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Requester</th>
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Type</th>
                  <th className="text-right text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Qty</th>
                  <th className="text-right text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Stock When Requested</th>
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-left text-[#8892a8] dark:text-gray-500 font-semibold text-xs uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => {
                  const isRejecting = rejectingId === req.id;

                  return (
                    <tr
                      key={req.id}
                      className="border-b border-[#eef1f6] dark:border-gray-800/50 hover:bg-[#f7f8fb] dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-viton-red dark:text-orange-400 text-xs font-semibold">
                        {req.item_serial_id}
                      </td>

                      <td className="px-5 py-3.5 text-viton-navy dark:text-white">
                        <p className="text-sm font-medium">{req.item_name}</p>
                        <p className="text-xs text-[#8892a8] dark:text-gray-500 mt-0.5">{req.item_unit}</p>
                        {req.notes && (
                          <p className="text-xs text-[#8892a8] dark:text-gray-500 mt-1 max-w-xs line-clamp-2">
                            {req.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-[#4a5578] dark:text-gray-400">
                        {req.requested_by_name ?? "—"}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                            req.adjustment_type === "adjustment_in"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {req.adjustment_type === "adjustment_in" ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                          {req.adjustment_type === "adjustment_in" ? "Add" : "Remove"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-viton-navy dark:text-white">
                        {req.qty}
                      </td>

                      <td className="px-5 py-3.5 text-right text-[#4a5578] dark:text-gray-400 tabular-nums">
                        {req.balance_at_request}
                      </td>

                      <td className="px-5 py-3.5 text-[#8892a8] dark:text-gray-500 text-xs">
                        {new Date(req.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                            req.status === "pending"
                              ? "bg-amber-500/10 text-amber-600"
                              : req.status === "approved"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {req.status === "pending" && <Clock size={12} />}
                          {req.status === "approved" && <CheckCircle size={12} />}
                          {req.status === "rejected" && <XCircle size={12} />}
                          {req.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {req.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={processingId === req.id}
                              className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                            >
                              {processingId === req.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <CheckCircle size={12} />
                              )}
                              Approve
                            </button>

                            <button
                              onClick={() => {
                                setRejectingId(isRejecting ? null : req.id);
                                setRejectNote("");
                              }}
                              disabled={processingId === req.id}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                            >
                              {isRejecting ? <ChevronUp size={12} /> : <XCircle size={12} />}
                              {isRejecting ? "Cancel" : "Reject"}
                            </button>
                          </div>
                        )}

                        {req.status === "approved" && req.reviewed_by_name && (
                          <p className="text-xs text-[#8892a8] dark:text-gray-500">
                            By {req.reviewed_by_name} on {new Date(req.reviewed_at!).toLocaleDateString("en-IN")}
                          </p>
                        )}

                        {req.status === "rejected" && req.reviewed_by_name && (
                          <div>
                            <p className="text-xs text-[#8892a8] dark:text-gray-500">
                              By {req.reviewed_by_name} on {new Date(req.reviewed_at!).toLocaleDateString("en-IN")}
                            </p>
                            {req.review_note && (
                              <p className="text-xs text-red-500 mt-1">"{req.review_note}"</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>

          {/* ── Mobile Cards ────────────────────────────────────────── */}
          <div className="sm:hidden space-y-3">
            {filtered.map((req) => {
              const isRejecting = rejectingId === req.id;
              return (
                <div key={req.id} className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-viton-red dark:text-orange-400 text-xs font-semibold">{req.item_serial_id}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            req.status === "pending" ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                              : req.status === "approved" ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                              : "bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400"
                          }`}>{req.status}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            req.adjustment_type === "adjustment_in" ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400" : "bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400"
                          }`}>
                            {req.adjustment_type === "adjustment_in" ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
                            {req.adjustment_type === "adjustment_in" ? "Add" : "Remove"}
                          </span>
                        </div>
                        <p className="text-viton-navy dark:text-white text-sm font-medium">{req.item_name}</p>
                        <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">
                          {req.item_unit} · By {req.requested_by_name ?? "Unknown"} · {new Date(req.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                        </p>
                        {req.notes && <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-1 line-clamp-2">{req.notes}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-viton-navy dark:text-white text-xl font-bold">{req.qty}</p>
                        <p className="text-[#8892a8] dark:text-gray-500 text-xs">Stock: {req.balance_at_request}</p>
                      </div>
                    </div>
                    {req.status === "approved" && req.reviewed_by_name && (
                      <p className="text-xs text-green-600 dark:text-green-400 mb-2">✓ By {req.reviewed_by_name}</p>
                    )}
                    {req.status === "rejected" && req.reviewed_by_name && (
                      <div className="mb-2">
                        <p className="text-xs text-red-500">✗ By {req.reviewed_by_name}</p>
                        {req.review_note && <p className="text-xs text-red-500 mt-0.5">"{req.review_note}"</p>}
                      </div>
                    )}
                    {req.status === "pending" && (
                      <div className="flex gap-2 pt-3 border-t border-[#eef1f6] dark:border-gray-800/50">
                        <button onClick={() => handleApprove(req)} disabled={processingId === req.id}
                          className="flex-1 min-h-[44px] flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all">
                          {processingId === req.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Approve
                        </button>
                        <button onClick={() => { setRejectingId(isRejecting ? null : req.id); setRejectNote(""); }} disabled={processingId === req.id}
                          className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all ${
                            isRejecting ? "bg-[#f1f3f8] dark:bg-gray-800 text-[#4a5578] dark:text-gray-300" : "bg-red-500 hover:bg-red-600"
                          }`}>
                          {isRejecting ? <ChevronUp size={16} /> : <XCircle size={16} />} {isRejecting ? "Cancel" : "Reject"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rejectingId && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-viton-navy dark:text-white font-bold text-lg mb-1">Reject Adjustment</h3>
            <p className="text-[#8892a8] dark:text-gray-500 text-sm mb-4">
              Add a note explaining why this request is being rejected.
            </p>

            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Optional reason for rejection..."
              rows={3}
              className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 resize-none mb-4"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectNote("");
                }}
                className="bg-[#f1f3f8] dark:bg-gray-800 hover:bg-[#e8eaf2] dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold px-5 py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  const req = requests.find((r) => r.id === rejectingId);
                  if (req) handleReject(req);
                }}
                disabled={processingId === rejectingId}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
              >
                {processingId === rejectingId ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
