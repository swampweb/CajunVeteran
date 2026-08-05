-- CajunVeteran Workshop V6 Update 05 required database adjustment
-- Allows each order line to store the selected/overridden colors for that specific line.
alter table public.cv_order_lines
add column if not exists colors jsonb default '[]'::jsonb;
