-- Material Codes: links Material No. to the 12 specification fields
-- (excluding Size, which varies per order)

create table if not exists material_codes (
  id          uuid primary key default gen_random_uuid(),
  material_no text not null unique,
  valve       text,
  type        text,
  bore        text,
  rating      text,
  end_connection text,
  body_bonnet text,
  wedge_disc_plug_ball text,
  stem_hinge  text,
  seat        text,
  gasket      text,
  gl_pkng     text,
  fasteners   text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table material_codes enable row level security;

create policy "Anyone can read material_codes"
  on material_codes for select using (true);

create policy "Authenticated users can insert material_codes"
  on material_codes for insert with check (true);

create policy "Authenticated users can update material_codes"
  on material_codes for update using (true);

create policy "Authenticated users can delete material_codes"
  on material_codes for delete using (true);
