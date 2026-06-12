-- stock_adjustment_requests
-- Holds pending manual stock adjustment requests from non-admin users.
-- Admins review these and apply them to stock_ledger upon approval.

create table if not exists public.stock_adjustment_requests (
  id                  uuid primary key default gen_random_uuid(),
  item_id             uuid not null references public.items(id) on delete cascade,
  item_serial_id      text not null,
  item_name           text not null,
  item_unit           text not null,
  adjustment_type     text not null check (adjustment_type in ('adjustment_in', 'adjustment_out')),
  qty                 integer not null check (qty > 0),
  balance_at_request  integer not null default 0,
  notes               text,
  status              text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by        uuid references auth.users(id) on delete set null,
  requested_by_name   text,
  reviewed_by         uuid references auth.users(id) on delete set null,
  reviewed_by_name    text,
  reviewed_at         timestamptz,
  review_note         text,
  created_at          timestamptz not null default now()
);

-- Index for the admin approval queue (pending requests, newest first)
create index if not exists idx_stock_adj_requests_status
  on public.stock_adjustment_requests (status, created_at desc);

-- RLS: authenticated users can insert their own requests
alter table public.stock_adjustment_requests enable row level security;

create policy "Users can submit adjustment requests"
  on public.stock_adjustment_requests for insert
  to authenticated
  with check (requested_by = auth.uid());

create policy "Users can view their own requests"
  on public.stock_adjustment_requests for select
  to authenticated
  using (
    requested_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Only admins can update requests"
  on public.stock_adjustment_requests for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
