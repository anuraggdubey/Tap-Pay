# Supabase — Mainnet username registry

TapPay uses **one** username table for **Monad Mainnet (chain ID 143)**. Wallet addresses are the same on testnet and mainnet for the same key, so **existing users keep their `@username`** after migration—no second signup.

## What you need to run (one time)

| Script / action | Run again? | Notes |
|-----------------|------------|--------|
| **`supabase/migrations/001_usernames_mainnet_only.sql`** | **Yes, safe** — idempotent (`IF NOT EXISTS`, updates `chain_id` to 143) | Paste in **Supabase Dashboard → SQL → New query → Run** |
| `supabase/waitlist.sql` | Fresh waitlist setup | Creates the hardened waitlist and rate limiter; no direct public inserts |
| `supabase/migrations/002_harden_anon_writes.sql` | Yes, after 001 and waitlist setup | Idempotent; tightens new writes without rejecting legacy rows |
| `supabase/migrations/004_username_ownership_proof.sql` | Yes, after 001/002 | Idempotent; revokes direct anon writes to `usernames` so only the signed Edge Function can write |
| `supabase/migrations/005_passkey_recovery.sql` | Yes | Idempotent; creates the passkey recovery blob table (service role only). Deploy the `passkey-recovery` function after it |
| `supabase/migrations/006_username_proof_single_use.sql` | Yes | Idempotent; makes username proofs single-use. Apply **before** deploying the updated `register-username` |
| `supabase/migrations/007_username_rate_limit.sql` | Yes | Idempotent; rate limiter used by `register-username`. Apply before deploying the function |
| `supabase/migrations/008_usernames_exact_lookup_only.sql` | Yes, **with the matching app release** | Revokes public `SELECT` on `usernames`; the app resolves handles through `resolve_username` / `reverse_resolve_address`. Older app builds read the table directly and will stop resolving handles |
| `supabase functions deploy register-username` | After migration 004 | Verifies the wallet signature for register/release; set `ALLOWED_ORIGINS` and the service role is provided by Supabase |
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
2. Securely export the deployment variables listed under **Staged rollout helper**
   below (never put the service-role key in Vite variables), then run:

   ```sh
   bash scripts/supabase-rollout.sh --deploy
   ```

   The helper selects `SUPABASE_PROJECT_REF` explicitly and streams secrets to
   CLI stdin rather than exposing them as arguments. Generate the salt with a
   cryptographically secure generator, e.g. `openssl rand -hex 32`.
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by hosted Supabase.
   For local function serving, supply these in an ignored local env file too.
   Keep the gateway JWT check enabled; the browser invokes with the public anon key.
