# TapPay — Agora Bounty: Development Rules & Boundaries

> **Purpose**: Strict rules for the Agora Payments Bounty ($10,000) work.
> Read this FIRST before touching any code. These rules prevent Aditya
> and Anurag from stepping on each other's work and ensure every change
> is safe, tested, and trackable.

**Bounty**: Best Cross-Border Payments App on Monad (Agora Payments Bounty)
**Deadline**: Oct 14, 2026 at 09:29 GMT+5:30
**Track**: Consumer Products & Payments

---

## 🔴 RULE 1 — NEVER TOUCH ANURAG'S FILES

These files belong to **Anurag**. Do NOT modify, rename, delete, or
move them under ANY circumstance:

```
src/screens/HomeScreen.tsx
src/screens/SendTapScreen.tsx
src/screens/ReceiveTapScreen.tsx
src/screens/SendPaymentScreen.tsx
src/screens/SettingsScreen.tsx
src/screens/AccountInfoScreen.tsx
src/screens/NetworkScreen.tsx
src/screens/AboutScreen.tsx
src/screens/TransactionHistoryScreen.tsx
src/screens/TransactionStatusScreen.tsx
src/screens/UsernamePayScreen.tsx
src/screens/WalletSetupScreen.tsx

src/services/hce.ts
src/services/nfcReader.ts
src/services/wallet.ts
src/services/tapPayment.ts
src/services/tapNfcNative.ts
src/services/history.ts
src/services/registry.ts

src/utils/apdu.ts
src/utils/format.ts
src/utils/haptics.ts
src/utils/type4Nfc.ts
src/utils/validation.ts

src/context/WalletContext.tsx

src/components/AppIcons.tsx
src/components/BrandLogo.tsx
src/components/ConfirmPaymentModal.tsx
src/components/GlobalAlert.tsx
src/components/InsufficientBalanceModal.tsx
src/components/NfcNotAvailableModal.tsx
src/components/NfcWaitingCard.tsx
src/components/PulsingRadar.tsx

src/navigation/AppNavigator.tsx
src/theme/index.ts

App.tsx
index.js
android/*
ios/*
.github/workflows/*
```

**Exception**: You may READ these files to understand how things work,
but you must NEVER write to them.

---

## 🔴 RULE 2 — ANURAG NEVER TOUCHES ADITYA'S FILES

These files belong to **Aditya**. Anurag must NOT modify them:

```
contracts/TapPayLedger.sol
contracts/UsernameRegistry.sol
contracts/test/*

hardhat.config.js
scripts/deploy.js
test/*

docs/BOUNTY_RULES.md
docs/AGORA_BOUNTY_SUBMISSION.md
docs/SUPABASE_MAINNET.md
docs/TapPay-Technical-Spec.md
docs/requirement.txt
```

Plus any NEW files/folders Aditya creates (see Rule 4).

---

## 🟡 RULE 3 — SHARED FILES (COORDINATE BEFORE CHANGING)

These files are shared. **Both must agree before any change:**

| File | What Aditya Can Touch | What Anurag Can Touch |
|------|----------------------|----------------------|
| `src/config/monad.ts` | Contract addresses, token configs | RPC URLs, chain settings |
| `package.json` (root) | Hardhat/contract deps only | React Native deps only |
| `README.md` | Bounty info, contract docs | App usage, screenshots |
| `.env.example` | Backend/contract env vars | App env vars |

**Process for shared files:**
1. Tell the other person BEFORE you edit
2. Make the smallest possible change
3. Test that the other person's code still works after

---

## 🟢 RULE 4 — ADITYA'S NEW FILES (Full Ownership)

Aditya will create all new bounty-related code in these locations:

