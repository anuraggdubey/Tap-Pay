/**
 * Mera Signer — ethers.js-Compatible Signer from Passkey Account
 *
 * This wraps the Mera passkey-derived account as an ethers.js Signer,
 * so ALL existing TapPay code that expects an ethers Signer works seamlessly.
 *
 * Anurag's code uses: `new ethers.Wallet(privateKey, provider)`
 * Our code provides: `getMeraSigner(provider)` → returns an ethers.Wallet
 *
 * The result is identical in behavior — same Signer interface, same signing,
 * same transaction broadcasting — but the key comes from a passkey instead
 * of being randomly generated.
 *
 * NOTE: This is a NEW file. Does NOT modify wallet.ts.
 */

import {ethers} from 'ethers';
import {getSessionPrivateKey, getAddress, isAuthenticated} from './meraAuth';
import {getProvider} from '../wallet';

// ─── Core Signer Function ─────────────────────────────────────────

/**
 * Create an ethers.js Wallet (Signer) from the current Mera passkey session.
 *
 * Usage:
 *   const signer = getMeraSigner();
 *   const tx = await signer.sendTransaction({to, value});
 *
 * This is a drop-in replacement for:
 *   const signer = new ethers.Wallet(privateKey, provider);
 *
 * @param provider Optional provider. Defaults to TapPay's configured Monad provider.
 * @returns ethers.Wallet connected to the provider, or null if not authenticated.
 */
export function getMeraSigner(
  provider?: ethers.JsonRpcProvider,
): ethers.Wallet | null {
  if (!isAuthenticated()) {
    console.warn('[MeraSigner] Not authenticated. Call meraAuth.register() or meraAuth.login() first.');
    return null;
  }

  const privateKeyBytes = getSessionPrivateKey();
  if (!privateKeyBytes) {
    console.warn('[MeraSigner] No session private key available. Session may have expired.');
    return null;
  }

  // Convert the 32-byte Uint8Array to a hex private key string
  const privateKeyHex = ethers.hexlify(privateKeyBytes);

  // Create a standard ethers.Wallet — fully compatible with all existing code
  const rpcProvider = provider || getProvider();
  return new ethers.Wallet(privateKeyHex, rpcProvider);
}

/**
 * Get just the address from the Mera session (no signing capability).
 * Useful for balance checks and display without requiring a full signer.
 */
export function getMeraAddress(): string | null {
  return getAddress();
}

/**
 * Check if a Mera signer is currently available.
 */
export function hasMeraSigner(): boolean {
  return isAuthenticated() && getSessionPrivateKey() !== null;
}

// ─── Convenience Functions ────────────────────────────────────────

/**
 * Sign a message using the Mera passkey-derived account.
 * Equivalent to wallet.ts signMessage() but uses Mera auth.
 *
 * @param message The message to sign
 * @returns The signature string, or null if not authenticated
 */
export async function signMessageWithMera(
  message: string | Uint8Array,
): Promise<string | null> {
  const signer = getMeraSigner();
  if (!signer) {
    return null;
  }

  try {
    return await signer.signMessage(message);
  } catch (error: any) {
    console.error('[MeraSigner] Failed to sign message:', error);
    return null;
  }
}

/**
 * Send a native MON payment using the Mera passkey-derived account.
 * This is a simple direct transfer (not through TapPayLedger contract).
 *
 * For ERC-20 token transfers (AUSD, USDC, USDT), use tokenTransfer.ts instead.
 *
 * @param to Recipient address
 * @param amountWei Amount in wei (smallest MON unit)
 * @returns Transaction hash or error
 */
export async function sendPaymentWithMera(
  to: string,
  amountWei: bigint,
): Promise<{txHash: string | null; error?: string}> {
  const signer = getMeraSigner();
  if (!signer) {
    return {
      txHash: null,
      error: 'Not authenticated with passkey. Please register or login first.',
    };
  }

  try {
    // Pre-check balance
    const balance = await signer.provider!.getBalance(signer.address);
    if (balance < amountWei) {
      return {txHash: null, error: 'Insufficient MON balance'};
    }

    // Send transaction
    const tx = await signer.sendTransaction({
      to,
      value: amountWei,
    });

    return {txHash: tx.hash};
  } catch (error: any) {
    console.error('[MeraSigner] Payment failed:', error);
    return {
      txHash: null,
      error: error?.message || 'Transaction failed',
    };
  }
}
