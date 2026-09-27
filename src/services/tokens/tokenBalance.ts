/**
 * Token Balance Service — Fetch ERC-20 and Native Token Balances
 *
 * Supports all tokens defined in config/tokens.ts:
 *   - AUSD (Agora Dollar) — bounty requirement
 *   - USDC (USD Coin)
 *   - USDT (Tether)
 *   - MON (native) — reuses existing getBalance() from wallet.ts
 *
 * NOTE: This is a NEW file. Does NOT modify wallet.ts.
 *       It IMPORTS getProvider() and getBalance() from wallet.ts (read-only).
 */

import {ethers} from 'ethers';
import {getProvider, getBalance as getNativeBalance, withRpcFailover} from '../wallet';
import {
  SUPPORTED_TOKENS,
  ERC20_ABI,
  TokenInfo,
  getAvailableTokens,
  formatTokenAmount,
} from '../../config/tokens';

// ─── Types ────────────────────────────────────────────────────────

export interface TokenBalance {
  /** Token symbol (AUSD, USDC, USDT, MON) */
  symbol: string;
  /** Token display name */
  name: string;
  /** Raw balance in smallest unit (bigint) */
  balanceRaw: bigint;
  /** Formatted balance for display (e.g., "1,234.56") */
  balanceFormatted: string;
  /** Number of decimals */
  decimals: number;
  /** Whether this token's balance was successfully fetched */
  success: boolean;
  /** Error message if fetch failed */
  error?: string;
}

// ─── Core Functions ───────────────────────────────────────────────

/**
 * Get the balance of a specific ERC-20 token for a given address.
 *
 * @param address Wallet address to check
 * @param tokenSymbol Token symbol (e.g., "AUSD", "USDC")
 * @returns TokenBalance with raw and formatted amounts
 */
export async function getTokenBalance(
  address: string,
  tokenSymbol: string,
): Promise<TokenBalance> {
  const token = SUPPORTED_TOKENS[tokenSymbol.toUpperCase()];
  if (!token) {
    return {
      symbol: tokenSymbol,
      name: 'Unknown',
      balanceRaw: 0n,
      balanceFormatted: '0.00',
      decimals: 18,
      success: false,
      error: `Unknown token: ${tokenSymbol}`,
    };
  }

  // For native MON, use the existing wallet.ts function
  if (token.isNative) {
    return await getNativeTokenBalance(address, token);
  }

  // For ERC-20 tokens, query the contract
  if (!token.contractAddress) {
    return {
      symbol: token.symbol,
      name: token.name,
      balanceRaw: 0n,
      balanceFormatted: '0.00',
      decimals: token.decimals,
      success: false,
      error: `${token.symbol} contract address not configured for this network`,
    };
  }

  return await getERC20Balance(address, token);
}

/**
 * Get balances for ALL available tokens at once.
 * Fetches in parallel for speed.
 *
 * @param address Wallet address to check
 * @returns Array of TokenBalance objects, sorted by display order
 */
export async function getAllTokenBalances(
  address: string,
): Promise<TokenBalance[]> {
  const availableTokens = getAvailableTokens();

  // Fetch all balances in parallel
  const balancePromises = availableTokens.map(token =>
    getTokenBalance(address, token.symbol),
  );

  const balances = await Promise.all(balancePromises);
  return balances;
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Fetch native MON balance using the existing wallet.ts getBalance().
 */
async function getNativeTokenBalance(
  address: string,
  token: TokenInfo,
): Promise<TokenBalance> {
  try {
    const balanceRaw = await getNativeBalance(address);
    return {
      symbol: token.symbol,
      name: token.name,
      balanceRaw,
      balanceFormatted: formatTokenAmount(balanceRaw, token.decimals, 4),
      decimals: token.decimals,
      success: true,
    };
  } catch (error: any) {
    return {
      symbol: token.symbol,
      name: token.name,
      balanceRaw: 0n,
      balanceFormatted: '0.0000',
      decimals: token.decimals,
      success: false,
      error: error?.message || 'Failed to fetch MON balance',
    };
  }
}

/**
 * Fetch ERC-20 token balance by calling balanceOf() on the token contract.
 * Uses the RPC failover mechanism from wallet.ts.
 */
async function getERC20Balance(
  address: string,
  token: TokenInfo,
): Promise<TokenBalance> {
  try {
    const balanceRaw = await withRpcFailover(async provider => {
      const contract = new ethers.Contract(
        token.contractAddress!,
        ERC20_ABI,
        provider,
      );
      return await contract.balanceOf(address);
    });

    return {
      symbol: token.symbol,
      name: token.name,
      balanceRaw,
      balanceFormatted: formatTokenAmount(balanceRaw, token.decimals, 4),
      decimals: token.decimals,
      success: true,
    };
  } catch (error: any) {
    return {
      symbol: token.symbol,
      name: token.name,
      balanceRaw: 0n,
      balanceFormatted: '0.0000',
      decimals: token.decimals,
      success: false,
      error: error?.message || `Failed to fetch ${token.symbol} balance`,
    };
  }
}
