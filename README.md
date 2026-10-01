# TapPay

Phone-to-phone contactless payments on [Monad Mainnet](https://docs.monad.xyz) — NFC tap or `@username` send, settled on-chain (MON and stablecoins).

<p align="center">
  <a href="https://x.com/tapxpay">
    <img src="https://img.shields.io/badge/X%20Account-%40tapxpay-000000?style=for-the-badge&logo=x&logoColor=white" alt="X Account @tapxpay" />
  </a>
</p>

<p align="center">
  <img src="docs/screenshots/home.png" alt="TapPay Home — Card & NFC actions" width="46%" />
  &nbsp;
  <img src="docs/screenshots/settings.png" alt="TapPay Settings — Network & account" width="46%" />
</p>

<p align="center">
  <em>Home (Card) &nbsp;·&nbsp; Settings</em>
</p>

---

## Quick Links (for judges)

| | |
|:--|:--|
| **X Account** | [![X Account](https://img.shields.io/badge/X%20Account-%40tapxpay-000000?style=flat-square&logo=x&logoColor=white)](https://x.com/tapxpay) &nbsp; [Here is the link: x.com/tapxpay](https://x.com/tapxpay) |
| **APK Download** | [Tap-pay.apk (Google Drive)](https://drive.google.com/file/d/1w3K3PTeqvt250qMJne4azXeU4D35dC8P/view?usp=drivesdk) |
| **Video Demo** | [tappay.mp4 (Google Drive)](https://drive.google.com/file/d/1f8ZO1ian1y1d4o98g1C-SuV6wPYAysDC/view?usp=sharing) |
| **UsernameRegistry** | [`0x458DD61Db411ec1feFC069B7B094a983E3a3E265`](https://monadscan.com/address/0x458DD61Db411ec1feFC069B7B094a983E3a3E265) |
| **TapPayLedger** | [`0x03907aE845E016f5F1605BAE4e6392C3491e03f1`](https://monadscan.com/address/0x03907aE845E016f5F1605BAE4e6392C3491e03f1) |
| **MultiTokenLedger** | [`0x15319f757FC0e600E681bC0bffD69541916F8860`](https://monadscan.com/address/0x15319f757FC0e600E681bC0bffD69541916F8860) |

---

## What is TapPay?

TapPay is a React Native wallet that settles payments on **Monad Mainnet** (Chain ID `143`).

**Two ways to pay**

1. **Tap Pay (NFC)** — sender reads the receiver’s address over NFC Host Card Emulation, then broadcasts `payWithLog` on TapPayLedger
2. **Username / Address Pay** — search `@username` (or paste a wallet address), enter amount on a Cash App–style keypad, confirm, and send

Keys stay on-device (Android Keystore via `react-native-keychain`). No custodial balances.

---

## 🏆 Agora Bounty: Cross-Border Payments

TapPay has been expanded for the **Best Cross-Border Payments App on Monad** bounty:
- **Agora Dollar (AUSD) Integration**: Seamlessly send stablecoins (AUSD, USDC, USDT) cross-border using `@username` resolution.
- **Passkey Onboarding (Mera)**: Frictionless account creation and transaction signing using Face ID / Fingerprint via `@category-labs/mera`.
- **Instant Settlement**: Harnessing Monad's ~1s finality for instant international remittances.

---

## Deployed Contracts (Monad Mainnet)

**Network:** Monad Mainnet · Chain ID `143` · ~1s finality

| Contract | Address | Explorer |
|:---------|:--------|:---------|
| **UsernameRegistry** | `0x458DD61Db411ec1feFC069B7B094a983E3a3E265` | [View on Monadscan](https://monadscan.com/address/0x458DD61Db411ec1feFC069B7B094a983E3a3E265) |
| **TapPayLedger** | `0x03907aE845E016f5F1605BAE4e6392C3491e03f1` | [View on Monadscan](https://monadscan.com/address/0x03907aE845E016f5F1605BAE4e6392C3491e03f1) |
| **MultiTokenLedger** | `0x15319f757FC0e600E681bC0bffD69541916F8860` | [View on Monadscan](https://monadscan.com/address/0x15319f757FC0e600E681bC0bffD69541916F8860) |

**Deployer:** [`0x1406Fe936D971A0dAE9a19DD3354b900B08Fa002`](https://monadscan.com/address/0x1406Fe936D971A0dAE9a19DD3354b900B08Fa002)

**Mainnet tokens (Pay tab):** AUSD `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a` · USDC `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` · USDT `0xe7cd86e13AC4309349F30B3435a9d337750fC82D`

**@username resolution:** Supabase (`chain_id` **143** only). Existing handles from the testnet era are migrated to mainnet—users do not re-register. See [`docs/SUPABASE_MAINNET.md`](./docs/SUPABASE_MAINNET.md).

**Pay tab / cross-border:** Routes through **MultiTokenLedger** (`payWithLog` / `payERC20WithLog`). **NFC tap (MON):** **TapPayLedger** `payWithLog`.

### MultiTokenLedger (Agora Bounty)

New payment rail deployed specifically for cross-border transactions. Supports native MON and ERC-20 tokens (like AUSD).
- Takes standard ERC-20 `transferFrom` deposits and routes them to the recipient atomically.
- Extends the `PaymentLogged` event to include the token address.

### TapPayLedger

Payment rail for NFC and direct sends. Sender calls `payWithLog(to, sessionIdHash)` with `msg.value`; funds forward atomically to the recipient and emit `PaymentLogged`.

- ReentrancyGuard + checks-effects-interactions
- Session-based replay protection
- Pausable / Ownable2Step
- Pass-through only — no custody

### UsernameRegistry

On-chain username ↔ address mapping used for human-readable pay and reverse lookup on receipts.

---

## Demo Assets

### APK

**APK URL:** [https://drive.google.com/file/d/1w3K3PTeqvt250qMJne4azXeU4D35dC8P/view?usp=drivesdk](https://drive.google.com/file/d/1w3K3PTeqvt250qMJne4azXeU4D35dC8P/view?usp=drivesdk)

Install on two NFC-capable Android phones to try Tap Pay end-to-end.

A debug APK is also available from GitHub Actions if needed:

1. Open [Actions → Build workflow](https://github.com/anuraggdubey/tappay/actions)
2. Open the latest successful run
3. Download the APK artifact

### Video Demo

**Video Demo URL:** [https://drive.google.com/file/d/1f8ZO1ian1y1d4o98g1C-SuV6wPYAysDC/view?usp=sharing](https://drive.google.com/file/d/1f8ZO1ian1y1d4o98g1C-SuV6wPYAysDC/view?usp=sharing)

---

## Social Posts

<p align="center">
  <a href="https://x.com/tapxpay">
    <img src="https://img.shields.io/badge/Follow%20TapPay%20on%20X-%40tapxpay-000000?style=for-the-badge&logo=x&logoColor=white" alt="Follow @tapxpay on X" />
  </a>
  <br/>
  <sub><strong>X Account:</strong> Here is the link &rarr; <a href="https://x.com/tapxpay">https://x.com/tapxpay</a></sub>
</p>

Live posts from **Monad India Blitz V4**, shown with the same media as on X and LinkedIn.

<table>
<tr>
<td width="50%" valign="top">

<p>
<img src="docs/screenshots/social/misbah-onsite-avatar.jpg" width="40" height="40" alt="@Misbahtwts" />
&nbsp;&nbsp;<strong>Misbah(agentic arc)</strong><br/>
<a href="https://x.com/Misbahtwts">@Misbahtwts</a>
</p>

> At @monad hack today.
>
> If you're here, come say hi.

<p align="center">
  <a href="https://x.com/Misbahtwts/status/2101171148813639993?s=20">
    <img src="docs/screenshots/social/misbah-onsite.jpg" alt="Misbah onsite at Monad hack" width="100%" />
  </a>
</p>

<p><a href="https://x.com/Misbahtwts/status/2101171148813639993?s=20">View on X</a></p>

</td>
<td width="50%" valign="top">

<p>
<img src="docs/screenshots/social/misbah-cooking-avatar.jpg" width="40" height="40" alt="@Misbahtwts" />
&nbsp;&nbsp;<strong>Misbah(agentic arc)</strong><br/>
<a href="https://x.com/Misbahtwts">@Misbahtwts</a>
</p>

> We @anuraggdubeyy @AdityaNishad987 cooking now for monad hack.
>
> How does this wallpaper look btw?

<p align="center">
  <a href="https://x.com/Misbahtwts/status/2101196068054769999?s=20">
    <img src="docs/screenshots/social/misbah-cooking.jpg" alt="Team cooking at Monad hack" width="100%" />
  </a>
</p>

<p><a href="https://x.com/Misbahtwts/status/2101196068054769999?s=20">View on X</a></p>

</td>
</tr>
<tr>
<td width="50%" valign="top">

<p>
<img src="docs/screenshots/social/misbah-tappay-avatar.jpg" width="40" height="40" alt="@Misbahtwts" />
&nbsp;&nbsp;<strong>Misbah(agentic arc)</strong><br/>
<a href="https://x.com/Misbahtwts">@Misbahtwts</a>
</p>

> Tappay....
>
> will be sharing more details about it sooon.
>
> @MonadIndia @geeky_kartikey

<p align="center">
  <a href="https://x.com/Misbahtwts/status/2101255579910230415?s=20">
    <img src="docs/screenshots/social/misbah-tappay.jpg" alt="TapPay teaser post" width="100%" />
  </a>
</p>

<p><a href="https://x.com/Misbahtwts/status/2101255579910230415?s=20">View on X</a></p>

</td>
<td width="50%" valign="top">

<p>
<img src="docs/screenshots/social/anurag-blitz-avatar.jpg" width="40" height="40" alt="@anuraggdubeyy" />
&nbsp;&nbsp;<strong>Anurag Dubey</strong><br/>
<a href="https://x.com/anuraggdubeyy">@anuraggdubeyy</a>
</p>

> Here at @MonadIndia Blitz V4.

<p align="center">
  <a href="https://x.com/anuraggdubeyy/status/2101171282012442744?s=20">
    <img src="docs/screenshots/social/anurag-blitz.jpg" alt="Anurag at Monad India Blitz V4" width="100%" />
  </a>
</p>

<p><a href="https://x.com/anuraggdubeyy/status/2101171282012442744?s=20">View on X</a></p>

</td>
</tr>
<tr>
<td width="50%" valign="top">

<p>
<img src="docs/screenshots/social/aditya-blitz-avatar.jpg" width="40" height="40" alt="@AdityaNishad987" />
&nbsp;&nbsp;<strong>0xAdityaa</strong><br/>
<a href="https://x.com/AdityaNishad987">@AdityaNishad987</a>
</p>

> At @monad Blitz V4..

<p align="center">
  <a href="https://x.com/AdityaNishad987/status/2101170921033883854?s=20">
    <img src="docs/screenshots/social/aditya-blitz.jpg" alt="Aditya at Monad Blitz V4" width="100%" />
  </a>
</p>

<p><a href="https://x.com/AdityaNishad987/status/2101170921033883854?s=20">View on X</a></p>

</td>
<td width="50%" valign="top">

<p>
<img src="docs/screenshots/social/misbah-cooking-avatar.jpg" width="40" height="40" alt="Misbah Ansari" />
&nbsp;&nbsp;<strong>Misbah Ansari</strong><br/>
<a href="https://www.linkedin.com/in/misbah-ansari-52657428a">LinkedIn</a>
</p>

> We Anurag Dubey Aditya Nishad cooking now at monad hack.
>
> Kartikey Garg

<p align="center">
  <a href="https://www.linkedin.com/posts/misbah-ansari-52657428a_we-anurag-dubey-aditya-nishad-cooking-now-activity-7506962375024168960-KQwP">
    <img src="docs/screenshots/social/misbah-cooking.jpg" alt="LinkedIn — cooking at Monad hack" width="100%" />
  </a>
</p>

<p><a href="https://www.linkedin.com/posts/misbah-ansari-52657428a_we-anurag-dubey-aditya-nishad-cooking-now-activity-7506962375024168960-KQwP">View on LinkedIn</a></p>

</td>
</tr>
<tr>
<td width="50%" valign="top">

<p>
<img src="docs/screenshots/social/aditya-demo-avatar.jpg" width="40" height="40" alt="@AdityaNishad987" />
&nbsp;&nbsp;<strong>0xAdityaa</strong><br/>
<a href="https://x.com/AdityaNishad987">@AdityaNishad987</a>
</p>

> This is what we made.
>
> TapPay at @monad BlitzV4.
>
> Contactless Payment using NFC just tap on each others phone and payment done that’s how easy it is.

<p align="center">
  <a href="https://x.com/AdityaNishad987/status/2101275794375131270?s=20">
    <img src="docs/screenshots/social/aditya-demo.jpg" alt="Aditya — TapPay demo video" width="100%" />
  </a>
</p>

<p><a href="https://x.com/AdityaNishad987/status/2101275794375131270?s=20">View on X</a></p>

</td>
<td width="50%" valign="top">

<p>
<img src="docs/screenshots/social/misbah-demo-avatar.jpg" width="40" height="40" alt="@Misbahtwts" />
&nbsp;&nbsp;<strong>Misbah(agentic arc)</strong><br/>
<a href="https://x.com/Misbahtwts">@Misbahtwts</a>
</p>

> We made TapPay and here's the video on how it works.
>
> if you wanna try it out, dm me
>
> @geeky_kartikey @KushalVijay_

<p align="center">
  <a href="https://x.com/Misbahtwts/status/2101276318541496533?s=20">
    <img src="docs/screenshots/social/aditya-demo.jpg" alt="Misbah — TapPay demo video share" width="100%" />
  </a>
</p>

<p><a href="https://x.com/Misbahtwts/status/2101276318541496533?s=20">View on X</a></p>

</td>
</tr>
</table>

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Mobile | React Native 0.87 (bare), TypeScript |
| NFC / HCE | `react-native-hce`, Android `HostApduService` |
| NFC Reader | `react-native-nfc-manager` |
| Wallet | `ethers.js` v6 + Android Keystore (`react-native-keychain`) |
| Chain | Monad Mainnet (`143`) |
| Contracts | `UsernameRegistry`, `TapPayLedger`, `MultiTokenLedger` (Hardhat) |
| Identity cache | Supabase `@username` → address |
| CI | GitHub Actions → debug APK artifact |

---

## Monad Mainnet Config

| Setting | Value |
|:--------|:------|
| Chain ID | `143` |
| RPC (primary) | `https://rpc.monad.xyz` |
| RPC (fallback) | `https://rpc.ankr.com/monad` |
| Explorer | `https://monadscan.com` |
| Currency | MON (18 decimals) |

Configured in [`src/config/monad.ts`](./src/config/monad.ts). Username DB migration: [`docs/SUPABASE_MAINNET.md`](./docs/SUPABASE_MAINNET.md).

Deploy mainnet contracts: `npm run deploy:mainnet` (requires `DEPLOYER_PRIVATE_KEY` and MON for gas).

---

## Prerequisites

See [`requirement.txt`](./docs/requirement.txt) for the full list.

- Node.js >= 18 (20 LTS recommended)
- JDK 17
- Android SDK (API 34 + Build-Tools 34)
- **Two physical Android devices with NFC** for Tap Pay (emulators cannot do HCE)

```bash
# macOS / Linux
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Android/Sdk
```

---

## Quick Start

```bash
git clone https://github.com/anuraggdubey/Tap-Pay.git
cd Tap-Pay
npm install

npm start
# separate terminal
npx react-native run-android
```

---

## Project Structure

```
TapPay/
├── android/                    # Native Android + HCE service
├── contracts/                  # TapPayLedger + UsernameRegistry
├── scripts/                    # Hardhat deploy
├── src/
│   ├── config/monad.ts         # RPC, chain, contract addresses
│   ├── services/               # wallet, NFC, HCE, registry, history
│   ├── screens/                # Home, Send/Receive Tap, Send Payment, Status…
│   ├── components/             # UI (radar, waiting card, modals…)
│   └── navigation/             # Stack + tabs
├── docs/                       # Architecture, implementation specs, screenshots
├── test/                       # Contract tests
└── .github/workflows/          # APK CI
```

---

## NFC Testing

NFC Host Card Emulation needs **two physical Android phones**. Emulators cannot test phone-to-phone tap.

1. Install the APK on both devices and enable NFC
2. **Receiver:** open Receive Tap (broadcasts wallet address over HCE)
3. **Sender:** enter amount → Ready to tap → hold phones together
4. Sender reads address, signs, and broadcasts on TapPayLedger
5. Both sides show a Glow-style Sent / Received receipt; balance updates in ~1–2s

---

## Documentation

- [`TapPay-Technical-Spec.md`](./docs/TapPay-Technical-Spec.md) — architecture
- [`TapPay-Implementation-Plan.md`](./docs/TapPay-Implementation-Plan.md) — implementation plan
- [`requirement.txt`](./docs/requirement.txt) — contributor setup
- [`ADITYA_RULES.md`](./docs/ADITYA_RULES.md) — team guidelines

---

## Team

Built at **Monad India Blitz V4** by:

- [Misbah](https://x.com/Misbahtwts)
- [Anurag Dubey](https://x.com/anuraggdubeyy)
- [Aditya](https://x.com/AdityaNishad987)

**Official Project X:** [![X Account](https://img.shields.io/badge/X_Account-@tapxpay-000000?style=flat-square&logo=x&logoColor=white)](https://x.com/tapxpay) &nbsp; [https://x.com/tapxpay](https://x.com/tapxpay)

---

## License

MIT
