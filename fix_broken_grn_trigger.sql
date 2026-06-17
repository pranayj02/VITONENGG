-- ============================================================
-- FIX: Find and drop broken GRN trigger that references 'v_name'
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: List all triggers on the grn table
select 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where tgrelid = 'public.grn'::regclass
  and not tgisinternal;

-- Step 2: Show the source code of any trigger function that references 'v_name'
-- (This will show the function body so we can identify the broken one)
select 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_source
from pg_proc p
where p.prosrc ilike '%v_name%'
  and p.proname like '%grn%';

-- Step 3: Drop ALL triggers on grn table (uncomment and run after reviewing above)
-- DO $$ 
-- DECLARE t record;
-- BEGIN
--   FOR t IN SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.grn'::regclass AND NOT tgisinternal LOOP
--     EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.grn', t.tgname);
--     RAISE NOTICE 'Dropped trigger: %', t.tgname;
--   END LOOP;
-- END $$;

-- Step 4: Create a CORRECT GRN activity trigger
-- (This one uses 'user_name' not 'v_name', matching the activity_logs schema)
create or replace function public.log_grn_activity()
returns trigger as $$
declare
  v_user_id uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  v_email text := (select email from auth.users where id = v_user_id);
  v_user_name text := (select full_name from public.profiles where id = v_user_id);
begin
  if TG_OP = 'INSERT' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_user_name, 'grn_created', 'grn', new.id, new.grn_number, jsonb_build_object('vendor_name', new.vendor_name, 'status', new.status, 'po_id', new.po_id));
    return new;
  elsif TG_OP = 'UPDATE' then
    insert into public.activity_logs (user_id, user_email, user_name, action, entity_type, entity_id, entity_code, details)
    values (v_user_id, v_email, v_user_name, 'grn_updated', 'grn', new.id, new.grn_number, jsonb_build_object('old_status', old.status, 'new_status', new.status, 'vendor_name', new.vendor_name));
    return new;
  elsif TG_OP = 'DELETE' then
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
      after insert or update or delete on public.grn
      for each row execute procedure public.log_grn_activity();
  end if;
end
$$;
