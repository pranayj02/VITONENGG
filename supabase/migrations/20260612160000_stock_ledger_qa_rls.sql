-- Update stock_ledger RLS to allow QA-driven GRN approval flow

drop policy if exists "Store keeper or admin can insert stock ledger" on public.stock_ledger;
drop policy if exists "Store keeper or admin can delete stock ledger" on public.stock_ledger;

create policy "QA can insert stock ledger"
  on public.stock_ledger
  for insert
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'purchase_manager', 'store_keeper', 'quality_assurance')
    )
  );

create policy "QA can delete stock ledger"
  on public.stock_ledger
  for delete
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'purchase_manager', 'store_keeper', 'quality_assurance')
    )
  );
