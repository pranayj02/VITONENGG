-- ============================================================
-- Fix: explicit GRN approval sequence
--   pending -> under_review (sent for inspection) -> inspected -> approved
--   (rejected / partial reachable from under_review / inspected)
--
-- This migration:
--   1. Ensures all inspection/approval metadata columns exist on public.grn
--      (the original 20250607000001_erp_system.sql migration defines them,
--      but the live database was missing `approved_at`, which is why the
--      app had stopped writing it — see commit "fix: stop writing missing
--      approved_at column when approving GRN inspection").
--   2. Widens the `status` check constraint to add 'under_review' so a GRN
--      can sit in an explicit "sent for inspection" state before QAQC marks
--      it as inspected.
-- ============================================================

-- 1. Make sure every column the app expects actually exists.
alter table public.grn add column if not exists inspected_by uuid references auth.users;
alter table public.grn add column if not exists inspected_by_name text;
alter table public.grn add column if not exists approved_by uuid references auth.users;
alter table public.grn add column if not exists approved_by_name text;
alter table public.grn add column if not exists approved_at timestamptz;

-- 2. Replace the status check constraint to include 'under_review'.
-- We don't assume the constraint's name (it may differ from Postgres's
-- default `grn_status_check` if it was ever renamed) — find any CHECK
-- constraint on public.grn that references the `status` column and drop it
-- before adding the widened one.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'grn'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.grn drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.grn
  add constraint grn_status_check
  check (status in ('pending', 'under_review', 'inspected', 'approved', 'rejected', 'partial'));
