/**
 * Canonical message the wallet signs to prove it owns a passkey recovery blob.
 * The Supabase `passkey-recovery` Edge Function rebuilds this exact string and recovers the
 * signer, so the format MUST stay byte-for-byte identical on both sides
 * (see supabase/functions/passkey-recovery/message.ts).
 */

export type PasskeyProofAction = 'put' | 'delete';

export function buildPasskeyProofMessage(params: {
  action: PasskeyProofAction;
  credentialId: string;
  walletAddress: string;
  /** sha256 hex of the blob for `put`; "-" for `delete`. */
  digest: string;
  issuedAt: string;
}): string {
  const {action, credentialId, walletAddress, digest, issuedAt} = params;
  return [
    'TapPay passkey recovery proof',
    `action: ${action}`,
    `credential: ${credentialId}`,
    `wallet: ${walletAddress.toLowerCase()}`,
    `digest: ${digest}`,
    `issued: ${issuedAt}`,
  ].join('\n');
}
