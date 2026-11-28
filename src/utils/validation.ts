/**
 * Validation utilities for amounts and usernames
 */
import {ethers} from 'ethers';

/** TapPayLedger payment rules (`maxPayment` 0 means no upper limit). */
export type PaymentLimits = {minPayment: bigint; maxPayment: bigint; paused: boolean};

/**
 * The ledger rule a native payment of `amountWei` breaks, or null when it passes (or when the
 * limits are unknown). The ledger reverts such payments, so they must never be signed.
 */
export function checkPaymentLimits(amountWei: bigint, limits: PaymentLimits | null): string | null {
  if (!limits) {
    return null;
  }
  if (limits.paused) {
    return 'Payments are temporarily paused. Please try again later.';
  }
  if (amountWei < limits.minPayment) {
    return `The minimum payment is ${ethers.formatEther(limits.minPayment)} MON.`;
  }
  if (limits.maxPayment !== 0n && amountWei > limits.maxPayment) {
    return `The maximum payment is ${ethers.formatEther(limits.maxPayment)} MON.`;
  }
  return null;
}

/**
 * Validate a MON amount string input. With `limits`, the amount must also satisfy the ledger's
 * minimum / maximum payment and the ledger must not be paused.
 */
export function validateAmount(
  amount: string,
  limits: PaymentLimits | null = null,
): {valid: boolean; error?: string} {
  if (!amount || amount.trim() === '') {
    return {valid: false, error: 'Amount is required'};
  }

  // Require digits, optionally followed by a single decimal group.
  // Rejects '1.', '.5' and '1.2.3' which parseFloat would silently accept.
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    return {valid: false, error: 'Invalid amount format'};
  }

  const value = parseFloat(amount);

  if (isNaN(value) || value <= 0) {
    return {valid: false, error: 'Amount must be greater than 0'};
  }

  // Check decimal places (max 18 for wei precision)
  const parts = amount.split('.');
  if (parts[1] && parts[1].length > 18) {
    return {valid: false, error: 'Too many decimal places (max 18)'};
  }

  const limitError = checkPaymentLimits(ethers.parseEther(amount), limits);
  if (limitError) {
    return {valid: false, error: limitError};
  }

  return {valid: true};
}

/**
 * Validate a username per rules (3-20 chars, a-z 0-9 only)
 */
export function validateUsername(username: string): {valid: boolean; error?: string} {
  if (!username || username.trim() === '') {
    return {valid: false, error: 'Username is required'};
  }

  if (username.length < 3) {
    return {valid: false, error: 'Username must be at least 3 characters'};
  }

  if (username.length > 20) {
    return {valid: false, error: 'Username must be 20 characters or less'};
  }

  if (!/^[a-z0-9]+$/.test(username)) {
    return {valid: false, error: 'Only lowercase letters and numbers allowed'};
  }

  return {valid: true};
}

/**
 * Validate an Ethereum address
 */
export function validateAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}
