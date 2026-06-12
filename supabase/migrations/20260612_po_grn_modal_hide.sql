-- Allow GRN workflow roles to hide POs from the GRN modal by updating dispatch_meta
create policy "QA and PM can update purchase orders for GRN modal"
  on public.purchase_orders
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'purchase_manager', 'quality_assurance')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'purchase_manager', 'quality_assurance')
    )
  );
