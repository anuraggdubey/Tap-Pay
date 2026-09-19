# TapPay

> Phone-to-phone contactless payments (NFC tap) & username-based payments, settling on [Monad testnet](https://docs.monad.xyz).

[![Build APK](https://github.com/anuraggdubey/Tap-Pay/actions/workflows/build.yml/badge.svg)](https://github.com/anuraggdubey/Tap-Pay/actions/workflows/build.yml)

## What is TapPay?

TapPay lets two people pay each other by:
1. **Tap Pay** — physically tapping phones together (NFC Host Card Emulation)
2. **Username Pay** — searching a username instead of a wallet address

All transactions settle on-chain as native MON transfers on the Monad testnet.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native 0.87 (bare workflow, TypeScript) |
| NFC / HCE | `react-native-hce`, Android `HostApduService` |
| NFC Reader | `react-native-nfc-manager` |
| Wallet / Signing | `ethers.js` v6, Android Keystore via `react-native-keychain` |
| Chain | Monad Testnet (Chain ID: 10143, EVM-compatible) |
| Username Registry | On-chain Solidity contract (`UsernameRegistry.sol`) |
| Payment Ledger | On-chain Solidity contract (`TapPayLedger.sol`) |
| CI / Build | GitHub Actions → debug APK artifact |

## Prerequisites

See [`requirement.txt`](./requirement.txt) for the full list. Quick version:

- **Node.js** >= 18.x (20 LTS recommended)
- **JDK 17** (Eclipse Temurin recommended)
- **Android SDK** with API 34 + Build-Tools 34.0.0
- **Two physical Android devices** with NFC for tap testing (emulators can't do HCE)

### Environment Variables

```bash
# Windows
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk

# macOS / Linux
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Android/Sdk
```

## Quick Start

```bash
# 1. Clone & install
git clone https://github.com/anuraggdubey/Tap-Pay.git
cd Tap-Pay
npm install

# 2. Start Metro bundler (JS hot reload)
npm start

# 3. Build & run on connected device (requires Android SDK locally)
npx react-native run-android

# OR download the pre-built APK from GitHub Actions:
# → Actions tab → latest "Build TapPay APK" run → download artifact
```

## Project Structure

```
TapPay/
├── android/                          # Android native project
│   └── app/src/main/
│       ├── java/com/tappay/
│       │   └── TapPayHceService.kt   # Native HostApduService for NFC HCE
│       ├── res/xml/apduservice.xml    # AID declaration for TapPay
│       └── AndroidManifest.xml        # NFC permissions + HCE service registration
├── contracts/                         # Solidity smart contracts (Hardhat)
│   ├── UsernameRegistry.sol           # On-chain username → address mapping
│   └── TapPayLedger.sol               # Payment logging with session-based replay protection
├── src/
│   ├── config/
│   │   └── monad.ts                   # Monad testnet RPC, chain ID, contract addresses
│   ├── services/
│   │   ├── wallet.ts                  # Key generation, secure storage, signing, broadcasting
│   │   ├── hce.ts                     # HCE session management + binary payload encoding
│   │   ├── nfcReader.ts               # NFC reader mode + payload decoding & verification
│   │   └── registry.ts               # UsernameRegistry contract interactions
│   ├── context/
│   │   └── WalletContext.tsx           # Global wallet state provider
│   ├── hooks/
│   │   ├── useNfc.ts                  # NFC availability check
│   │   ├── useTransaction.ts          # Build, sign, broadcast, poll receipt
│   │   └── useBalance.ts             # Auto-refreshing balance
│   ├── screens/
│   │   ├── WalletSetupScreen.tsx      # Onboarding: create/import wallet + username
│   │   ├── HomeScreen.tsx             # Balance, recent tx, action buttons
│   │   ├── SendTapScreen.tsx          # Enter amount → arm HCE → "Hold phones together"
│   │   ├── ReceiveTapScreen.tsx       # NFC reader → accept/reject → confirmation
│   │   ├── UsernamePayScreen.tsx      # Search username → resolve → send
│   │   ├── TransactionStatusScreen.tsx # Pending/confirmed/failed + explorer link
│   │   ├── TransactionHistoryScreen.tsx # Past payments list
│   │   └── SettingsScreen.tsx         # Export key, username, wallet QR
│   ├── components/                    # Reusable UI components
│   ├── utils/
│   │   ├── apdu.ts                    # Binary APDU encode/decode (NOT JSON)
│   │   ├── format.ts                  # Address truncation, MON formatting
│   │   └── validation.ts             # Amount & username validation
│   └── navigation/
│       └── AppNavigator.tsx           # NativeStack navigator
├── App.tsx                            # Root component
├── .github/workflows/build.yml        # CI: build debug APK on push
├── requirement.txt                    # Full dependency & setup guide
├── TapPay-Technical-Spec.md           # Technical specification
└── TapPay-Implementation-Plan.md      # Detailed implementation plan
```

## Monad Testnet Config

| Setting | Value |
|---|---|
| Chain ID | `10143` |
| RPC (primary) | `https://testnet-rpc.monad.xyz` |
| RPC (fallback) | `https://rpc.ankr.com/monad_testnet` |
| Explorer | `https://testnet.monadscan.com` |
| Faucet | `https://faucet.monad.xyz` |
| Currency | MON (18 decimals) |

## Deployed Contracts (Monad Testnet)

Both smart contracts are **live and verified** on Monad Testnet (Chain ID: 10143).

| Contract | Address | Explorer Link |
|---|---|---|
| **UsernameRegistry** | `0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD` | [View on Monadscan ↗](https://testnet.monadscan.com/address/0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD) |
| **TapPayLedger** | `0x5B177FEF554dA84A86be62E45fb49BB52e6D6838` | [View on Monadscan ↗](https://testnet.monadscan.com/address/0x5B177FEF554dA84A86be62E45fb49BB52e6D6838) |

**Deployer:** [`0x1406Fe936D971A0dAE9a19DD3354b900B08Fa002`](https://testnet.monadscan.com/address/0x1406Fe936D971A0dAE9a19DD3354b900B08Fa002)

### TapPayLedger — On-chain Payment Logger

The payment rail for both Tap Pay (NFC) and Username Pay flows. Sender calls `payWithLog()` with native MON — funds pass through atomically to the recipient with an on-chain event log.

**Security features:**
- 🛡️ ReentrancyGuard + Checks-Effects-Interactions pattern
- 🔁 Session-based replay protection (each NFC tap gets a unique `sessionId`)
- ⏰ Optional deadline enforcement for session expiry
- 💰 Configurable min/max payment limits (default: 0.0001 – 10,000 MON)
- 🚫 Direct ETH send rejection (prevents accidental fund locking)
- ⏸️ Pausable emergency stop (owner-only)
- 🔐 Ownable2Step safe ownership transfer
- 📊 On-chain analytics (`totalPayments`, `totalVolume`)
- 📦 Batch payment support (`payMultiple()` for up to 10 recipients)

### UsernameRegistry — On-chain Identity Layer

Maps human-readable usernames to Monad wallet addresses. Fully on-chain — no off-chain database needed.

**Features:**
- ✅ Register unique usernames (3-20 chars: `a-z`, `0-9`, `_`)
- 🔍 `resolve(username)` → address lookup
- 🔄 `reverseResolve(address)` → username lookup
- 🆓 Self-service `release()` to free your username
- 👮 Admin `adminRemove()` for abusive/inappropriate names
- 📊 `totalRegistrations` counter
- 🔎 `isAvailable(username)` for UI pre-checks

## NFC Testing

> ⚠️ NFC Host Card Emulation requires **two physical Android devices**. Emulators cannot test phone-to-phone tap.

1. Install the debug APK on both phones
2. Enable NFC in Android Settings on both
3. **Phone A** (Sender): Tap "Send" → enter amount → "Hold phones together"
4. **Phone B** (Receiver): Tap "Receive" → bring phones together → tap "Accept"
5. Transaction confirms on Monad testnet in ~1-2 seconds

## CI / APK Builds

The project builds via GitHub Actions (no local Android SDK needed for APK generation):

- Pushes to `main` trigger `.github/workflows/build.yml`
- The workflow compiles a debug APK and uploads it as a workflow artifact
- Download from the Actions tab → install on phone via `adb install` or file transfer

Only re-trigger the build when native code changes (Gradle config, AndroidManifest, native deps). JS-only changes use Metro hot reload.

## Documentation

- [`TapPay-Technical-Spec.md`](./TapPay-Technical-Spec.md) — High-level architecture & concept
- [`TapPay-Implementation-Plan.md`](./TapPay-Implementation-Plan.md) — Deep technical implementation plan
- [`requirement.txt`](./requirement.txt) — Complete dependency list for contributors

## License

MIT
