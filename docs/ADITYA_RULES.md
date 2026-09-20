# TapPay — Aditya's Track: Rules & Boundaries

> **Purpose**: This document is the single source of truth for Aditya's development track. Reference this when resuming work, starting a new session, or if tokens are depleted. These rules prevent overlap with Anurag's work and keep the implementation consistent.

---

## 🔴 HARD BOUNDARIES — Do NOT Touch

These files belong to **Anurag (Mobile / NFC / Client Track)**. Never modify, create, or delete anything here:

```
src/screens/*            # All UI screens (Home, Send, Receive, Settings, etc.)
src/services/hce.ts      # HCE card emulation service
src/services/nfcReader.ts # NFC reader service  
src/services/wallet.ts   # Wallet key management & signing (READ-ONLY reference OK)
src/utils/apdu.ts        # Binary APDU encoder/decoder
src/utils/format.ts      # Display formatting utilities
src/utils/validation.ts  # Input validation
src/context/*            # React context providers
src/hooks/*              # React hooks (useNfc, useTransaction, useBalance)
src/navigation/*         # App navigation setup
src/components/*         # Reusable UI components
android/*                # Native Android code (HCE service, manifest, etc.)
ios/*                    # iOS directory
App.tsx                  # Root component
index.js                 # App entry point
.github/workflows/*      # CI pipelines
```

## 🟡 SHARED FILES — Update With Coordination

These files are shared between both tracks. Aditya may update **only the specified fields**:

| File | Aditya May Update | Do NOT Change |
|------|-------------------|---------------|
| `src/config/monad.ts` | `contracts.usernameRegistry`, `contracts.tapPayLedger`, `apiBaseUrl` | Everything else (RPC URLs, constants, helpers) |
| `src/services/registry.ts` | Only if contract ABI changes — **coordinate with Anurag first** | Function signatures, error handling patterns |
| `package.json` (root) | Only add Hardhat-related devDependencies if needed | React Native deps, scripts, metadata |

## 🟢 ADITYA'S TERRITORY — Full Ownership

```
contracts/                # Solidity smart contracts
  ├── UsernameRegistry.sol
  └── TapPayLedger.sol
backend/                  # Backend API server (NEW — create this)
  ├── package.json
  ├── tsconfig.json  
  ├── src/
  │   ├── index.ts
  │   ├── config.ts
  │   ├── db.ts
  │   ├── routes/username.ts
  │   ├── routes/session.ts
  │   ├── services/chainWatcher.ts
  │   ├── services/eventIndexer.ts
  │   ├── middleware/rateLimit.ts
  │   └── socket.ts
  ├── schema.sql
  └── .env.example
hardhat.config.ts         # Hardhat configuration
scripts/deploy.ts         # Contract deployment script
test/                     # Contract unit tests
  ├── UsernameRegistry.test.ts
  └── TapPayLedger.test.ts
```

---

## Contract Standards

1. **Solidity version**: `pragma solidity ^0.8.24;`
2. **OpenZeppelin version**: v5 (NOT v4)
   - `@openzeppelin/contracts/utils/Pausable.sol` (NOT `security/Pausable.sol`)
   - `@openzeppelin/contracts/utils/ReentrancyGuard.sol` (NOT `security/ReentrancyGuard.sol`)
   - `@openzeppelin/contracts/access/Ownable2Step.sol`
   - Constructor pattern: `Ownable(msg.sender)`
3. **Custom errors** over `require` strings — saves gas, ethers v6 decodes them
4. **Checks-effects-interactions** pattern strictly enforced
5. Both contracts must inherit: `Pausable`, `Ownable2Step`
6. `TapPayLedger` additionally inherits: `ReentrancyGuard`
7. **No custody** — contracts never hold funds beyond a single atomic transaction

### Integration Contract (Aditya delivers, Anurag consumes)

