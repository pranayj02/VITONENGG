-- ============================================================
-- DIAGNOSE + FIX: 'v_name' error on activity_logs
-- Run ALL of this in Supabase SQL Editor
-- ============================================================

-- STEP 1: Show actual columns in activity_logs
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'activity_logs'
order by ordinal_position;

-- STEP 2: Show ALL triggers on ALL tables
select 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where not tgisinternal
order by tgrelid::regclass::text, tgname;

-- STEP 3: Show ALL functions that insert into activity_logs
select 
  p.proname as function_name,
  left(p.prosrc, 300) as source_preview
from pg_proc p
where p.prosrc ilike '%activity_logs%'
order by p.proname;

-- STEP 4: If activity_logs is missing 'user_name', add it
alter table public.activity_logs 
  add column if not exists user_name text;

-- STEP 5: Recreate the PO/Invoice triggers with correct variable names
-- (replacing 'v_name' with 'v_user_name' to avoid confusion)
create or replace function public.log_po_activity()
returns trigger as $$
declare
  v_user_id uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_email text := (select email from auth.users where id = v_user_id);
  v_user_name text := (select full_name from public.profiles where id = v_user_id);
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_user_name, 'po_created', 'purchase_order', new.id, new.po_number, jsonb_build_object('vendor_id', new.vendor_id, 'total', new.total, 'status', new.status));
    return new;
  elsif TG_OP = 'UPDATE' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_user_name, 'po_updated', 'purchase_order', new.id, new.po_number, jsonb_build_object('old_status', old.status, 'new_status', new.status, 'total', new.total));
    return new;
  elsif TG_OP = 'DELETE' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_user_name, 'po_deleted', 'purchase_order', old.id, old.po_number, '{}');
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create or replace function public.log_invoice_activity()
returns trigger as $$
declare
  v_user_id uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_email text := (select email from auth.users where id = v_user_id);
  v_user_name text := (select full_name from public.profiles where id = v_user_id);
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_user_name, 'invoice_created', 'invoice', new.id, new.invoice_number, jsonb_build_object('buyer', new.buyer_name, 'total', new.total, 'status', new.status));
    return new;
  elsif TG_OP = 'UPDATE' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_user_name, 'invoice_updated', 'invoice', new.id, new.invoice_number, jsonb_build_object('old_status', old.status, 'new_status', new.status, 'total', new.total));
    return new;
  elsif TG_OP = 'DELETE' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_user_name, 'invoice_deleted', 'invoice', old.id, old.invoice_number, '{}');
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- STEP 6: Add a GRN delete trigger too (so the API doesn't need to manually log)
create or replace function public.log_grn_activity()
returns trigger as $$
declare
  v_user_id uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_email text := (select email from auth.users where id = v_user_id);
  v_user_name text := (select full_name from public.profiles where id = v_user_id);
begin
  if TG_OP = 'DELETE' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_user_name, 'grn_deleted', 'grn', old.id, old.grn_number, '{}');
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'grn_activity_trigger') then
    create trigger grn_activity_trigger
      after delete on public.grn
      for each row execute procedure public.log_grn_activity();
  end if;
end
$$;

-- STEP 7: Remove manual activity log insert from the API
-- (The trigger now handles it automatically)
-- This means the Next.js API can simplify its code
