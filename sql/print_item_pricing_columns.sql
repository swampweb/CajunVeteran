alter table public.cv_items
  add column if not exists price_components jsonb default '[]'::jsonb,
  add column if not exists linked_items jsonb default '[]'::jsonb,
  add column if not exists suggested_price numeric default 0,
  add column if not exists total_grams numeric default 0,
  add column if not exists total_print_minutes numeric default 0,
  add column if not exists filament_cost numeric default 0,
  add column if not exists machine_cost numeric default 0,
  add column if not exists print_time text,
  add column if not exists weight text;