```solidity
// UsernameRegistry.sol — public interface
function register(string calldata username) external;
function release() external;
function resolve(string calldata username) external view returns (address);
function reverseResolve(address user) external view returns (string memory);

// TapPayLedger.sol — public interface  
function payWithLog(address to, bytes32 sessionId) external payable;
function isSessionUsed(bytes32 sessionId) external view returns (bool);
event PaymentLogged(address indexed from, address indexed to, uint256 amount, bytes32 sessionId, uint256 timestamp);
```

> ⚠️ If you change any function signature, event, or error — you MUST tell Anurag so he updates `registry.ts` and `wallet.ts` ABIs.

---

## Backend API Standards

1. **Stack**: Node.js + Express + SQLite + Socket.io
2. **Base URL pattern**: `/api/v1/...`
3. **Database**: SQLite (hackathon simplicity — zero setup)
4. **Not custodial**: Backend NEVER sees private keys, NEVER signs transactions
5. **On-chain verification**: Always verify `txHash` against actual chain events before trusting client data
6. **Rate limiting**: 
   - `/username/register`: 5 req/min per IP
   - `/session/create`: 10 req/min per IP
7. **Session expiry**: 2 minutes (120 seconds). Cron sweep every 30s.
8. **Error response format**: `{ "error": "machine_readable_code", "details": "human message" }`
9. **Socket.io events**: Push `session_update` to both sender and receiver rooms when status changes

### API Endpoints

| Method | Endpoint | Request | Success Response |
|--------|----------|---------|------------------|
| POST | `/api/v1/username/register` | `{ username, address, signature, txHash }` | `201: { username, address }` |
| GET | `/api/v1/username/resolve/:username` | — | `200: { username, address }` |
| GET | `/api/v1/username/reverse/:address` | — | `200: { username }` |
| POST | `/api/v1/session/create` | `{ senderAddress, amountWei }` | `201: { sessionId, expiresAt }` |
| GET | `/api/v1/session/:id` | — | `200: { status, txHash, ... }` |
| POST | `/api/v1/session/:id/complete` | `{ txHash }` | `200: { status: "broadcasting" }` |
| GET | `/api/v1/session/history/:address` | `?limit=50&offset=0` | `200: { transactions: [...], total }` |

---

## Monad Testnet Config

```
Chain ID:      10143
RPC Primary:   https://testnet-rpc.monad.xyz
RPC Fallback:  https://rpc.ankr.com/monad_testnet
RPC Fallback2: https://rpc-testnet.monadinfra.com
Explorer:      https://testnet.monadscan.com
Faucet:        https://faucet.monad.xyz
Currency:      MON (18 decimals)
```

---

## Security Checklist (Aditya's Items)

### Contracts
- [ ] ReentrancyGuard on `payWithLog()`
- [ ] Checks-effects-interactions strictly followed
- [ ] Session/nonce replay protection on-chain
- [ ] Custom errors (not require strings)
- [ ] `Ownable2Step` (not single-step `Ownable`)
- [ ] `Pausable` emergency stop wired
- [ ] Zero-address, zero-amount, self-pay validation
- [ ] `isSessionUsed()` view function exists
- [ ] `release()` flow tested: register → release → re-register
- [ ] Unit tests cover adversarial cases
- [ ] No unnecessary custody
- [ ] OZ v5 import paths

### Backend
- [ ] HTTPS only in production
- [ ] On-chain event verification before trusting client data
- [ ] Rate limiting on registration and session creation
- [ ] Session expiry enforced server-side
- [ ] No private keys touch the backend
- [ ] Transaction history endpoint with pagination
- [ ] Machine-readable error codes in all responses

---

## Resume Instructions

If you're starting a new session or tokens were depleted, follow this order:

1. **Read this rules file first** — it defines what you can and cannot touch
2. **Check what's already been done** — look at `contracts/`, `backend/`, `hardhat.config.ts`, `test/`
3. **Check deployed addresses** — look at `src/config/monad.ts` to see if contracts are deployed
4. **Continue from where you left off** — the implementation plan has the build order
5. **Never modify Anurag's files** — see the red boundary section above
