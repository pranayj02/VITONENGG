-- Update GRN RLS to match current QA-driven workflow

drop policy if exists "Store keeper or admin can insert GRN" on public.grn;
drop policy if exists "Store keeper or admin can update GRN" on public.grn;
drop policy if exists "Store keeper or admin can delete GRN" on public.grn;

create policy "QA can insert GRN"
  on public.grn
  for insert
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'quality_assurance')
    )
  );

create policy "QA can update GRN"
  on public.grn
  for update
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'quality_assurance', 'purchase_manager')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'quality_assurance', 'purchase_manager')
    )
  );

create policy "QA can delete GRN"
  on public.grn
  for delete
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('admin', 'quality_assurance')
    )
  );
