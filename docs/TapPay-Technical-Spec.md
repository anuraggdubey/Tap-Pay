# TapPay — Technical Spec & Architecture

**Monad Hackathon Build**
Native Android app enabling phone-to-phone contactless payments (NFC tap) and username-based payments, settling on the Monad testnet.

---

## 1. Overview

TapPay lets two people pay each other by physically tapping phones together (like Apple Pay / Google Pay's NFC tap), or by searching a username instead of a wallet address (like GPay's phone-number search). All transactions settle on-chain as MON testnet transfers.

Two payment modes:
- **Tap Pay** — proximity-based, phone-to-phone, NFC HCE
- **Username Pay** — search-based, username → wallet address lookup

---

## 2. User Flow

### 2.1 Tap Pay Flow

1. **Sender** opens TapPay, taps "Send," enters amount (e.g. 5 MON)
2. App shows "Hold phones together" screen — sender's phone now advertises via NFC HCE with the payment payload (amount + sender wallet address) encoded
3. **Receiver** opens TapPay, taps "Receive" (or app auto-detects incoming NFC session)
4. Receiver brings their phone close to sender's phone
5. Receiver's phone (NFC reader role) reads the APDU response from sender's phone (HCE role), decodes amount + sender address
6. Receiver sees a one-tap confirmation screen: "Receive 5 MON from 0xABC...?" with an **Accept** button
7. Receiver taps Accept → receiver's phone signs and broadcasts the transaction (receiver's wallet address as `to`, sender's as `from` context) OR sender's phone broadcasts once it gets an ACK from receiver — see §4.3 for who actually submits the tx
8. Both phones show "Payment Sent" / "Payment Received" with a testnet explorer link once the transaction confirms

### 2.2 Username Pay Flow

1. User taps "Pay by Username"
2. Types a username (e.g. `@anurag`) into a search bar
3. App queries backend, resolves username → wallet address
4. User enters amount, hits Send
5. Standard wallet transaction is signed and broadcast to Monad testnet
6. Confirmation screen shown once mined

---

## 3. Monad Integration

### 3.1 Network Details
- **Chain**: Monad Testnet
- **Native currency**: MON (testnet)
- **RPC**: Monad testnet RPC endpoint (via public RPC or your own node/Alchemy-style provider once available)
- Monad is EVM-compatible, so standard `ethers.js` / `viem` tooling works for signing and broadcasting

### 3.2 Wallet Handling
- Each user has a wallet keypair generated/imported on first app launch
- Private key stored in Android **Keystore** (hardware-backed secure storage) — never stored in plaintext, never leaves device
- Public address is what gets shared via NFC tap or linked to a username

### 3.3 Transaction Flow (both payment modes)
1. App builds a transaction object: `{ to, value, gasLimit, nonce, chainId: <monad testnet id> }`
2. Transaction signed locally using the sender's private key (via `ethers.Wallet` / `viem` local signer) — signing never touches the backend
3. Signed raw transaction sent via RPC call `eth_sendRawTransaction` to the Monad testnet RPC
4. App polls the RPC (or listens via WebSocket if available) for the transaction receipt
5. Once mined, both sender and receiver UI update with confirmation + explorer link

---

## 4. Tap Pay — Backend / Native Mechanics

This is the core NFC piece and the reason this has to be a native Android build (not a web app — Web NFC doesn't support card emulation, only NDEF tag read/write).

### 4.1 Roles
- **Sender phone** = Card Emulator → runs `HostApduService`
- **Receiver phone** = Reader → uses `react-native-hce`'s reader utilities (or Android's built-in NFC reader mode) to talk to the emulated card

