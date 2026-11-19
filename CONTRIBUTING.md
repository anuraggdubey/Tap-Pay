# Contributing to TapPay

Thanks for helping improve TapPay. TapPay moves real money, so we hold contributions to a high bar. Please read this whole file before opening an issue or a pull request.

> **License note:** TapPay is "All Rights Reserved" (see [LICENSE](LICENSE) and [COPYRIGHT.md](COPYRIGHT.md)). Submitting a contribution means you agree that it may be used, modified and distributed as part of TapPay under the project's license. Only the maintainer may change `LICENSE`, `COPYRIGHT.md` or `.github/CODEOWNERS`; edits to them by anyone else are automatically reverted.

## Table of contents

1. [Ground rules](#1-ground-rules)
2. [Before you raise an issue](#2-before-you-raise-an-issue)
3. [Issue guidelines](#3-issue-guidelines)
4. [Security vulnerabilities](#4-security-vulnerabilities)
5. [Development setup](#5-development-setup)
6. [Branching and commits](#6-branching-and-commits)
7. [Before you open a pull request](#7-before-you-open-a-pull-request)
8. [Pull request rules](#8-pull-request-rules)
9. [Code standards](#9-code-standards)
10. [Smart contract rules](#10-smart-contract-rules)
11. [Wallet, NFC and payment code rules](#11-wallet-nfc-and-payment-code-rules)
12. [Review and merge](#12-review-and-merge)

---

## 1. Ground rules

- Be respectful. Critique code, not people. Harassment or spam gets you blocked.
- One issue or pull request = one concern. Do not bundle unrelated changes.
- No work is guaranteed to be merged. For large changes, open an issue and get a maintainer's go-ahead **before** you write code.
- Do not commit secrets, private keys, `.env` files, keystores or API keys. Ever.
- Never test with real funds on a feature you have not finished. Use a throwaway wallet with a tiny balance.

## 2. Before you raise an issue

**Do not raise an issue that already exists, or that an open PR already covers.** Duplicates are closed without discussion.

Check all of these first:

1. Search **open and closed** [issues](../../issues) with a few different keywords.
2. Search open and closed [pull requests](../../pulls). A fix may already be in review.
3. Read the [README](README.md) and `docs/` to confirm the behaviour is not documented as intended.
4. Make sure you are on the latest `main`.

If you find a related issue, add your findings as a comment there instead of opening a new one. If you are unsure, comment on the existing thread first.

## 3. Issue guidelines

- Use a clear, specific title, for example `[Bug] Receiver shows "received" for unrelated deposit`, not `app broken`.
- Include: what you expected, what happened, exact steps to reproduce, device/Android version, app version or commit, and logs or screenshots.
- For feature requests, explain the problem first, then the proposed solution.
- Label it (`bug`, `enhancement`, `security`, `smart-contract`, `android`, `backend`, `documentation`) if you are able to.
- **Claim before you start.** Comment "I'd like to work on this" and wait for a maintainer to assign you. If an issue is already assigned, do not open a competing PR. An assignee with no activity for 7 days may be unassigned.
- New contributors: look for `good first issue` and `help wanted`.

## 4. Security vulnerabilities

**Do not open a public issue for an exploitable vulnerability** (key handling, fund loss, contract exploits, spoofing, auth bypass). Report it privately to the maintainer via GitHub's private vulnerability reporting (Security tab -> "Report a vulnerability"), or contact the maintainer directly. Include a proof of concept and impact. Allow reasonable time to fix before any public disclosure.

Hardening suggestions that are not directly exploitable can be public issues.

## 5. Development setup

Prerequisites: Node.js 22, JDK 17, Android SDK + NDK (for the app), an NFC-capable Android device for tap testing.

```bash
git clone https://github.com/anuraggdubey/Tap-Pay.git
cd Tap-Pay
npm install              # runs the RN Gradle patch postinstall

npm start                # Metro bundler
npx react-native run-android

npm test                 # Jest unit tests
npm run lint             # ESLint
npm run compile:contracts
npm run test:contracts   # Hardhat tests

npm run web:dev          # landing site (web/)
```

For contract deployment, copy `.env.example` to `.env` and use a **throwaway deployer key**. Never use a key that holds real funds for testing, and never commit `.env`.

Fork the repo and work in your fork. Do not push branches directly to the main repository unless you have been given write access.

## 6. Branching and commits

- Branch from the latest `main`. Never commit to `main` directly.
- Branch names: `type/short-description`, for example `fix/receiver-confirm-spoofing`, `feat/sign-nfc-payload`, `docs/contributing`, `chore/ci-cache`.
- Keep commits small and focused. Write messages in the imperative mood with a short summary line (about 72 characters or less):
  - Good: `Show recipient address before biometric prompt`
  - Bad: `fixes`, `wip`, `update stuff`
- Use the commit body to explain *why* when it is not obvious.
- Rebase or merge `main` into your branch before opening the PR so it has no conflicts.
- Do not rewrite history on a branch after review has started, unless asked to.
- Do not add generated files, build output (`android/app/build`, `node_modules`, `artifacts/`, `cache/`) or editor settings.

## 7. Before you open a pull request

**Review your own changes before you push.** Read your full diff line by line as if you were the reviewer:

```bash
git status
git diff main...HEAD
```

Confirm each of the following:

- [ ] The diff contains only what the PR is about. No stray files, debug code, `console.log`s, commented-out code or unrelated formatting changes.
- [ ] No secrets, keys, addresses of personal wallets, `.env`, or keystores in the diff or in the history of the branch.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes, and `npm run test:contracts` passes if you touched `contracts/`.
- [ ] You added or updated tests for the behaviour you changed.
- [ ] The app builds (`npx react-native run-android`) for app changes, and the site builds (`npm --prefix web run build`) for `web/` changes.
- [ ] Docs and the README are updated if behaviour, setup or addresses changed.
- [ ] You searched existing PRs and issues so you are not duplicating work.

PRs that obviously were not self-reviewed (leftover debug code, failing CI, unrelated changes) will be closed or sent back without detailed review.

## 8. Pull request rules

### Link the issue with `Closes #<number>`

Every PR that fixes an issue **must** reference it in the PR description with a closing keyword so GitHub closes the issue automatically when the PR is merged into `main`:

```
Closes #12
```

Rules for this:

- Use `Closes`, `Fixes` or `Resolves`, followed by the issue number, in the **PR description** (or a commit message). The keyword must be written for each issue: `Closes #12, closes #13`.
- Put it on its own line, not inside a code block or comment, or GitHub will not link it.
- If the PR only partly addresses an issue, write `Refs #12` instead so the issue stays open.
- If there is no issue for your change, open one first (after checking for duplicates), unless it is a trivial typo or docs fix.

### PR content

- Title: short and descriptive, same style as commit summaries.
- Description must include:
  - **What** changed and **why**.
  - **How you tested it** (commands, device, screenshots or screen recording for UI/NFC changes).
  - Any **breaking changes**, migrations or config changes (new env vars, contract redeploys, Supabase SQL).
- Keep PRs small. If a PR changes more than roughly 400 lines of non-generated code, consider splitting it.
- Mark unfinished work as a **Draft** PR.
- Do not open a PR for an issue that is assigned to someone else or that already has an open PR.
- CI (contract tests, Jest, build) must pass before review.
- Respond to review comments. Resolve a conversation only after you push a fix or the reviewer agrees.

## 9. Code standards

- **Language:** TypeScript for the app and `web/`, Solidity `^0.8.24` for contracts.
- **Style:** follow `.eslintrc.js` and `.prettierrc.js`. Run `npm run lint` before committing.
- No `any` in new code unless there is a comment explaining why. Keep types accurate for `bigint` amounts; never use `number` or `parseFloat` for token or wei values.
- Handle errors explicitly. Do not swallow errors with empty `catch {}` in payment, wallet or registry code.
- No `console.log` of addresses, amounts tied to users, session ids, or anything key-related. Remove debug logging before opening a PR.
- Keep functions small, name things clearly, and comment the *why*, not the *what*.
- Do not add a new dependency without justification in the PR (size, maintenance, license, security). Pin versions and commit the lockfile change.
- Accessibility and UX: new UI must work in both themes, with readable contrast and touch targets.

## 10. Smart contract rules

Contracts here handle user funds. Extra care is mandatory.

- Never modify an already deployed contract in place. Contracts are not upgradeable; a fix means a new contract plus updating `src/config/monad.ts`, docs and the deployment notes in the PR.
- Every contract change needs tests in `test/` covering success, failure and attack cases (reentrancy, front-running, non-standard tokens where relevant). `npm run test:contracts` must pass.
- Use audited OpenZeppelin primitives instead of hand-rolling (SafeERC20, ReentrancyGuard, Ownable2Step, Pausable).
- Follow checks-effects-interactions. Do not add owner powers that can move user funds. Explain any new privileged function in the PR.
- Do not change a contract's ABI without updating the app's ABIs (`src/services/*`) in the same PR.
- Document gas impact for hot paths (`payWithLog`, `payERC20WithLog`).
- Never put a private key, mnemonic or RPC secret in a script or test. Deployment scripts read from `.env`.

## 11. Wallet, NFC and payment code rules

Changes to `src/services/wallet.ts`, `src/services/mera/`, `src/services/tapPayment.ts`, `src/services/nfcReader.ts`, `src/services/hce.ts`, `src/services/registry.ts`, `src/services/tokens/` or `src/services/multiTokenLedger.ts` are **security-sensitive**:

- Private keys and passkey secrets must never be logged, sent over the network, put in AsyncStorage, or kept longer than needed in memory.
- Every action that spends funds must go through user authentication (biometrics/passkey) and show the user the exact recipient, amount and fee first.
- Network calls that broadcast transactions must not be blindly retried.
- Validate all external input (NFC payloads, deep links, usernames, RPC responses).
- Describe the threat model impact in the PR description and tag the maintainer for review.
- Add tests for new logic where feasible, and do manual NFC testing on a real device for NFC changes. Say which devices you tested on.

Android manifest, signing and Gradle changes (`android/`) and Supabase SQL (`supabase/`) also require maintainer review. Never commit a release keystore or passwords.

## 12. Review and merge

- The maintainer reviews PRs and may request changes, ask you to split a PR, or close it with an explanation.
- At least one maintainer approval is required, and CI must be green.
- PRs are merged by the maintainer, usually with squash merge. Your PR title becomes the commit message, so keep it clean.
- Do not ping maintainers repeatedly. Allow a few days for review.
- Stale PRs (no response from the author for 14 days after a review) may be closed. You can reopen them later.

Thank you for contributing to TapPay.
