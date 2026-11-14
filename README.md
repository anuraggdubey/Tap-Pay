<p align="center">
  <img src="docs/screenshots/social/logo.png" alt="TapPay" width="120" />
</p>

<h1 align="center">TapPay</h1>

<p align="center">
  <strong>Multi-chain phone-to-phone contactless payments — NFC tap or <code>@username</code> send across multiple blockchains — Stellar, Solana, Base and more.</strong>
</p>

<p align="center">
  <a href="https://x.com/tapxpay">
    <img src="https://img.shields.io/badge/Multi--Chain-EVM_%C2%B7_Stellar_%C2%B7_Solana_%C2%B7_Base-7B3FE4?style=for-the-badge&logo=ethereum&logoColor=white" alt="Multi-chain" />
  </a>
  <img src="https://img.shields.io/badge/Multi--Chain_APK-Coming_Soon-F59E0B?style=for-the-badge&logo=android&logoColor=white" alt="Multi-chain APK coming soon" />
  <a href="https://drive.google.com/file/d/1f8ZO1ian1y1d4o98g1C-SuV6wPYAysDC/view?usp=sharing">
    <img src="https://img.shields.io/badge/Watch-Demo_Video-FF0000?style=for-the-badge&logo=googledrive&logoColor=white" alt="Demo Video" />
  </a>
  <a href="https://x.com/tapxpay">
    <img src="https://img.shields.io/badge/Follow-@tapxpay-000000?style=for-the-badge&logo=x&logoColor=white" alt="X @tapxpay" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.87-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/Solidity-^0.8-363636?style=flat-square&logo=solidity&logoColor=white" alt="Solidity" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Hardhat-2.29-FFF100?style=flat-square&logo=hardhat&logoColor=black" alt="Hardhat" />
  <img src="https://img.shields.io/badge/License-All%20Rights%20Reserved-red?style=flat-square" alt="All Rights Reserved" />
</p>

---

