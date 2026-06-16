"use client";

// React hook that wires up Web Push + in-app browser notifications
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  subscribeToPush,
  saveSubscription,
  requestNotificationPermission,
  isPushSupported,
} from "@/lib/push";

export function usePushNotifications() {
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      if (!isPushSupported()) {
        console.log("[Push] Not supported in this browser");
        return;
      }

      const granted = await requestNotificationPermission();
      setPermission(Notification.permission);
      if (!granted) return;

      const subscription = await subscribeToPush();
      if (subscription) {
        const supabase = createClient();
        await saveSubscription(supabase, subscription);
        setSubscribed(true);
      }
    }

    init();
  }, []);

  return { subscribed, permission, isSupported: isPushSupported() };
}

// ── Approval watcher ───────────────────────────────────────────────────────
// Polls for pending approvals and shows a ONE-TIME browser notification per item.
// Uses localStorage so it survives page navigation / remounts.
// Once notified, the same item will NOT trigger again until it disappears
// (approved/rejected) and reappears later.

const LS_PREFIX = "viton_notified_";

interface WatcherState {
  stock: string[];
  grn: string[];
  requisitions: string[];
  items: string[];
}

function loadState(): WatcherState {
  try {
    const raw = localStorage.getItem(LS_PREFIX + "ids");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { stock: [], grn: [], requisitions: [], items: [] };
}

function saveState(s: WatcherState) {
  try {
    localStorage.setItem(LS_PREFIX + "ids", JSON.stringify(s));
  } catch { /* ignore */ }
}

export function useApprovalWatcher() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // We need to check if user is an admin/approver before polling.
    // But we don't want to re-run the effect when role loads,
    // so we check inside the poll function.
    const supabase = createClient();

    async function checkAndNotify() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = (profile as any)?.role;

      // Only admins / purchase_manager / QA need alerts
      if (!role || (role !== "admin" && role !== "purchase_manager" && role !== "quality_assurance")) {
        return;
      }

      // ── Fetch current pending items with their IDs ────────────────────
      const [stockRes, grnRes, reqRes, itemRes] = await Promise.all([
        supabase.from("stock_adjustment_requests").select("id").eq("status", "pending"),
        supabase.from("grn").select("id").in("status", ["pending", "inspected"]),
        supabase.from("requisitions").select("id").eq("status", "pending"),
        supabase.from("item_creation_requests").select("id").eq("status", "pending"),
      ]);

      const current = {
        stock: (stockRes.data ?? []).map((r: any) => r.id),
        grn: (grnRes.data ?? []).map((r: any) => r.id),
        requisitions: (reqRes.data ?? []).map((r: any) => r.id),
        items: (itemRes.data ?? []).map((r: any) => r.id),
      };

      const prev = loadState();

      // Helper: find new IDs (in current but not in prev) and notify
      function findNew(prevIds: string[], currIds: string[]): string[] {
        const prevSet = new Set(prevIds);
        return currIds.filter((id) => !prevSet.has(id));
      }

      const newStock = findNew(prev.stock, current.stock);
      const newGrn = findNew(prev.grn, current.grn);
      const newReqs = findNew(prev.requisitions, current.requisitions);
      const newItems = findNew(prev.items, current.items);

      // ── Show browser notifications for genuinely new items ────────────
      if (newStock.length > 0) {
        showBrowserNotification(
          "Stock Adjustment Request",
          `${newStock.length} new stock adjustment${newStock.length > 1 ? "s" : ""} awaiting approval`,
          "/dashboard/stock/adjustments",
          "stock-adjustment"
        );
      }

      if (newGrn.length > 0) {
        showBrowserNotification(
          "New GRN Pending",
          `${newGrn.length} new GRN${newGrn.length > 1 ? "s" : ""} awaiting inspection/approval`,
          "/dashboard/grn",
          "grn-pending"
        );
      }

      if (newReqs.length > 0) {
        showBrowserNotification(
          "New Requisition",
          `${newReqs.length} new requisition${newReqs.length > 1 ? "s" : ""} awaiting approval`,
          "/dashboard/requisitions",
          "requisition-pending"
        );
      }

      if (newItems.length > 0) {
        showBrowserNotification(
          "New Item Request",
          `${newItems.length} new item creation request${newItems.length > 1 ? "s" : ""} awaiting approval`,
          "/dashboard/catalog",
          "item-request"
        );
      }

      // ── Save the current state so we don't re-notify ──────────────────
      // Keep previously-notified IDs that are still pending,
      // drop ones that have been resolved, add new ones
      function mergeForward(prevIds: string[], currIds: string[], newIds: string[]): string[] {
        const currSet = new Set(currIds);
        const kept = prevIds.filter((id) => currSet.has(id));
        return Array.from(new Set([...kept, ...newIds]));
      }

      saveState({
        stock: mergeForward(prev.stock, current.stock, newStock),
        grn: mergeForward(prev.grn, current.grn, newGrn),
        requisitions: mergeForward(prev.requisitions, current.requisitions, newReqs),
        items: mergeForward(prev.items, current.items, newItems),
      });
    }

    // Kick off immediately (with a small delay to let the layout settle)
    const initTimeout = setTimeout(checkAndNotify, 2000);

    // Then poll every 60 seconds (less aggressive)
    intervalRef.current = setInterval(checkAndNotify, 60000);

    return () => {
      clearTimeout(initTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}

// ── Browser notification helper ────────────────────────────────────────────

function showBrowserNotification(
  title: string,
  body: string,
  url: string,
  tag: string
) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  // Skip if a notification with the same tag is already shown
  if (document.hasFocus?.()) return; // don't notify if user is on the page

  try {
    const notification = new Notification(title, {
      body,
      icon: "/Logo.JPG",
      badge: "/Logo.JPG",
      tag,
      data: { url },
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = url;
      notification.close();
    };
  } catch {
    // Notifications may be blocked
  }
}
