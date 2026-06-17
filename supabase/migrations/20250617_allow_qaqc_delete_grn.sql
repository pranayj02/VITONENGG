-- ============================================================
-- Migration: Allow quality_assurance to delete GRNs
-- Run this in Supabase SQL Editor
-- ============================================================

-- Update the GRN delete policy to include quality_assurance
drop policy if exists "Store keeper or admin can delete GRN" on public.grn;

create policy "Store keeper, admin, or QA can delete GRN"
  on public.grn for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','store_keeper','purchase_manager','quality_assurance'))
  );

-- Also update stock_ledger delete policy to include quality_assurance
drop policy if exists "Store keeper or admin can delete stock ledger" on public.stock_ledger;

create policy "Store keeper, admin, or QA can delete stock ledger"
  on public.stock_ledger for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','store_keeper','purchase_manager','quality_assurance'))
  );
