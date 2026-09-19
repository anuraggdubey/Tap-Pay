/**
 * Formatting utilities for display
 */

/**
 * Truncate an Ethereum address for display: 0xABC...DEF
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (!address || address.length < startChars + endChars) {
    return address;
  }
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}

/**
 * Format a wei value as MON with specified decimal places
 */
export function formatMon(weiValue: bigint | string, decimals = 4): string {
  const wei = typeof weiValue === 'string' ? BigInt(weiValue) : weiValue;
  const divisor = 10n ** 18n;
  const whole = wei / divisor;
  const remainder = wei % divisor;

  if (remainder === 0n) {
    return `${whole.toString()} MON`;
  }

  const remainderStr = remainder.toString().padStart(18, '0');
  const truncated = remainderStr.substring(0, decimals);

  // Remove trailing zeros
  const cleaned = truncated.replace(/0+$/, '');
  if (cleaned === '') {
    return `${whole.toString()} MON`;
  }

  return `${whole.toString()}.${cleaned} MON`;
}

/**
 * Parse a user-entered MON amount string to wei (bigint)
 * e.g. "5.5" → 5500000000000000000n
 */
export function parseMonToWei(amount: string): bigint {
  const parts = amount.split('.');
  const whole = parts[0] || '0';
  let decimal = parts[1] || '';

  // Pad or truncate to 18 decimal places
  decimal = decimal.padEnd(18, '0').substring(0, 18);

  return BigInt(whole) * 10n ** 18n + BigInt(decimal);
}

/**
 * Format a timestamp for display
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

  if (isToday) {
    return `Today at ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${time}`;
  }

  return `${date.toLocaleDateString()} at ${time}`;
}
