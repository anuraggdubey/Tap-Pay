/**
 * Validation utilities for amounts and usernames
 */

/**
 * Validate a MON amount string input
 */
export function validateAmount(amount: string): {valid: boolean; error?: string} {
  if (!amount || amount.trim() === '') {
    return {valid: false, error: 'Amount is required'};
  }

  // Allow only digits and one decimal point
  if (!/^\d+\.?\d*$/.test(amount)) {
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