### 4.2 HCE Setup
- `HostApduService` is registered in `AndroidManifest.xml` with an AID (Application Identifier) filter, e.g.:
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
- `apduservice.xml` declares the custom AID for TapPay (a unique hex string identifying your app's "card")
- `react-native-hce` wraps this native service and exposes a JS API to set the data payload the card responds with

### 4.3 APDU Exchange (the actual "tap")
1. Sender sets the HCE payload (JSON: `{ amount, senderAddress, nonce/sessionId }`) via `react-native-hce` before showing the "hold phones together" screen — this data sits ready in the emulated card
2. Receiver's phone enters NFC reader mode, detects the emulated card when phones are ~4cm apart
3. Receiver sends a `SELECT AID` APDU command matching TapPay's AID
4. Sender's `HostApduService.processCommandApdu()` fires, returns the payload as the APDU response
5. Receiver's app parses the response, extracts amount + sender address, shows the Accept screen
6. **Who broadcasts the tx**: cleanest approach is receiver signs a "claim" that gets relayed back to sender via a second short APDU round-trip (receiver's public address sent back), then the **sender's** phone builds and broadcasts the actual transaction (since sender is the one moving funds and already has the details) — this avoids receiver needing sender's private key context and keeps signing on the paying device
7. Sender's app shows "Sent," polls for receipt, and can optionally push a status ping to receiver via a lightweight backend socket/polling so receiver's screen updates too (NFC session itself only needs to last the initial handshake, not the whole confirmation wait)

### 4.4 Why not a web app
Web NFC (`navigator.nfc` in Chrome for Android) only supports **reading and writing NDEF tags** — it cannot put a phone into HCE/card-emulation mode. `HostApduService` is a native-only Android API with no browser equivalent. So the phone-to-phone tap mechanic is only possible as a native app.

---

## 5. Username Pay — Backend

### 5.1 Username Registration
- On first launch, user optionally claims a username (e.g. `anurag`)
- Backend stores mapping: `{ username: "anurag", walletAddress: "0xABC..." }`
- Simple uniqueness check on registration

### 5.2 Backend Options
- Lightweight backend (Node/Express or Supabase) with one table: `usernames(username TEXT UNIQUE, wallet_address TEXT, created_at)`
- Alternative (more "web3-native" for hackathon judging): store the mapping in a small Monad smart contract instead of an off-chain DB — a `mapping(string => address)` contract that's cheap to read/write on testnet. This is a nice differentiator if judges like on-chain-everything.

### 5.3 Search/Pay Flow
1. User types username in search bar → debounced API call (or contract `view` call) to resolve address
2. If found, show resolved user (username + truncated address) for confirmation
3. User enters amount → same signing/broadcast flow as §3.3

---

## 6. React Native + APK Build (GitHub Actions)

Since local Android builds are too heavy for your PC, all native compilation happens in CI.

### 6.1 One-time: Dev Client Build
- Push the React Native project (with `react-native-hce` installed) to GitHub
- `.github/workflows/build.yml` runs on a GitHub-hosted runner:
  - Sets up JDK 17, Node, Android SDK/build-tools
  - `npm install`
  - `cd android && ./gradlew assembleDebug`
  - Uploads the resulting `.apk` as a workflow artifact
- Download the APK from the Actions run page, install on phone (`adb install app.apk` or manual transfer + "install unknown apps")

### 6.2 Daily Development Loop
- Run `npx react-native start` locally (Metro bundler — lightweight, JS only)
- The installed dev-client APK connects to Metro over WiFi for hot reload on JS/UI changes
- **No PC-side native compile needed** for this loop

### 6.3 Rebuild Triggers
Only re-run the Actions build when:
- `react-native-hce` version changes
- AndroidManifest/permissions change
- Any other native dependency or Gradle config change

### 6.4 Two-Device Testing
NFC tap functionality can only be tested with two physical NFC-capable Android phones running the installed APK — Metro hot reload doesn't help here since HCE operates at the native OS layer.

---

## 7. Tech Stack Summary

| Layer | Tech |
|---|---|
| Mobile app | React Native |
| NFC / HCE | `react-native-hce`, Android `HostApduService` |
| Wallet / signing | `ethers.js` or `viem`, Android Keystore |
| Chain | Monad Testnet (EVM-compatible) |
| Username backend | Node/Express + DB, or on-chain mapping contract |
| CI/Build | GitHub Actions (Gradle build on hosted runner) |
| Local dev | Metro bundler, hot reload via installed dev client |

---

## 8. Open Questions / Next Steps
- Decide: on-chain username mapping contract vs off-chain DB (on-chain is a stronger hackathon story)
- Decide: sender-broadcasts vs receiver-broadcasts transaction model (§4.3) — sender-broadcast is simpler and recommended
- Confirm Monad testnet RPC endpoint + chain ID to hardcode in the app config
- Design the AID (Application Identifier) string for TapPay's HCE service
