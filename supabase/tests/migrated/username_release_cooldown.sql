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

create function pg_temp.expect_cooldown(command text) returns void
language plpgsql as $$
begin
  begin
    execute command;
  exception when raise_exception then
    if sqlerrm = 'username_cooldown' then
      return;
    end if;
    raise;
  end;
  raise exception 'Expected username_cooldown for %', command;
end $$;

set role service_role;
insert into public.usernames(username, normalized_username, wallet_address)
values ('alice', 'alice', '0x1111111111111111111111111111111111111111');

-- Resolution with registration time.
do $$
declare
  row record;
begin
  select * into row from public.resolve_username_details('ALICE');
  if row.wallet_address <> '0x1111111111111111111111111111111111111111' or row.registered_at is null then
    raise exception 'resolve_username_details must return the wallet and registration time';
  end if;
  if exists (select 1 from public.resolve_username_details('nobody')) then
    raise exception 'unknown handles must resolve to nothing';
  end if;
end $$;

-- Release records the previous owner.
delete from public.usernames where normalized_username = 'alice';
do $$
begin
  if not exists (
    select 1 from public.released_usernames
    where normalized_username = 'alice' and previous_wallet = '0x1111111111111111111111111111111111111111'
  ) then
    raise exception 'a release must be recorded';
  end if;
end $$;

-- Another wallet cannot take the handle during the cooldown.
select pg_temp.expect_cooldown($q$insert into public.usernames(username, normalized_username, wallet_address)
  values ('alice', 'alice', '0x2222222222222222222222222222222222222222')$q$);

-- ...nor by moving an existing row onto it.
insert into public.usernames(username, normalized_username, wallet_address)
values ('bob', 'bob', '0x3333333333333333333333333333333333333333');
select pg_temp.expect_cooldown($q$update public.usernames set username = 'alice', normalized_username = 'alice'
  where normalized_username = 'bob'$q$);

-- The previous wallet can take it back (case-insensitive address).
insert into public.usernames(username, normalized_username, wallet_address)
values ('alice', 'alice', '0x1111111111111111111111111111111111111111');
delete from public.usernames where normalized_username = 'alice';

-- After the cooldown anyone can register it.
update public.released_usernames set released_at = now() - interval '61 days' where normalized_username = 'alice';
insert into public.usernames(username, normalized_username, wallet_address)
values ('alice', 'alice', '0x2222222222222222222222222222222222222222');

-- Handles that were never released are unaffected.
insert into public.usernames(username, normalized_username, wallet_address)
values ('carol', 'carol', '0x4444444444444444444444444444444444444444');
reset role;

-- Clients can resolve, but cannot read or edit the release log.
set role anon;
select * from public.resolve_username_details('alice');
select pg_temp.expect_denied('select * from public.released_usernames');
select pg_temp.expect_denied('delete from public.released_usernames');
reset role;

set role authenticated;
select * from public.resolve_username_details('alice');
select pg_temp.expect_denied('select * from public.released_usernames');
select pg_temp.expect_denied($q$insert into public.released_usernames(normalized_username, previous_wallet)
  values ('x', '0x1111111111111111111111111111111111111111')$q$);
reset role;
rollback;
