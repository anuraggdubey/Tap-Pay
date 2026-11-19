// Canonical ownership-proof message. MUST stay byte-for-byte identical to the app's
// src/services/usernameAuth.ts (buildUsernameAuthMessage / normalizeUsername).

export type UsernameAction = 'register' | 'release';

export function normalizeUsername(username: string): string {
  return username.replace(/0/g, 'o').replace(/1/g, 'l').toLowerCase();
}

export function buildUsernameAuthMessage(params: {
  action: UsernameAction;
  username: string;
  walletAddress: string;
  chainId: number;
  issuedAt: string;
}): string {
  const {action, username, walletAddress, chainId, issuedAt} = params;
  return [
    'TapPay username ownership proof',
    `action: ${action}`,
    `username: ${username.toLowerCase()}`,
    `wallet: ${walletAddress.toLowerCase()}`,
    `chain: ${chainId}`,
    `issued: ${issuedAt}`,
  ].join('\n');
}
