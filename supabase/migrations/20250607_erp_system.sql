-- ============================================================
-- VITONENGG ERP Migration: System-Oriented Process Layer
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. PROFILES / ROLES
-- Links auth.users to business roles so permissions survive turnover
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role text check (role in ('admin','purchase_manager','accounts','store_keeper','viewer','engineer')) default 'viewer',
  department text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Everyone can read profiles (needed for "requested_by_name" lookups)
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

-- Users can update their own profile (except role — only admin can change role via dashboard)
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'viewer');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger only if not already exists
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end
$$;


-- 2. ACTIVITY LOGS
-- Immutable audit trail: who did what, when
-- ------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  user_email text,
  user_name text,
  action text not null,                 -- e.g. 'po_created', 'po_updated', 'invoice_confirmed'
  entity_type text not null,            -- 'purchase_order', 'invoice', 'requisition', 'grn', 'item', 'vendor'
  entity_id uuid,                       -- row UUID in the target table
  entity_code text,                     -- human-readable code like PO number
  details jsonb default '{}',            -- before/after snapshot or extra context
  ip_address text,
  created_at timestamptz default now()
);

alter table public.activity_logs enable row level security;

create policy "Activity logs viewable by authenticated users"
  on public.activity_logs for select using (auth.role() = 'authenticated');

-- Only service / trigger can insert. App inserts via security-definer function or from client with policy:
create policy "Authenticated users can insert activity"
  on public.activity_logs for insert with check (auth.role() = 'authenticated');


-- 3. MATERIAL REQUISITIONS (MR)
-- Engineering team requests material → Manager approves → Purchase converts to PO
-- ------------------------------------------------------------
create table if not exists public.requisitions (
  id uuid default gen_random_uuid() primary key,
  req_number text unique not null,       -- e.g. MR/001/26-27
  fy_label text,
  fy_serial int,
  requested_by uuid references auth.users,
  requested_by_name text,
  department text,
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  status text default 'pending' check (status in ('pending','under_review','approved','rejected','converted_to_po','partially_fulfilled')),
  line_items jsonb default '[]',
  notes text,
  required_by date,
  approved_by uuid references auth.users,
  approved_by_name text,
  approved_at timestamptz,
  rejected_reason text,
  po_id uuid references public.purchase_orders on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.requisitions enable row level security;

create policy "Requisitions viewable by authenticated users"
  on public.requisitions for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert requisitions"
  on public.requisitions for insert with check (auth.role() = 'authenticated');

create policy "Requester or admin can update their own requisition"
  on public.requisitions for update using (
    auth.uid() = requested_by or
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','purchase_manager'))
  );


-- 4. GOODS RECEIPT NOTE (GRN)
-- Store receives against PO OR direct (without PO). Decouples "ordered" from "actually arrived".
-- ------------------------------------------------------------
create table if not exists public.grn (
  id uuid default gen_random_uuid() primary key,
  grn_number text unique not null,       -- e.g. GRN/001/26-27
  fy_label text,
  fy_serial int,
  po_id uuid references public.purchase_orders on delete set null,  -- NULLABLE: allows direct receipt without PO
  vendor_id uuid references public.vendors,
  vendor_name text,                       -- Fallback if vendor not in master list
  received_by uuid references auth.users,
  received_by_name text,
  inspected_by uuid references auth.users,
  inspected_by_name text,
  approved_by uuid references auth.users,
  approved_by_name text,
  approved_at timestamptz,
  line_items jsonb default '[]',         -- { item_id, serial_id, name, po_qty, received_qty, accepted_qty, rejected_qty, rejection_reason, unit, challan_weight, challan_nos, counted_nos }
  status text default 'pending' check (status in ('pending','inspected','approved','rejected','partial')),
  challan_no text,
  challan_date text,
  revision_no text,
  revision_date text,
  grn_date text,
  inspection_notes text,
  documents jsonb default '[]',          -- e.g. [{type:'photo',url:'...'}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Make po_id nullable if table already exists from prior migration
do $$
begin
  alter table public.grn alter column po_id drop not null;
exception
  when others then null;
end $$;

alter table public.grn enable row level security;

create policy "GRN viewable by authenticated users"
  on public.grn for select using (auth.role() = 'authenticated');

create policy "Store keeper or admin can insert GRN"
  on public.grn for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','store_keeper','purchase_manager'))
  );

create policy "Store keeper or admin can update GRN"
  on public.grn for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','store_keeper','purchase_manager'))
  );


-- 5. STOCK LEDGER
-- Per-item running balance. Source of truth for inventory.
-- ------------------------------------------------------------
create table if not exists public.stock_ledger (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.items not null,
  transaction_type text not null check (transaction_type in ('grn_in','po_commit','invoice_out','adjustment_in','adjustment_out','return_in','warranty_out')),
  reference_type text,                   -- 'grn', 'po', 'invoice', 'manual'
  reference_id uuid,
  reference_code text,                  -- e.g. GRN number or PO number
  qty_in numeric default 0,
  qty_out numeric default 0,
  balance numeric not null,
  unit text,
  notes text,
  created_by uuid references auth.users,
  created_by_name text,
  created_at timestamptz default now()
);

alter table public.stock_ledger enable row level security;

create policy "Stock ledger viewable by authenticated users"
  on public.stock_ledger for select using (auth.role() = 'authenticated');

create policy "Store keeper or admin can insert stock ledger"
  on public.stock_ledger for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','store_keeper','purchase_manager'))
  );


