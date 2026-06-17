-- Web Push Notifications: push_subscriptions table
-- Stores each user's browser push subscription for sending web push notifications

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

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- RLS: users can only manage their own subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can read all (for sending notifications)
CREATE POLICY "Service role can read all subscriptions"
  ON push_subscriptions FOR SELECT
  USING (true);
