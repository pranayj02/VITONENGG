-- Run this in your Supabase SQL Editor
-- Adds is_completed to work_order_items for item-level completion tracking

alter table work_order_items
  add column if not exists is_completed boolean not null default false;

create index if not exists idx_work_order_items_is_completed
  on work_order_items (is_completed);
