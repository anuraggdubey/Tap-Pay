/**
 * Token Configuration for Multi-Token Support
 *
 * Defines all supported tokens on Monad Mainnet.
 * AUSD is the primary token for the Agora Bounty.
 * USDC, USDT, and MON are additional tokens for a complete product.
 *
 * NOTE: This is a NEW file. It does NOT modify any existing config.
 * It imports getProvider() from wallet.ts (read-only) for RPC access.
 */

import {ethers} from 'ethers';

// ─── Token Type Definitions ───────────────────────────────────────

export interface TokenInfo {
  /** Human-readable name */
  name: string;
  /** Ticker symbol */
  symbol: string;
  /** Number of decimal places (AUSD/USDC/USDT = 6, MON = 18) */
  decimals: number;
  /** Contract address on Monad. null = native token (MON) */
  contractAddress: string | null;
  /** Logo identifier for UI (Anurag can map these to actual icons) */
  logoId: string;
  /** Whether this is the native chain token */
  isNative: boolean;
  /** Priority for display ordering (lower = higher priority) */
  displayOrder: number;
}

// ─── Supported Token List ─────────────────────────────────────────

/**
 * All supported tokens on Monad Mainnet (chain ID 143).
 *
 * Decimal reference:
 *   - Stablecoins (AUSD, USDC, USDT): 6 decimals (1 AUSD = 1_000_000 units)
 *   - Native MON: 18 decimals (1 MON = 1_000_000_000_000_000_000 units)
 */
export const SUPPORTED_TOKENS: Record<string, TokenInfo> = {
  AUSD: {
    name: 'Agora Dollar',
    symbol: 'AUSD',
    decimals: 6,
    // Monad Mainnet — Official Agora AUSD
    contractAddress: '0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a',
    logoId: 'ausd',
    isNative: false,
    displayOrder: 1,
  },

  USDC: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    // Monad Mainnet — Official Circle USDC
    contractAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
    logoId: 'usdc',
    isNative: false,
    displayOrder: 2,
  },

  USDT: {
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    // Monad Mainnet — Official Tether USDT
    contractAddress: '0xe7cd86e13AC4309349F30B3435a9d337750fC82D',
    logoId: 'usdt',
    isNative: false,
    displayOrder: 3,
  },

  MON: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
    contractAddress: null, // Native token — no contract
    logoId: 'mon',
    isNative: true,
    displayOrder: 4,
  },
};

// ─── Standard ERC-20 ABI (minimal — only what we need) ────────────

/**
 * Minimal ERC-20 ABI for balance checks and transfers.
 * We don't need the full ABI — just balanceOf, transfer, approve, allowance, and decimals.
 */
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// ─── Helper Functions ─────────────────────────────────────────────

/**
 * Get a list of all tokens that have confirmed contract addresses.
 * Filters out tokens where contractAddress is still null (pending verification).
 * Always includes MON (native token) regardless.
 */
export function getAvailableTokens(): TokenInfo[] {
  return Object.values(SUPPORTED_TOKENS)
    .filter(token => token.isNative || token.contractAddress !== null)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get token info by symbol (case-insensitive).
 */
export function getTokenBySymbol(symbol: string): TokenInfo | undefined {
  return SUPPORTED_TOKENS[symbol.toUpperCase()];
}

/**
 * Format a raw token amount (in smallest unit) to a human-readable string.
 * Example: formatTokenAmount(1000000n, 6) → "1.0"
 */
export function formatTokenAmount(
  amountRaw: bigint,
  decimals: number,
  displayDecimals: number = 4,
): string {
  return parseFloat(ethers.formatUnits(amountRaw, decimals)).toFixed(displayDecimals);
}

/**
 * Parse a human-readable amount string to raw token units.
 * Example: parseTokenAmount("1.5", 6) → 1500000n
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  return ethers.parseUnits(amount, decimals);
}

/**
 * Update a token's contract address at runtime.
 * Used when a token address changes on a network upgrade.
 */
export function setTokenAddress(symbol: string, address: string): void {
  const token = SUPPORTED_TOKENS[symbol.toUpperCase()];
  if (token && !token.isNative) {
    token.contractAddress = address;
  }
}
