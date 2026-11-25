-- 005_phase2_memory_atlas_and_racks.sql
-- Phase 2 foundation: expand rack slots (keeping existing Motophile items intact),
-- extend SSO profiles, create customer_memory, visitor_pins, episode_knowledge,
-- and analytics_events with strict RLS.

-- 1. Expand public.products.rack_slot allowed values safely
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%rack_slot%'
  loop
    execute format('alter table public.products drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.products
  add constraint products_rack_slot_check check (
    rack_slot in (
      'rack_1_humor',
      'rack_2_definition',
      'wall_braap',
      'parts_shelf',
      'hard_r_originals',
      'motophile_partner',
      'episode_drops',
      'vip_secret_stash'
    )
  );

-- 2. Extend public.profiles with community/social preferences and visit count
alter table public.profiles
  add column if not exists social_handle text not null default '',
  add column if not exists atlas_visibility text not null default 'public',
  add column if not exists v_circle_opt_in boolean not null default false,
  add column if not exists visit_count integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_atlas_visibility_check'
  ) then
    alter table public.profiles
      add constraint profiles_atlas_visibility_check
      check (atlas_visibility in ('public', 'anonymized', 'hidden'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_visit_count_check'
  ) then
    alter table public.profiles
      add constraint profiles_visit_count_check
      check (visit_count >= 1);
  end if;
end $$;

update public.profiles
set visit_count = greatest(coalesce(visit_count, 1), coalesce(sign_in_count, 1), 1);

-- Preserve server-controlled visit_count on direct authenticated client updates
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('role', true) = 'authenticated' then
    new.role := old.role;
    new.notes := old.notes;
    new.email := old.email;
    new.visit_count := old.visit_count;
  end if;
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

revoke execute on function public.prevent_profile_role_escalation() from public, anon, authenticated;

-- 3. Customer Memory table (Dick / V / Scooter persistent recognition)
create table if not exists public.customer_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_orders integer not null default 0 check (total_orders >= 0),
  lifetime_spend numeric(10,2) not null default 0.00 check (lifetime_spend >= 0),
  purchased_skus text[] not null default '{}',
  last_order_date timestamptz,
  last_purchased_item text,
  diagnostic_count integer not null default 0 check (diagnostic_count >= 0),
  last_diagnosed_bike text,
  last_symptom text,
  flat_rate_high_score numeric(6,2) not null default 0 check (flat_rate_high_score >= 0 and flat_rate_high_score <= 300),
  loiter_kick_count integer not null default 0 check (loiter_kick_count >= 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

grant select on public.customer_memory to authenticated;
alter table public.customer_memory enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_memory'
      and policyname = 'Users can read own customer memory'
  ) then
    create policy "Users can read own customer memory"
      on public.customer_memory
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

insert into public.customer_memory (
  user_id,
  total_orders,
  lifetime_spend,
  last_order_date,
  last_purchased_item,
  flat_rate_high_score
)
select
  p.id,
  coalesce(ord.total_orders, 0),
  coalesce(ord.lifetime_spend, 0.00),
  ord.last_order_date,
  ord.last_purchased_item,
  coalesce(ro.high_score, 0)
from public.profiles p
left join lateral (
  select
    count(*)::integer as total_orders,
    coalesce(sum(o.total), 0.00)::numeric(10,2) as lifetime_spend,
    max(o.created_at) as last_order_date,
    (
      select (item ->> 'title')
      from public.orders o2,
           lateral jsonb_array_elements(o2.items) as item
      where (o2.user_id = p.id or lower(o2.customer_email) = lower(p.email))
        and o2.status in ('paid', 'fulfilling', 'shipped')
      order by o2.created_at desc
      limit 1
    ) as last_purchased_item
  from public.orders o
  where (o.user_id = p.id or lower(o.customer_email) = lower(p.email))
    and o.status in ('paid', 'fulfilling', 'shipped')
) ord on true
left join lateral (
  select coalesce(max(r.efficiency_rating), 0)::numeric(6,2) as high_score
  from public.repair_orders r
  where r.user_id = p.id
) ro on true
on conflict (user_id) do nothing;

-- 4. Visitor Pins table (Wave 2 Shop Wall Atlas / Guest Book, SSO-only)
create table if not exists public.visitor_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous Rider',
  city text not null default 'Unknown',
  region text not null default 'Unknown',
  country text not null default 'US',
  lat_approx numeric(8,4) not null,
  lng_approx numeric(8,4) not null,
  visit_count integer not null default 1 check (visit_count >= 1),
  favorite_bike text not null default 'Custom Chopper',
  visibility text not null default 'public' check (visibility in ('public', 'anonymized', 'hidden')),
  first_seen_at timestamptz not null default timezone('utc'::text, now()),
  last_seen_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_visitor_pins_coords
  on public.visitor_pins (lat_approx, lng_approx);
create index if not exists idx_visitor_pins_last_seen
  on public.visitor_pins (last_seen_at desc);
create index if not exists idx_visitor_pins_visible
  on public.visitor_pins (last_seen_at desc)
  where visibility <> 'hidden';

grant select on public.visitor_pins to authenticated;
alter table public.visitor_pins enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'visitor_pins'
      and policyname = 'Users can read own visitor pin'
  ) then
    create policy "Users can read own visitor pin"
      on public.visitor_pins
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

-- 5. Episode Knowledge table (Wave 5 cartoon lore & SKU zero-API NPC sync)
create table if not exists public.episode_knowledge (
  id uuid primary key default gen_random_uuid(),
  episode_id text unique not null,
  slug text unique not null,
  title text not null,
  character_appearances text[] not null default '{}',
  summary text not null,
  catchphrases text[] not null default '{}',
  keywords text[] not null default '{}',
  associated_sku text,
  winning_writers text[] not null default '{}',
  video_url text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_episode_knowledge_created_at
  on public.episode_knowledge (created_at desc);

grant select on public.episode_knowledge to anon, authenticated;
alter table public.episode_knowledge enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'episode_knowledge'
      and policyname = 'Public can read episode knowledge'
  ) then
    create policy "Public can read episode knowledge"
      on public.episode_knowledge
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- 6. Analytics Events table (activates Wave 0 /api/events collector, strictly server-role write)
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_analytics_events_name_created
  on public.analytics_events (event_name, created_at desc);
create index if not exists idx_analytics_events_user_id
  on public.analytics_events (user_id)
  where user_id is not null;

alter table public.analytics_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'analytics_events'
      and policyname = 'Deny direct client access to analytics_events'
  ) then
    create policy "Deny direct client access to analytics_events"
      on public.analytics_events
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;
