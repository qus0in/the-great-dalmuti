-- 0.3.8 followup: suspect -> violation confirm + omitted-result auto-lift.
-- ADR-0016 decisions 23/31 (confirm path) and 35 (lift resolves reports).
-- Original file move/delete stays server-side (service role); out of SQL scope.
-- Rerunnable: create or replace only, no destructive drops.
-- Decision 23/31: admin confirms a suspect block as a violation.
create or replace function public.confirm_profile_violation(target_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_user_id::text, 0));
  perform 1 from public.hidden_profiles where user_id = target_user_id for update;
  if not found then return; end if;
  update public.hidden_profiles
    set kind = 'violation', processed_by = (select auth.uid()), hidden_at = now()
    where user_id = target_user_id and kind = 'suspect';
  update public.reports set resolved_at = now()
    where target_id = target_user_id and resolved_at is null;
end;
$$;
revoke all on function public.confirm_profile_violation(uuid) from public, anon;
grant execute on function public.confirm_profile_violation(uuid) to authenticated;
-- Observation 3: omitted appeal_result on lift left open appeals undecided.
-- Auto-record them as 'lifted'; explicit 'upheld' path unchanged.
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
  if appeal_result is distinct from 'upheld' then
    update public.profile_appeals set decision = coalesce(appeal_result, 'lifted'), processed_at = now()
      where hidden_profile_id = (select id from public.hidden_profiles where user_id = target_user_id)
        and decision is null;
    update public.reports set resolved_at = now() where target_id = target_user_id and resolved_at is null;
    delete from public.hidden_profiles where user_id = target_user_id;
  else
    update public.profile_appeals set decision = appeal_result, processed_at = now()
      where hidden_profile_id = (select id from public.hidden_profiles where user_id = target_user_id)
        and decision is null;
  end if;
end;
$$;
revoke all on function public.resolve_profile_moderation(uuid, text) from public, anon;
grant execute on function public.resolve_profile_moderation(uuid, text) to authenticated;
