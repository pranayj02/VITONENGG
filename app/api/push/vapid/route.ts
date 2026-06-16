// One-time utility: call this endpoint to generate VAPID keys
// Then set them as environment variables in Vercel
// DELETE this route after generating keys!

import { NextResponse } from "next/server";

export async function GET() {
  // Dynamically import web-push
  let webPush: typeof import("web-push");
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    webPush = require("web-push");
  } catch {
    return NextResponse.json(
      { error: "web-push not installed. Run: npm install web-push" },
      { status: 500 }
    );
  }

  const keys = webPush.generateVAPIDKeys();

  return NextResponse.json({
    message: "Add these to your Vercel Environment Variables:",
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: keys.publicKey,
    WARNING: "DELETE THIS FILE AFTER GENERATING KEYS!",
  });
}
