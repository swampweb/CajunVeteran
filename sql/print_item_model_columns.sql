-- Optional columns for saving 3D model file attachment data on print items.
-- Run this if 3MF/STL/OBJ files do not persist after saving.
alter table public.cv_items
  add column if not exists model_file_name text,
  add column if not exists model_file_type text,
  add column if not exists model_file_data text;
