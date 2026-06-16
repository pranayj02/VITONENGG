// Server-side API route: sends web push notifications via the Web Push Protocol
// Requires: npm install web-push
// Deploy on Vercel — works with serverless functions

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Dynamically import web-push to avoid build-time issues
let webPush: typeof import("web-push") | null = null;

function getWebPush() {
  if (!webPush) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    webPush = require("web-push");
  }
  return webPush;
}

// Set VAPID keys (from env or generate once)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars." },
      { status: 500 }
    );
  }

  const wp = getWebPush();
  wp.setVapidDetails(
    "mailto:admin@vitonengg.com",
    vapidPublicKey,
    vapidPrivateKey
  );

  const body = await req.json();
  const { userIds, title, body: msgBody, url = "/dashboard", tag = "viton-notification", type = "general", requireInteraction = false } = body;

  // Fetch subscriptions from DB
  let query = supabase.from("push_subscriptions").select("*");

  if (userIds && userIds.length > 0) {
    query = query.in("user_id", userIds);
  } else {
    // Default: send to all admins
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");
    const adminIds = (adminProfiles ?? []).map((p: any) => p.id);
    if (adminIds.length > 0) {
      query = query.in("user_id", adminIds);
    } else {
      return NextResponse.json({ sent: 0, reason: "No admins found" });
    }
  }

  const { data: subscriptions, error } = await query;
  if (error) {
    console.error("[Push] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, reason: "No subscriptions found" });
  }

  const payload = JSON.stringify({
    title,
    body: msgBody,
    url,
    tag,
    type,
    requireInteraction,
    actions: [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  });

  const sendPromises = subscriptions.map(async (sub: any) => {
    const subscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys_p256dh,
        auth: sub.keys_auth,
      },
    };

    try {
      await wp.sendNotification(subscription, payload);
      return { endpoint: sub.endpoint, status: "sent" };
    } catch (err: any) {
      // Subscription may have expired — clean it up
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
        return { endpoint: sub.endpoint, status: "expired-removed" };
      }
      console.error("[Push] Send failed for", sub.endpoint, err.message);
      return { endpoint: sub.endpoint, status: "failed", error: err.message };
    }
  });

  const results = await Promise.all(sendPromises);
  const sent = results.filter((r) => r.status === "sent").length;

  return NextResponse.json({ sent, total: results.length, results });
}
