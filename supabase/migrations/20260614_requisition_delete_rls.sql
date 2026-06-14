-- Allow MR deletion for roles that manage requisitions

drop policy if exists "Requisitions deletable by creators or managers" on public.requisitions;

create policy "Requisitions deletable by creators or managers"
  on public.requisitions
  for delete
  using (
    requested_by = auth.uid()
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'purchase_manager', 'quality_assurance')
    )
  );
