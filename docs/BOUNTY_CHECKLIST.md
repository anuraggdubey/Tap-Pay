# TapPay — Agora Bounty: Master Checklist

> **Bounty**: Best Cross-Border Payments App on Monad ($10,000)
> **Deadline**: Oct 14, 2026 at 09:29 GMT+5:30
> **Last Updated**: Sep 25, 2026

---

## 📋 How to Use This Checklist

- `[ ]` = Not started
- `[~]` = In progress
- `[x]` = Done & tested
- `[!]` = Blocked (see notes)

After completing each item, update this file and note the date.

---

## 🚀 Next Actions for Tomorrow

1. **Setup Deployment Wallet**: Create a `.env` file in the root directory with `DEPLOYER_PRIVATE_KEY=<your_testnet_private_key>` (export a burner wallet from MetaMask). Get Monad Testnet MON from `https://faucet.monad.xyz` to pay for deployment gas.
2. **Deploy to Testnet (Phase 3C)**: Run `npx hardhat run scripts/deployMultiTokenLedger.js --network monad_testnet`. This will deploy the ledger and mock AUSD/USDC.
3. **Update Config**: Copy the deployed `MultiTokenLedger` address into `src/config/monad.ts`.
4. **Coordinate with Anurag (Phase 4B)**: Give him the new `transferService.ts` and `tokenBalance.ts` so he can start wiring up the UI for the Token Selector and Cross-Border Send button.
5. **App Testing (Phase 1C & 2C)**: Boot up the Android emulator/device and test the Face ID registration and token fetching flows end-to-end.

---

## Phase 0: Setup & Research (Before Any Code)

- [x] Read bounty requirements thoroughly (Sep 24)
- [x] Research Mera passkey library (Sep 24)
- [x] Research Agora AUSD documentation (Sep 24)
- [x] Research Monad instant settlement (Sep 24)
- [x] Understand current TapPay codebase (Sep 24)
- [x] Create BOUNTY_RULES.md (Sep 25)
- [x] Create BOUNTY_CHECKLIST.md — this file (Sep 25)
- [x] Find AUSD contract address on Monad mainnet (Sep 25) — `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a`
- [x] Find USDC contract address on Monad (Sep 25) — `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`
- [~] Find USDT contract address on Monad — bridged via LayerZero, needs canonical verify
- [x] Verify Mera npm package works with React Native (Sep 25) — NATIVE SUPPORT! No WebView needed!

---

## Phase 1: Mera Passkey Authentication 🔑

> This is the HARDEST part and a MANDATORY bounty requirement.
> The demo must show passkey onboarding (Face ID / Fingerprint).

### 1A: Research & Proof of Concept
- [ ] Install Mera npm package
- [ ] Read Mera SDK documentation fully
- [ ] Build a minimal WebView test that runs Mera passkey registration
- [ ] Confirm passkey ceremony works on Android physical device
- [ ] Document any React Native limitations with WebAuthn

### 1B: Build the Mera Service Layer
- [x] Create `src/services/mera/meraAuth.ts` (Sep 25)
      — Passkey registration (create account)
      — Passkey login (recover account)
      — Get wallet address from passkey
- [x] Create `src/services/mera/meraWebView.ts` -> NOT NEEDED (Native support confirmed)
- [x] Create `src/services/mera/meraSigner.ts` (Sep 25)
      — Sign transactions using Mera account
      — Return signed transaction to the app
      — Wraps as ethers.js Signer for compatibility

