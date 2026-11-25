-- 006_orders_delivered_status.sql
-- Adds explicit 'delivered' order status to public.orders for NPC walk-in & order tracking checks.

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.orders
  add constraint orders_status_check
  check (status in ('paid', 'fulfilling', 'shipped', 'delivered', 'cancelled', 'refunded'));
