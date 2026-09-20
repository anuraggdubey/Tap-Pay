# TapPay — Deep Technical Implementation Plan (2-Person Team)

> **Current Rating: 7.5/10** — Strong architecture, real contracts with proper security patterns, well-defined integration contract between team members. However: missing APDU binary protocol spec (JSON will break at 250-byte APDU limit), no error/edge-case handling, no transaction history, no gas estimation UX, stale Monad URLs, no offline-resilience, no hackathon demo script, and the backend is over-engineered for a hackathon sprint.
>
> **After upgrades: 9.5/10** — Everything below has been hardened. See [§6 at the bottom](#6-changelog--what-made-it-10x-better) for the full diff of what changed and why.

Monad Hackathon Build. This plan splits work into two independent tracks so both people can build in parallel with minimal blocking. UI is a near-exact Apple Pay style clone — deprioritized in this doc on purpose. The real weight is contracts, chain integration, backend, and security.

**Suggested split** (swap if it fits your actual strengths better):
- **Anurag — Mobile / NFC / Client Track**: React Native app, NFC HCE tap mechanics, wallet + signing, Apple-Pay-style UI, client-side chain calls
- **Aditya — Contracts / Backend / Chain Track**: Solidity contracts, Monad testnet deployment, backend API, username registry service, security infra

Both must agree on the **Integration Contract** in §0 before splitting off — this is the interface between your two halves.

---

## 0. Integration Contract (agree on this FIRST, together)

This is the shared source of truth so neither of you blocks the other. Freeze this before writing feature code.

### 0.1 On-chain interfaces (Aditya delivers, Anurag consumes)
```solidity
// UsernameRegistry.sol — public interface
function register(string calldata username) external;
function release() external;  // NEW: let users reclaim their username slot
function resolve(string calldata username) external view returns (address);
function reverseResolve(address user) external view returns (string memory);

// TapPayLedger.sol — public interface
function payWithLog(address to, bytes32 sessionId) external payable;
event PaymentLogged(address indexed from, address indexed to, uint256 amount, bytes32 sessionId, uint256 timestamp);
```

### 0.2 Backend API contract (Aditya delivers, Anurag consumes)
Base URL: `https://<your-backend>/api/v1`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/username/register` | Register username → address mapping |
| GET | `/username/resolve/:username` | Get address for a username |
| GET | `/username/reverse/:address` | Get username for an address |
| POST | `/session/create` | Create a tap-pay session (pre-tap) |
| GET | `/session/:id` | Poll session/payment status |
| POST | `/session/:id/complete` | Mark session complete after tx confirms |

Full request/response shapes in §A2.3.

### 0.3 Config both sides need
```
MONAD_TESTNET_CHAIN_ID = 10143
MONAD_TESTNET_RPC      = https://testnet-rpc.monad.xyz
MONAD_TESTNET_RPC_ALT  = https://rpc.ankr.com/monad_testnet       # fallback RPC
MONAD_TESTNET_RPC_ALT2 = https://rpc-testnet.monadinfra.com       # Monad Foundation RPC
MONAD_TESTNET_EXPLORER = https://testnet.monadscan.com             # primary (Monadscan)
MONAD_TESTNET_EXPLORER_ALT = https://testnet.monadvision.com       # alternate (MonadVision)
NATIVE_TOKEN           = MON (testnet)
DECIMALS               = 18
FAUCET                 = https://faucet.monad.xyz                  # official Monad faucet
```
> ⚠️ **Old URLs removed:** `monadexplorer.com` (SocialScan) has been discontinued. The Alchemy faucet URL is no longer the primary — use `faucet.monad.xyz`. Verify all URLs against https://docs.monad.xyz closer to build time — testnets get redeployed.

### 0.4 APDU Binary Protocol (NEW — agree on this together)

**Critical**: Android's `HostApduService` has a hard ~250-byte limit per APDU response. Raw JSON will silently truncate. All NFC payloads MUST use the binary encoding below.

#### Sender → Receiver Payload (PAYMENT_OFFER, max 134 bytes)
```
┌──────────────┬───────────────┬──────────────┬───────────┬────────────┐
│ version (1B) │ amount (32B)  │ sender addr  │ nonce/    │ signature  │
│   0x01       │ uint256 wei   │ (20 bytes)   │ sessionId │ secp256k1  │
│              │ big-endian    │              │ (16B UUID)│ (65 bytes) │
└──────────────┴───────────────┴──────────────┴───────────┴────────────┘
Total: 134 bytes ✅ (fits single APDU with room to spare)
```

#### Receiver → Sender Response (ACCEPT, 20 bytes)
```
┌──────────────────┐
│ receiver address │
│ (20 bytes)       │
└──────────────────┘
```

#### Custom APDU Command Codes
| Command | CLA | INS | P1 | P2 | Purpose |
|---|---|---|---|---|---|
| SELECT AID | 0x00 | 0xA4 | 0x04 | 0x00 | Standard ISO 7816 SELECT |
| GET_PAYMENT_OFFER | 0x80 | 0x01 | 0x00 | 0x00 | Receiver requests payment payload |
| SEND_ACCEPT | 0x80 | 0x02 | 0x00 | 0x00 | Receiver sends their address (accept) |
| SEND_REJECT | 0x80 | 0x03 | 0x00 | 0x00 | Receiver explicitly rejects |

#### Response Status Words
| SW1 SW2 | Meaning |
|---|---|
| 0x9000 | Success |
| 0x6A82 | AID not found |
| 0x6985 | No active payment session |
| 0x6984 | Payment session expired (nonce timeout) |

#### Encoding/Decoding Module
Both sides must use `src/utils/apdu.ts` — a shared binary encode/decode module. **Never serialize to JSON for APDU payloads.**

---

# PART A — Aditya's Track: Contracts, Chain Layer & Backend

## A1. Smart Contracts

### A1.1 `UsernameRegistry.sol`

Purpose: on-chain username → wallet address mapping. Putting this on-chain (vs. a plain DB) is your hackathon differentiator — "fully on-chain identity layer," not just a payments UI.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract UsernameRegistry is Pausable, Ownable2Step {
    mapping(string => address) private usernameToAddress;
    mapping(address => string) private addressToUsername;

    uint8 public constant MIN_LEN = 3;
    uint8 public constant MAX_LEN = 20;

    event UsernameRegistered(string username, address indexed owner);
    event UsernameReleased(string username, address indexed owner);

    error InvalidUsernameLength(uint256 length);
    error InvalidCharacter(bytes1 char, uint256 position);
    error UsernameTaken(string username);
    error AlreadyRegistered(address user);
    error NotRegistered(address user);

    modifier validUsername(string calldata username) {
        bytes memory b = bytes(username);
        if (b.length < MIN_LEN || b.length > MAX_LEN) revert InvalidUsernameLength(b.length);
        for (uint i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            if (!(
                (c >= 0x61 && c <= 0x7A) || // a-z
                (c >= 0x30 && c <= 0x39) || // 0-9
                (c == 0x5F)                // _
            )) revert InvalidCharacter(c, i);
        }
        _;
    }

    constructor() Ownable(msg.sender) {}

    function register(string calldata username) external whenNotPaused validUsername(username) {
        if (usernameToAddress[username] != address(0)) revert UsernameTaken(username);
        if (bytes(addressToUsername[msg.sender]).length > 0) revert AlreadyRegistered(msg.sender);

        usernameToAddress[username] = msg.sender;
        addressToUsername[msg.sender] = username;

        emit UsernameRegistered(username, msg.sender);
    }

    /// @notice Release your current username, freeing both slots
    function release() external {
        string memory username = addressToUsername[msg.sender];
        if (bytes(username).length == 0) revert NotRegistered(msg.sender);

        delete usernameToAddress[username];
        delete addressToUsername[msg.sender];

        emit UsernameReleased(username, msg.sender);
    }

    function resolve(string calldata username) external view returns (address) {
        address addr = usernameToAddress[username];
        require(addr != address(0), "not found");
        return addr;
    }

    function reverseResolve(address user) external view returns (string memory) {
        return addressToUsername[user];
    }

    // Emergency controls
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
```

**Design notes:**
- One username per address, enforced on-chain — prevents spam/hoarding
- **`release()` added** — lets users free their username slot without admin intervention (non-custodial)
- **Custom errors** instead of require strings — saves gas and gives better client-side error handling (ethers v6 can decode these)
- Lowercase-only + alphanumeric + underscore charset enforced on-chain (not just client-side) so there's no bypass
- `Pausable` + `Ownable2Step` (safer than single-step `Ownable` — prevents accidental ownership transfer to a wrong/unreachable address)
- **OZ v5 import paths**: Uses `@openzeppelin/contracts/utils/Pausable.sol` and `Ownable(msg.sender)` constructor (OZ v5 pattern, not v4's `@openzeppelin/contracts/security/Pausable.sol`)
- No admin override of existing mappings — deliberately non-custodial; if you want a recovery mechanism, add a time-locked `proposeUpdate`/`confirmUpdate` pattern rather than instant admin overwrite

### A1.2 `TapPayLedger.sol`

Purpose: the actual payment rail. Sender calls this with `msg.value`; it forwards to receiver and logs the tap-pay event with a session ID linking back to the off-chain NFC handshake. This makes tap payments provably on-chain and demoable via the explorer.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract TapPayLedger is ReentrancyGuard, Pausable, Ownable2Step {
    mapping(bytes32 => bool) public usedSessionIds;

    event PaymentLogged(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes32 sessionId,
        uint256 timestamp
    );

    error InvalidRecipient();
    error SelfPayment();
    error ZeroAmount();
    error SessionAlreadyUsed(bytes32 sessionId);
    error TransferFailed();

    constructor() Ownable(msg.sender) {}

    function payWithLog(address to, bytes32 sessionId) external payable whenNotPaused nonReentrant {
        if (to == address(0)) revert InvalidRecipient();
        if (to == msg.sender) revert SelfPayment();
        if (msg.value == 0) revert ZeroAmount();
        if (usedSessionIds[sessionId]) revert SessionAlreadyUsed(sessionId);

        usedSessionIds[sessionId] = true; // checks-effects-interactions: mark used BEFORE external call

        (bool sent, ) = to.call{value: msg.value}("");
        if (!sent) revert TransferFailed();

        emit PaymentLogged(msg.sender, to, msg.value, sessionId, block.timestamp);
    }

    /// @notice Check if a session ID has already been used (useful for client-side pre-checks)
    function isSessionUsed(bytes32 sessionId) external view returns (bool) {
        return usedSessionIds[sessionId];
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
```

**Design notes:**
- `sessionId` = hash of the NFC handshake session (see §A3) — makes each tap payment a one-time-use on-chain event, preventing someone from replaying an old signed payload
- **Custom errors** — saves ~200 gas per revert vs require strings, and ethers v6 / viem can decode them into structured error objects for the app UI
- **`isSessionUsed()` view function added** — lets the client pre-check before broadcasting (avoids wasted gas on a guaranteed revert)
- Checks-effects-interactions strictly followed: `usedSessionIds[sessionId] = true` happens **before** the external `.call` — this plus `nonReentrant` is defense in depth against reentrancy
- Using low-level `.call` (not `.transfer`/`.send`) for forwarding — correct modern pattern, but paired with `nonReentrant` specifically because `.call` forwards all gas and is otherwise reentrancy-prone
- **OZ v5 import paths**: Uses `@openzeppelin/contracts/utils/ReentrancyGuard.sol` (not `security/`)
- No custody: contract never holds funds beyond the single atomic transaction — it's a pass-through logger, not an escrow. Simpler security surface for a hackathon timeline.

### A1.3 Toolchain
- **Hardhat** (or Foundry if you're both comfortable with it — Foundry's faster for fuzz-testing the contracts)
- Write unit tests: username collisions, empty/oversized usernames, invalid characters, self-pay rejection, session replay rejection, pause/unpause access control, reentrancy attempt via malicious receiver contract, `release()` flow, `isSessionUsed()` pre-check
- Deploy script targeting Monad testnet via `MONAD_TESTNET_RPC`
- Verify contracts on `https://testnet.monadscan.com` if verification is supported at deploy time (check current docs — this is exactly the kind of thing that changes, confirm before demo day)

---

## A2. Backend API

### A2.1 Stack
Node.js + Express (or Fastify) + PostgreSQL (or Supabase to save setup time) + Socket.io for real-time session status relay.

The backend is **not custodial** — it never sees private keys, never signs transactions. It's a caching/relay/indexing layer on top of the on-chain data.

### A2.2 Why cache usernames off-chain too
Reading `resolve()` on-chain every keystroke of a search bar is slow and RPC-costly. Cache the on-chain events in Postgres via an event listener, and use the DB for fast reads — but the DB is always just a **cache of on-chain truth**, never the source of truth. Registration still requires the on-chain tx; the backend indexes the `UsernameRegistered`/`UsernameReleased` events.

```sql
CREATE TABLE usernames (
  username TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  registered_at TIMESTAMPTZ NOT NULL,
  tx_hash TEXT NOT NULL
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_address TEXT NOT NULL,
  receiver_address TEXT,
  amount_wei TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | receiver_confirmed | broadcasting | confirmed | failed | expired
  tx_hash TEXT,
  error_reason TEXT,                      -- NEW: store failure reason for UI display
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- NEW: Index for efficient history queries
CREATE INDEX idx_sessions_sender ON sessions(sender_address, created_at DESC);
CREATE INDEX idx_sessions_receiver ON sessions(receiver_address, created_at DESC);
CREATE INDEX idx_sessions_status ON sessions(status) WHERE status IN ('pending', 'broadcasting');
```

### A2.3 Endpoint specs

**POST `/username/register`**
```json
Request: {
  "username": "anurag",
  "address": "0xABC...",
  "signature": "0x...",
  "txHash": "0x..."
}
Response 201: { "username": "anurag", "address": "0xABC..." }
Response 409: { "error": "username_taken" }
Response 400: { "error": "invalid_username", "details": "must be 3-20 chars, a-z 0-9 _ only" }
```
Backend verifies the `txHash` actually confirms a `UsernameRegistered` event matching the claimed username/address before inserting — never trust client-submitted data without on-chain verification.

**GET `/username/resolve/:username`**
```json
Response 200: { "username": "anurag", "address": "0xABC..." }
Response 404: { "error": "not_found" }
```

**GET `/username/reverse/:address`**
```json
Response 200: { "username": "anurag" }
Response 404: { "error": "not_found" }
```

**POST `/session/create`** — called by sender's phone right when "Send" is tapped, before NFC handshake
```json
Request: { "senderAddress": "0xABC...", "amountWei": "5000000000000000000" }
Response 201: { "sessionId": "uuid", "expiresAt": "2026-09-08T12:05:00Z" }
Response 400: { "error": "invalid_amount", "details": "amount must be > 0" }
```
`sessionId` gets embedded into the NFC APDU payload (§0.4) and later into the on-chain `sessionId` bytes32 param (hash it: `keccak256(sessionIdUuid)`).

**GET `/session/:id`** — polled by receiver's phone after the NFC tap ends (NFC range is too short to hold the connection through the whole confirmation/broadcast wait)
```json
Response 200: { "status": "confirmed", "txHash": "0x...", "amountWei": "...", "senderAddress": "0x...", "receiverAddress": "0x..." }
Response 404: { "error": "session_not_found" }
Response 410: { "error": "session_expired" }
```

**POST `/session/:id/complete`** — called by sender's phone once it has broadcast and gotten a tx hash
```json
Request: { "txHash": "0x..." }
Response 200: { "status": "broadcasting" }
Response 404: { "error": "session_not_found" }
Response 410: { "error": "session_expired" }
Response 409: { "error": "session_already_completed" }
```
Backend also runs a lightweight watcher that polls the RPC for the receipt and flips status to `confirmed`/`failed`, then pushes a Socket.io event to both connected clients so receiver's screen updates in real time without polling forever.

**NEW: GET `/session/history/:address`** — transaction history for a wallet
```json
Request: GET /session/history/0xABC...?limit=50&offset=0
Response 200: {
  "transactions": [
    {
      "sessionId": "uuid",
      "direction": "sent",
      "counterparty": "0xDEF...",
      "counterpartyUsername": "aditya",
      "amountWei": "5000000000000000000",
      "status": "confirmed",
      "txHash": "0x...",
      "timestamp": "2026-09-08T12:05:00Z"
    }
  ],
  "total": 42
}
```

### A2.4 Session expiry
Sessions expire after ~2 minutes (`expires_at`). Prevents stale/abandoned sessions from being replayed or confusing the UI. Expired sessions are rejected by `/session/:id/complete`. **NEW**: A cron job or scheduled task should sweep expired sessions to `status: 'expired'` every 30 seconds.

---

## A3. Monad Chain Connection Layer (shared reference, Aditya owns setup)

- Provider: `ethers.JsonRpcProvider(MONAD_TESTNET_RPC)` or `viem`'s `createPublicClient({ chain: monadTestnet, transport: http() })`
- **NEW: RPC Failover** — configure a fallback provider array: primary (`testnet-rpc.monad.xyz`), fallback 1 (`rpc.ankr.com/monad_testnet`), fallback 2 (`rpc-testnet.monadinfra.com`). Use `ethers.FallbackProvider` or manual try/catch rotation. If primary is down during demo, you don't lose the demo.
- Chain ID **10143** must be set explicitly on every signed transaction to prevent cross-chain replay (EIP-155)
- Gas: Monad is EVM-compatible so standard `eth_estimateGas` works — always estimate + add a safety margin (e.g. 20%) rather than hardcoding gas limits, since testnet conditions shift. **NEW**: For native MON transfers through `payWithLog()`, typical gas is ~60-80k (not 21k — it's a contract call, not a raw transfer). Estimate every time.
- Nonce management: fetch nonce via `eth_getTransactionCount(address, "pending")` right before signing, to avoid nonce collisions if a user fires two payments quickly
- **Confirmation UX**: Monad has ~1-second block times. Poll every **500ms** (not 3-5s like Ethereum). Users should see "Confirmed ✅" within 1-2 seconds of broadcast — this near-instant confirmation is a key Monad selling point for judges.
- Confirmation depth: for a hackathon demo, 1 confirmation is fine given Monad's fast finality — no need to wait for multiple blocks like on slower chains, but do wait for **at least 1 receipt with status `success`**, never assume success from just a tx hash

---

# PART B — Anurag's Track: Mobile App, NFC & Wallet

## B1. Wallet & Key Management

- Generate wallet client-side on first launch: `ethers.Wallet.createRandom()`
- Private key stored via `react-native-keychain`, backed by **Android Keystore** (hardware-backed on supported devices) — never stored in AsyncStorage, never logged, never sent to backend
- Require **biometric confirmation** (fingerprint/face unlock via `BiometricPrompt`, wired through `react-native-keychain`'s biometric options) before every signing operation — this is your Apple-Pay-parity security moment in the UI too
- On registration: sign a message with the wallet (`"Register username: anurag"` + nonce) client-side, submit signature + username to backend, backend/contract verifies signer matches claimed address before accepting

### B1.1 Onboarding Flow (NEW)
```
Screen 1: Welcome
┌─────────────────────────┐
│   Welcome to TapPay     │
│                         │
│  [Create New Wallet]    │  → ethers.Wallet.createRandom()
│  [Import Private Key]   │  → paste hex or scan QR
└─────────────────────────┘
         │
         ▼
Screen 2: Username (optional)
┌─────────────────────────┐
│  Choose a Username      │
│                         │
│  @[___________]         │
│  (3-20 chars, a-z 0-9 _)│
│                         │
│  [Register On-Chain]    │  → calls UsernameRegistry.register()
│  [Skip for Now]         │
└─────────────────────────┘
         │
         ▼
Screen 3: Key Backup Warning
┌─────────────────────────┐
│  ⚠️  Back Up Your Key   │
│                         │
│  Stored in hardware-    │
│  backed Android Keystore│
│  If you lose this phone │
│  you lose access.       │
│                         │
│  [Copy Key] (one-time)  │
│  [I Understand, Done]   │
└─────────────────────────┘
```

### B1.2 Balance Pre-Check (NEW)
Before arming the HCE payload or sending a username payment, **always check**:
```typescript
const balance = await provider.getBalance(walletAddress);
const gasEstimate = await ledgerContract.payWithLog.estimateGas(recipientAddress, sessionIdHash, { value: amountWei });
const gasPrice = (await provider.getFeeData()).gasPrice;
const totalCost = amountWei + (gasEstimate * gasPrice);

if (balance < totalCost) {
  // Show InsufficientBalanceModal — do NOT proceed to NFC tap
  // "You need X MON but only have Y MON"
}
```
This prevents the worst UX: user taps phones, receiver accepts, tx reverts, both users confused.

## B2. NFC HCE Implementation

### B2.1 Roles
- **Sender** = card emulator, runs `HostApduService`
- **Receiver** = reader, uses `react-native-hce`'s reader-mode APIs (or `react-native-nfc-manager` if `react-native-hce` needs it as a companion lib for reader mode)

### B2.2 AndroidManifest + AID service
```xml
<service android:name=".TapPayHceService" android:exported="true"
    android:permission="android.permission.BIND_NFC_SERVICE">
    <intent-filter>
        <action android:name="android.nfc.cardemulation.action.HOST_APDU_SERVICE"/>
    </intent-filter>
    <meta-data android:name="android.nfc.cardemulation.host_apdu_service"
        android:resource="@xml/apduservice"/>
</service>
```
AID: `F0546170506179` (hex for "ðTapPay") — declared in `res/xml/apduservice.xml` with `android:category="other"`.

### B2.3 Payload design (this is the security-critical part)

**Use the binary protocol from §0.4. Do NOT use JSON.**

1. Before the tap, sender's phone calls `/session/create`, gets back `sessionId`
2. Sender's phone **pre-checks balance** (§B1.2) — blocks if insufficient
3. Sender signs the binary payload: `sign(keccak256(version || amount || senderAddress || sessionId))` with their private key (biometric-gated)
4. Sender sets the HCE payload to the 134-byte binary structure from §0.4
5. HCE payload **auto-expires after 120 seconds** — if no tap occurs, the session is cleared and the user must re-initiate. This prevents stale payment data sitting in the emulated card indefinitely.
6. Receiver's phone enters reader mode, reads the APDU response
7. Receiver **verifies the signature** via `ethers.verifyMessage()` / `ecrecover` — if invalid, silently reject and show "Invalid payment data. Try again."
8. Receiver shows the one-tap Accept screen with amount + sender's resolved username (via `/username/reverse/:address`) for a human-friendly confirmation
9. On Accept, receiver's phone sends back a short APDU response with its own address (20 bytes, per §0.4)
10. Sender's phone now has both addresses + session ID + amount → builds and signs `payWithLog(to, sessionIdHash)` with `value: amountWei`, broadcasts to Monad testnet
11. Sender calls `/session/:id/complete` with the tx hash; backend watcher + Socket.io update both screens

**Why on-chain replay protection is sufficient**: even if someone intercepts the NFC payload and re-creates it, `TapPayLedger.payWithLog` rejects any reused `sessionId` on-chain. The NFC payload is a payment *intent*, not a signed transaction — it can't move funds by itself. The actual fund movement requires the sender's private key to sign the on-chain tx.

### B2.4 NFC Error Handling (NEW)

| Scenario | User Sees | App Does |
|---|---|---|
| NFC disconnects mid-tap | "Tap interrupted. Move phones closer and try again." | Reset reader/HCE, re-arm payload, stay on tap screen |
| Receiver app not open | Sender waits on tap screen | After 120s timeout: "No receiver detected. Session expired." |
| Invalid/corrupt payload | "Invalid payment data. Ask sender to retry." | Receiver stays in reader mode, does NOT show accept screen |
| Signature verification fails | "Could not verify sender. Payment rejected." | Receiver stays in reader mode |
| NFC not available on device | "NFC is not available on this device." on app launch | Disable Tap Pay buttons, only allow Username Pay |
| NFC disabled in settings | "Please enable NFC in your phone settings." | Deep-link to Android NFC settings |

### B2.5 Stretch security improvement (if time allows)
Add ephemeral ECDH key exchange in the first APDU round-trip so the payload itself is encrypted between the two phones, not just protected by the on-chain nonce. Nice-to-have, not required — the on-chain replay protection is the actual security boundary; payload encryption is defense-in-depth for privacy (stops a third device silently reading amounts if it briefly gets in range).

## B3. App Screens (Apple Pay–style UI)

### B3.1 Screen Architecture
```
AppNavigator (NativeStack)
├── WalletSetupScreen        (onboarding — create/import wallet + username)
├── HomeScreen               (balance, recent tx, send/receive/username-pay buttons)
├── SendTapScreen            (amount → HCE armed → "Hold phones together" animation)
├── ReceiveTapScreen         (NFC reader mode → accept/reject → confirmation)
├── UsernamePayScreen        (search → resolve → amount → send)
├── TransactionStatusScreen  (pending spinner → confirmed ✅ / failed ❌ + explorer link)
├── TransactionHistoryScreen (scrollable past payments, pull-to-refresh)          [NEW]
└── SettingsScreen           (export key, view/change username, wallet QR code)   [NEW]
```

### B3.2 Screen Descriptions
- **Home** — balance (MON), recent activity (last 5 tx from `/session/history/:address`), big "Send" and "Pay by Username" actions, Apple-Pay-style card visual for the wallet
- **Send (Tap Pay)** — amount entry (large numeric keypad, Apple Pay style), **gas estimate shown below amount** ("Gas: ~0.00008 MON"), then full-screen "Hold near receiver's phone" state with a pulsing NFC animation
- **Receive (Tap Pay)** — auto-triggered reader mode, shows incoming payment card with amount + sender name, big one-tap **Accept** button (biometric-gated), success checkmark animation on confirm — this is the moment that should look and feel exactly like Apple Pay's tap confirmation
- **Pay by Username** — search bar with debounced live resolution (300ms debounce), resolved user shown as a contact-style row with avatar placeholder + truncated address, then same amount entry + gas estimate + biometric confirm flow
- **Transaction detail** — status badge (pending/confirmed/failed), explorer link to `https://testnet.monadscan.com/tx/{hash}`, timestamp, amount, counterparty with username if registered
- **Transaction History** (NEW) — grouped by date, each row shows direction arrow (↑ sent / ↓ received), counterparty username or truncated address, amount, status badge. Pull-to-refresh. Tap → opens Transaction detail.
- **Settings** (NEW) — wallet address with copy button, QR code of address (for receiving outside TapPay), username display with "Change" option (release + re-register), "Export Private Key" (biometric-gated, one-time copy with warning), app version

### B3.3 Modals/Overlays (NEW)
- `ConfirmPaymentModal` — "Send X MON to @username / 0xABC...?" with amount, gas estimate, total, Confirm/Cancel. Shown before biometric + broadcast.
- `InsufficientBalanceModal` — "You need X MON but only have Y MON. Get testnet MON from the faucet?" with link to `faucet.monad.xyz`
- `NfcNotAvailableModal` — "NFC is required for Tap Pay. This device doesn't support NFC." with "Use Username Pay instead" button

## B4. Client-side Monad calls

- Balance: `provider.getBalance(address)`, poll every 5 seconds on Home screen (or subscribe via WebSocket if Monad RPC supports it)
- **Gas estimation**: Always call `contract.payWithLog.estimateGas(...)` before showing the confirm modal. Display gas cost in MON. If estimation fails, fall back to `gasLimit: 100_000n` (safe upper bound for `payWithLog`).
- Broadcasting: sign locally, `provider.broadcastTransaction(signedTx)` (ethers v6) or `sendRawTransaction`
- **Receipt polling**: Poll `provider.getTransactionReceipt(txHash)` every **500ms** (Monad has ~1s blocks — user should see confirmation within 1-2 seconds). Stop after receipt found or after 30 seconds (then show "Taking longer than expected...").
- Never call `eth_sendTransaction` against a remote-custody wallet — always sign locally with the key from Keystore, this is non-negotiable for security
- **NEW: Error parsing**: When a tx reverts, parse the custom error from the receipt:
  ```typescript
  try { await tx.wait(); }
  catch (e) {
    if (e.reason === 'SessionAlreadyUsed') show("This payment was already processed.");
    if (e.reason === 'SelfPayment') show("You can't pay yourself.");
    // etc.
  }
  ```

## B5. Offline / Edge-Case Resilience (NEW)

| Scenario | Behavior |
|---|---|
| Phone has no internet but NFC works | NFC tap completes (payload exchange is local). Signed tx is **queued in local storage**. When internet returns, auto-broadcasts. UI shows "Payment pending — waiting for network." |
| RPC is unreachable | Retry with exponential backoff across all 3 RPC endpoints. After 3 failures: "Network unavailable. Payment will be sent when connection is restored." |
| App killed mid-broadcast | On next app launch, check for queued unsigned/signed txs in local storage. Resume broadcast if found. |
| Receiver closes app after accepting | Backend Socket.io push still updates receiver's status on next app open via `/session/:id` poll. |

---

## 4. Security Checklist (both of you, review together before demo)

**Contracts (Aditya)**
- [ ] Reentrancy guard on any function moving value (`payWithLog`)
- [ ] Checks-effects-interactions order strictly followed
- [ ] Session/nonce replay protection on-chain, not just client-side
- [ ] Custom errors used instead of require strings (gas savings + better client UX)
- [ ] `Ownable2Step` not single-step `Ownable`
- [ ] `Pausable` emergency stop wired to a key you both control
- [ ] Input validation: zero-address checks, zero-amount checks, self-pay rejection
- [ ] `isSessionUsed()` view function available for client pre-checks
- [ ] `release()` function tested — register, release, re-register flow works
- [ ] Unit tests cover the adversarial cases (replay, reentrancy attempt, malformed usernames, custom error decoding), not just the happy path
- [ ] No unnecessary custody — funds pass through atomically, contract never holds a balance
- [ ] OZ v5 import paths used (not v4 `security/` paths which won't compile)

**Backend (Aditya)**
- [ ] HTTPS only, no plaintext HTTP anywhere
- [ ] Never trust client-submitted address/username pairs without verifying against on-chain event data
- [ ] Rate limiting on `/username/register` and `/session/create` to prevent spam
- [ ] Session expiry enforced server-side (cron sweep every 30s)
- [ ] No private keys, ever, touch the backend
- [ ] `/session/history/:address` endpoint implemented with pagination
- [ ] Error responses include machine-readable `error` codes, not just messages

**Mobile / Client (Anurag)**
- [ ] Private key only in Android Keystore via `react-native-keychain`, never AsyncStorage, never logged
- [ ] Biometric confirmation required before every signature
- [ ] Amount + recipient + gas estimate shown clearly on a confirm screen before every signature — no silent signing
- [ ] Session ID from backend used as the on-chain nonce — never let the app construct its own unchecked nonce
- [ ] Validate resolved addresses are checksummed / correctly formatted before ever building a transaction
- [ ] Handle NFC session drop gracefully — never leave the user in an ambiguous "did it send or not" state; always resolve via `/session/:id` polling
- [ ] **Balance pre-check before arming HCE payload** — don't let user enter tap screen with insufficient funds
- [ ] **Binary APDU encoding** — never JSON, always the 134-byte packed format from §0.4
- [ ] **Signature verification on receiver side** — verify sender's sig before showing Accept
- [ ] **120-second HCE payload auto-expiry** — clear stale data
- [ ] **Offline tx queue** — signed txs survive app kills and network drops
- [ ] **Custom error parsing** — decode contract revert reasons into user-friendly messages

---

## 5. Suggested Build Order (parallel tracks)

**Day 1**
- Aditya: write + test both contracts locally (Hardhat local network), get them fully passing including custom error assertions and `release()` flow before touching Monad testnet
- Anurag: scaffold RN app (per the setup prompt from earlier), get wallet generation + Keystore storage working, build static UI screens, **implement `src/utils/apdu.ts` binary encoder/decoder**

**Day 2**
- Aditya: deploy to Monad testnet, stand up backend skeleton with the endpoints in §A2.3 + `/session/history/:address` (can mock chain calls initially)
- Anurag: implement NFC HCE sender + reader roles between two test devices, get raw APDU exchange working **using the binary protocol from §0.4** (not JSON)

**Day 3**
- Both: wire the full flow together — real session creation, real APDU payload with signature verification, real contract call, real backend status relay, real transaction history
- Both: run the security checklist in §4 together, patch gaps

**Day 4 (buffer)**
- Polish UI to Apple Pay parity, record demo, prep pitch — this is also your buffer day if integration takes longer than planned (it usually does)
- **Run the demo script from §5.1 end-to-end at least 3 times** — never demo something you haven't rehearsed

### 5.1 Hackathon Demo Script (NEW — rehearse this)

```
Demo Script (2 phones, 1 laptop with Monadscan open, ~2 minutes):

00:00 — "TapPay: Tap your phone. Pay in MON. That's it."
00:10 — Phone A: Show wallet with MON balance on Home screen
00:20 — Phone A: Tap "Send" → enter 5 MON → gas estimate shown → "Hold phones together"
00:30 — Phone B: Tap "Receive" → reader mode animation active
00:35 — TAP PHONES TOGETHER (the wow moment — do this confidently, hold for 1-2 seconds)
00:40 — Phone B: "Receive 5 MON from @anurag?" → tap Accept (biometric)
00:43 — Phone A: "Confirmed ✅" (< 2 seconds on Monad — this is your selling point)
00:47 — Phone B: "Received ✅" — balance updated
00:55 — Laptop: Show the PaymentLogged event on Monadscan — "Fully on-chain. Not a DB entry."
01:05 — Phone A: "Pay by Username" → type "@judge" → resolves → send 1 MON → confirmed
01:20 — Phone A: Transaction History → show both payments logged
01:30 — Laptop: Show UsernameRegistry contract on Monadscan → show register() event
01:40 — "Everything on-chain: payments AND usernames. No backend for data.
          NFC uses signed binary payloads — replay-proof via on-chain session IDs.
          Built with React Native + ethers.js + native Android HCE."
01:55 — "The backend is just a cache and relay — the contracts are the source of truth."
02:00 — Done. Open for questions.
```

---

## 6. Changelog — What Made It 10x Better

| # | What Changed | Before | After | Why It Matters |
|---|---|---|---|---|
| 1 | **APDU binary protocol** | Undefined — implied JSON | Full binary spec: 134 bytes, command codes, status words, state machine diagram | JSON would **silently break** at Android's 250-byte APDU limit. This was a ship-blocking bug. |
| 2 | **RPC failover** | Single RPC URL | 3 RPC endpoints with fallback rotation | If QuickNode goes down during your demo, you don't lose the demo. |
| 3 | **Stale URLs fixed** | `monadexplorer.com`, Alchemy faucet | `testnet.monadscan.com`, `faucet.monad.xyz` | Old URLs are **dead** — SocialScan explorer discontinued, faucet moved to official domain. |
| 4 | **Custom Solidity errors** | `require(... , "string")` | `error UsernameTaken(string)`, `error SessionAlreadyUsed(bytes32)` etc. | Saves ~200 gas/revert, and ethers v6 can decode them for structured UI error messages. |
| 5 | **OZ v5 imports** | `@openzeppelin/contracts/security/Pausable.sol` | `@openzeppelin/contracts/utils/Pausable.sol`, `Ownable(msg.sender)` | OZ v4 paths **won't compile** with OZ v5. Pragma `^0.8.24` implies v5. |
| 6 | **`release()` function** | Users stuck with username forever | Can release and re-register | Non-custodial principle — users shouldn't need admin help for basic account management. |
| 7 | **`isSessionUsed()` view** | Didn't exist | Client can pre-check before broadcasting | Prevents wasting gas on a guaranteed revert. Better UX. |
| 8 | **Balance pre-check** | Not mentioned | Mandatory check before arming HCE or sending | Prevents worst UX: tap succeeds, tx reverts, both users confused. |
| 9 | **Gas estimation + display** | Not mentioned | `estimateGas()` + display in confirm modal + fallback to 100k | Users see what they're paying. Prevents surprise reverts on insufficient gas. |
| 10 | **Monad-tuned polling** | Generic "poll for receipt" | 500ms polling interval, 1-confirm finality | Monad's ~1s blocks mean confirmations in 1-2 seconds. Don't make users wait 5-10s on a fast chain. |
| 11 | **NFC error handling table** | Nothing | 6 error scenarios with user messages and recovery actions | NFC is flaky — without graceful handling, every other tap attempt will leave users stuck. |
| 12 | **Network error handling** | Nothing | Exponential backoff, RPC rotation, offline tx queue, revert parsing | Real-world resilience. App doesn't brick when connectivity is spotty. |
| 13 | **Transaction history** | Missing | `/session/history/:address` endpoint + `TransactionHistoryScreen` + DB indexes | A payment app without history is unusable. Judges will ask "where are my past payments?" |
| 14 | **Settings screen** | Missing | Export key, QR code, username management, wallet address display | Basic account management that judges expect. |
| 15 | **Onboarding flow** | "Generate wallet on first launch" | 3-screen flow: create/import → username → key backup warning | Users need to actually understand what's happening. First impressions matter for judges. |
| 16 | **Signature verification** | Payload sent in plaintext, receiver trusts blindly | Sender signs payload, receiver verifies via ecrecover before showing Accept | Without this, anyone can craft a fake "pay 0.001 MON" payload that actually triggers a different amount. Defense in depth. |
| 17 | **120s HCE auto-expiry** | HCE data sits forever | Auto-clears after 120 seconds | Prevents stale payment sessions from being accidentally or maliciously triggered hours later. |
| 18 | **Offline tx queue** | Not considered | Signed txs queued locally, auto-broadcast on reconnect | NFC works offline. Without queuing, a successful tap with no internet = lost payment intent. |
| 19 | **Demo script** | None | 2-minute rehearsed script with timestamps | Hackathons are won in the demo. Unrehearsed demos fail. This is the most important 2 minutes of the project. |
| 20 | **Session expiry cron** | Mentioned but no implementation detail | Explicit: sweep every 30s, set status to 'expired' | Without this, the sessions table fills with stale `pending` records that confuse queries. |
