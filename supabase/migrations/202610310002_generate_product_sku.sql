alter table public.products
  alter column sku
  set default ('RL-' || upper(replace(gen_random_uuid()::text, '-', '')));