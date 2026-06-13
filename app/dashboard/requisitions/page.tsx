"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { useRouter } from "next/navigation";
import { can, useRole } from "@/lib/roles";
import type { Requisition, ReqLineItem } from "@/lib/types";
import {
  FileText,
  Search,
  X,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Download,
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { MRPdfDocument } from "@/components/MRPdf";

type ReqWithUser = Requisition & { requested_by_email?: string };

const statusColors: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  under_review: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  approved: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  converted_to_po: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
  fulfilled: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  awaiting_procurement: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  partially_fulfilled: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

function getReqGroupBase(reqNumber: string) {
  const match = reqNumber.match(/^(MR\/\d+\/\d{2}-\d{2})(?:-(\d+))?$/);
  return match?.[1] ?? reqNumber;
}

function getReqSubIndex(reqNumber: string) {
  const match = reqNumber.match(/^(MR\/\d+\/\d{2}-\d{2})(?:-(\d+))?$/);
  return match?.[2] ? Number(match[2]) : 1;
}

const priorityColors: Record<string, string> = {
  low: "text-gray-500",
  normal: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

export default function RequisitionsPage() {
  const router = useRouter();
  const { role, loading: roleLoading } = useRole();
  const [reqs, setReqs] = useState<ReqWithUser[]>([]);
  const [filtered, setFiltered] = useState<ReqWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "convert" | "fulfil" | "raise_po">("approve");
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [actionNote, setActionNote] = useState("");
  const [actionError, setActionError] = useState<string>("");
  const [acting, setActing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [{ data, error }, { data: stockData }] = await Promise.all([
      supabase.from("requisitions").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.rpc("get_stock_summary"),
    ]);

    if (error) {
      setReqs([]);
      setFiltered([]);
    } else {
      const rows = (data ?? []) as unknown as ReqWithUser[];
      setReqs(rows);
      setFiltered(rows);
    }

    // Build item_id -> balance map
    const map: Record<string, number> = {};
    for (const row of (stockData ?? []) as any[]) {
      map[row.item_id] = Number(row.balance ?? 0);
    }
    setStockMap(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let out = reqs;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          r.req_number.toLowerCase().includes(q) ||
          (r.requested_by_name ?? "").toLowerCase().includes(q) ||
          r.line_items.some((li: ReqLineItem) => li.name.toLowerCase().includes(q))
      );
    }
    if (statusFilter) {
      out = out.filter((r) => r.status === statusFilter);
    }


    setFiltered(out);
  }, [search, statusFilter, reqs]);

  async function handleAction() {
    if (!actionId) return;
    setActionError("");
    setActing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };
    const name = (profile as any)?.full_name?.trim() || "Yatish Jain";

    if (actionType === "reject") {
      await supabase
        .from("requisitions")
        .update({
          status: "rejected",
          rejected_reason: actionNote.trim() || "Rejected by manager",
          approved_by: user?.id ?? null,
          approved_by_name: name,
          approved_at: new Date().toISOString(),
        })
        .eq("id", actionId);
    } else if (actionType === "approve") {
      await supabase
        .from("requisitions")
        .update({
          status: "approved",
          approved_by: user?.id ?? null,
          approved_by_name: name,
          approved_at: new Date().toISOString(),
        })
        .eq("id", actionId);
    } else if (actionType === "convert" || actionType === "raise_po") {
      const req = reqs.find((r) => r.id === actionId);
      if (req) {
        const lines = (req.line_items ?? []) as ReqLineItem[];
        // Only include shortage lines (requested > available in stock)
        const shortageLines = lines.map((li) => ({
          ...li,
          quantity: Math.max(0, Number(li.qty_requested) - (stockMap[li.item_id] ?? 0)),
        })).filter((li) => li.quantity > 0);
        const itemsToOrder = shortageLines.length > 0 ? shortageLines : lines;
        const params = new URLSearchParams();
        params.set("from_req", req.id);
        params.set("items", JSON.stringify(itemsToOrder));
        params.set("notes", req.notes ?? "");
        router.push(`/dashboard/po/new?${params.toString()}`);
        setActing(false);
        return;
      }
    }

    setActionId(null);
    setActionNote("");
    setActing(false);
    await load();
  }

  async function handleFulfil(req: ReqWithUser) {
    setActionError("");
    setActing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };
    const actor = (profile as any)?.full_name?.trim() || "Yatish Jain";
    const lines = (req.line_items ?? []) as ReqLineItem[];

    try {
      for (const line of lines) {
        const requestedQty = Number(line.qty_requested ?? 0);
        if (requestedQty <= 0) continue;

        const { data: lastLedger, error: lastLedgerErr } = await supabase
          .from("stock_ledger")
          .select("balance")
          .eq("item_id", line.item_id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (lastLedgerErr) throw lastLedgerErr;

        const curBalance = Number((lastLedger as any)?.[0]?.balance ?? 0);
        if (curBalance < requestedQty) {
          throw new Error(`Insufficient stock for ${line.name}. Available: ${curBalance}, required: ${requestedQty}.`);
        }

        const { error: insertErr } = await supabase.from("stock_ledger").insert({
          item_id: line.item_id,
          transaction_type: "mr_issue_out",
          reference_type: "requisition",
          reference_id: req.id,
          reference_code: req.req_number,
          qty_in: 0,
          qty_out: requestedQty,
          balance: curBalance - requestedQty,
          unit: line.unit,
          notes: `Issued to ${req.req_number}`,
          created_by: user?.id ?? null,
          created_by_name: actor,
        });

        if (insertErr) throw insertErr;
      }

      const { error: reqErr } = await supabase
        .from("requisitions")
        .update({ status: "fulfilled" })
        .eq("id", req.id);
      if (reqErr) throw reqErr;

      const { error: auditErr } = await supabase.from("activity_logs").insert({
        user_id: user?.id ?? null,
        user_name: actor,
        action: "requisition_fulfilled_from_stock",
        entity_type: "requisition",
        entity_id: req.id,
        entity_code: req.req_number,
        details: { items: lines.map((l) => ({ name: l.name, qty: l.qty_requested })) },
      });
      if (auditErr) throw auditErr;

      await load();
    } catch (err: any) {
      setActionError(err?.message || "Could not fulfil MR from stock.");
      return;
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("requisitions").delete().eq("id", deleteId);
    setDeleteId(null);
    setDeleting(false);
    await load();
  }

  const canApprove = role && can(role, "approve_requisition");
  const canConvert = role && can(role, "convert_requisition");
  const canCreate = role && can(role, "create_requisition");

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-viton-navy dark:text-white text-2xl font-bold">Material Requisitions</h1>
          <p className="text-[#8892a8] dark:text-gray-500 text-sm mt-1">
            Request → Approve → Fulfil from Stock or Raise PO for Shortage
          </p>
        </div>
        {canCreate && (
          <a
            href="/dashboard/requisitions/new"
            className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <Plus size={16} /> New Requisition
          </a>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by MR number, requester, or item..."
            className="w-full bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl pl-10 pr-10 py-3 text-viton-navy dark:text-white text-sm placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 hover:text-viton-navy dark:hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-xl px-4 py-3 pr-10 text-sm text-viton-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="awaiting_procurement">Awaiting Procurement</option>
            <option value="converted_to_po">PO Raised</option>
            <option value="partially_fulfilled">Partially Fulfilled</option>
            <option value="rejected">Rejected</option>
            <option value="fulfilled">Fulfilled</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8892a8] dark:text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-viton-navy dark:text-white font-bold text-center text-lg mb-1">Delete Requisition?</h3>
            <p className="text-[#8892a8] dark:text-gray-500 text-sm text-center mb-6">
              This will permanently remove the MR from the queue. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 bg-[#f1f3f8] hover:bg-[#e7ebf3] dark:bg-gray-800 dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold py-3 rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-viton-red hover:bg-viton-red-hover dark:bg-red-500 dark:hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-all"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-viton-navy dark:text-white font-bold text-lg mb-1 capitalize">
              {actionType} Requisition
            </h3>
            <p className="text-[#8892a8] dark:text-gray-500 text-sm mb-4">
              {actionType === "approve" && "This will mark the requisition as approved. A purchase officer can then convert it to a PO."}
              {actionType === "reject" && "Provide a reason so the requester understands why."}
              {(actionType === "convert" || actionType === "raise_po") && "This will open the PO builder pre-filled with shortage quantities only. Items already in stock will not be ordered."}
            </p>

            {actionType === "reject" && (
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full bg-[#f1f3f8] dark:bg-gray-800 border border-[#dde1ea] dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-viton-navy dark:text-white placeholder-[#8892a8] dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-viton-red dark:focus:ring-orange-500 resize-none mb-4"
                rows={3}
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setActionId(null); setActionNote(""); setActionError(""); }}
                className="flex-1 bg-[#f1f3f8] hover:bg-[#e7ebf3] dark:bg-gray-800 dark:hover:bg-gray-700 text-[#4a5578] dark:text-gray-300 font-semibold py-3 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={acting}
                className={`flex-1 font-semibold py-3 rounded-xl text-sm transition-all ${
                  actionType === "reject"
                    ? "bg-red-50 hover:bg-red-500 text-red-700 hover:text-white border border-red-200 dark:bg-red-500/10 dark:hover:bg-red-500 dark:text-red-400 dark:border-red-500/30"
                    : "bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
                }`}
              >
                {acting ? "Processing..." : actionType === "reject" ? "Reject" : actionType === "approve" ? "Approve" : "Raise PO for Shortage"}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {actionError}
        </div>
      )}

      {/* List */}
      {loading || roleLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-viton-red dark:border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8892a8] dark:text-gray-600">
          {search || statusFilter ? "No requisitions match your filters." : "No requisitions yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isOpen = expanded === req.id;
            const lines = (req.line_items ?? []) as ReqLineItem[];
            const date = new Date(req.created_at).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
            });
            const hasLinkedPo = !!req.po_id;
            const showCreatePoAgain = req.status === "approved" && !hasLinkedPo;
            const linkedPoLabel = req.po_id ? `PO linked · ${req.po_id.slice(0, 8)}` : null;
            const groupBase = getReqGroupBase(req.req_number);
            const groupCount = filtered.filter((row) => getReqGroupBase(row.req_number) === groupBase).length;
            const subIndex = getReqSubIndex(req.req_number);
            const isSubMr = groupCount > 1;
            const allInStock = lines.every((li) => (stockMap[li.item_id] ?? 0) >= Number(li.qty_requested));
            const anyShortage = lines.some((li) => (stockMap[li.item_id] ?? 0) < Number(li.qty_requested));
            const isPoRaised = req.status === "converted_to_po";
            const isReadyToFulfil = isPoRaised && allInStock;

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-gray-900 border border-[#dde1ea] dark:border-gray-800 rounded-2xl overflow-hidden hover:border-[#cfd5e2] dark:hover:border-gray-700 transition-all"
              >
                <div
                  className="px-5 py-4 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : req.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-viton-red/10 dark:bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-viton-red dark:text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-viton-navy dark:text-white font-semibold font-mono text-sm">{isSubMr ? groupBase : req.req_number}</p>
                        {isSubMr && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-viton-red dark:text-orange-400 bg-viton-red/10 dark:bg-orange-500/10 px-2 py-0.5 rounded-md">
                            Sub-MR {subIndex}/{groupCount}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${priorityColors[req.priority]}`}>
                          {req.priority}
                        </span>
                      </div>
                      <p className="text-[#8892a8] dark:text-gray-500 text-xs mt-0.5">
                        {isSubMr ? `Line item ${subIndex} of ${groupCount} · ` : ""}By {req.requested_by_name ?? "Unknown"} · {date}
                        {req.department ? ` · ${req.department}` : ""}
                        {req.required_by ? ` · Required by ${new Date(req.required_by).toLocaleDateString("en-IN")}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${statusColors[req.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {isReadyToFulfil ? "Ready to Fulfil" : (req.status as string) === "converted_to_po" ? "PO Raised" : (req.status as string) === "fulfilled" ? "Fulfilled ✓" : req.status.replace(/_/g, " ")}
                    </span>
                    {isOpen ? <ChevronUp size={16} className="text-[#8892a8] dark:text-gray-500" /> : <ChevronDown size={16} className="text-[#8892a8] dark:text-gray-500" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-[#dde1ea] dark:border-gray-800">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#dde1ea] dark:border-gray-800 bg-[#f7f8fb] dark:bg-gray-800/40">
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">#</th>
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Serial ID</th>
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Description</th>
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Qty Requested</th>
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">In Stock</th>
                            <th className="text-left text-[#8892a8] dark:text-gray-500 text-xs uppercase tracking-wider px-5 py-2.5">Shortage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line, i) => (
                            <tr key={i} className="border-b border-[#eef1f6] dark:border-gray-800/40 last:border-0">
                              <td className="px-5 py-2.5 text-[#8892a8] dark:text-gray-500 text-xs">{i + 1}</td>
                              <td className="px-5 py-2.5 text-viton-red dark:text-orange-400 font-mono text-xs font-semibold">{line.serial_id}</td>
                              <td className="px-5 py-2.5 text-viton-navy dark:text-white">{line.name}</td>
                              <td className="px-5 py-2.5 text-[#4a5578] dark:text-gray-400">{line.qty_requested} {line.unit}</td>
                              <td className="px-5 py-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">{stockMap[line.item_id] ?? 0}</td>
                              <td className={`px-5 py-2.5 font-semibold ${Math.max(0, Number(line.qty_requested) - (stockMap[line.item_id] ?? 0)) > 0 ? "text-red-500 dark:text-red-400" : "text-gray-400"}`}>{Math.max(0, Number(line.qty_requested) - (stockMap[line.item_id] ?? 0)) || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-5 py-4 border-t border-[#dde1ea] dark:border-gray-800">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="text-sm text-[#4a5578] dark:text-gray-400">
                          {req.notes && <p className="mb-1">Notes: {req.notes}</p>}
                          {req.rejected_reason && (
                            <p className="text-red-600 dark:text-red-400">Reason: {req.rejected_reason}</p>
                          )}
                          {req.approved_by_name && (
                            <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle size={12} /> Approved by {req.approved_by_name} on {req.approved_at ? new Date(req.approved_at).toLocaleDateString("en-IN") : ""}
                            </p>
                          )}
                          {showCreatePoAgain && (
                            <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertCircle size={12} /> {allInStock ? "Approved — stock available, but you can still raise a fresh PO" : "Approved but PO not created"}
                            </p>
                          )}
                          {isReadyToFulfil && (
                            <p className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle size={12} /> All requested items are now in stock and ready to fulfil
                            </p>
                          )}
                          {hasLinkedPo && linkedPoLabel && (
                            <p className="text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <ArrowRightLeft size={12} /> {linkedPoLabel}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {req.status === "pending" && canApprove && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setActionType("approve"); setActionId(req.id); }}
                                className="flex items-center gap-2 bg-green-50 hover:bg-green-500 text-green-700 hover:text-white border border-green-200 hover:border-green-500 dark:bg-green-500/10 dark:hover:bg-green-500 dark:text-green-400 dark:border-green-500/30 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                              >
                                <CheckCircle size={14} /> Approve
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setActionType("reject"); setActionId(req.id); }}
                                className="flex items-center gap-2 bg-red-50 hover:bg-red-500 text-red-700 hover:text-white border border-red-200 hover:border-red-500 dark:bg-red-500/10 dark:hover:bg-red-500 dark:text-red-400 dark:border-red-500/30 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </>
                          )}

                          {/* MR Fulfillment Buttons */}
                          {(req.status === "approved" || isPoRaised) && canConvert && (
                            <>
                              <button
                                disabled={!allInStock}
                                onClick={(e) => { e.stopPropagation(); if (allInStock) handleFulfil(req); }}
                                title={allInStock ? (isPoRaised ? "PO/GRN stock is now available — fulfil this MR" : "Issue all items from stock") : "Insufficient stock — wait for GRN or raise PO for shortage first"}
                                className={`flex items-center gap-2 font-semibold px-4 py-2 rounded-xl text-sm transition-all border ${
                                  allInStock
                                    ? "bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white border-emerald-200 hover:border-emerald-500 dark:bg-emerald-500/10 dark:hover:bg-emerald-500 dark:text-emerald-400 dark:border-emerald-500/30"
                                    : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800/40 dark:text-gray-600 dark:border-gray-700 cursor-not-allowed opacity-50"
                                }`}
                              >
                                <CheckCircle size={14} /> {isPoRaised ? "Fulfil MR" : "Fulfil From Stock"}
                              </button>

                              {showCreatePoAgain && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActionType("raise_po"); setActionId(req.id); }}
                                  className="flex items-center gap-2 bg-purple-50 hover:bg-purple-500 text-purple-700 hover:text-white border border-purple-200 hover:border-purple-500 dark:bg-purple-500/10 dark:hover:bg-purple-500 dark:text-purple-400 dark:border-purple-500/30 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                                >
                                  <ArrowRightLeft size={14} /> {anyShortage ? "Raise PO for Shortage" : "Raise Fresh PO"}
                                </button>
                              )}

                              {isPoRaised && anyShortage && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActionType("raise_po"); setActionId(req.id); }}
                                  className="flex items-center gap-2 bg-purple-50 hover:bg-purple-500 text-purple-700 hover:text-white border border-purple-200 hover:border-purple-500 dark:bg-purple-500/10 dark:hover:bg-purple-500 dark:text-purple-400 dark:border-purple-500/30 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                                >
                                  <ArrowRightLeft size={14} /> Raise Another PO
                                </button>
                              )}
                            </>
                          )}

                          {/* Delete button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteId(req.id); }}
                            className="flex items-center gap-2 bg-gray-50 hover:bg-red-500 text-gray-600 hover:text-white border border-gray-200 hover:border-red-500 dark:bg-gray-800 dark:hover:bg-red-500 dark:text-gray-400 dark:border-gray-700 dark:hover:border-red-500 font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                            title="Delete this requisition"
                          >
                            <Trash2 size={14} /> Delete
                          </button>

                          <PDFDownloadLink
                            document={<MRPdfDocument req={req} />}
                            fileName={`${req.req_number.replace(/\//g, "-")}.pdf`}
                            className="flex items-center gap-2 bg-viton-red hover:bg-viton-red-hover dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
                          >
                            <Download size={14} /> Download PDF
                          </PDFDownloadLink>
                        </div>
                      </div>
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
