-- WO Autocomplete: stores previously entered field values globally
-- so suggestions appear across accounts and devices.

create table if not exists wo_autocomplete (
  id          uuid primary key default gen_random_uuid(),
  field_key   text not null,
  value       text not null,
  use_count   integer not null default 1,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (field_key, value)
);

-- Index for fast prefix search
create index if not exists idx_wo_autocomplete_field_value
  on wo_autocomplete (field_key, value text_pattern_ops);

-- Allow anyone (authenticated or anonymous) to read suggestions
alter table wo_autocomplete enable row level security;

create policy "Anyone can read autocomplete"
  on wo_autocomplete for select
  using (true);

-- Allow any authenticated user to insert/update
create policy "Authenticated users can insert autocomplete"
  on wo_autocomplete for insert
  with check (true);

create policy "Authenticated users can update autocomplete"
  on wo_autocomplete for update
  using (true);
