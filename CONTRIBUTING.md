# Contributing Guide

Thank you for contributing to TapPay!

TapPay moves real money, so we keep a high bar for changes. This guide is short on purpose. Read it once, then use it as a checklist.

> **License note:** TapPay is "All Rights Reserved" (see [LICENSE](LICENSE) and [COPYRIGHT.md](COPYRIGHT.md)). By submitting a contribution you agree it may be used, modified and distributed as part of TapPay under the project's license. Only the maintainer may change `LICENSE`, `COPYRIGHT.md` or `.github/CODEOWNERS`; edits to them by anyone else are reverted automatically.

By taking part you also agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## The one rule: every PR closes an issue

**Every pull request must link the issue it solves with a closing keyword in the PR description.**

```
Closes #12
```

- Use `Closes`, `Fixes` or `Resolves`, once per issue: `Closes #12, closes #13`.
- Write it on its own line in the PR **description**, not in a code block or comment. GitHub will not link it otherwise.
- The issue then closes by itself when the PR is merged into `main`. No manual clean-up, no stale open issues.
- No issue yet? Open one first. For a trivial typo or docs fix you can write `No issue: <short reason>` instead.
- A check on every PR fails until the description has one of these. PRs that fail it are not reviewed.

## Quick Setup

```bash
git clone https://github.com/<your-username>/Tap-Pay.git   # your fork
cd Tap-Pay
npm install              # also runs the React Native Gradle patch

npm start                # Metro bundler
npx react-native run-android   # needs a device or emulator

npm test                 # Jest unit tests
npm run lint             # ESLint
npm run compile:contracts
npm run test:contracts   # Hardhat tests

npm run web:dev          # marketing site (web/)
```

Requirements: Node.js 22, JDK 17, Android SDK + NDK. Tap testing needs **two NFC-capable Android phones**; emulators cannot do Host Card Emulation.

**Need more details?** See the [README](./README.md) for the architecture and [docs/](./docs) for specs.

For contract deployment, copy `.env.example` to `.env` and use a **throwaway deployer key**. Never use a key that holds real funds, and never commit `.env`.

## Development Workflow

### Making changes

| You are changing | Edit | Check with |
|:-----------------|:-----|:-----------|
| App UI and screens | `src/screens/`, `src/components/`, `src/theme/` | `npm test`, run on a device in dark and light mode |
| Wallet, NFC, payments | `src/services/` | `npm test`, test on two real phones |
| Smart contracts | `contracts/`, `test/` | `npm run test:contracts` |
| Marketing site | `web/` | `npm --prefix web run build` |
| Identity service | `supabase/` | the Supabase tests in CI |
| Chain support (Base, Solana, Stellar, NEAR) | `src/config/`, `src/services/` | open an issue first; see below |

New chains are added through the chain adapter layer. Open an issue and agree on the approach with a maintainer before writing code.

### Project documentation

- **[README.md](./README.md)** — product overview, networks, architecture, setup
- **[docs/TapPay-Technical-Spec.md](./docs/TapPay-Technical-Spec.md)** — product and architecture spec
- **[docs/SUPABASE_MAINNET.md](./docs/SUPABASE_MAINNET.md)** — `@username` database migration guide

## Git Workflow

### Branch naming

Fork the repo, then create feature branches from the latest `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feat/amazing-feature
```

**Branch naming conventions:**
- `feat/description` — new features
- `fix/description` — bug fixes
- `docs/description` — documentation changes
- `refactor/description` — code refactoring
- `test/description` — test additions or changes
- `chore/description` — build, CI, tooling

Never commit to `main` directly. Do not push branches to the main repository unless you were given write access.

### Semantic commits

Use [Semantic Commits](https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716) for a clear history:

```bash
# Format: <type>(<scope>): <subject>
git commit -m "feat(send): add address entry to the send sheet"
git commit -m "fix(nfc): ignore reads after the session expires"
git commit -m "docs(readme): list supported networks"
git commit -m "refactor(wallet): split keychain access from signing"
git commit -m "test(ledger): cover fee-on-transfer tokens"
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

Keep commits small and focused. Explain the *why* in the body when it is not obvious. Do not rewrite history on a branch once review has started unless asked.

### Pull request process

1. **Before creating the PR**, read your own diff line by line as if you were the reviewer:
   ```bash
   git status
   git diff main...HEAD
   npm run lint
   npm test
   npm run test:contracts   # if you touched contracts/
   ```
   The diff must contain only what the PR is about: no stray files, debug code, `console.log`, commented-out code, secrets, `.env`, keystores or build output.

2. **Create the PR from your fork:**
   - Push your branch: `git push origin feat/amazing-feature`
   - Open a PR against `main` of the upstream repo
   - Title in semantic format, for example `fix(nfc): ignore reads after session expiry`
   - Fill in the PR template, including **`Closes #<issue>`**

