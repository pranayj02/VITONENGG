create table if not exists public.catalog_spec_options (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  field_key text not null,
  option_value text not null,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  unique (category, field_key, option_value)
);

alter table public.catalog_spec_options enable row level security;

create policy "Catalog spec options viewable by authenticated users"
  on public.catalog_spec_options for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert catalog spec options"
  on public.catalog_spec_options for insert with check (auth.role() = 'authenticated');

create policy "Admins can delete catalog spec options"
  on public.catalog_spec_options for delete using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create index if not exists idx_catalog_spec_options_lookup
  on public.catalog_spec_options (category, field_key, option_value);
