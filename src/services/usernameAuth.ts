/**
 * Canonical messages the wallet signs to prove ownership when registering or releasing a
 * username. The Supabase `register-username` Edge Function rebuilds the exact same string and
 * recovers the signer, so this format MUST stay byte-for-byte identical on both sides
 * (see supabase/functions/register-username/message.ts).
 */

export type UsernameAction = 'register' | 'release';

/** Normalize a username for lookups/uniqueness (lowercase; 0→o, 1→l to block look-alikes). */
export function normalizeUsername(username: string): string {
  return username.replace(/0/g, 'o').replace(/1/g, 'l').toLowerCase();
}

/**
 * Build the human-readable message signed by the wallet. `walletAddress` is lowercased so the
 * signed text is deterministic; the server compares the recovered address case-insensitively.
 */
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
