-- 003_rewards_and_storage.sql
-- Adds server-issued Flat Rate Panic discount claims and public product-images storage bucket.

create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  repair_order_id uuid unique references public.repair_orders(id) on delete set null,
  mechanic_name text not null check (char_length(btrim(mechanic_name)) >= 1 and char_length(btrim(mechanic_name)) <= 24),
  efficiency_rating numeric(6,2) not null check (efficiency_rating >= 0 and efficiency_rating <= 300),
  discount_percent smallint not null check (discount_percent in (5, 10, 15)),
  promo_code text not null unique,
  stripe_coupon_id text,
  stripe_promo_id text,
  redeemed boolean not null default false,
  redeemed_order_id uuid references public.orders(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists reward_claims_created_idx
  on public.reward_claims (created_at desc);

create index if not exists reward_claims_redeemed_order_idx
  on public.reward_claims (redeemed_order_id);

alter table public.reward_claims enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'reward_claims'
      and policyname = 'Deny direct client access to reward_claims'
  ) then
    create policy "Deny direct client access to reward_claims"
      on public.reward_claims
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read product-images'
  ) then
    create policy "Public read product-images"
      on storage.objects
      for select
      to public
      using (bucket_id = 'product-images');
  end if;
end $$;
