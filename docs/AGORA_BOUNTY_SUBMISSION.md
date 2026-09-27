# TapPay — Agora Bounty Submission

## Project Description

**Tagline:** Instant, cross-border tap-to-pay and username-to-username payments on Monad, powered by Agora AUSD and Mera Passkeys.

**The Problem:**
Cross-border payments are traditionally slow, expensive, and require complex onboarding with seed phrases or custodial platforms. Users want the simplicity of Apple Pay or Cash App, but with the borderless reach of crypto stablecoins.

**The Solution:**
TapPay bridges this gap on the Monad Testnet. We built a React Native wallet that enables instant, frictionless international payments using Agora Dollar (AUSD). 

**Key Features for the Bounty:**
1. **Mera Passkey Onboarding:** No seed phrases or passwords. Users create accounts and sign transactions natively on their devices using Face ID / Fingerprint via the Mera SDK.
2. **Cross-Border Remittances:** Users can search a `@username` (resolved on-chain via our Registry contract) and instantly send AUSD, USDC, or USDT.
3. **Instant Settlement:** Leveraging Monad's high throughput and ~1s finality, payments are settled before the UI animation even finishes.
4. **Multi-Token Ledger:** A newly deployed, non-custodial smart contract (`MultiTokenLedger`) that safely routes ERC-20 token transfers and native MON.

**Why Monad & Agora?**
Monad provides the speed required for a true "tap and go" retail experience, while Agora AUSD provides the stable, borderless medium of exchange required for real-world commerce.

---

## Demo Script

**Objective:** Show passkey onboarding, AUSD balance, and a completed send/receive transaction settled instantly.

**Step 1: Onboarding (Device A)**
- Open TapPay on a fresh install.
- Tap "Create Account".
- Native Face ID / Fingerprint prompt appears (Mera Passkey).
- User authenticates. Wallet is instantly derived and ready.

**Step 2: Balance Check**
- The Home screen prominently displays the AUSD balance (e.g., 50.00 AUSD).

**Step 3: Cross-Border Send**
- User navigates to the "Send" tab.
- Types in `@anurag` in the recipient field.
- Selects "AUSD" from the token selector.
- Enters `10.00` on the keypad.
- Taps "Send".
- Face ID prompt appears again to securely sign the transaction via Mera.

**Step 4: Instant Settlement**
- Transaction is broadcasted to the Monad Testnet.
- Within ~1 second, the UI shows a green "Payment Successful" checkmark.
- The AUSD balance on Device A drops to 40.00 AUSD.

**Step 5: Receiving (Device B)**
- On Device B (logged in as `@anurag`), a notification appears: "Received 10.00 AUSD from @aditya".
- The balance on Device B instantly reflects the new funds.
