-- Decisions 20/21/28: distinct users trigger hiding; reason codes mean improper photo, abusive/spam chat, or other.
create table if not exists public.reports (
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('photo', 'chat', 'other')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  primary key (reporter_id, target_id),
  check (reporter_id <> target_id)
);
create index if not exists reports_target_id_idx on public.reports(target_id) where resolved_at is null;
alter table public.reports enable row level security;
drop policy if exists "Admins can read reports" on public.reports;
create policy "Admins can read reports" on public.reports for select to authenticated using (public.is_admin());
drop policy if exists "Users report as themselves" on public.reports;
create policy "Users report as themselves" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and coalesce((select auth.jwt()->>'is_anonymous'), 'false') <> 'true');
revoke all on public.reports from public, anon, authenticated;
grant select on public.reports to authenticated;
grant insert (reporter_id, target_id, reason) on public.reports to authenticated;
-- Decision 20: uniqueness and the self-report check exclude duplicate and self-reports; serialize each target's threshold.
create or replace function public.hide_after_three_reports()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.target_id::text, 0));
  if new.resolved_at is null and (select count(distinct reporter_id) from public.reports
      where target_id = new.target_id and resolved_at is null) >= 3 then
    insert into public.hidden_profiles (user_id, kind, processed_by)
    values (new.target_id, 'suspect', null) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.hide_after_three_reports() from public, anon, authenticated;
drop trigger if exists reports_hide_after_three on public.reports;
create trigger reports_hide_after_three after insert on public.reports
  for each row execute function public.hide_after_three_reports();
-- Decision 30: the trigger binds one appeal to each hidden-profile event; deleting a lifted block preserves its result.
create table if not exists public.profile_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hidden_profile_id uuid unique references public.hidden_profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  decision text check (decision in ('lifted', 'upheld')),
  processed_at timestamptz,
  check ((decision is null) = (processed_at is null))
);
alter table public.profile_appeals enable row level security;
drop policy if exists "Users and admins read appeals" on public.profile_appeals;
create policy "Users and admins read appeals" on public.profile_appeals for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "Only hidden users can appeal" on public.profile_appeals;
create policy "Only hidden users can appeal" on public.profile_appeals for insert to authenticated
  with check (user_id = (select auth.uid()) and hidden_profile_id is not null
    and coalesce((select auth.jwt()->>'is_anonymous'), 'false') <> 'true');
drop policy if exists "Admins process appeals" on public.profile_appeals;
revoke all on public.profile_appeals from public, anon, authenticated;
grant select on public.profile_appeals to authenticated;
grant insert (user_id, body) on public.profile_appeals to authenticated;
-- Decisions 30/32: attach the active block, allow one appeal per block, and enforce a 500-character body limit.
create or replace function public.bind_appeal_to_hidden_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select id into new.hidden_profile_id from public.hidden_profiles where user_id = new.user_id;
  if new.hidden_profile_id is null then raise exception 'Profile is not hidden'; end if;
  return new;
end;
$$;
revoke all on function public.bind_appeal_to_hidden_profile() from public, anon, authenticated;
drop trigger if exists profile_appeals_bind_block on public.profile_appeals;
create trigger profile_appeals_bind_block before insert on public.profile_appeals
  for each row execute function public.bind_appeal_to_hidden_profile();
-- Decision 35: release, resolve open reports, and optionally record the appeal result atomically.
create or replace function public.resolve_profile_moderation(target_user_id uuid, appeal_result text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if appeal_result is not null and appeal_result not in ('lifted', 'upheld') then
    raise exception 'Invalid appeal result' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_user_id::text, 0));
  perform 1 from public.hidden_profiles where user_id = target_user_id for update;
  if not found then return; end if;
  if appeal_result is not null then
    update public.profile_appeals set decision = appeal_result, processed_at = now()
      where hidden_profile_id = (select id from public.hidden_profiles where user_id = target_user_id)
        and decision is null;
  end if;
  if appeal_result is distinct from 'upheld' then
    update public.reports set resolved_at = now() where target_id = target_user_id and resolved_at is null;
    delete from public.hidden_profiles where user_id = target_user_id;
  end if;
end;
$$;
revoke all on function public.resolve_profile_moderation(uuid, text) from public, anon;
grant execute on function public.resolve_profile_moderation(uuid, text) to authenticated;
