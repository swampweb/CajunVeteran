-- CajunVeteran Print Item Pricing Columns
-- Run this in Supabase SQL editor if you want suggested pricing/components saved online.
-- The update will still save the item without these columns, but pricing data will fall back to browser localStorage until these are added.

alter table public.cv_items
  add column if not exists price_components jsonb default '[]'::jsonb,
  add column if not exists linked_items jsonb default '[]'::jsonb,
  add column if not exists filament_rate numeric default 0.02,
  add column if not exists machine_rate numeric default 0.75,
  add column if not exists markup_percent numeric default 100,
  add column if not exists round_to numeric default 0.50,
  add column if not exists suggested_price numeric default 0,
  add column if not exists total_grams numeric default 0,
  add column if not exists total_print_minutes numeric default 0,
  add column if not exists filament_cost numeric default 0,
  add column if not exists machine_cost numeric default 0,
  add column if not exists print_time text,
  add column if not exists weight text;
