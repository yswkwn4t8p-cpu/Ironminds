create table if not exists public.ironminds_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"exercises":[],"plans":[],"workouts":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.ironminds_data enable row level security;
grant select,insert,update,delete on public.ironminds_data to authenticated;
drop policy if exists "ironminds_own" on public.ironminds_data;
create policy "ironminds_own" on public.ironminds_data
for all to authenticated
using (auth.uid()=user_id)
with check (auth.uid()=user_id);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  friend_code text not null unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
grant select,insert,update on public.profiles to authenticated;
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  receiver_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  unique(sender_id,receiver_id)
);
alter table public.friend_requests enable row level security;
grant select,insert,update,delete on public.friend_requests to authenticated;
drop policy if exists "friend_requests_participant" on public.friend_requests;
create policy "friend_requests_participant" on public.friend_requests
for select to authenticated using (auth.uid()=sender_id or auth.uid()=receiver_id);
drop policy if exists "friend_requests_sender_insert" on public.friend_requests;
create policy "friend_requests_sender_insert" on public.friend_requests
for insert to authenticated with check (auth.uid()=sender_id);
drop policy if exists "friend_requests_receiver_update" on public.friend_requests;
create policy "friend_requests_receiver_update" on public.friend_requests
for update to authenticated using (auth.uid()=receiver_id);
drop policy if exists "friend_requests_participant_delete" on public.friend_requests;
create policy "friend_requests_participant_delete" on public.friend_requests
for delete to authenticated using (auth.uid()=sender_id or auth.uid()=receiver_id);

create table if not exists public.shared_workouts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id) on delete cascade,
  recipient_id uuid not null references public.profiles(user_id) on delete cascade,
  workout jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.shared_workouts enable row level security;
grant select,insert,delete on public.shared_workouts to authenticated;
drop policy if exists "shared_workouts_participant" on public.shared_workouts;
create policy "shared_workouts_participant" on public.shared_workouts
for select to authenticated using (auth.uid()=owner_id or auth.uid()=recipient_id);
drop policy if exists "shared_workouts_owner_insert" on public.shared_workouts;
create policy "shared_workouts_owner_insert" on public.shared_workouts
for insert to authenticated with check (auth.uid()=owner_id);
drop policy if exists "shared_workouts_participant_delete" on public.shared_workouts;
create policy "shared_workouts_participant_delete" on public.shared_workouts
for delete to authenticated using (auth.uid()=owner_id or auth.uid()=recipient_id);
