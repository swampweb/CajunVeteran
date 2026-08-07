-- Optional cleanup: delete duplicate cv_items rows and keep the newest row per SKU.
-- Review find_duplicate_print_skus.sql before running this.
with ranked as (
  select id, sku,
         row_number() over (
           partition by sku
           order by updated_at desc nulls last, created_at desc nulls last, id desc
         ) as rn
  from public.cv_items
  where sku is not null
    and sku <> ''
)
delete from public.cv_items
where id in (select id from ranked where rn > 1);
