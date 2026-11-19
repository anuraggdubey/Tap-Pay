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

Add these repository secrets to produce real release builds in CI:
`TAPPAY_KEYSTORE_BASE64` (`base64 -w0 tappay-release.jks`), `TAPPAY_KEYSTORE_PASSWORD`,
`TAPPAY_KEY_ALIAS`, `TAPPAY_KEY_PASSWORD`.

Without the secrets (pull requests, forks) CI signs with a **throwaway key** so the build is still
verified. That artifact is named `tappay-ci-apk-NOT-FOR-DISTRIBUTION` and must not be shared.

## App links / Digital Asset Links

`web/public/.well-known/assetlinks.json` no longer pins any certificate. The app has no https app
links or passkeys anymore. If you add app links later, pin the **release** certificate SHA-256
(`keytool -list -v -keystore tappay-release.jks`) and the Play App Signing certificate, never the debug one.