```
# New: Mera Passkey Authentication
src/services/mera/              # Mera passkey integration
  ├── meraAuth.ts               # Passkey registration & login
  ├── meraWebView.ts            # WebView bridge for WebAuthn
  └── meraSigner.ts             # Signing transactions via Mera

# New: Multi-Token Support (AUSD, USDC, USDT, MON)
src/services/tokens/            # Token management
  ├── tokenConfig.ts            # Token addresses, decimals, ABIs
  ├── tokenBalance.ts           # Fetch balances for all tokens
  └── tokenTransfer.ts          # Send any supported token

# New: Cross-Border Payment Logic
src/services/crossBorder/       # Cross-border specific logic
  ├── currencyConverter.ts      # Display local currency equivalents
  └── transferService.ts        # Multi-token transfer orchestrator

# New: Agora-specific Integration
src/services/agora/             # Agora AUSD specific code
  └── agoraConfig.ts            # Agora contract details & setup

# New: Smart Contracts for Bounty
contracts/AgoraBounty/          # New contracts (don't modify old ones)
  ├── MultiTokenLedger.sol      # Payment ledger supporting ERC-20 tokens
  └── interfaces/IERC20.sol     # ERC-20 interface

# New: Config Extensions
src/config/tokens.ts            # Token list & addresses
src/config/agora.ts             # Agora-specific config
```

---

## 🔴 RULE 5 — SAFETY PRECAUTIONS (Follow Every Time)

### Before Writing ANY Code:
1. ✅ Read this rules file
2. ✅ Skim `docs/AGORA_BOUNTY_SUBMISSION.md` and `docs/TapPay-Technical-Spec.md` for current scope
3. ✅ Confirm you are editing a file YOU own (see Rules 1-4)

### Before Every Change:
4. ✅ Create new files in YOUR folders — never modify existing files
   that belong to the other person
5. ✅ If you need something from the other person's code, IMPORT it
   — don't copy-paste or modify the original
6. ✅ Test that the app still builds after your change
7. ✅ Test that existing features (NFC, Username Pay) still work

### For Smart Contracts:
8. ✅ Write unit tests for every new contract
9. ✅ Use OpenZeppelin v5 import paths
10. ✅ Follow checks-effects-interactions pattern
11. ✅ No contract should ever hold user funds (pass-through only)
12. ✅ Deploy to testnet first, verify on explorer, then update config

### For Token Integration:
13. ✅ Always check token decimals (AUSD=6, USDC=6, USDT=6, MON=18)
14. ✅ Always validate token addresses before sending
15. ✅ Handle the case where user has zero balance gracefully
16. ✅ Show clear error messages for failed transfers

---

## 🔴 RULE 6 — GIT WORKFLOW

1. **Never push directly to main** — always use a feature branch
2. **Branch naming**: `bounty/feature-name` (e.g., `bounty/mera-passkey`)
3. **Commit messages**: Start with `[bounty]` prefix
   - Example: `[bounty] add Mera passkey authentication service`
4. **Pull before push** — always pull latest changes first
5. **If there's a merge conflict in the other person's file — STOP
   and talk to them**

---

## 🔴 RULE 7 — WHAT TO DO IF SOMETHING BREAKS

1. **If the app won't build after your change:**
   - Undo your last change immediately
   - Check if you accidentally modified someone else's file
   - Check imports — did you break an import path?

2. **If existing features stop working:**
   - Your new code should NEVER modify existing feature behavior
   - New features should be ADDITIVE (add new screens, new services)
   - If you need to change how something works, discuss first

3. **If you're unsure whether a file is yours:**
   - Check Rules 1-4 in this document
   - If still unsure — don't touch it, ask first

---

## Token Support Matrix

| Token | Symbol | Expected Decimals | Priority |
|-------|--------|-------------------|----------|
| Agora Dollar | AUSD | 6 | 🔴 Must Have (bounty requirement) |
| USD Coin | USDC | 6 | 🟡 Should Have |
| Tether | USDT | 6 | 🟡 Should Have |
| Monad (native) | MON | 18 | 🟢 Already Works |

> Note: AUSD is mandatory for the bounty. USDC and USDT are additions
> to make TapPay a more complete product and impress judges.

---

## Resume Instructions (New Session / Token Depletion)

1. Read `docs/BOUNTY_RULES.md` (this file)
2. Read `docs/TapPay-Technical-Spec.md` and `docs/AGORA_BOUNTY_SUBMISSION.md`
3. Check what files exist in your territory (Rule 4)
4. **NEVER modify Anurag's files** — always create new files