## 📋 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [App Screenshots](#-app-screenshots)
- [How It Works](#-how-it-works)
- [Architecture](#-architecture)
- [Deployed Contracts](#-deployed-contracts)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [NFC Testing Guide](#-nfc-testing-guide)
- [Documentation](#-documentation)
- [Team](#-team)

---

## 🔴 The Problem

Cross-border payments are **slow**, **expensive**, and **complex**. Traditional solutions (SWIFT, Western Union) take days and charge 5–10% in fees. Crypto wallets, while faster, require users to manage hex addresses, seed phrases, and gas — creating a UX nightmare for everyday users.

**There is no "Apple Pay for crypto."** No one has built a payment experience where you can physically tap phones together and settle a stablecoin transaction in under a second, with zero seed phrases.

---

## 💡 The Solution

**TapPay** is a non-custodial mobile wallet that makes on-chain payments feel as effortless as tapping a contactless card. Built to be **multi-chain** — EVM chains, Stellar, Solana, Base and more — it harnesses fast-finality networks to deliver near-instant settlement across two intuitive payment modes:

| Mode | How It Works |
|:-----|:-------------|
| **📱 Tap Pay (NFC)** | Hold two phones together. The sender's address is read over NFC Host Card Emulation, the transaction is signed on-device, and payment settles on-chain — all in one tap. |
| **👤 Username Pay** | Search `@username`, enter an amount on a Cash App–style keypad, confirm, and send — no wallet addresses needed. |

**Key differentiators:**
- 🔐 **No seed phrases** — Passkey onboarding via Mera (Face ID / Fingerprint)
- 🏦 **Non-custodial** — Keys stay on-device (Android Keystore via `react-native-keychain`)
- 🌍 **Cross-border** — Send AUSD, USDC, USDT stablecoins to anyone with a `@username`
- ⚡ **Instant** — fast-finality chains mean payment confirms before the UI animation ends

---

## 📸 App Screenshots

<p align="center">
  <img src="docs/screenshots/social/Home.jpg" alt="TapPay Home — balance, tap pay, and quick actions" width="180" />
  &nbsp;
  <img src="docs/screenshots/social/payment%20screen.jpg" alt="TapPay Pay — username search and amount keypad" width="180" />
  &nbsp;
  <img src="docs/screenshots/social/history.jpg" alt="TapPay History — sent and received activity" width="180" />
  &nbsp;
  <img src="docs/screenshots/social/settings.jpg" alt="TapPay Settings — network, account, and security" width="180" />
</p>

<p align="center">
  <em>Home&nbsp;&nbsp;·&nbsp;&nbsp;Pay&nbsp;&nbsp;·&nbsp;&nbsp;History&nbsp;&nbsp;·&nbsp;&nbsp;Settings</em>
</p>

<p align="center">
  <strong>Product demo</strong> — <a href="docs/screenshots/social/watermark-removed.mp4">watch the NFC tap film</a> (also on the <a href="https://github.com/anuraggdubey/Tap-Pay">project site</a> at <code>/#watch-demo</code>).
</p>

---

## 🔄 How It Works

### Tap Pay (NFC) Flow

```
Sender opens app → Enters amount → "Ready to Tap"
                                        │
            ┌───────── NFC Tap ─────────┘
            ▼
Receiver's address read via HCE (HostApduService)
            │
            ▼
Sender signs tx locally (Android Keystore)
            │
            ▼
TapPayLedger.payWithLog() broadcasts on-chain
            │
            ▼
~1s finality → Both phones show Sent / Received receipt
```

### Username Pay Flow

```
User taps "Pay" → Searches @username → Selects token (AUSD/USDC/USDT/native)
                                        │
                                        ▼
                         Enter amount on keypad → Confirm
                                        │
                                        ▼
                  MultiTokenLedger.payERC20WithLog() or payWithLog()
                                        │
                                        ▼
                         ~1s settlement → Receipt shown
```

---

## 🏗 Architecture

```mermaid
graph TB
    subgraph "User Layer"
        A["📱 Sender Phone"] -->|NFC HCE| B["📱 Receiver Phone"]
        A -->|"@username Search"| C["Supabase DB"]
    end

    subgraph "Application Layer"
        D["React Native App"]
        D -->|Passkey Auth| E["Mera SDK"]
        D -->|Key Storage| F["Android Keystore"]
        D -->|NFC Read/Write| G["react-native-hce\nreact-native-nfc-manager"]
        D -->|Sign & Broadcast| H["ethers.js v6"]
    end

    subgraph "Blockchain Layer (multi-chain)"
        I["TapPayLedger\n(NFC Payments)"]
        J["MultiTokenLedger\n(Cross-Border / ERC-20)"]
        K["UsernameRegistry\n(@username ↔ address)"]
        L["AUSD / USDC / USDT\n(Stablecoins)"]
    end

    C -->|Resolve address| D
    H -->|payWithLog| I
    H -->|payERC20WithLog| J
    H -->|register / resolve| K
    J -->|transferFrom| L

    style I fill:#7B3FE4,color:#fff
    style J fill:#7B3FE4,color:#fff
    style K fill:#7B3FE4,color:#fff
```

---


## 📜 Deployed Contracts

> **Current deployment:** EVM mainnet (Chain ID `143`) · ~1s finality · more chains rolling out

| Contract | Address | Explorer |
|:---------|:--------|:---------|
| **UsernameRegistry** | `0x458DD61Db411ec1feFC069B7B094a983E3a3E265` | [View on explorer ↗](https://monadscan.com/address/0x458DD61Db411ec1feFC069B7B094a983E3a3E265) |
| **TapPayLedger** | `0x03907aE845E016f5F1605BAE4e6392C3491e03f1` | [View on explorer ↗](https://monadscan.com/address/0x03907aE845E016f5F1605BAE4e6392C3491e03f1) |
| **MultiTokenLedger** | `0x15319f757FC0e600E681bC0bffD69541916F8860` | [View on explorer ↗](https://monadscan.com/address/0x15319f757FC0e600E681bC0bffD69541916F8860) |

**Deployer:** [`0x1406Fe936D971A0dAE9a19DD3354b900B08Fa002`](https://monadscan.com/address/0x1406Fe936D971A0dAE9a19DD3354b900B08Fa002)

**Supported Tokens:**

| Token | Address |
|:------|:--------|
| AUSD | [`0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a`](https://monadscan.com/address/0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a) |
| USDC | [`0x754704Bc059F8C67012fEd69BC8A327a5aafb603`](https://monadscan.com/address/0x754704Bc059F8C67012fEd69BC8A327a5aafb603) |
| USDT | [`0xe7cd86e13AC4309349F30B3435a9d337750fC82D`](https://monadscan.com/address/0xe7cd86e13AC4309349F30B3435a9d337750fC82D) |

### Contract Details

<details>
<summary><strong>TapPayLedger</strong> — NFC payment rail</summary>

- Sender calls `payWithLog(to, sessionIdHash)` with `msg.value`
- Funds forward atomically to the recipient; emits `PaymentLogged`
- ReentrancyGuard + checks-effects-interactions
- Session-based replay protection
- Pausable / Ownable2Step
- **Pass-through only — zero custody**

</details>

<details>
<summary><strong>MultiTokenLedger</strong> — Cross-border ERC-20 payment rail</summary>

- Supports the native token via `payWithLog` and ERC-20 tokens via `payERC20WithLog`
- Routes standard ERC-20 `transferFrom` deposits atomically to the recipient
- Extended `PaymentLogged` event includes the token address
- Built for cross-border stablecoin payments

</details>

<details>
<summary><strong>UsernameRegistry</strong> — On-chain identity mapping</summary>

- Maps `@username` ↔ wallet address on-chain
- Used for human-readable payments and reverse lookup on receipts
- `@username` resolution cached via Supabase (`chain_id` **143** only)

</details>

---

## ⚙️ Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Mobile** | React Native 0.87 (bare workflow), TypeScript |
| **NFC / HCE** | `react-native-hce`, Android `HostApduService` |
| **NFC Reader** | `react-native-nfc-manager` |
| **Wallet** | `ethers.js` v6 + Android Keystore (`react-native-keychain`) |
| **Passkeys** | `@category-labs/mera` + `react-native-passkey` |
| **Blockchain** | Multi-chain — EVM mainnet (Chain ID `143`) live; Stellar, Solana, Base and more |
| **Smart Contracts** | Solidity (Hardhat), OpenZeppelin |
| **Identity** | Supabase `@username` → address resolution |
| **CI/CD** | GitHub Actions → debug APK artifact |

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 22 (see `engines` in `package.json`)
- JDK 17
- Android SDK (API 34 + Build-Tools 34)
- **Two physical Android devices with NFC** (emulators cannot do HCE)

```bash
# macOS / Linux
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Android/Sdk
```

### Install & Run

```bash
git clone https://github.com/anuraggdubey/Tap-Pay.git
cd Tap-Pay
npm install

# Terminal 1 — Metro bundler
npm start

# Terminal 2 — Build & install
npx react-native run-android
```

### Deploy Contracts (optional)

```bash
cp .env.example .env
# Add DEPLOYER_PRIVATE_KEY (fund with the native token for gas)
npm run deploy:mainnet
```

---

## 📁 Project Structure

```
TapPay/
├── android/                        # Native Android + HCE service
├── contracts/
│   ├── TapPayLedger.sol            # NFC payment contract
│   ├── UsernameRegistry.sol        # @username ↔ address mapping
│   └── AgoraBounty/
│       └── MultiTokenLedger.sol    # Cross-border ERC-20 payments
├── src/
│   ├── config/monad.ts             # RPC, chain ID, contract addresses
│   ├── services/
│   │   ├── wallet.ts               # Wallet creation, signing, keychain
│   │   ├── hce.ts                  # HCE card emulation
│   │   ├── nfcReader.ts            # NFC reader mode
│   │   ├── tapPayment.ts           # Tap Pay transaction logic
│   │   ├── registry.ts             # Username resolution
│   │   ├── multiTokenLedger.ts     # Multi-token payment routing
│   │   ├── crossBorder/            # Cross-border payment logic
│   │   ├── mera/                   # Passkey (Mera) integration
│   │   └── tokens/                 # Token config & balances
│   ├── screens/                    # 13 screens (Home, Send, Receive, History…)
│   ├── components/                 # UI (radar, waiting card, modals…)
│   └── navigation/                 # Stack + tab navigation
├── scripts/                        # Hardhat deploy scripts
├── test/                           # Contract unit tests
├── docs/
│   └── screenshots/social/           # App UI captures, logo.png (README), demo MP4
└── .github/workflows/              # CI → APK artifact
```

---

## 📱 APK Status

> The multi-chain Android APK is **coming soon**. The website no longer offers a direct download; follow [@tapxpay](https://x.com/tapxpay) for the launch.

---

## 📡 NFC Testing Guide

> ⚠️ NFC Host Card Emulation requires **two physical Android phones**. Emulators cannot test phone-to-phone tap.

| Step | Sender Phone | Receiver Phone |
|:-----|:-------------|:---------------|
| **1** | Install APK (coming soon), enable NFC | Install APK (coming soon), enable NFC |
| **2** | Enter amount → tap "Ready to Tap" | Open **Receive Tap** (broadcasts wallet address via HCE) |
| **3** | Hold phones together (~4cm) | — |
| **4** | Reads address, signs, broadcasts `payWithLog` on `TapPayLedger` | — |
| **5** | ✅ "Sent" receipt | ✅ "Received" receipt, balance updates in ~1–2s |

---

## 📚 Documentation

| Document | Description |
|:---------|:------------|
| [`TapPay-Technical-Spec.md`](./docs/TapPay-Technical-Spec.md) | Full product & architecture spec |
| [`SUPABASE_MAINNET.md`](./docs/SUPABASE_MAINNET.md) | `@username` DB migration guide (chain 143) |
| [`requirement.txt`](./docs/requirement.txt) | Full dev environment prerequisites |
| [`docs/screenshots/social/`](./docs/screenshots/social/) | App UI captures, README `logo.png`, product demo MP4 |

---

## 👥 Team

TapPay is built and maintained by:

| | Name | X |
|:--|:-----|:--|
| 🧑‍💻 | **Anurag Dubey** — Founder & owner | [@anuraggdubeyy](https://x.com/anuraggdubeyy) |
| 🧑‍💻 | **Aditya Nishad** — Co-founder | [@AdityaNishad987](https://x.com/AdityaNishad987) |
| 🎨 | **Misbah Ansari** — UI/UX designer & contributor | [@Misbahtwts](https://x.com/Misbahtwts) |

<p align="center">
  <a href="https://x.com/tapxpay">
    <img src="https://img.shields.io/badge/Follow_TapPay-@tapxpay-000000?style=for-the-badge&logo=x&logoColor=white" alt="Follow @tapxpay" />
  </a>
</p>

---

<p align="center">
  <strong>© 2026 Anurag Dubey. All Rights Reserved.</strong> · Built with 💜 for a multi-chain world
</p>
