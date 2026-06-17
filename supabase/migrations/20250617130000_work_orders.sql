-- Work Orders tables for VITONENGG ERP
-- Created: 2025-06-17

-- ── Work Orders ─────────────────────────────────────────────────────────────

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  wo_number text not null unique,
  party_name text not null,
  delivery_date text,
  po_no text,
  po_date text,
  inspection_by text default 'NO',
  qap_no text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.work_orders is 'Work orders / manufacturing orders';

-- ── Work Order Items ────────────────────────────────────────────────────────

create table if not exists public.work_order_items (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  sr_no integer not null,
  po_sr_no text,
  valve_sr_no text,
  material_no text,
  valve text,
  type text,
  bore text,
  size_mm text,
  rating text,
  end_connection text,
  body_bonnet text,
  wedge_disc_plug_ball text,
  stem_hinge text,
  seat text,
  gasket text,
  gl_pkng text,
  fasteners text,
  operation text,
  special_requirements text,
  remarks text,
  drawing_no text,
  qty text,
  delivery text,
  created_at timestamptz default now()
);

comment on table public.work_order_items is 'Line items for work orders';

-- ── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists idx_work_orders_number on public.work_orders(wo_number);
create index if not exists idx_work_orders_party on public.work_orders(party_name);
create index if not exists idx_work_order_items_wo on public.work_order_items(work_order_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.work_orders enable row level security;
alter table public.work_order_items enable row level security;

-- Allow read for all authenticated users
create policy if not exists "Allow select work_orders" on public.work_orders
  for select to authenticated using (true);

create policy if not exists "Allow select work_order_items" on public.work_order_items
  for select to authenticated using (true);

-- Allow insert/update/delete for admins, purchase_managers, engineers
create policy if not exists "Allow insert work_orders" on public.work_orders
  for insert to authenticated with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'purchase_manager', 'engineer')
    )
  );

create policy if not exists "Allow update work_orders" on public.work_orders
  for update to authenticated using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'purchase_manager', 'engineer')
    )
  );

create policy if not exists "Allow delete work_orders" on public.work_orders
  for delete to authenticated using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'purchase_manager')
    )
  );

create policy if not exists "Allow insert work_order_items" on public.work_order_items
  for insert to authenticated with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'purchase_manager', 'engineer')
    )
  );

create policy if not exists "Allow update work_order_items" on public.work_order_items
  for update to authenticated using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'purchase_manager', 'engineer')
    )
  );

create policy if not exists "Allow delete work_order_items" on public.work_order_items
  for delete to authenticated using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'purchase_manager')
    )
  );
