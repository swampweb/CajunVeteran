-- CajunVeteran Colors / Filament inventory fields
-- Run in Supabase SQL editor so Active/Inactive, per-spool grams, totals, and low threshold save online.

alter table public.cv_colors
  add column if not exists status text default 'active',
  add column if not exists spool_grams jsonb default '[1000]'::jsonb,
  add column if not exists estimated_grams numeric default 1000,
  add column if not exists spools numeric default 1,
  add column if not exists low_grams numeric default 200,
  add column if not exists palette_color text,
  add column if not exists hex_color text,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz default now();

update public.cv_colors
set status = coalesce(status, 'active'),
    spool_grams = coalesce(spool_grams, '[1000]'::jsonb),
    estimated_grams = coalesce(estimated_grams, 1000),
    spools = coalesce(spools, 1),
    low_grams = coalesce(low_grams, 200)
where status is null or spool_grams is null or estimated_grams is null or spools is null or low_grams is null;
