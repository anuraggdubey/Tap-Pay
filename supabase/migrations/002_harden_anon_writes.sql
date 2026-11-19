-- NOT VALID preserves legacy rows while enforcing checks on new/updated rows.
do $$
declare
  item record;
begin
  for item in select * from (values
    ('waitlist', 'waitlist_name_length_chk', 'char_length(trim(name)) between 2 and 100'),
    ('waitlist', 'waitlist_email_format_chk', $check$char_length(email) <= 254 and email = lower(trim(email)) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'$check$),
    ('usernames', 'usernames_username_format_chk', $check$username ~ '^[a-z0-9]{3,20}$'$check$),
    ('usernames', 'usernames_wallet_format_chk', $check$wallet_address ~ '^0x[0-9a-f]{40}$'$check$),
    ('usernames', 'usernames_normalized_consistency_chk', $check$normalized_username = lower(replace(replace(username, '0', 'o'), '1', 'l'))$check$)
  ) as checks(table_name, constraint_name, expression)
  loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = format('public.%I', item.table_name)::regclass
        and conname = item.constraint_name
    ) then
      execute format('alter table public.%I add constraint %I check (%s) not valid',
        item.table_name, item.constraint_name, item.expression);
    end if;
  end loop;
end $$;

alter table public.waitlist enable row level security;
drop policy if exists "waitlist_anon_insert" on public.waitlist;
revoke insert on public.waitlist from public, anon, authenticated;
grant insert on public.waitlist to service_role;

create table if not exists public.waitlist_rate_limits (
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  request_count bigint not null default 1 check (request_count > 0),
  primary key (ip_hash, window_start)
);
alter table public.waitlist_rate_limits enable row level security;
revoke all on public.waitlist_rate_limits from public, anon, authenticated;

create or replace function public.consume_waitlist_rate_limit(p_ip_hash text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  hits bigint;
begin
  insert into public.waitlist_rate_limits (ip_hash, window_start, request_count)
  values (p_ip_hash, current_window, 1)
  on conflict (ip_hash, window_start)
  do update set request_count = public.waitlist_rate_limits.request_count + 1
  returning request_count into hits;
  return hits;
end;
$$;

revoke all on function public.consume_waitlist_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_waitlist_rate_limit(text) to service_role;
