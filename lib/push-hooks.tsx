"use client";

// React hook that wires up Web Push + Supabase Realtime for approval alerts
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  subscribeToPush,
  saveSubscription,
  sendPushNotification,
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

      // Auto-request permission
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

// ── Realtime watcher for pending approvals ──────────────────────────────────
// Place this in DashboardLayout or a dedicated provider component.
// It watches Supabase tables for new pending items and shows browser notifications.

export function useApprovalWatcher() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countsRef = useRef({
    stock: 0,
    grn: 0,
    requisitions: 0,
    items: 0,
  });

  useEffect(() => {
    const supabase = createClient();

    async function checkAndNotify() {
      // Get current user & role
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = (profile as any)?.role;
      const isAdmin = role === "admin";

      // Only admins / managers need these alerts
      if (!isAdmin && role !== "purchase_manager" && role !== "quality_assurance")
        return;

      // Fetch counts
      const [stockRes, grnRes, reqRes, itemRes] = await Promise.all([
        supabase
          .from("stock_adjustment_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("grn")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "inspected"]),
        supabase
          .from("requisitions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("item_creation_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      const newCounts = {
        stock: stockRes.count ?? 0,
        grn: grnRes.count ?? 0,
        requisitions: reqRes.count ?? 0,
        items: itemRes.count ?? 0,
      };

      const prev = countsRef.current;

      // Detect new pending items
      if (newCounts.stock > prev.stock) {
        const diff = newCounts.stock - prev.stock;
        showBrowserNotification(
          "Stock Adjustment Request",
          `${diff} new stock adjustment${diff > 1 ? "s" : ""} awaiting approval`,
          "/dashboard/stock/adjustments",
          "stock-adjustment"
        );
        // Also try web push for specific users
        if (isAdmin) {
          sendPushNotification({
            title: "Stock Adjustment Request",
            body: `${diff} new stock adjustment${diff > 1 ? "s" : ""} awaiting approval`,
            url: "/dashboard/stock/adjustments",
            tag: "stock-adjustment",
          });
        }
      }

      if (newCounts.grn > prev.grn) {
        const diff = newCounts.grn - prev.grn;
        showBrowserNotification(
          "New GRN Pending",
          `${diff} GRN${diff > 1 ? "s" : ""} awaiting inspection/approval`,
          "/dashboard/grn",
          "grn-pending"
        );
        sendPushNotification({
          title: "New GRN Pending",
          body: `${diff} GRN${diff > 1 ? "s" : ""} awaiting inspection/approval`,
          url: "/dashboard/grn",
          tag: "grn-pending",
        });
      }

      if (newCounts.requisitions > prev.requisitions) {
        const diff = newCounts.requisitions - prev.requisitions;
        showBrowserNotification(
          "New Requisition",
          `${diff} requisition${diff > 1 ? "s" : ""} awaiting approval`,
          "/dashboard/requisitions",
          "requisition-pending"
        );
        sendPushNotification({
          title: "New Requisition",
          body: `${diff} requisition${diff > 1 ? "s" : ""} awaiting approval`,
          url: "/dashboard/requisitions",
          tag: "requisition-pending",
        });
      }

      if (newCounts.items > prev.items) {
        const diff = newCounts.items - prev.items;
        showBrowserNotification(
          "New Item Request",
          `${diff} item creation request${diff > 1 ? "s" : ""} awaiting approval`,
          "/dashboard/catalog",
          "item-request"
        );
        sendPushNotification({
          title: "New Item Request",
          body: `${diff} item creation request${diff > 1 ? "s" : ""} awaiting approval`,
          url: "/dashboard/catalog",
          tag: "item-request",
        });
      }

      countsRef.current = newCounts;
    }

    // Initial check
    checkAndNotify();

    // Poll every 30 seconds (simple and reliable for Vercel serverless)
    intervalRef.current = setInterval(checkAndNotify, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}

// ── Helper: show browser notification (works even without web push) ─────────

function showBrowserNotification(
  title: string,
  body: string,
  url: string,
  tag: string
) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

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
    // Notifications may be blocked by browser policy
  }
}
