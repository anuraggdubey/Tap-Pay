// Canonical proof message. MUST stay byte-for-byte identical to
// src/services/passkeyRecovery/message.ts in the app.

export type PasskeyProofAction = 'put' | 'delete';

export function buildPasskeyProofMessage(params: {
  action: PasskeyProofAction;
  credentialId: string;
  walletAddress: string;
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
