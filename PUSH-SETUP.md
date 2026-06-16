# Web Push Notifications — Setup Guide

## What was added

| File | Purpose |
|------|---------|
| `public/sw.js` | Service Worker — receives push events, shows browser notifications |
| `lib/push.ts` | Client helpers — subscribe, save to DB, send via API |
| `lib/push-hooks.tsx` | React hooks — auto-subscribe on login, watch for new approvals |
| `app/api/push/send/route.ts` | API endpoint — sends push to stored subscriptions |
| `app/api/push/vapid/route.ts` | One-time utility — generates VAPID keys |
| `supabase/migrations/20260616_push_subscriptions.sql` | DB table for storing push subscriptions |
| `app/dashboard/layout.tsx` | Integrated push hooks into dashboard layout |

## How it works

1. **User visits /dashboard** → browser asks for notification permission
2. **User grants** → service worker registers + push subscription created
3. **Subscription saved** to `push_subscriptions` table in Supabase
4. **Approval watcher** polls every 30s for new pending items (stock, GRN, MR, items)
5. **New pending detected** → browser notification + web push sent to admins
6. **Admin clicks notification** → opens the relevant dashboard page

## Setup steps

### 1. Run the Supabase migration

Go to your Supabase Dashboard → SQL Editor → paste the contents of:
```
supabase/migrations/20260616_push_subscriptions.sql
```
Run it.

### 2. Install the web-push package

In your project directory:
```bash
npm install web-push
```

### 3. Generate VAPID keys

After deploying (or running `npm run dev`), visit:
```
https://your-vercel-url.com/api/push/vapid
```

This returns JSON with your keys:
```json
{
  "VAPID_PUBLIC_KEY": "...",
  "VAPID_PRIVATE_KEY": "..."
}
```

### 4. Set environment variables in Vercel

Go to Vercel → Your Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VAPID_PUBLIC_KEY` | (from step 3) |
| `VAPID_PRIVATE_KEY` | (from step 3) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | (same as VAPID_PUBLIC_KEY) |
| `SUPABASE_SERVICE_ROLE_KEY` | (your Supabase service role key — should already exist) |

### 5. Deploy

```bash
git add -A
git commit -m "feat: add web push notifications for approval alerts"
git push origin main
```

### 6. Test

1. Open your app in Chrome/Edge (Firefox also works)
2. Go to /dashboard
3. Accept the notification permission prompt
4. In another browser/profile, create a new requisition or stock adjustment
5. Within 30 seconds you should see a browser notification

## Notification types

| Trigger | Recipients | Destination |
|---------|-----------|-------------|
| Stock adjustment request submitted | All admins | /dashboard/stock/adjustments |
| GRN created (pending) | All users | /dashboard/grn |
| Requisition created (pending) | Admins, purchase managers | /dashboard/requisitions |
| Item creation request | Admins | /dashboard/catalog |

## Security notes

- Push subscriptions are scoped per-user with RLS
- The `/api/push/send` endpoint uses the Supabase service role key (server-side only)
- After generating VAPID keys, you should **delete** `app/api/push/vapid/route.ts` to prevent re-generation