3. **After deploying, confirm which header carries the client IP.** The function
   prefers `CF-Connecting-IP` (overwritten by Cloudflare), then the leftmost
   `X-Forwarded-For` entry. Missing IPs fail closed. Confirm that the gateway
   preserves a trusted client address rather than a shared proxy hop, and does
   not simply pass spoofed client headers through. Turnstile is the primary
   control: each signup request requires a fresh, single-use verification token.
   The per-IP limit is defense in depth. CORS is not authentication.
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
select public.purge_waitlist_rate_limits(); -- after applying migration 003
```

Migration **003_waitlist_rate_limit_cleanup.sql** provides
`public.purge_waitlist_rate_limits()`, executable only by `service_role` (and
administrators). It deletes windows older than the current fixed 10-minute window,
retaining current/future windows. With `pg_cron` available/configured, it upserts
the named job `waitlist-rate-limit-cleanup` at minute 7 of every hour. Re-run as
the same database administrator to update that job without duplicates. Without
usable `pg_cron`, the migration succeeds with a NOTICE: enable/configure the
extension and re-run 003, or invoke the purge hourly from a trusted job runner.
Check `cron.job` and `cron.job_run_details` privately to confirm actual execution.
Check existing policies/grants in production too: the migrations only replace the
known policy names and revoke public insert grants.

### Staged rollout helper (issue #26)

Run `bash scripts/supabase-rollout.sh --dry-run` to preview without credentials or
network access. No flags selects audit → apply 002/003 → validate → deploy → smoke.
Choose steps explicitly to pause for manual cleanup, for example:

```sh
bash scripts/supabase-rollout.sh --audit
# Investigate/clean up legacy rows privately; the script never rewrites them.
bash scripts/supabase-rollout.sh --apply --validate
bash scripts/supabase-rollout.sh --deploy --smoke
```

Both tables must already exist (fresh setup: `waitlist.sql`, then 001). The script
prints only violation counts for all five 002 checks. Validation recounts each
check, validates only zero-violation constraints and reports the rest as
`NOT VALIDATED`; nonzero counts do not block installing new-write protection.
Re-run `--audit --validate` after maintainer-approved cleanup. A concurrent bad
legacy write can make validation fail; `ON_ERROR_STOP` stops the script safely.

Preflight tools: Bash, `psql` for database steps; Supabase CLI for deploy; `curl`,
`jq` and `awk` for smoke. Supply credentials using the maintainer's secure shell/
secret manager, not command-line assignments, shell history, or committed files:

- Database steps: exported `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, plus
  optional `PGPORT`/`PGSSLMODE`/CA settings. Use the database administrator and
  verified TLS for hosted connections; local test databases can disable TLS.
- Deploy: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `ALLOWED_ORIGINS`
  (comma-separated origins without spaces), `TURNSTILE_SECRET_KEY`,
  `WAITLIST_IP_SALT` (32+ hex/base64 characters), optional `WAITLIST_RATE_LIMIT`
  (1–1000, default 5).
- Smoke: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS`. It uses the first
  allowed origin. Keep the gateway JWT check enabled and use the project's legacy
  anon JWT key for these authenticated Edge Function requests.

Confirm the database host, project ref and API URL all refer to the intended
project. Secrets are streamed to CLI stdin; API keys go through curl's stdin config,
not arguments or temporary files. Tracing is disabled. Do not wrap the script with
credential-logging tools. Smoke checks require REST SQLSTATE `42501`, CORS HTTP
204, and the exact generic HTTP 400 missing-token error; gateway/config/network
failures are not mistaken for a passing smoke test. If direct insertion unexpectedly
succeeds, the script stops; privately remove the `rollout-smoke@example.invalid`
sentinel row after fixing privileges. Live deployment and a real Turnstile signup
still require the maintainer's accounts.

Finish the Turnstile site, Vercel env/redeploy and coordinated key rotation above.
For the client-IP debug check, use a private staging deployment and two controlled
networks: temporarily instrument only header-presence and comparison booleans
against the tester's known public IP (never raw headers/IPs/tokens). Confirm
`CF-Connecting-IP` or the leftmost `X-Forwarded-For` matches that client and that
different clients get different rate-limit buckets. Check that spoofed headers
are overwritten. Remove instrumentation and redeploy before accepting signups.
Do not add a public header-echo endpoint. Turnstile remains the primary control.

### Local verification

Use an isolated Postgres 16 database, never production, for
`supabase/tests/anon_write_hardening.sql` (run as a superuser; it creates stub roles).
It exercises fresh setup, migration reruns, legacy rows, constraints and privileges.
`supabase/tests/rate_limit_cleanup.sql` also runs that suite, applies 003 twice,
checks expired/current/future and empty purges, denies both public roles, and
asserts one named job when `pg_cron` is installed. Run it as a database administrator
on disposable Postgres 16, with and without configured `pg_cron`.
For the rollout helper, run `shellcheck scripts/supabase-rollout.sh` and
`node --test supabase/tests/rollout_smoke.mjs` (requires the smoke tools above).
The latter uses only a loopback HTTP stub, never live Supabase credentials.
For the Edge Function, no downloaded test dependencies are needed:

```sh
deno check supabase/functions/waitlist-signup/index.ts
deno test supabase/functions/waitlist-signup/
```
