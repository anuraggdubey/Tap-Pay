# TapPay

Phone-to-phone contactless payments on [Monad Testnet](https://docs.monad.xyz) — NFC tap or `@username` send, settled on-chain as native MON.

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
| **APK Download** | `[PLACEHOLDER — paste APK URL here]` |
| **Video Demo** | `[PLACEHOLDER — paste demo video URL here]` |
| **UsernameRegistry** | [`0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD`](https://testnet.monadscan.com/address/0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD) |
| **TapPayLedger** | [`0x5B177FEF554dA84A86be62E45fb49BB52e6D6838`](https://testnet.monadscan.com/address/0x5B177FEF554dA84A86be62E45fb49BB52e6D6838) |

---

## What is TapPay?

TapPay is a React Native wallet built for **Monad Blitz** that settles payments as native MON on Monad Testnet (Chain ID `10143`).

**Two ways to pay**

1. **Tap Pay (NFC)** — sender reads the receiver’s address over NFC Host Card Emulation, then broadcasts `payWithLog` on TapPayLedger
2. **Username / Address Pay** — search `@username` (or paste a wallet address), enter amount on a Cash App–style keypad, confirm, and send

Keys stay on-device (Android Keystore via `react-native-keychain`). No custodial balances.

---

## Deployed Contracts (Monad Testnet)

**Network:** Monad Testnet · Chain ID `10143` · ~1s finality

| Contract | Address | Explorer |
|:---------|:--------|:---------|
| **UsernameRegistry** | `0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD` | [View on Monadscan](https://testnet.monadscan.com/address/0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD) |
| **TapPayLedger** | `0x5B177FEF554dA84A86be62E45fb49BB52e6D6838` | [View on Monadscan](https://testnet.monadscan.com/address/0x5B177FEF554dA84A86be62E45fb49BB52e6D6838) |

**Deployer:** [`0x1406Fe936D971A0dAE9a19DD3354b900B08Fa002`](https://testnet.monadscan.com/address/0x1406Fe936D971A0dAE9a19DD3354b900B08Fa002)

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

**APK URL:** `[PLACEHOLDER — paste public APK / drive / Actions artifact link here]`

Until the public link is ready, a debug APK can also be downloaded from GitHub Actions:

1. Open [Actions → Build workflow](https://github.com/anuraggdubey/tappay/actions)
2. Open the latest successful run
3. Download the APK artifact
4. Install on two NFC-capable Android phones

### Video Demo

**Video Demo URL:** `[PLACEHOLDER — paste YouTube / Loom / Drive link here]`

---

## Social Posts

Build-in-public trail from **Monad India Blitz V4**. Each card shows a short visual overview of the post.

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>Misbah — On site</h3>
      <blockquote>
        At @monad hack today.<br/>
        If you're here, come say hi.
      </blockquote>
      <p><strong>Overview:</strong> Kickoff check-in from the venue — team is live at the hack.</p>
      <p><a href="https://x.com/Misbahtwts/status/2101171148813639993?s=20">Open on X</a> · <a href="https://x.com/Misbahtwts">@Misbahtwts</a></p>
    </td>
    <td width="50%" valign="top">
      <h3>Misbah — Cooking</h3>
      <blockquote>
        We @anuraggdubeyy @AdityaNishad987 cooking now for monad hack.<br/>
        How does this wallpaper look btw?
      </blockquote>
      <p><strong>Overview:</strong> Team build update while hacking — Misbah, Anurag, and Aditya shipping TapPay.</p>
      <p><a href="https://x.com/Misbahtwts/status/2101196068054769999?s=20">Open on X</a> · <a href="https://x.com/Misbahtwts">@Misbahtwts</a></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Misbah — TapPay teaser</h3>
      <blockquote>
        Tappay....<br/>
        will be sharing more details about it sooon.<br/>
        @MonadIndia @geeky_kartikey
      </blockquote>
      <p><strong>Overview:</strong> First public name-drop of TapPay during Blitz — product tease for judges and community.</p>
      <p><a href="https://x.com/Misbahtwts/status/2101255579910230415?s=20">Open on X</a> · <a href="https://x.com/Misbahtwts">@Misbahtwts</a></p>
    </td>
    <td width="50%" valign="top">
      <h3>Anurag — Blitz V4</h3>
      <blockquote>
        Here at @MonadIndia Blitz V4.
      </blockquote>
      <p><strong>Overview:</strong> Anurag’s venue check-in at Monad India Blitz V4.</p>
      <p><a href="https://x.com/anuraggdubeyy/status/2101171282012442744?s=20">Open on X</a> · <a href="https://x.com/anuraggdubeyy">@anuraggdubeyy</a></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Aditya — Blitz V4</h3>
      <blockquote>
        At @monad Blitz V4..
      </blockquote>
      <p><strong>Overview:</strong> Aditya’s on-site presence post for Monad Blitz V4.</p>
      <p><a href="https://x.com/AdityaNishad987/status/2101170921033883854?s=20">Open on X</a> · <a href="https://x.com/AdityaNishad987">@AdityaNishad987</a></p>
    </td>
    <td width="50%" valign="top">
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
| Chain | Monad Testnet (`10143`) |
| Contracts | `UsernameRegistry.sol`, `TapPayLedger.sol` (Hardhat) |
| Identity cache | Supabase username index (with on-chain registry) |
| CI | GitHub Actions → debug APK artifact |

---

## Monad Testnet Config

| Setting | Value |
|:--------|:------|
| Chain ID | `10143` |
| RPC (primary) | `https://testnet-rpc.monad.xyz` |
| RPC (fallback) | `https://rpc.ankr.com/monad_testnet` |
| Explorer | `https://testnet.monadscan.com` |
| Faucet | `https://faucet.monad.xyz` |
| Currency | MON (18 decimals) |

Configured in [`src/config/monad.ts`](./src/config/monad.ts).

---

## Prerequisites

See [`requirement.txt`](./requirement.txt) for the full list.

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
git clone https://github.com/anuraggdubey/tappay.git
cd tappay
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
├── docs/screenshots/           # README UI shots
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

- [`TapPay-Technical-Spec.md`](./TapPay-Technical-Spec.md) — architecture
- [`TapPay-Implementation-Plan.md`](./TapPay-Implementation-Plan.md) — implementation plan
- [`requirement.txt`](./requirement.txt) — contributor setup

---

## Team

Built at **Monad India Blitz V4** by:

- [Misbah](https://x.com/Misbahtwts)
- [Anurag Dubey](https://x.com/anuraggdubeyy)
- [Aditya](https://x.com/AdityaNishad987)

---

## License

MIT
