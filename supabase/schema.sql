create table if not exists public.ironminds_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"exercises":[],"plans":[],"workouts":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.ironminds_data enable row level security;
grant select,insert,update,delete on public.ironminds_data to authenticated;
drop policy if exists "ironminds_own" on public.ironminds_data;
create policy "ironminds_own" on public.ironminds_data for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  friend_code text not null unique,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
grant select,insert,update on public.profiles to authenticated;
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_own_insert" on public.profiles;
create policy "profiles_own_insert" on public.profiles for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
