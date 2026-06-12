-- Allow admins to update any profile row from Team & Roles
create policy "Admins can update all profiles"
  on public.profiles
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (true);
