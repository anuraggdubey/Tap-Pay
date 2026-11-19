# Supabase — Mainnet username registry

TapPay uses **one** username table for **Monad Mainnet (chain ID 143)**. Wallet addresses are the same on testnet and mainnet for the same key, so **existing users keep their `@username`** after migration—no second signup.

## What you need to run (one time)

| Script / action | Run again? | Notes |
|-----------------|------------|--------|
| **`supabase/migrations/001_usernames_mainnet_only.sql`** | **Yes, safe** — idempotent (`IF NOT EXISTS`, updates `chain_id` to 143) | Paste in **Supabase Dashboard → SQL → New query → Run** |
| `supabase/waitlist.sql` | Fresh waitlist setup | Creates the hardened waitlist and rate limiter; no direct public inserts |
| `supabase/migrations/002_harden_anon_writes.sql` | Yes, after 001 and waitlist setup | Idempotent; tightens new writes without rejecting legacy rows |
| `npm run deploy:mainnet` / `scripts/deploy-mainnet.js` | **No** unless redeploying contracts | Would deploy **new** contracts, not Supabase |
| `scripts/deploy.js` (testnet) | **No** for production | Testnet-only Hardhat script |

You do **not** need users to claim their username again. The migration sets `chain_id = 143` on all existing rows (including legacy rows with `NULL` or `10143`).

## What the migration does

1. Ensures `public.usernames` exists.
2. Adds `chain_id` (default **143**) if missing.
3. `UPDATE` all rows to **143** (testnet-era rows included).
4. Adds a check constraint: **`chain_id` must be 143**.
5. RLS: read/insert only for **mainnet** rows.

## App behavior after migration

- New registrations: `registry.ts` inserts `chain_id: 143`.
- `@username` pay: resolves address from Supabase, then pays on **Monad Mainnet** via `MONAD_CONFIG` (143).
- Startup: `assertMainnetOnlyConfig()` throws if `monad.ts` is pointed at testnet RPC or chain ID.

## If SQL fails with “relation already exists” / constraint errors

- The migration avoids creating duplicate **tables**. Duplicate **constraint** errors usually mean constraints already exist—you can ignore that block or comment out the `DO $$ ... $$` unique section.
- Do **not** drop the `usernames` table in production (you would lose handles).

## Verify

After running the migration, in SQL Editor:

```sql
select username, wallet_address, chain_id
from public.usernames
order by created_at desc
limit 20;
```

All `chain_id` values should be **143**.

## Anonymous-write hardening (issue #17)

Apply `supabase/waitlist.sql`, migration **001**, then **002** in the SQL Editor.
Existing installations can run 002 directly once both tables exist. The new checks
are `NOT VALID`: existing rows are retained, but inserts and updates must comply.
Direct waitlist inserts by `anon` and `authenticated` are revoked. Username
registration remains public and compatible with the RN app: lowercase 3–20
alphanumeric characters, lowercase hex wallet addresses, and `0→o` / `1→l`
normalization. This does **not** authenticate wallet ownership; signed registration,
RN build-time configuration and double opt-in email are separate follow-ups.

### Audit legacy rows before validating constraints

Run privately as an administrator; results contain personal data. Do not delete
or rewrite handles automatically. Resolve violations with the maintainer first.

```sql
select id, name, email from public.waitlist
where not (char_length(trim(name)) between 2 and 100)
   or not (char_length(email) <= 254 and email = lower(trim(email))
           and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$');

select id, username, normalized_username, wallet_address from public.usernames
where username !~ '^[a-z0-9]{3,20}$'
   or wallet_address !~ '^0x[0-9a-f]{40}$'
   or normalized_username <> lower(replace(replace(username, '0', 'o'), '1', 'l'));
```

After resolving all reported rows:

```sql
alter table public.waitlist validate constraint waitlist_name_length_chk;
alter table public.waitlist validate constraint waitlist_email_format_chk;
alter table public.usernames validate constraint usernames_username_format_chk;
alter table public.usernames validate constraint usernames_wallet_format_chk;
alter table public.usernames validate constraint usernames_normalized_consistency_chk;
```

### Deploy the signup endpoint

1. Create a Cloudflare Turnstile site with the actual frontend hostnames allowed.
   The widget uses action `waitlist-signup`; the server verifies both that action
   and the hostname against the allowed request origin.
2. Link the Supabase CLI to the correct project. Set secrets locally (never commit
   the values or put the service-role key in Vite variables):

   ```sh
   supabase secrets set ALLOWED_ORIGINS=https://your-site.example TURNSTILE_SECRET_KEY=<secret> WAITLIST_IP_SALT=<random-at-least-32-characters> WAITLIST_RATE_LIMIT=5
   supabase functions deploy waitlist-signup
   ```

   Replace the angle-bracket placeholders before running the command. Generate
   the salt with a cryptographically secure generator, e.g. `openssl rand -hex 32`.
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by hosted Supabase.
   For local function serving, supply these in an ignored local env file too.
   Keep the gateway JWT check enabled; the browser invokes with the public anon key.
3. **Verify the gateway's trusted IP header before enabling signup.** The function
   uses the rightmost `X-Forwarded-For` address, so the gateway must overwrite the
   incoming header or append a trustworthy client address. Never expose a runtime
   that merely passes client-supplied headers through. Missing IPs fail closed.
   Check that different clients yield different trusted addresses; a shared proxy
   address would instead rate-limit everyone together. CORS is not authentication.
4. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and
   `VITE_TURNSTILE_SITE_KEY` in `web/.env.local` or the Vercel build environment,
   then rebuild (`npm --prefix web ci && npm --prefix web run build`). No committed
   fallback is used. Other pages tolerate missing Supabase configuration.
   `WaitlistPage` remains unrouted intentionally; deployment does not enable it.
5. Rotate the previously committed Supabase anon key using the project's supported
   key-rotation procedure. Coordinate all consumers **before** revoking the old
   key: web, external integrations, and the RN app (which still embeds its key).
   RN key/config changes are deliberately not part of this patch. Public anon keys
   are not secrets; RLS and privileges remain the security boundary.

The default limit is **5 validated requests per IP per fixed 10-minute window**,
including invalid CAPTCHA attempts and duplicates. `WAITLIST_RATE_LIMIT` accepts
1–1000. The database increments atomically before CAPTCHA verification; upstream
failures fail closed. Only salted SHA-256 hashes are stored, not raw IPs. IPs are
sent to Turnstile for verification. Do not log request bodies, tokens or IPs.
Duplicates and successful inserts return the same response; no confirmation email
is sent. Rate-limit state needs periodic administrator cleanup, for example:

```sql
delete from public.waitlist_rate_limits
where window_start < now() - interval '1 day';
```

Schedule cleanup with the project's existing job runner; this patch does not
assume `pg_cron` is installed. Check existing policies/grants in production too:
the migrations only replace the known policy names and revoke public insert grants.

### Local verification

Use an isolated Postgres 16 database, never production, for
`supabase/tests/anon_write_hardening.sql` (run as a superuser; it creates stub roles).
It exercises fresh setup, migration reruns, legacy rows, constraints and privileges.
For the Edge Function, no downloaded test dependencies are needed:

```sh
deno check supabase/functions/waitlist-signup/index.ts
deno test supabase/functions/waitlist-signup/
```
