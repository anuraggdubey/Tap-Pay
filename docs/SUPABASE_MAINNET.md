# Supabase — Mainnet username registry

TapPay uses **one** username table for **Monad Mainnet (chain ID 143)**. Wallet addresses are the same on testnet and mainnet for the same key, so **existing users keep their `@username`** after migration—no second signup.

## What you need to run (one time)

| Script / action | Run again? | Notes |
|-----------------|------------|--------|
| **`supabase/migrations/001_usernames_mainnet_only.sql`** | **Yes, safe** — idempotent (`IF NOT EXISTS`, updates `chain_id` to 143) | Paste in **Supabase Dashboard → SQL → New query → Run** |
| `supabase/waitlist.sql` | Only if `waitlist` table missing | Uses `create table if not exists` — safe if already applied |
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
