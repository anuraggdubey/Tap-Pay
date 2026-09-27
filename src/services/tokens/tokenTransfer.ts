/**
 * Token Transfer Service — Send any supported ERC-20 or Native Token
 *
 * Handles the actual on-chain transfer of tokens:
 *   - AUSD, USDC, USDT → ERC-20 transfer() call
 *   - MON → native transfer (delegates to existing sendPayment or Mera signer)
 *
 * NOTE: This is a NEW file. Does NOT modify wallet.ts or tapPayment.ts.
 *       It IMPORTS from wallet.ts (read-only) for provider and gas estimation.
 */

import {ethers} from 'ethers';
import {getProvider, withRpcFailover} from '../wallet';
import {SUPPORTED_TOKENS, ERC20_ABI, parseTokenAmount} from '../../config/tokens';
import {getMeraSigner, hasMeraSigner} from '../mera/meraSigner';

// ─── Types ────────────────────────────────────────────────────────

export interface TransferResult {
  /** Transaction hash if successful */
  txHash: string | null;
  /** Whether the transfer was initiated successfully */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Token symbol that was transferred */
  tokenSymbol: string;
  /** Amount transferred (human-readable) */
  amount: string;
}

export interface TransferParams {
  /** Recipient address (0x...) */
  to: string;
  /** Amount to send (human-readable, e.g., "10.50") */
  amount: string;
  /** Token symbol (AUSD, USDC, USDT, MON) */
  tokenSymbol: string;
  /** Optional: provide a signer directly. If not provided, uses Mera signer. */
  signer?: ethers.Wallet;
}

// ─── Core Transfer Function ───────────────────────────────────────

/**
 * Send a token transfer (ERC-20 or native MON).
 *
 * This is the main function for all token transfers in the bounty feature.
 * It automatically routes to the correct transfer method based on token type.
 *
 * @param params TransferParams with recipient, amount, and token
 * @returns TransferResult with tx hash or error
 */
export async function sendTokenTransfer(
  params: TransferParams,
): Promise<TransferResult> {
  const {to, amount, tokenSymbol} = params;

  // Validate token
  const token = SUPPORTED_TOKENS[tokenSymbol.toUpperCase()];
  if (!token) {
    return {
      txHash: null,
      success: false,
      error: `Unsupported token: ${tokenSymbol}`,
      tokenSymbol,
      amount,
    };
  }

  // Validate recipient address
  if (!ethers.isAddress(to)) {
    return {
      txHash: null,
      success: false,
      error: 'Invalid recipient address',
      tokenSymbol,
      amount,
    };
  }

  // Validate amount
  let amountRaw: bigint;
  try {
    amountRaw = parseTokenAmount(amount, token.decimals);
    if (amountRaw <= 0n) {
      return {
        txHash: null,
        success: false,
        error: 'Amount must be greater than zero',
        tokenSymbol,
        amount,
      };
    }
  } catch {
    return {
      txHash: null,
      success: false,
      error: 'Invalid amount format',
      tokenSymbol,
      amount,
    };
  }

  // Get signer (from params, Mera, or fail)
  const signer = params.signer || getMeraSigner();
  if (!signer) {
    return {
      txHash: null,
      success: false,
      error: 'No wallet connected. Please authenticate with passkey first.',
      tokenSymbol,
      amount,
    };
  }

  // Route to correct transfer type
  if (token.isNative) {
    return await sendNativeTransfer(signer, to, amountRaw, token.symbol, amount);
  }

  if (!token.contractAddress) {
    return {
      txHash: null,
      success: false,
      error: `${token.symbol} contract address not configured for this network`,
      tokenSymbol,
      amount,
    };
  }

  return await sendERC20Transfer(
    signer,
    to,
    amountRaw,
    token.contractAddress,
    token.symbol,
    amount,
  );
}

// ─── Internal Transfer Functions ──────────────────────────────────

/**
 * Send native MON transfer.
 */
async function sendNativeTransfer(
  signer: ethers.Wallet,
  to: string,
  amountWei: bigint,
  symbol: string,
  displayAmount: string,
): Promise<TransferResult> {
  try {
    // Pre-check balance
    const balance = await signer.provider!.getBalance(signer.address);
    if (balance < amountWei) {
      return {
        txHash: null,
        success: false,
        error: `Insufficient ${symbol} balance`,
        tokenSymbol: symbol,
        amount: displayAmount,
      };
    }

    const tx = await signer.sendTransaction({
      to,
      value: amountWei,
    });

    return {
      txHash: tx.hash,
      success: true,
      tokenSymbol: symbol,
      amount: displayAmount,
    };
  } catch (error: any) {
    return {
      txHash: null,
      success: false,
      error: parseTransferError(error),
      tokenSymbol: symbol,
      amount: displayAmount,
    };
  }
}

/**
 * Send ERC-20 token transfer via the token's transfer() function.
 */
async function sendERC20Transfer(
  signer: ethers.Wallet,
  to: string,
  amountRaw: bigint,
  contractAddress: string,
  symbol: string,
  displayAmount: string,
): Promise<TransferResult> {
  try {
    // Create contract instance connected to the signer
    const tokenContract = new ethers.Contract(
      contractAddress,
      ERC20_ABI,
      signer,
    );

    // Pre-check ERC-20 balance
    const balance: bigint = await tokenContract.balanceOf(signer.address);
    if (balance < amountRaw) {
      return {
        txHash: null,
        success: false,
        error: `Insufficient ${symbol} balance. You have ${ethers.formatUnits(balance, 6)} ${symbol}.`,
        tokenSymbol: symbol,
        amount: displayAmount,
      };
    }

    // Also check native MON balance for gas
    const nativeBalance = await signer.provider!.getBalance(signer.address);
    if (nativeBalance < ethers.parseUnits('0.001', 18)) {
      return {
        txHash: null,
        success: false,
        error: 'Insufficient MON for gas fees. You need a small amount of MON to pay for the transaction.',
        tokenSymbol: symbol,
        amount: displayAmount,
      };
    }

    // Execute the ERC-20 transfer
    const tx = await tokenContract.transfer(to, amountRaw);

    return {
      txHash: tx.hash,
      success: true,
      tokenSymbol: symbol,
      amount: displayAmount,
    };
  } catch (error: any) {
    return {
      txHash: null,
      success: false,
      error: parseTransferError(error),
      tokenSymbol: symbol,
      amount: displayAmount,
    };
  }
}

// ─── Error Parsing ────────────────────────────────────────────────

/**
 * Parse transfer errors into user-friendly messages.
 */
function parseTransferError(error: any): string {
  const message = error?.message || error?.toString() || 'Unknown error';

  if (message.includes('insufficient funds') || message.includes('exceeds balance')) {
    return 'Insufficient balance for this transfer plus gas fees.';
  }
  if (message.includes('user rejected') || message.includes('User denied')) {
    return 'Transaction cancelled by user.';
  }
  if (message.includes('nonce too low')) {
    return 'Transaction nonce conflict. Please wait a moment and retry.';
  }
  if (message.includes('ERC20: transfer amount exceeds balance')) {
    return 'Token balance too low for this transfer.';
  }
  if (message.includes('ERC20: transfer to the zero address')) {
    return 'Cannot send tokens to the zero address.';
  }

  return error?.reason || error?.shortMessage || message;
}
