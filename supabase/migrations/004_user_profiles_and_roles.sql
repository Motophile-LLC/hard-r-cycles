-- 004_user_profiles_and_roles.sql
-- Adds customer/admin profiles, OAuth provider metadata, saved garage bikes,
-- shipping defaults, and user_id links across orders, repair_orders, and reward_claims.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  display_name text not null default '',
  mechanic_handle text not null default '',
  avatar_url text,
  auth_provider text not null default 'email',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  phone text not null default '',
  shirt_size text not null default '',
  default_shipping_address jsonb,
  garage_bikes jsonb not null default '[]'::jsonb,
  marketing_opt_in boolean not null default false,
  notes text not null default '',
  sign_in_count integer not null default 1 check (sign_in_count >= 1),
  last_seen_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can read own profile'
  ) then
    create policy "Users can read own profile"
      on public.profiles
      for select
      to authenticated
      using ((select auth.uid()) = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can update own non-privileged profile fields'
  ) then
    create policy "Users can update own non-privileged profile fields"
      on public.profiles
      for update
      to authenticated
      using ((select auth.uid()) = id)
      with check ((select auth.uid()) = id);
  end if;
end $$;

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
  end if;
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_prevent_profile_role_escalation'
  ) then
    create trigger trg_prevent_profile_role_escalation
      before update on public.profiles
      for each row
      execute function public.prevent_profile_role_escalation();
  end if;
end $$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_full_name text;
  v_avatar text;
  v_provider text;
  v_handle text;
begin
  v_email := lower(coalesce(new.email, ''));
  v_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  );
  v_avatar := coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture',
    null
  );
  v_provider := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  v_handle := nullif(trim(split_part(v_full_name, ' ', 1)), '');
  if v_handle is null then
    v_handle := nullif(trim(split_part(v_email, '@', 1)), '');
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    display_name,
    mechanic_handle,
    avatar_url,
    auth_provider,
    role
  )
  values (
    new.id,
    v_email,
    v_full_name,
    coalesce(nullif(trim(v_full_name), ''), split_part(v_email, '@', 1)),
    left(coalesce(v_handle, 'Wrench'), 24),
    v_avatar,
    v_provider,
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created_profile'
  ) then
    create trigger on_auth_user_created_profile
      after insert on auth.users
      for each row
      execute function public.handle_new_auth_user();
  end if;
end $$;

-- Backfill any existing auth.users rows safely
insert into public.profiles (
  id,
  email,
  full_name,
  display_name,
  mechanic_handle,
  avatar_url,
  auth_provider,
  role
)
select
  u.id,
  lower(coalesce(u.email, '')),
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''),
  coalesce(
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ''),
    split_part(lower(coalesce(u.email, '')), '@', 1)
  ),
  left(
    coalesce(
      nullif(trim(split_part(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), ' ', 1)), ''),
      nullif(trim(split_part(lower(coalesce(u.email, '')), '@', 1)), ''),
      'Wrench'
    ),
    24
  ),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', null),
  coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
  'customer'
from auth.users u
on conflict (id) do nothing;

-- Link orders, repair_orders, and reward_claims to signed-in users
alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_user_id_idx on public.orders (user_id);

alter table public.repair_orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists repair_orders_user_id_idx on public.repair_orders (user_id);

alter table public.reward_claims
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists reward_claims_user_id_idx on public.reward_claims (user_id);

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.prevent_profile_role_escalation() from public, anon, authenticated;
