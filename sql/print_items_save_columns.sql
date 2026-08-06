-- Run this in Supabase SQL Editor if components, image thumbnail, or description are not persisting.
-- This stores pricing/components and model file metadata. It does NOT store the full 3MF file blob.
alter table public.cv_items
  add column if not exists description text,
  add column if not exists image_url text,
  add column if not exists price_components jsonb,
  add column if not exists linked_items jsonb,
  add column if not exists suggested_price numeric,
  add column if not exists total_grams numeric,
  add column if not exists total_print_minutes numeric,
  add column if not exists model_file_name text,
  add column if not exists model_file_type text;
