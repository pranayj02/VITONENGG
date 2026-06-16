// ONE-TIME migration endpoint
// Visit this route ONCE after deploying to create the push_subscriptions table
// Then DELETE this file for security
//
// Requires SUPABASE_SERVICE_ROLE_KEY env var

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  // Only allow from localhost or your own domain (basic protection)
  const host = req.headers.get("host") || "";
  if (!host.includes("localhost") && !host.includes("vercel.app")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Run migration via Supabase SQL API (edge function / pgmeta)
  // Since Supabase REST doesn't support DDL, we use the management approach:
  // Execute via the postgres endpoint using the service role key

  const sql = `
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      keys_p256dh TEXT NOT NULL,
      keys_auth TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, endpoint)
    );

    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

    ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      -- Drop existing policies if they exist (idempotent)
      DROP POLICY IF EXISTS "Users can insert own subscriptions" ON push_subscriptions;
      DROP POLICY IF EXISTS "Users can update own subscriptions" ON push_subscriptions;
      DROP POLICY IF EXISTS "Users can delete own subscriptions" ON push_subscriptions;
      DROP POLICY IF EXISTS "Service role can read all subscriptions" ON push_subscriptions;
    END $$;

    CREATE POLICY "Users can insert own subscriptions"
      ON push_subscriptions FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own subscriptions"
      ON push_subscriptions FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own subscriptions"
      ON push_subscriptions FOR DELETE
      USING (auth.uid() = user_id);

    CREATE POLICY "Service role can read all subscriptions"
      ON push_subscriptions FOR SELECT
      USING (true);
  `;

  try {
    // Use Supabase's pgmeta REST API to execute raw SQL
    const pgmetaUrl = `${supabaseUrl}/rest/v1/`;
    const res = await fetch(`${pgmetaUrl}`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({}),
    });

    // pgmeta won't work for DDL via REST. Use Supabase Management API instead.
    // Extract project ref from URL
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

    if (!projectRef) {
      return NextResponse.json(
        {
          error: "Could not extract project ref from SUPABASE_URL",
          manual_sql: sql,
          instruction: "Paste this SQL into your Supabase Dashboard > SQL Editor and run it.",
        },
        { status: 200 }
      );
    }

    // Try the Supabase SQL endpoint (requires management API)
    const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });

    if (mgmtRes.ok) {
      const result = await mgmtRes.json();
      return NextResponse.json({
        success: true,
        message: "push_subscriptions table created successfully",
        result,
      });
    }

    // If management API fails, return SQL for manual execution
    return NextResponse.json({
      error: "Auto-migration failed via API. Please run this SQL manually in Supabase Dashboard > SQL Editor:",
      sql,
      instruction: "1. Go to https://app.supabase.com/project/" + projectRef + "/sql/new",
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      instruction: "Please run the migration SQL manually in Supabase Dashboard > SQL Editor",
      sql,
    });
  }
}
