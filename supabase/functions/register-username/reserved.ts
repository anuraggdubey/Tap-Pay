// Handles that cannot be registered: impersonation, brand and system names.
// Compared against the normalized username (0 -> o, 1 -> l), so look-alikes are covered too.

const RESERVED = new Set([
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'security', 'staff', 'team',
  'official', 'moderator', 'mod', 'owner', 'founder', 'ceo', 'billing', 'payments', 'payment',
  'wallet', 'wallets', 'tappay', 'tap', 'pay', 'tapxpay', 'monad', 'ethereum', 'eth', 'base',
  'solana', 'stellar', 'near', 'bitcoin', 'btc', 'usdc', 'usdt', 'ausd', 'mon', 'null',
  'undefined', 'anonymous', 'everyone', 'tappaybot', 'service', 'info', 'contact', 'abuse',
  'noreply', 'postmaster', 'webmaster', 'api', 'app', 'www',
]);

const RESERVED_PREFIXES = ['tappay', 'tapxpay'];

export function isReservedUsername(normalized: string): boolean {
  return RESERVED.has(normalized) || RESERVED_PREFIXES.some(prefix => normalized.startsWith(prefix));
}
