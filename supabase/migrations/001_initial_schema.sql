-- Hard R Cycles: Unified Storefront & Flat Rate Panic Initial Schema
-- Project: szrkpwtavfzmnzctsixx

-- 1. Products Catalog
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  handle text unique not null,
  title text not null,
  collection text not null,
  rack_slot text not null check (rack_slot in ('rack_1_humor', 'rack_2_definition', 'wall_braap', 'parts_shelf', 'hard_r_originals')),
  department text not null check (department in ('APPAREL', 'PARTS')),
  checkout_mode text not null default 'shopify_link' check (checkout_mode in ('shopify_link', 'stripe_diy', 'stripe_pod')),
  external_url text,
  price_min numeric(10,2) not null check (price_min >= 0),
  price_max numeric(10,2) not null check (price_max >= price_min),
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  tags text[] not null default '{}',
  fit_notes text not null default '',
  image_url text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists products_active_rack_idx
  on public.products (active, department, rack_slot, sort_order);

grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;

alter table public.products enable row level security;

create policy "Public can view active products"
  on public.products
  for select
  to anon, authenticated
  using (active = true);

-- 2. Orders (Stripe-ready, strictly private / service-role only)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  customer_email text not null,
  shipping_name text,
  shipping_address jsonb,
  items jsonb not null,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  shipping_cost numeric(10,2) not null default 0 check (shipping_cost >= 0),
  total numeric(10,2) not null check (total >= 0),
  currency text not null default 'usd',
  fulfillment_mode text not null check (fulfillment_mode in ('diy', 'pod', 'hybrid')),
  status text not null default 'paid' check (status in ('paid', 'fulfilling', 'shipped', 'cancelled', 'refunded')),
  tracking_number text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.orders enable row level security;

-- 3. Repair Orders Leaderboard (Flat Rate Panic)
create table if not exists public.repair_orders (
  id uuid default gen_random_uuid() primary key,
  mechanic_name text not null,
  billed_hours numeric(5,2) not null,
  actual_hours numeric(5,2) not null,
  efficiency_rating numeric(5,2) not null,
  shop_damage_cost numeric(10,2) not null,
  rank_badge text not null default 'Shop Wrench',
  jobs_completed smallint not null default 4,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  constraint repair_orders_name_check check (char_length(btrim(mechanic_name)) between 1 and 24),
  constraint repair_orders_billed_check check (billed_hours > 0 and billed_hours <= 50),
  constraint repair_orders_actual_check check (actual_hours > 0 and actual_hours <= 100),
  constraint repair_orders_efficiency_check check (efficiency_rating between 0 and 300),
  constraint repair_orders_damage_check check (shop_damage_cost >= 0 and shop_damage_cost <= 100000),
  constraint repair_orders_jobs_check check (jobs_completed between 0 and 10),
  constraint repair_orders_badge_check check (char_length(btrim(rank_badge)) between 1 and 40)
);

create index if not exists repair_orders_leaderboard_idx
  on public.repair_orders (efficiency_rating desc, shop_damage_cost asc, created_at desc);

grant select, insert on public.repair_orders to anon, authenticated;

alter table public.repair_orders enable row level security;

create policy "Anyone can view leaderboard"
  on public.repair_orders
  for select
  to anon, authenticated
  using (true);

create policy "Validated inserts via API or anon"
  on public.repair_orders
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(mechanic_name)) between 1 and 24
    and billed_hours > 0
    and billed_hours <= 50
    and actual_hours > 0
    and actual_hours <= 100
    and efficiency_rating between 0 and 300
    and shop_damage_cost >= 0
    and shop_damage_cost <= 100000
    and jobs_completed between 0 and 10
    and char_length(btrim(rank_badge)) between 1 and 40
  );
