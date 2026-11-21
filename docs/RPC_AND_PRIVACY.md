# RPC endpoints, trust and privacy

TapPay signs every transaction on the phone, but it still has to talk to a blockchain node (an RPC endpoint) to broadcast the transaction and to read balances and receipts. This page explains what those endpoints can see, what they cannot do, and how to choose your own. Tracks [#43](https://github.com/anuraggdubey/Tap-Pay/issues/43).

## What an endpoint learns

Any endpoint that serves a request sees your **IP address** together with the **sender, recipient and amount** of the payments you broadcast through it, plus the addresses you query. It cannot spend your funds or see your key: transactions are signed on the phone and only the signed bytes are sent.

## Default behaviour (public endpoints)

| Action | What the app does |
|:-------|:------------------|
| **Broadcast** | The same signed raw transaction is sent to **all** configured endpoints at once. It is the same bytes (same hash, same nonce), so it cannot double-spend. One honest endpoint is enough for the payment to reach the network, so a single node that drops or censors it cannot stop it. |
| **Receipts** | A receipt is trusted only when **two different endpoints** report the same status. One endpoint claiming "confirmed" is not enough, and disagreeing endpoints are treated as "still pending". This stops a compromised RPC from inventing a confirmation. |
| **Other reads** (balances, fees) | Read from the active endpoint with automatic rotation to the next one on errors. The active endpoint is shown in **Settings > Network**. |

**Trade-off:** broadcasting to all endpoints means every one of them sees your payment. That buys censorship resistance and costs privacy.

## Use your own RPC

For maximum privacy, or if you run a node, set your own endpoint in **Settings > Network > Your own RPC**.

- It must be `https`, with no username, password or query string, and a public hostname.
- It is verified before it is saved: it must answer `eth_chainId` with Monad (`143`).
- When set, it is the **only** endpoint used for broadcasts, receipts and reads. There is **no silent fallback** to the public providers, and the receipt check trusts your own node on its own (there is only one endpoint to ask).
- Choose a node you trust: it will see your IP with your payments, and if it is offline the app reports an error instead of switching.
- Use **Use Default Endpoints** to go back.

## What this does not do

- It does not pin TLS certificates. A network attacker who can present a valid certificate for an endpoint can still tamper with that single response. The two-endpoint receipt check and the on-device signing limit the damage.
- It does not hide your IP from the endpoints. Use a VPN or your own node for that.
