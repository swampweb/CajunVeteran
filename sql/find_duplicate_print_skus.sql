-- Find duplicate print item SKUs in cv_items.
select sku, count(*) as duplicate_count, array_agg(id order by updated_at desc nulls last, id desc) as row_ids
from public.cv_items
where sku is not null
  and sku <> ''
group by sku
having count(*) > 1
order by duplicate_count desc, sku;
