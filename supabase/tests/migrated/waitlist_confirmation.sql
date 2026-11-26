\set ON_ERROR_STOP on
begin;
create function pg_temp.expect_denied(command text) returns void
language plpgsql as $$
begin
  begin
    execute command;
  exception when insufficient_privilege then
    return;
  end;
  raise exception 'Expected permission denied for %', command;
end $$;

set role service_role;
insert into public.waitlist(name, email) values ('Ada', 'ada@example.com'), ('Bob', 'bob@example.com');

do $$
declare
  h1 text := repeat('a', 64);
  h2 text := repeat('b', 64);
begin
  -- unknown address
  if public.issue_waitlist_confirmation('nobody@example.com', h1) <> 'missing' then
    raise exception 'unknown email must be missing';
  end if;

  -- first issue is sent; an immediate resend is throttled
  if public.issue_waitlist_confirmation('ADA@example.com', h1) <> 'sent' then
    raise exception 'first issue must be sent (case-insensitive email)';
  end if;
  if public.issue_waitlist_confirmation('ada@example.com', h2) <> 'throttled' then
    raise exception 'resend within the minimum interval must be throttled';
  end if;

  -- unconfirmed rows are not subscribers
  if (select count(*) from public.waitlist_subscribers) <> 0 then
    raise exception 'unconfirmed signups must not be subscribers';
  end if;

  -- the token is stored hashed and confirms once
  if public.confirm_waitlist_email(repeat('c', 64)) is not false then
    raise exception 'unknown token must not confirm';
  end if;
  if public.confirm_waitlist_email('not-a-hash') is not false then
    raise exception 'malformed token must not confirm';
  end if;
  if public.confirm_waitlist_email(h1) is not true then
    raise exception 'valid token must confirm';
  end if;
  if public.confirm_waitlist_email(h1) is not false then
    raise exception 'token must be single use';
  end if;
  if (select count(*) from public.waitlist_subscribers) <> 1 then
    raise exception 'confirmed signup must be a subscriber';
  end if;
  if (select confirmation_token_hash from public.waitlist where email = 'ada@example.com') is not null then
    raise exception 'token hash must be cleared after confirmation';
  end if;

  -- an already confirmed address is not re-issued
  if public.issue_waitlist_confirmation('ada@example.com', h2) <> 'confirmed' then
    raise exception 'confirmed address must report confirmed';
  end if;

  -- expiry
  perform public.issue_waitlist_confirmation('bob@example.com', repeat('d', 64));
  update public.waitlist set confirmation_expires_at = now() - interval '1 minute' where email = 'bob@example.com';
  if public.confirm_waitlist_email(repeat('d', 64)) is not false then
    raise exception 'expired token must not confirm';
  end if;

  -- daily cap: five sends, the sixth is throttled even after the minimum interval
  update public.waitlist
  set confirmation_sent_at = now() - interval '2 minutes', confirmation_send_count = 5
  where email = 'bob@example.com';
  if public.issue_waitlist_confirmation('bob@example.com', repeat('e', 64)) <> 'throttled' then
    raise exception 'daily send cap must throttle';
  end if;
  -- after 24 hours the counter resets
  update public.waitlist set confirmation_sent_at = now() - interval '25 hours' where email = 'bob@example.com';
  if public.issue_waitlist_confirmation('bob@example.com', repeat('e', 64)) <> 'sent' then
    raise exception 'counter must reset after 24 hours';
  end if;
  if (select confirmation_send_count from public.waitlist where email = 'bob@example.com') <> 1 then
    raise exception 'send count must restart at 1';
  end if;
end $$;
reset role;

-- Only the service role can use any of it.
set role anon;
select pg_temp.expect_denied($q$select public.issue_waitlist_confirmation('ada@example.com', repeat('f', 64))$q$);
select pg_temp.expect_denied($q$select public.confirm_waitlist_email(repeat('f', 64))$q$);
select pg_temp.expect_denied('select * from public.waitlist_subscribers');
do $$
begin
  -- RLS hides every waitlist row (and so every token hash) from public roles.
  if (select count(*) from public.waitlist) <> 0 then raise exception 'waitlist rows exposed to anon'; end if;
end $$;
reset role;

set role authenticated;
select pg_temp.expect_denied($q$select public.issue_waitlist_confirmation('ada@example.com', repeat('f', 64))$q$);
select pg_temp.expect_denied($q$select public.confirm_waitlist_email(repeat('f', 64))$q$);
select pg_temp.expect_denied('select * from public.waitlist_subscribers');
reset role;
rollback;
