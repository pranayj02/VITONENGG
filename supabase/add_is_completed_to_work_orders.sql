-- Run this in your Supabase SQL editor
-- Adds the is_completed boolean flag to work_orders

alter table work_orders
  add column if not exists is_completed boolean not null default false;

-- Optional: index for fast filtering
create index if not exists idx_work_orders_is_completed
  on work_orders (is_completed);