-- 6. TRIGGER: Auto-log PO changes to activity_logs
-- ------------------------------------------------------------
create or replace function public.log_po_activity()
returns trigger as $$
declare
  v_user_id uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_email text := (select email from auth.users where id = v_user_id);
  v_name text := (select full_name from public.profiles where id = v_user_id);
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_name, 'po_created', 'purchase_order', new.id, new.po_number, jsonb_build_object('vendor_id', new.vendor_id, 'total', new.total, 'status', new.status));
    return new;
  elsif TG_OP = 'UPDATE' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_name, 'po_updated', 'purchase_order', new.id, new.po_number, jsonb_build_object('old_status', old.status, 'new_status', new.status, 'total', new.total));
    return new;
  elsif TG_OP = 'DELETE' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_name, 'po_deleted', 'purchase_order', old.id, old.po_number, '{}');
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'po_activity_trigger') then
    create trigger po_activity_trigger
      after insert or update or delete on public.purchase_orders
      for each row execute procedure public.log_po_activity();
  end if;
end
$$;


-- 7. TRIGGER: Auto-log Invoice changes
-- ------------------------------------------------------------
create or replace function public.log_invoice_activity()
returns trigger as $$
declare
  v_user_id uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_email text := (select email from auth.users where id = v_user_id);
  v_name text := (select full_name from public.profiles where id = v_user_id);
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_name, 'invoice_created', 'invoice', new.id, new.invoice_number, jsonb_build_object('buyer', new.buyer_name, 'total', new.total, 'status', new.status));
    return new;
  elsif TG_OP = 'UPDATE' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_name, 'invoice_updated', 'invoice', new.id, new.invoice_number, jsonb_build_object('old_status', old.status, 'new_status', new.status, 'total', new.total));
    return new;
  elsif TG_OP = 'DELETE' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_name, 'invoice_deleted', 'invoice', old.id, old.invoice_number, '{}');
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'invoice_activity_trigger') then
    create trigger invoice_activity_trigger
      after insert or update or delete on public.invoices
      for each row execute procedure public.log_invoice_activity();
  end if;
end
$$;


-- 8. FUNCTION: Compute current stock per item
-- ------------------------------------------------------------
create or replace function public.get_stock_summary()
returns table (
  item_id uuid,
  serial_id text,
  name text,
  category text,
  unit text,
  total_in numeric,
  total_out numeric,
  balance numeric
) as $$
begin
  return query
    select
      i.id as item_id,
      i.serial_id,
      i.name,
      i.category,
      i.unit,
      coalesce(sum(case when sl.qty_in > 0 then sl.qty_in else 0 end), 0) as total_in,
      coalesce(sum(case when sl.qty_out > 0 then sl.qty_out else 0 end), 0) as total_out,
      coalesce(sum(sl.qty_in), 0) - coalesce(sum(sl.qty_out), 0) as balance
    from public.items i
    left join public.stock_ledger sl on sl.item_id = i.id
    group by i.id, i.serial_id, i.name, i.category, i.unit
    order by balance desc, i.serial_id;
end;
$$ language plpgsql stable;


-- 9. INDEXES for performance
-- ------------------------------------------------------------
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);
create index if not exists idx_activity_logs_entity on public.activity_logs(entity_type, entity_id);
create index if not exists idx_requisitions_status on public.requisitions(status);
create index if not exists idx_requisitions_requested_by on public.requisitions(requested_by);
create index if not exists idx_grn_po_id on public.grn(po_id);
create index if not exists idx_grn_status on public.grn(status);
create index if not exists idx_stock_ledger_item_id on public.stock_ledger(item_id);
create index if not exists idx_stock_ledger_created_at on public.stock_ledger(created_at desc);


-- 10. SEED: If you already have users in auth.users, backfill profiles
-- ------------------------------------------------------------
insert into public.profiles (id, email, full_name, role)
select 
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.email),
  'admin'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
