# TapPay — Mainnet Funding Guide

This document lists **what to fund**, **which wallets**, and **how much** to run TapPay end-to-end on **Monad Mainnet** (chain ID **143**). Amounts include a practical buffer for deploys, failed transactions, and demos—not bare-minimum gas only.

**Related config:** [`src/config/monad.ts`](../src/config/monad.ts), [`src/config/tokens.ts`](../src/config/tokens.ts), [`src/config/agora.ts`](../src/config/agora.ts), [`scripts/deploy.js`](../scripts/deploy.js), [`scripts/deployMultiTokenLedger.js`](../scripts/deployMultiTokenLedger.js).

---

## Network reference

| Setting | Monad Mainnet | Monad Testnet (current app default) |
|--------|---------------|-------------------------------------|
| Chain ID | **143** | **10143** |
| Native gas token | **MON** (18 decimals) | MON |
| RPC (public) | `https://rpc.monad.xyz` | `https://testnet-rpc.monad.xyz` |
| Explorer | [monadscan.com](https://monadscan.com) | [testnet.monadscan.com](https://testnet.monadscan.com) |

Docs: [Monad network information](https://docs.monad.xyz/developer-essentials/network-information).

---

## Mainnet token contracts (confirmed in repo)

| Token | Mainnet contract | Decimals | App usage |
|-------|------------------|----------|-----------|
| **MON** | Native (no contract) | 18 | NFC `TapPayLedger`, native sends |
| **AUSD** | `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a` | 6 | Pay tab, cross-border |
| **USDC** | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` | 6 | Pay tab |
| **USDT** | **TBD** — verify canonical address before funding | 6 | `tokens.ts` has `contractAddress: null` |

Stablecoins use **6 decimals** (1.00 token = `1_000_000` units). MON uses **18 decimals**.

---

## What costs MON on mainnet

| Action | Who pays | Notes |
|--------|----------|--------|
| Deploy `UsernameRegistry` | Deployer | `scripts/deploy.js` |
| Deploy `TapPayLedger` | Deployer | Same script |
| Deploy `MultiTokenLedger` | Deployer | `scripts/deployMultiTokenLedger.js` |
| Whitelist AUSD / USDC / USDT on `MultiTokenLedger` | Deployer | One tx per token |
| Explorer contract verification (optional) | Deployer | MON gas |
| NFC tap pay (`payWithLog`) | Sender | Payment in MON + gas; min **0.0001 MON** per payment |
| Direct MON transfer | Sender | Amount + gas |
| Direct AUSD / USDC / USDT transfer | Sender | Token amount + **MON for gas only** |
| Register `@username` | — | **Supabase only** today (`src/services/registry.ts`) — no on-chain gas |
| On-chain `UsernameRegistry.register()` | User | Only if you move identity fully on-chain later |
| Mera passkey onboarding | — | No chain tokens |

**Current Pay tab behavior:** ERC-20 sends use direct `transfer()` in [`src/services/tokens/tokenTransfer.ts`](../src/services/tokens/tokenTransfer.ts). They do **not** require `approve` to `MultiTokenLedger` unless you wire `payERC20WithLog` in the app.

---

## Wallets to fund

| Role | Count | Purpose |
|------|-------|---------|
| **Deployer / owner** | 1 | Deploy contracts, whitelist tokens, admin |
| **Sender phone** | 1 | NFC send, Pay tab, primary passkey wallet |
| **Receiver phone** | 1 | NFC receive, receive stablecoins / MON |
| **Optional tester** | 1 | Second `@username`, cross-device demos |

NFC tap pay requires **two physical Android devices with NFC** (see [README](../README.md)).

---

## Recommended amounts per wallet

Monad gas is very low (UI references ~**0.0004 MON** per tx). Round buffers below avoid running dry during deploys and demos.

### Deployer (MON only)

| Asset | Technical minimum | **Recommended** |
|-------|-------------------|-----------------|
| MON | ~1–3 MON (deploy + admin txs) | **15 MON** |

No stablecoins required on the deployer unless you test sends from that address.

### Sender phone (primary demo wallet)

| Asset | **Recommended** | Why |
|-------|-----------------|-----|
| MON | **10 MON** | NFC `payWithLog`, native sends, gas buffer |
| AUSD | **10 AUSD** | Pay tab / cross-border demos |
| USDC | **10 USDC** | Pay tab |
| USDT | **10 USDT** | Only after mainnet address is set in `tokens.ts` |

### Receiver phone

| Asset | **Recommended** |
|-------|-----------------|
| MON | **2 MON** (optional; reply sends, gas) |
| AUSD | **2 AUSD** (optional send-back demo) |
| USDC | **2 USDC** |
| USDT | **2 USDT** (if USDT enabled) |

### Optional third tester

| Asset | **Recommended** |
|-------|-----------------|
| MON | **5 MON** |
| AUSD | **5 AUSD** |
| USDC | **5 USDC** |
| USDT | **5 USDT** (if enabled) |

---

## Grand total (recommended)

| Asset | Deployer | Sender | Receiver | Optional 3rd | **Total** |
|-------|----------|--------|----------|--------------|-----------|
| MON | 15 | 10 | 2 | 5 | **32 MON** |
| AUSD | 0 | 10 | 2 | 5 | **17 AUSD** |
| USDC | 0 | 10 | 2 | 5 | **17 USDC** |
| USDT | 0 | 10 | 2 | 5 | **17 USDT** * |

\* Fund USDT only after confirming the canonical Monad mainnet address and updating [`src/config/tokens.ts`](../src/config/tokens.ts).

### Minimal two-phone budget

If you only use **deployer + sender + light receiver**:

- **Deployer:** 15 MON  
- **Sender:** 10 MON + 10 AUSD + 10 USDC + 10 USDT (USDT when ready)  
- **Receiver:** 0–2 MON (optional)

---

## Simple rule of thumb

| Wallet | Hold |
|--------|------|
| **Deployer** | **15 MON** |
| **Each active sender** | **10 MON + 10 AUSD + 10 USDC + 10 USDT** |
| **Receiver** | **2 MON** (+ optional **2** of each stable for send-back tests) |

`TapPayLedger` allows up to **10,000 MON** per payment (`maxPayment` in contract); demo wallets do not need anywhere near that cap.

---

## Feature → token checklist

| Flow | Tokens used |
|------|-------------|
| Deploy 3 contracts + whitelist 2–3 tokens | MON (deployer) |
| Passkey + Supabase `@username` | None on-chain |
| NFC send 1 MON | Sender: 1 MON + gas |
| Direct send 3 AUSD to `@user` | Sender: 3 AUSD + MON gas |
| Direct USDC / USDT sends | Same pattern |
| Direct 0.5 MON to `0x…` | 0.5 MON + gas |

---

## Before you fund: engineering checklist

Mainnet is **not** wired in Hardhat/app config yet. Complete these before spending mainnet assets:

1. Add **`monad_mainnet`** to [`hardhat.config.js`](../hardhat.config.js) (chain **143**, RPC `https://rpc.monad.xyz`).
2. Update [`src/config/monad.ts`](../src/config/monad.ts): chain ID **143**, RPC, explorer, deployed contract addresses.
3. Update [`src/config/tokens.ts`](../src/config/tokens.ts) with mainnet AUSD/USDC; set USDT when verified.
4. Deploy with `DEPLOYER_PRIVATE_KEY` set (never commit keys):
   - `npx hardhat run scripts/deploy.js --network monad_mainnet`
   - `npx hardhat run scripts/deployMultiTokenLedger.js --network monad_mainnet`
5. Write deployed addresses to `deployed-addresses.json` / `monad.ts` as documented in deploy scripts.
6. **Acquire** mainnet MON and stablecoins (bridge, swap, or issuer flow)—testnet faucet does not apply.
7. Confirm **USDT** canonical address ([`docs/PHASE1_RESEARCH.md`](./PHASE1_RESEARCH.md) notes bridged / USDT0 variants).

---

## Non-token costs

| Item | Cost type |
|------|-----------|
| Supabase (username index) | SaaS / free tier |
| Mera passkeys | No MON |
| Public RPC | Free with rate limits; heavy use may need paid RPC (USD) |
| GitHub Actions / hosting | Separate from chain tokens |

---

## Copy-paste shopping list

**Bridge or buy on Monad Mainnet (chain 143):**

- **32 MON** total (or **25 MON** without optional tester)  
- **17 AUSD** (or **10** for sender-only demos)  
- **17 USDC** (or **10**)  
- **17 USDT** (or **10**) — after USDT address is confirmed in code  

**Per sender wallet:** **10 MON + 10 AUSD + 10 USDC + 10 USDT**  
**Deployer:** **15 MON**

---

## Contract deployment summary

| Contract | Script | Post-deploy |
|----------|--------|-------------|
| `UsernameRegistry` | `deploy.js` | `usernameRegistry` in `monad.ts` |
| `TapPayLedger` | `deploy.js` | `tapPayLedger` in `monad.ts` |
| `MultiTokenLedger` | `deployMultiTokenLedger.js` | `multiTokenLedger` in `monad.ts`; whitelist AUSD/USDC (+ USDT when known) |

Mainnet whitelist addresses in deploy script:

- AUSD: `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a`
- USDC: `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`

---

*Last aligned with TapPay repo: UsernameRegistry + TapPayLedger + MultiTokenLedger, Supabase usernames, direct ERC-20 transfers on Pay tab, NFC MON via TapPayLedger.*
