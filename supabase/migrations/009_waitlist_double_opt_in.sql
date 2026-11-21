-- Waitlist double opt-in (issue #28).
-- A signup is only a subscriber once the owner of the email address clicked the confirmation
-- link. The token is single use, expires after 24 hours and is stored only as a SHA-256 hash.
-- Existing rows have no confirmation, so they are NOT subscribers until they confirm.
-- Everything here is service role only (the Edge Functions); anon/authenticated get nothing.
-- Idempotent: safe to run more than once.

alter table public.waitlist
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmation_token_hash text,
  add column if not exists confirmation_expires_at timestamptz,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists confirmation_send_count smallint not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.waitlist'::regclass and conname = 'waitlist_confirmation_hash_chk'
  ) then
    alter table public.waitlist add constraint waitlist_confirmation_hash_chk
      check (confirmation_token_hash is null or confirmation_token_hash ~ '^[0-9a-f]{64}$');
  end if;
end $$;

create unique index if not exists waitlist_confirmation_token_idx
  on public.waitlist (confirmation_token_hash)
  where confirmation_token_hash is not null;

-- Only confirmed rows are subscribers. Use this view (or `confirmed_at is not null`) to count
-- or export; never the raw table.
create or replace view public.waitlist_subscribers
with (security_invoker = true) as
  select id, name, email, created_at, source, confirmed_at
  from public.waitlist
  where confirmed_at is not null;

revoke all on public.waitlist_subscribers from public, anon, authenticated;
grant select on public.waitlist_subscribers to service_role;

-- Issue (or re-issue) a confirmation token for an existing signup.
-- Returns: 'sent' (a new token was stored, send the email), 'throttled' (resend limit),
-- 'confirmed' (already confirmed) or 'missing' (no such signup). The Edge Function treats every
-- result the same toward the caller, so emails cannot be enumerated.
create or replace function public.issue_waitlist_confirmation(
  p_email text,
  p_token_hash text,
  p_ttl_hours integer default 24,
  p_min_interval_seconds integer default 60,
  p_max_sends integer default 5
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.waitlist%rowtype;
  recent_sends integer;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid token hash';
  end if;
  if p_ttl_hours is null or p_ttl_hours < 1 or p_ttl_hours > 168 then
    raise exception 'invalid ttl';
  end if;

  select * into r from public.waitlist where email = lower(trim(p_email)) for update;
  if not found then
    return 'missing';
  end if;
  if r.confirmed_at is not null then
    return 'confirmed';
  end if;

  -- Resend rate limit: a minimum gap between emails, and a daily cap per address.
  if r.confirmation_sent_at is not null
     and r.confirmation_sent_at > now() - make_interval(secs => p_min_interval_seconds) then
    return 'throttled';
  end if;
  recent_sends := case
    when r.confirmation_sent_at is null or r.confirmation_sent_at < now() - interval '24 hours' then 0
    else r.confirmation_send_count
  end;
  if recent_sends >= p_max_sends then
    return 'throttled';
  end if;

  update public.waitlist
  set confirmation_token_hash = p_token_hash,
      confirmation_expires_at = now() + make_interval(hours => p_ttl_hours),
      confirmation_sent_at = now(),
      confirmation_send_count = recent_sends + 1
  where id = r.id;
  return 'sent';
end;
$$;

-- Confirm by token hash. Single use: the hash is cleared on success. An unknown, expired or
-- already used token returns false (callers do not distinguish them).
create or replace function public.confirm_waitlist_email(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  update public.waitlist
  set confirmed_at = now(),
      confirmation_token_hash = null,
      confirmation_expires_at = null
  where confirmation_token_hash = p_token_hash
    and confirmation_expires_at > now()
    and confirmed_at is null;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.issue_waitlist_confirmation(text, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.confirm_waitlist_email(text) from public, anon, authenticated;
grant execute on function public.issue_waitlist_confirmation(text, text, integer, integer, integer) to service_role;
grant execute on function public.confirm_waitlist_email(text) to service_role;
