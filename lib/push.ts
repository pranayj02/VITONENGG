// Client-side Web Push helpers — VITON ERP
// Uses the browser's native Push API (no extra package needed on client)

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// ── Service Worker registration ─────────────────────────────────────────────

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("[Push] Service Worker not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    console.log("[Push] Service Worker registered:", registration.scope);
    return registration;
  } catch (err) {
    console.error("[Push] Service Worker registration failed:", err);
    return null;
  }
}

// ── Push subscription ───────────────────────────────────────────────────────

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const registration = await registerServiceWorker();
  if (!registration) return null;

  // Check existing subscription
  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    console.log("[Push] Already subscribed");
    return subscription;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn("[Push] VAPID public key not configured");
    return null;
  }

  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    console.log("[Push] New subscription created");
    return subscription;
  } catch (err) {
    console.error("[Push] Subscription failed:", err);
    return null;
  }
}

// ── Save subscription to Supabase ───────────────────────────────────────────

export async function saveSubscription(
  supabase: any,
  subscription: PushSubscription
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const json = subscription.toJSON() as PushSubscriptionJSON;

  // Upsert to avoid duplicates
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      keys_p256dh: json.keys.p256dh,
      keys_auth: json.keys.auth,
    },
    {
      onConflict: "user_id,endpoint",
    }
  );

  if (error) {
    console.error("[Push] Failed to save subscription:", error);
  } else {
    console.log("[Push] Subscription saved to DB");
  }
}

// ── Send a push notification via our API route ──────────────────────────────

export async function sendPushNotification(opts: {
  userIds?: string[]; // send to specific users; omit to broadcast to all admins
  title: string;
  body: string;
  url?: string;
  tag?: string;
  type?: string;
  requireInteraction?: boolean;
}) {
  try {
    const res = await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("[Push] Send failed:", err);
    } else {
      console.log("[Push] Notification sent");
    }
  } catch (err) {
    console.error("[Push] Send error:", err);
  }
}

// ── Utility: convert VAPID base64 key to Uint8Array ─────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Check if notifications are supported & granted ──────────────────────────

export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Notifications API available (local browser notifications, no push needed) */
export function isNotificationSupported(): boolean {
  return typeof Notification !== "undefined" &&
    "Notification" in window &&
    typeof Notification.requestPermission === "function";
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}