3. **PR requirements:**
   - `Closes #<issue>` in the description (see the rule above)
   - CI is green (lint, Jest, contract tests, build)
   - Tests added or updated for the behaviour you changed
   - Docs and README updated if behaviour, setup or addresses changed
   - Screenshots or a screen recording for UI and NFC changes, and which devices you tested on
   - Draft PR if the work is unfinished

4. **After merge:**
   - Delete your branch
   - The linked issue closes automatically

Keep PRs small. If a change is more than about 400 lines of non-generated code, split it. One PR, one concern.

## Contributing Code

1. **Find or open an issue** (see below) and comment that you want to work on it
2. **Wait to be assigned** before you start
3. **Fork** the repository and **clone** your fork
4. **Create** a branch: `git checkout -b fix/short-description`
5. **Make** your changes and test them
6. **Commit** using Semantic Commits
7. **Push** to your fork
8. **Open** a PR to `main` with `Closes #<issue>`

### Code style

- TypeScript for the app and `web/`, Solidity `^0.8.24` for contracts
- No `any` in new code without a comment explaining why
- Token and wei amounts are `bigint`. Never use `number` or `parseFloat` for them
- Handle errors explicitly. No empty `catch {}` in payment, wallet or registry code
- Never log addresses, amounts tied to users, session ids or anything key-related
- Use the theme (`useTheme()` colors, `IosList`, `GlassSurface`). No hard-coded colors
- New UI must work in both light and dark mode, with readable contrast and large touch targets
- New dependencies need a justification in the PR (size, maintenance, license, security). Pin the version and commit the lockfile
- Name things clearly, and comment the *why*, not the *what*

### Linting

We use ESLint and Prettier. Run `npm run lint` before you commit. CI runs the same.

## Security-sensitive areas

Extra care is mandatory here. Tag the maintainer in the PR and describe the threat-model impact.

**Smart contracts (`contracts/`)**
- Never modify a deployed contract in place. A fix means a new contract plus updated config, docs and deployment notes in the PR
- Every change needs tests for success, failure and attack cases (reentrancy, front-running, non-standard tokens)
- Use audited OpenZeppelin primitives. Follow checks-effects-interactions. No owner powers that can move user funds
- Update the app's ABIs in the same PR if the ABI changes
- Never put a private key, mnemonic or RPC secret in a script or test

**Wallet, NFC and payments (`src/services/wallet.ts`, `tapPayment.ts`, `nfcReader.ts`, `hce.ts`, `registry.ts`, `tokens/`, `multiTokenLedger.ts`)**
- Keys and recovery phrases are never logged, sent over the network, put in AsyncStorage or kept in memory longer than needed
- Every action that spends funds needs phone authentication and shows the exact recipient, amount and fee first
- Do not blindly retry calls that broadcast transactions
- Validate all external input: NFC payloads, deep links, usernames, RPC responses
- NFC changes need manual testing on real phones. Say which ones

Changes to `android/` (manifest, signing, Gradle) and `supabase/` SQL also need maintainer review. Never commit a release keystore or passwords.

## Reporting Issues

**Do not raise an issue that already exists or that an open PR already covers.** Duplicates are closed without discussion.

Before you open one:

1. Search **open and closed** [issues](../../issues) with a few keywords
2. Search open and closed [pull requests](../../pulls)
3. Read the [README](./README.md) and `docs/`
4. Make sure you are on the latest `main`

Then use [GitHub Issues](../../issues) with:

- **A clear title**, for example `[Bug] Receiver shows "received" for an unrelated deposit`
- **Steps to reproduce**
- **Expected behavior** vs **actual behavior**
- **Environment details** (device, Android version, app version or commit, logs or screenshots)
- For features: the problem first, then the proposed solution
- Labels if you can: `bug`, `enhancement`, `security`, `smart-contract`, `android`, `backend`, `documentation`

**Claim before you start.** Comment "I'd like to work on this" and wait for assignment. If an issue is assigned, do not open a competing PR. An assignee with no activity for 7 days may be unassigned. New here? Look for `good first issue` and `help wanted`.

## Security vulnerabilities

**Do not open a public issue for an exploitable vulnerability** (key handling, fund loss, contract exploits, spoofing, auth bypass). Report it privately through GitHub's private vulnerability reporting (Security tab, "Report a vulnerability"), or contact a maintainer directly. Include a proof of concept and the impact, and allow reasonable time for a fix before disclosing publicly. Hardening ideas that are not directly exploitable can be normal issues.

## Review and merge

- A maintainer reviews PRs and may request changes, ask you to split a PR, or close it with an explanation
- At least one maintainer approval is required and CI must be green
- PRs are usually squash-merged, so your PR title becomes the commit message
- Allow a few days for review and please do not ping repeatedly
- A PR with no author response for 14 days after a review may be closed. You can reopen it later

## Getting Help

- Check the [README](./README.md) and [docs/](./docs)
- Ask in [GitHub Issues](../../issues) or Discussions
- Follow [@tapxpay](https://x.com/tapxpay) for project news

---

Thank you for your contributions!
