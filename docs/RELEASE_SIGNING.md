# Release signing

Release APKs/bundles are signed **only** with the TapPay release key. The committed
`android/app/debug.keystore` (password `android`) is public and is used for debug builds only.
`./gradlew assembleRelease` / `bundleRelease` fails if the release key is not provided; there is no
fallback to the debug key.

## Create the key (once, maintainer only)

```sh
keytool -genkeypair -v -keystore tappay-release.jks -alias tappay -keyalg RSA -keysize 4096 -validity 10000
```

Store the file and passwords in a password manager. **Never commit the keystore or passwords.**
Losing the key means you cannot update the installed app.

## Build locally

```sh
export TAPPAY_KEYSTORE_FILE=/absolute/path/tappay-release.jks
export TAPPAY_KEYSTORE_PASSWORD=...
export TAPPAY_KEY_ALIAS=tappay
export TAPPAY_KEY_PASSWORD=...
cd android && ./gradlew assembleRelease
```

## GitHub Actions

The release key is only ever available to one job, `sign-release` in
`.github/workflows/build.yml`. Every other job (tests, the Gradle/Metro build) runs npm and Gradle
code, so it never receives the key or its passwords.

| Job | Runs on | Has the release key? | Output |
|:----|:--------|:---------------------|:-------|
| `build` | every push and pull request | **No** | `tappay-release-unsigned` (input for signing) and `tappay-ci-apk-NOT-FOR-DISTRIBUTION`, signed with a throwaway key generated in that run. Never share it. |
| `sign-release` | a `v*` tag, or **Run workflow** on `main` | Yes, from the `release-signing` environment | `tappay-release-apk` |

`sign-release` checks out no code and runs no npm/Gradle: it downloads the unsigned APK built in
the same workflow run, aligns it with `zipalign` and signs it with `apksigner`. Passwords are
passed through step-level environment variables (`--ks-pass env:...`), never through
`$GITHUB_ENV`, and the decoded keystore is deleted when the step ends. Locally,
`./gradlew assembleRelease -PtappayUnsignedRelease` produces the same unsigned APK.

### One-time setup (maintainer)

1. **Settings → Environments → New environment** `release-signing`:
   - **Required reviewers**: the maintainer(s). Every signing run then waits for approval.
   - **Deployment branches and tags**: *Selected* → `main` and tags `v*`.
2. Add these as **environment secrets** of `release-signing` (not repository secrets, which any
   workflow job could read): `TAPPAY_KEYSTORE_BASE64` (`base64 -w0 tappay-release.jks`),
   `TAPPAY_KEYSTORE_PASSWORD`, `TAPPAY_KEY_ALIAS`, `TAPPAY_KEY_PASSWORD`.
3. Delete any repository-level `TAPPAY_*` secrets.
4. Add the **repository variables** `TAPPAY_SUPABASE_URL` and `TAPPAY_SUPABASE_ANON_KEY`
   (Settings → Secrets and variables → Actions → Variables). They are build-time app config
   (#27), not signing secrets. Release runs fail without them; other runs use a placeholder.

To release: push a tag such as `v1.2.0` (or run the workflow on `main`), approve the
`release-signing` deployment, then download `tappay-release-apk`.

## App links / Digital Asset Links

`web/public/.well-known/assetlinks.json` no longer pins any certificate. The app has no https app
links or passkeys anymore. If you add app links later, pin the **release** certificate SHA-256
(`keytool -list -v -keystore tappay-release.jks`) and the Play App Signing certificate, never the debug one.