### 1C: Integration & Testing
- [ ] Test passkey registration on physical Android device
- [ ] Test passkey login on the same device
- [ ] Test passkey login on a DIFFERENT device (cross-device)
- [ ] Test transaction signing through Mera
- [ ] Confirm existing wallet flow still works (don't break it)

---

## Phase 2: Multi-Token Support (AUSD, USDC, USDT, MON) 💰

> Must support AUSD (bounty requirement) + other tokens for a better product.

### 2A: Token Configuration
- [x] Create `src/config/tokens.ts` (Sep 25)
      — Token addresses for Monad network
      — Token decimals, symbols, names
      — Token contract ABIs (ERC-20 standard)
- [x] Create `src/config/agora.ts` (Sep 27)
      — Agora-specific endpoints or configs

### 2B: Token Service Layer
- [x] Create `src/services/tokens/tokenConfig.ts` -> Included in `tokens.ts` (Sep 25)
- [x] Create `src/services/tokens/tokenBalance.ts` (Sep 25)
      — Fetch ERC-20 balance for any token
      — Fetch native MON balance (already exists, reuse)
      — Handle errors gracefully (wrong address, network down)
- [x] Create `src/services/tokens/tokenTransfer.ts` (Sep 25)
      — ERC-20 `transfer()` for AUSD/USDC/USDT
      — Native MON transfer (already exists, reuse)
      — Estimate gas before sending
      — Return transaction hash

### 2C: Testing
- [ ] Test fetching AUSD balance
- [ ] Test fetching USDC balance
- [ ] Test fetching USDT balance
- [ ] Test sending AUSD to another address
- [ ] Test sending USDC to another address
- [ ] Test sending USDT to another address
- [ ] Test sending MON still works (regression test)
- [ ] Test with zero balance (should show friendly error)
- [ ] Test with insufficient balance (should show friendly error)

---

## Phase 3: Smart Contract Updates 📄

> New contracts that support ERC-20 token payments alongside native MON.

### 3A: Contract Development
- [x] Create `contracts/AgoraBounty/MultiTokenLedger.sol` (Sep 25)
      — Accept ERC-20 tokens via `transferFrom`
      — Accept native MON via `msg.value` (backward compatible)
      — Emit `PaymentLogged` event with token address
      — ReentrancyGuard + Pausable + Ownable2Step
      — No custody — atomic pass-through only
- [x] Create `contracts/AgoraBounty/interfaces/IERC20.sol` (Sep 25)
      — Standard ERC-20 interface

### 3B: Contract Testing
- [x] Write unit tests for MultiTokenLedger (Sep 25)
      — Test ERC-20 payment flow
      — Test native MON payment flow
      — Test replay protection
      — Test pause/unpause
      — Test zero-amount rejection
      — Test self-pay rejection
- [x] All tests pass locally with `npx hardhat test` (Sep 25)

### 3C: Contract Deployment
- [x] Deploy MultiTokenLedger to Monad testnet (Sep 27) — `0x9830B8638085a0da1eDB5e2f0Daa110d24B82f7E`
- [ ] Verify contract on Monadscan
- [x] Update `src/config/monad.ts` with new contract address (Sep 27)
- [ ] Test contract from the app end-to-end

---

## Phase 4: Cross-Border Payment UX 🌍

> The bounty specifically asks for cross-border payments.
> Username Pay is our cross-border solution.

### 4A: Cross-Border Service
- [x] Create `src/services/crossBorder/transferService.ts` (Sep 25)
      — Orchestrate: select token → resolve username → transfer
      — Handle multi-token selection
      — Return clear success/failure status

### 4B: UI/UX Updates (Coordinate with Anurag)
- [ ] Discuss with Anurag: new "Cross-Border" screen or modify existing?
- [ ] Token selector component (pick AUSD/USDC/USDT/MON)
- [ ] Show AUSD balance prominently on home screen
- [ ] "Send Cross-Border" button that goes to Username Pay with token selection
- [ ] Transaction receipt shows token type (AUSD, USDC, etc.)
- [ ] Success animation after instant settlement (~600ms on Monad)

> ⚠️ UI changes are Anurag's territory. Coordinate and let him
> implement the screens. Aditya provides the service layer only.

---

## Phase 5: Demo Preparation 🎬

> The bounty requires: "A working demo showing passkey onboarding,
> an AUSD balance, and a completed send/receive transaction settled
> instantly."

### 5A: Demo Scenario Script
- [ ] Write step-by-step demo script:
      1. Fresh app install → Passkey registration (Face ID)
      2. Show AUSD balance on home screen
      3. Send AUSD to another user via @username
      4. Show instant settlement (~1 second confirmation)
      5. Receiver shows updated AUSD balance
- [ ] Practice the demo flow 3+ times
- [ ] Record backup video demo

### 5B: Demo Readiness Checks
- [ ] Passkey onboarding works on camera (Face ID animation visible)
- [ ] AUSD balance displays correctly
- [ ] Send transaction completes in under 2 seconds
- [ ] Receive notification shows on other device
- [ ] App doesn't crash during demo flow
- [ ] Testnet has enough AUSD for demo (get from faucet/team)

### 5C: Submission Materials
- [ ] Update README.md with bounty info
- [ ] Record final demo video
- [ ] Take clean screenshots
- [ ] Write project description for hackathon submission
- [ ] Submit project before deadline (Oct 14, 09:29 GMT+5:30)

---

## 🚨 Blockers & Open Questions

| # | Question | Status | Answer |
|---|----------|--------|--------|
| 1 | Is AUSD deployed on Monad? | ✅ Resolved | Yes — `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a` (mainnet) |
| 2 | Does Mera have a React Native SDK? | ✅ Resolved | Yes — `@category-labs/mera` supports RN natively (Android 9+, iOS 18+) |
| 3 | Can WebAuthn work in React Native WebView? | ✅ Not Needed | Mera works natively via `react-native-passkey` — no WebView needed |
| 4 | Do we need Agora API keys for staging? | ❓ Need to check | — |
| 5 | Is Monad mainnet live? | ✅ Resolved | Yes — launched Nov 24, 2025 |

---

## 📊 Progress Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 0: Setup & Research | ✅ Complete | 95% |
| Phase 1: Mera Passkey | 🟡 Code Complete, Needs Testing | 60% |
| Phase 2: Multi-Token | 🟡 Code Complete, Needs Testing | 65% |
| Phase 3: Smart Contracts | ✅ Deployed to Testnet | 85% |
| Phase 4: Cross-Border UX | 🟡 Service Complete, UI Pending | 40% |
| Phase 5: Demo Prep | ⬜ Not Started | 0% |

**Overall Progress: ~70%**

---

> 💡 **Tip**: Update this file every time you complete a task.
> Check items off, add dates, and move on to the next item.
> If something is blocked, add it to the Blockers table above.
