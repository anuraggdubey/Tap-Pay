/**
 * Cross-Border Transfer Service — Orchestrator for International Payments
 *
 * This is the top-level service that ties everything together for the
 * Agora Bounty "Cross-Border Payments" requirement:
 *
 *   1. User selects a token (AUSD, USDC, USDT, MON)
 *   2. User enters a @username or 0x address
 *   3. This service resolves the username → address (via registry.ts)
 *   4. This service sends the token → recipient (via tokenTransfer.ts)
 *   5. Returns transaction result for UI display
 *
 * NOTE: This is a NEW file. Does NOT modify any existing services.
 *       It IMPORTS from registry.ts (read-only) for username resolution.
 */

import {ethers} from 'ethers';
import {sendTokenTransfer, TransferResult} from '../tokens/tokenTransfer';
import {getTokenBalance, TokenBalance} from '../tokens/tokenBalance';
import {getAvailableTokens, TokenInfo} from '../../config/tokens';

// ─── Types ────────────────────────────────────────────────────────

export interface CrossBorderTransferParams {
  /** Recipient — can be a @username or a 0x address */
  recipient: string;
  /** Amount to send (human-readable, e.g., "10.50") */
  amount: string;
  /** Token to send (AUSD, USDC, USDT, MON) */
  tokenSymbol: string;
  /** Optional: provide an ethers.Wallet signer directly */
  signer?: ethers.Wallet;
}

export interface CrossBorderTransferResult extends TransferResult {
  /** The resolved recipient address (0x...) */
  resolvedAddress: string;
  /** The original recipient input (@username or address) */
  recipientInput: string;
  /** Username if resolved from @username */
  resolvedUsername?: string;
}

// ─── Core Function ────────────────────────────────────────────────

/**
 * Execute a cross-border token transfer.
 *
 * Handles the full flow:
 *   - Resolve @username to address (if needed)
 *   - Validate the token and amount
 *   - Send the transfer
 *   - Return the result
 *
 * @param params CrossBorderTransferParams
 * @returns CrossBorderTransferResult with tx hash, resolved address, etc.
 */
export async function executeCrossBorderTransfer(
  params: CrossBorderTransferParams,
): Promise<CrossBorderTransferResult> {
  const {recipient, amount, tokenSymbol, signer} = params;

  // Step 1: Resolve recipient
  let resolvedAddress: string;
  let resolvedUsername: string | undefined;

  if (recipient.startsWith('@')) {
    // Username resolution — try to import registry.ts dynamically
    // We import dynamically to avoid modifying the import chain
    const username = recipient.slice(1); // Remove @ prefix
    try {
      const registry = await import('../registry');
      const address = await registry.resolveUsername(username);
      if (!address) {
        return {
          txHash: null,
          success: false,
          error: `Username @${username} not found. Make sure they have registered.`,
          tokenSymbol,
          amount,
          resolvedAddress: '',
          recipientInput: recipient,
        };
      }
      resolvedAddress = address;
      resolvedUsername = username;
    } catch (error: any) {
      return {
        txHash: null,
        success: false,
        error: `Failed to resolve username: ${error?.message || 'Unknown error'}`,
        tokenSymbol,
        amount,
        resolvedAddress: '',
        recipientInput: recipient,
      };
    }
  } else if (ethers.isAddress(recipient)) {
    // Direct address
    resolvedAddress = recipient;
  } else {
    return {
      txHash: null,
      success: false,
      error: 'Invalid recipient. Enter a @username or a valid 0x address.',
      tokenSymbol,
      amount,
      resolvedAddress: '',
      recipientInput: recipient,
    };
  }

  // Step 2: Execute the token transfer
  const transferResult = await sendTokenTransfer({
    to: resolvedAddress,
    amount,
    tokenSymbol,
    signer,
  });

  // Step 3: Return enriched result
  return {
    ...transferResult,
    resolvedAddress,
    recipientInput: recipient,
    resolvedUsername,
  };
}

/**
 * Get a preview of a cross-border transfer before executing it.
 * Shows the user what will happen without actually sending.
 *
 * @param senderAddress The sender's wallet address
 * @param tokenSymbol Token to preview (AUSD, USDC, etc.)
 * @returns Balance info and available tokens
 */
export async function getTransferPreview(
  senderAddress: string,
  tokenSymbol: string,
): Promise<{
  balance: TokenBalance;
  availableTokens: TokenInfo[];
}> {
  const balance = await getTokenBalance(senderAddress, tokenSymbol);
  const availableTokens = getAvailableTokens();

  return {
    balance,
    availableTokens,
  };
}
