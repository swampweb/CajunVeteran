-- Run AFTER duplicate SKUs are cleaned up.
-- Prevents future duplicate print item SKUs.
create unique index if not exists cv_items_sku_unique
on public.cv_items (sku)
where sku is not null and sku <> '';
