/**
 * Agora Configuration — AUSD Stablecoin Integration
 *
 * Agora is the issuer of AUSD, a USD-pegged stablecoin.
 * This config contains Agora-specific contract details and endpoints
 * needed for TapPay's cross-border payment functionality.
 *
 * AUSD is the PRIMARY token required by the bounty.
 *
 * Docs: https://docs.agora.finance
 * NOTE: This is a NEW file in Aditya's territory (Rule 4).
 */

// ─── AUSD Contract Details ───────────────────────────────────────

/**
 * AUSD contract addresses on Monad.
 * AUSD uses 6 decimals (like USDC/USDT) — NOT 18.
 */
export const AGORA_CONFIG = {
  /** AUSD token address on Monad Mainnet */
  ausd: {
    mainnet: '0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a' as `0x${string}`,
    /** Decimals — AUSD uses 6 decimals (same as USDC) */
    decimals: 6,
    symbol: 'AUSD',
    name: 'Agora Dollar',
    /** Logo URI for display in token selector */
    logoUri: 'https://assets.agora.finance/ausd-logo.png',
  },

  /** Agora API endpoints (for future integration — mint/redeem) */
  api: {
    /** Base URL for Agora's public API */
    baseUrl: 'https://api.agora.finance',
    /** Health check endpoint */
    health: '/v1/health',
    /** AUSD supply endpoint */
    supply: '/v1/ausd/supply',
  },

  /** Agora documentation links */
  docs: {
    main: 'https://docs.agora.finance',
    ausdOverview: 'https://docs.agora.finance/ausd',
    integration: 'https://docs.agora.finance/developers',
  },
};

// ─── Helper Functions ────────────────────────────────────────────

/**
 * Get the AUSD contract address for the current network.
 * Currently only mainnet is supported.
 */
export function getAusdAddress(): `0x${string}` {
  return AGORA_CONFIG.ausd.mainnet;
}

/**
 * Format a raw AUSD amount (6 decimals) to a human-readable string.
 * Example: 1000000n → "1.00"
 *
 * @param rawAmount Raw token amount as bigint (6 decimal places)
 * @param maxDecimals Maximum decimal places to show (default: 2)
 */
export function formatAusdAmount(
  rawAmount: bigint,
  maxDecimals: number = 2,
): string {
  const divisor = 10n ** BigInt(AGORA_CONFIG.ausd.decimals);
  const whole = rawAmount / divisor;
  const remainder = rawAmount % divisor;

  if (remainder === 0n) {
    return whole.toString() + '.00';
  }

  // Convert remainder to decimal string with leading zeros
  const remainderStr = remainder.toString().padStart(AGORA_CONFIG.ausd.decimals, '0');
  const trimmed = remainderStr.slice(0, maxDecimals);

  return `${whole}.${trimmed}`;
}

/**
 * Parse a human-readable AUSD amount to raw bigint (6 decimals).
 * Example: "1.50" → 1500000n
 *
 * @param displayAmount Human-readable amount string (e.g. "10.50")
 */
export function parseAusdAmount(displayAmount: string): bigint {
  const parts = displayAmount.split('.');
  const whole = BigInt(parts[0] || '0');
  let fraction = parts[1] || '0';

  // Pad or truncate to 6 decimal places
  fraction = fraction.padEnd(AGORA_CONFIG.ausd.decimals, '0').slice(0, AGORA_CONFIG.ausd.decimals);

  const divisor = 10n ** BigInt(AGORA_CONFIG.ausd.decimals);
  return whole * divisor + BigInt(fraction);
}

/**
 * Check if a given token address is AUSD.
 */
export function isAusd(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() === AGORA_CONFIG.ausd.mainnet.toLowerCase();
}
