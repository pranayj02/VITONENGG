create table if not exists public.item_creation_requests (
  id uuid default gen_random_uuid() primary key,
  item_payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid references auth.users,
  requested_by_name text,
  reviewed_by uuid references auth.users,
  reviewed_by_name text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.item_creation_requests enable row level security;

create policy "Item creation requests viewable by authenticated users"
  on public.item_creation_requests for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert item creation requests"
  on public.item_creation_requests for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update item creation requests"
  on public.item_creation_requests for update using (auth.role() = 'authenticated');

create index if not exists idx_item_creation_requests_status_created_at
  on public.item_creation_requests (status, created_at desc);
