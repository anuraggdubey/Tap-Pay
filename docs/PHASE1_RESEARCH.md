# Phase 1 Research: Mera Passkey + Multi-Token Integration

> **Date**: Sep 25, 2026
> **Status**: Research Complete ✅ — Ready to Build

---

## 🔑 KEY FINDING: Mera Natively Supports React Native!

**This is a game-changer.** Mera's README explicitly states:

> **Supported platforms:** Web browsers, Chrome extensions,
> **React Native on iOS 18 or later and Android 9 or later**

This means we do NOT need the WebView hack we originally planned.
Mera works natively in React Native using the device's Credential
Manager (Android) / iCloud Keychain (iOS) for passkey operations.

---

## 1. Mera SDK Summary

### Package
```
npm install @category-labs/mera
```

### What Mera Does
1. Uses a **passkey** (Face ID / Fingerprint) to derive **32 secret bytes**
2. Those 32 bytes become the **private key** for a standard EVM account
3. No smart contracts needed — it creates a normal externally-owned account (EOA)
4. Account is **instantly backed up** via the device's passkey sync (iCloud/Google)
5. Account is **recoverable** on any device that has access to the same passkey

### How It Works (Simplified)
```
Face ID / Fingerprint
        ↓
   WebAuthn PRF Extension
        ↓
   32 random bytes (deterministic from passkey)
        ↓
   Standard EVM private key
        ↓
   Normal Ethereum address (0x...)
```

### Key Concepts
1. **Passkey Accounts**: Accounts derived from a passkey. No seed phrase needed.
   The passkey IS the recovery mechanism.
2. **Signing Sessions**: After the initial passkey ceremony, Mera holds the
   derived private key in memory for a session, so the user doesn't need to
   authenticate (Face ID) for every single transaction.

### React Native Requirements
- `react-native-passkey` v3.3+ (for PRF extension support)
- `react-native-get-random-values` (already in our project!)
- Crypto polyfill for `crypto.getRandomValues` (we already have this via
  `react-native-get-random-values`)
- `assetlinks.json` configured for Android (for passkey domain association)
- Development build (NOT Expo Go — we use bare React Native, so we're fine!)

### Critical Integration Notes
- **rpId (Relying Party ID)**: Must match a domain you control. For the
  bounty demo, we can use our app's associated domain.
- Our app is **bare React Native** (not Expo), which is perfect because
  `react-native-passkey` needs native module access.
- We already have `react-native-get-random-values` in `package.json` ✅

---

## 2. Token Contract Addresses (Monad)

### Confirmed Addresses

| Token | Network | Contract Address | Decimals |
|-------|---------|------------------|----------|
| **AUSD** | Mainnet | `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a` | 6 |
| **USDC** | Mainnet | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` | 6 |
| **USDC** | Testnet | `0x534b2f3A21130d7a60830c2Df862319e593943A3` | 6 |
| **MON** | Both | Native (no contract) | 18 |

### USDT Status
- USDT exists on Monad via bridging protocols (LayerZero, Wormhole)
- Contract address varies by bridge — need to verify the canonical one
- May use ticker `USDT0` for the bridged version
- **Decision**: Start with AUSD + USDC + MON. Add USDT later if time permits.

### Important Notes
- Monad **Mainnet** launched Nov 24, 2025 — it's live!
- Our current app targets **Testnet** (chain 10143)
- For the bounty, we should target **Mainnet** since AUSD is deployed there
- Monad Mainnet Chain ID: needs verification

---

## 3. Monad Instant Settlement

- **Finality**: ~600ms deterministic finality
- **TPS**: 10,000 transactions per second
- **Block time**: 0.3 seconds
- **Consensus**: MonadBFT (pipelined for fast finality)
- **Gas fees**: Near-zero

This means our send/receive demo will show settlement in under 1 second,
which is a MASSIVE selling point for the bounty judges.

---

## 4. Dependencies We Need to Add

### New packages (Aditya's territory only):
```bash
npm install @category-labs/mera
npm install react-native-passkey@^3.3
```

### Already in project (no changes needed):
- `react-native-get-random-values` ✅
- `ethers` v6 ✅
- `react-native-keychain` ✅ (still used for session persistence)

---

## 5. Architecture Decision: Mera + Existing Wallet

### The Problem
Our app currently uses `ethers.Wallet.createRandom()` + `react-native-keychain`.
The bounty requires Mera passkey onboarding.

### The Solution: Dual-Mode Wallet
We will NOT rip out the existing wallet system. Instead:

1. **New users** → Mera passkey flow (bounty requirement)
2. **Existing users** → Keep working with their current private key
3. **Import** → Allow importing existing key INTO a Mera-protected account

This way we don't break Anurag's code AND we fulfill the bounty requirement.

### How the Mera service integrates:

```
src/services/mera/meraAuth.ts
  ├── register()     → Creates new passkey → derives account
  ├── login()        → Authenticates with existing passkey → recovers account
  ├── getAddress()   → Returns the EVM address from passkey-derived account
  └── getSession()   → Returns a signing session for transactions

src/services/mera/meraSigner.ts
  ├── signTransaction()  → Signs an EVM tx using the Mera session
  ├── signMessage()      → Signs arbitrary message
  └── toEthersSigner()   → Wraps Mera as an ethers.js Signer for compatibility
```

The `toEthersSigner()` wrapper is KEY — it lets us plug Mera into all of
Anurag's existing code that expects an ethers.js Signer, without changing
his files.

---

## 6. Blockers Resolved

| # | Question | Answer |
|---|----------|--------|
| 1 | Does Mera work in React Native? | ✅ YES — officially supported |
| 2 | Is AUSD on Monad? | ✅ YES — `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a` |
| 3 | Is USDC on Monad? | ✅ YES — `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` |
| 4 | Do we need WebView hack? | ❌ NO — native passkey support |
| 5 | Will it break existing features? | ❌ NO — additive, dual-mode design |

---

## 7. Next Steps (Ready to Code)

1. Install `@category-labs/mera` and `react-native-passkey`
2. Create `src/services/mera/meraAuth.ts` — passkey registration + login
3. Create `src/services/mera/meraSigner.ts` — ethers.js compatible signer
4. Create `src/config/tokens.ts` — token addresses and ABIs
5. Create `src/services/tokens/tokenBalance.ts` — multi-token balance fetching
6. Create `src/services/tokens/tokenTransfer.ts` — ERC-20 transfer logic
7. Test on physical Android device
