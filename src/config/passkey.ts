/**
 * Passkey recovery configuration. See docs/PASSKEY_RECOVERY.md.
 *
 * PASSKEY_RP_ID is the WebAuthn relying party id. It MUST be an owned, stable production
 * domain that serves /.well-known/assetlinks.json for package `com.tappay`. Never use a
 * preview or throwaway domain: changing it later orphans every existing passkey.
 *
 * It ships empty on purpose. Passkey recovery stays hidden and disabled until the owner sets
 * it (and publishes assetlinks.json).
 */

export const PASSKEY_RP_ID = '';
export const PASSKEY_RP_NAME = 'TapPay';

/** Server function that stores and serves the encrypted recovery blob. */
export const PASSKEY_FUNCTION = 'passkey-recovery';

export function isPasskeyRecoveryConfigured(): boolean {
  return PASSKEY_RP_ID.trim().length > 0 && !/vercel\.app$|localhost$/i.test(PASSKEY_RP_ID.trim());
}
