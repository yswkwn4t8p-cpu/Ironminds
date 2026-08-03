create table if not exists public.ironminds_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"exercises":[],"plans":[],"workouts":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.ironminds_data enable row level security;
revoke all on table public.ironminds_data from anon;
grant select,insert,update,delete on table public.ironminds_data to authenticated;
drop policy if exists "ironminds_select_own" on public.ironminds_data;
create policy "ironminds_select_own" on public.ironminds_data for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "ironminds_insert_own" on public.ironminds_data;
create policy "ironminds_insert_own" on public.ironminds_data for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "ironminds_update_own" on public.ironminds_data;
create policy "ironminds_update_own" on public.ironminds_data for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "ironminds_delete_own" on public.ironminds_data;
create policy "ironminds_delete_own" on public.ironminds_data for delete to authenticated using ((select auth.uid())=user_id);
create index if not exists ironminds_data_updated_at_idx on public.ironminds_data(updated_at desc);


create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Ironminds',
  friend_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  receiver_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null check (status in ('pending','accepted','rejected')) default 'pending',
  created_at timestamptz not null default now(),
  unique(sender_id, receiver_id)
);

create table if not exists public.shared_workouts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id) on delete cascade,
  recipient_id uuid not null references public.profiles(user_id) on delete cascade,
  workout jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.shared_workouts enable row level security;

grant select,insert,update on public.profiles to authenticated;
grant select,insert,update,delete on public.friend_requests to authenticated;
grant select,insert,delete on public.shared_workouts to authenticated;

drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid()=user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

drop policy if exists "friend_requests_read_participant" on public.friend_requests;
create policy "friend_requests_read_participant" on public.friend_requests for select to authenticated using (auth.uid()=sender_id or auth.uid()=receiver_id);
drop policy if exists "friend_requests_insert_sender" on public.friend_requests;
create policy "friend_requests_insert_sender" on public.friend_requests for insert to authenticated with check (auth.uid()=sender_id);
drop policy if exists "friend_requests_update_receiver" on public.friend_requests;
create policy "friend_requests_update_receiver" on public.friend_requests for update to authenticated using (auth.uid()=receiver_id);
drop policy if exists "friend_requests_delete_participant" on public.friend_requests;
create policy "friend_requests_delete_participant" on public.friend_requests for delete to authenticated using (auth.uid()=sender_id or auth.uid()=receiver_id);

drop policy if exists "shared_workouts_read_recipient_or_owner" on public.shared_workouts;
create policy "shared_workouts_read_recipient_or_owner" on public.shared_workouts for select to authenticated using (auth.uid()=recipient_id or auth.uid()=owner_id);
drop policy if exists "shared_workouts_insert_owner" on public.shared_workouts;
create policy "shared_workouts_insert_owner" on public.shared_workouts for insert to authenticated with check (auth.uid()=owner_id);
drop policy if exists "shared_workouts_delete_participant" on public.shared_workouts;
create policy "shared_workouts_delete_participant" on public.shared_workouts for delete to authenticated using (auth.uid()=recipient_id or auth.uid()=owner_id);

alter table public.profiles add column if not exists height_cm numeric;
alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists current_weight numeric;
alter table public.profiles add column if not exists goal_weight numeric;
alter table public.profiles add column if not exists avatar_url text;
