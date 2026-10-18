-- 0.3.6 profile moderation schema. Review before applying in the Supabase dashboard.
-- Decision 1/2: public avatars bucket, fixed object path, PNG/JPEG/WebP, 1 MiB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp']),
       ('avatars_held', 'avatars_held', false, null, null)
on conflict (id) do update set name = excluded.name, public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
-- Decision 23: avatars_held is private; server(service role) moves/restores suspect files and deletes violations.
-- Decision 13: /admin filters auth.users.is_anonymous through the server Admin API.
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
drop policy if exists "Admins can read own membership" on public.admins;
create policy "Admins can read own membership" on public.admins for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.admins from public, anon, authenticated;
grant select on public.admins to authenticated;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
-- Decisions 22/23: suspect or violation hides the avatar; null processor means report-triggered suspect.
create table if not exists public.hidden_profiles (
  id uuid not null unique default gen_random_uuid(),
  user_id uuid primary key references auth.users(id) on delete cascade,
  kind text not null check (kind in ('suspect', 'violation')),
  processed_by uuid references auth.users(id) on delete restrict,
  hidden_at timestamptz not null default now(),
  check ((kind = 'suspect' and processed_by is null) or (kind = 'violation' and processed_by is not null))
);
alter table public.hidden_profiles enable row level security;
drop policy if exists "Public can read hidden profile IDs" on public.hidden_profiles;
create policy "Public can read hidden profile IDs" on public.hidden_profiles for select to anon, authenticated using (true);
drop policy if exists "Admins manage hidden profiles" on public.hidden_profiles;
drop policy if exists "Admins read hidden profiles" on public.hidden_profiles;
create policy "Admins read hidden profiles" on public.hidden_profiles for select to authenticated using (public.is_admin());
drop policy if exists "Admins insert violations" on public.hidden_profiles;
create policy "Admins insert violations" on public.hidden_profiles for insert to authenticated
  with check (public.is_admin() and kind = 'violation' and processed_by = (select auth.uid()));
revoke all on public.hidden_profiles from public, anon, authenticated;
grant select (user_id) on public.hidden_profiles to anon, authenticated;
grant insert on public.hidden_profiles to authenticated;
create or replace function public.is_profile_hidden(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.hidden_profiles where user_id = target_user_id);
$$;
revoke all on function public.is_profile_hidden(uuid) from public, anon;
grant execute on function public.is_profile_hidden(uuid) to authenticated;
create or replace function public.my_hidden_profile_kind()
returns text language sql stable security definer set search_path = '' as $$
  select kind from public.hidden_profiles where user_id = (select auth.uid());
$$;
revoke all on function public.my_hidden_profile_kind() from public, anon;
grant execute on function public.my_hidden_profile_kind() to authenticated;
create or replace view public.hidden_profiles_admin with (security_barrier = true) as
  select user_id, kind, processed_by, hidden_at from public.hidden_profiles where public.is_admin();
revoke all on public.hidden_profiles_admin from public, anon, authenticated;
grant select on public.hidden_profiles_admin to authenticated;
-- Decision 27: suspect and violation both block chat until an admin lifts the block.
create or replace function public.is_chat_blocked(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.hidden_profiles where user_id = target_user_id);
$$;
revoke all on function public.is_chat_blocked(uuid) from public, anon;
grant execute on function public.is_chat_blocked(uuid) to authenticated;
-- Decision 26: both hidden states block the owner's Storage writes until an admin lifts the block.
alter table storage.objects enable row level security;
drop policy if exists "Users manage only their unhidden avatar" on storage.objects;
create policy "Users manage only their unhidden avatar" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text)
    and name = (select auth.uid()::text) || '/avatar' and not public.is_profile_hidden((select auth.uid()))
    and coalesce((select auth.jwt()->>'is_anonymous'), 'false') <> 'true')
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text)
    and name = (select auth.uid()::text) || '/avatar' and not public.is_profile_hidden((select auth.uid()))
    and coalesce((select auth.jwt()->>'is_anonymous'), 'false') <> 'true');
