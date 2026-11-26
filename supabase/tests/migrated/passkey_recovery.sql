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
insert into public.passkey_recovery_blobs(credential_id, wallet_address, ciphertext, nonce)
values (repeat('A', 22), '0x1111111111111111111111111111111111111111', repeat('B', 40), repeat('C', 16));
select public.consume_passkey_recovery_rate_limit(repeat('a', 64), 600);
select public.purge_passkey_recovery_rate_limits();
reset role;

-- One blob per wallet.
set role service_role;
do $$
begin
  begin
    insert into public.passkey_recovery_blobs(credential_id, wallet_address, ciphertext, nonce)
    values (repeat('D', 22), '0x1111111111111111111111111111111111111111', repeat('B', 40), repeat('C', 16));
    raise exception 'Expected unique violation for wallet_address';
  exception when unique_violation then
    null;
  end;
end $$;
reset role;

-- Malformed rows are rejected.
set role service_role;
do $$
begin
  begin
    insert into public.passkey_recovery_blobs(credential_id, wallet_address, ciphertext, nonce)
    values ('short', '0x2222222222222222222222222222222222222222', repeat('B', 40), repeat('C', 16));
    raise exception 'Expected check violation';
  exception when check_violation then
    null;
  end;
end $$;
reset role;

-- No client role can read or write blobs or rate-limit rows.
set role anon;
select pg_temp.expect_denied('select * from public.passkey_recovery_blobs');
select pg_temp.expect_denied($q$insert into public.passkey_recovery_blobs(credential_id, wallet_address, ciphertext, nonce)
  values (repeat('E', 22), '0x3333333333333333333333333333333333333333', repeat('B', 40), repeat('C', 16))$q$);
select pg_temp.expect_denied('delete from public.passkey_recovery_blobs');
select pg_temp.expect_denied('select * from public.passkey_recovery_rate_limits');
select pg_temp.expect_denied($q$select public.consume_passkey_recovery_rate_limit(repeat('b', 64), 600)$q$);
select pg_temp.expect_denied('select public.purge_passkey_recovery_rate_limits()');
reset role;

set role authenticated;
select pg_temp.expect_denied('select * from public.passkey_recovery_blobs');
select pg_temp.expect_denied('update public.passkey_recovery_blobs set ciphertext = ciphertext');
select pg_temp.expect_denied('select * from public.passkey_recovery_rate_limits');
select pg_temp.expect_denied($q$select public.consume_passkey_recovery_rate_limit(repeat('b', 64), 600)$q$);
reset role;
rollback;
