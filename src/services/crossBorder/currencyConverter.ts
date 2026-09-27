/**
 * Currency Converter — Display Local Currency Equivalents
 *
 * Converts stablecoin amounts (AUSD, USDC, USDT) to local fiat currencies
 * for cross-border payment UX. Shows the recipient how much they're receiving
 * in their local currency.
 *
 * For the bounty demo, we use hardcoded rates. In production, this would
 * hit a price API (CoinGecko, Chainlink, etc.).
 *
 * NOTE: This is a NEW file in Aditya's territory (Rule 4).
 *       Does NOT modify any existing service.
 */

// ─── Types ────────────────────────────────────────────────────────

export interface ConversionResult {
  /** Original amount in the source token */
  sourceAmount: number;
  /** Source token symbol (e.g. "AUSD") */
  sourceToken: string;
  /** Converted amount in local fiat */
  localAmount: number;
  /** Local fiat currency code (e.g. "INR") */
  localCurrency: string;
  /** Local fiat currency symbol (e.g. "₹") */
  localSymbol: string;
  /** Exchange rate used */
  rate: number;
  /** Whether this is a live or fallback rate */
  isLiveRate: boolean;
}

export interface FiatCurrency {
  code: string;
  name: string;
  symbol: string;
  /** Fallback rate: 1 USD = X local currency */
  fallbackRate: number;
}

// ─── Supported Fiat Currencies ───────────────────────────────────

/**
 * Supported fiat currencies with fallback rates.
 * Rates are approximate USD-based conversions (as of Sep 2026).
 * These are used when live price feeds are unavailable.
 */
export const FIAT_CURRENCIES: Record<string, FiatCurrency> = {
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    fallbackRate: 83.5,
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    fallbackRate: 0.92,
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    fallbackRate: 0.79,
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    fallbackRate: 149.5,
  },
  PHP: {
    code: 'PHP',
    name: 'Philippine Peso',
    symbol: '₱',
    fallbackRate: 56.2,
  },
  NGN: {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    fallbackRate: 1550.0,
  },
  BRL: {
    code: 'BRL',
    name: 'Brazilian Real',
    symbol: 'R$',
    fallbackRate: 4.95,
  },
  MXN: {
    code: 'MXN',
    name: 'Mexican Peso',
    symbol: '$',
    fallbackRate: 17.2,
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    fallbackRate: 3.67,
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    fallbackRate: 1.35,
  },
};

// ─── Default Currency ────────────────────────────────────────────

/** Default local currency (India — where the team is based) */
const DEFAULT_CURRENCY = 'INR';

// ─── State ───────────────────────────────────────────────────────

let _selectedCurrency: string = DEFAULT_CURRENCY;

// ─── Core Functions ──────────────────────────────────────────────

/**
 * Convert a stablecoin amount to a local fiat currency.
 *
 * For stablecoins (AUSD, USDC, USDT), 1 token ≈ 1 USD.
 * For MON, we'd need a live price (not implemented yet — MON is volatile).
 *
 * @param amount Token amount as a number (e.g. 10.50)
 * @param tokenSymbol Token symbol (e.g. "AUSD", "USDC")
 * @param targetCurrency Fiat currency code (e.g. "INR"). Defaults to selected currency.
 */
export function convertToLocal(
  amount: number,
  tokenSymbol: string,
  targetCurrency?: string,
): ConversionResult {
  const currencyCode = targetCurrency || _selectedCurrency;
  const currency = FIAT_CURRENCIES[currencyCode];

  if (!currency) {
    // Unknown currency — return as-is in USD
    return {
      sourceAmount: amount,
      sourceToken: tokenSymbol,
      localAmount: amount,
      localCurrency: 'USD',
      localSymbol: '$',
      rate: 1,
      isLiveRate: false,
    };
  }

  // For stablecoins, 1 token ≈ 1 USD
  const isStablecoin = ['AUSD', 'USDC', 'USDT'].includes(
    tokenSymbol.toUpperCase(),
  );

  if (!isStablecoin) {
    // Non-stablecoin (MON) — can't convert without live price
    return {
      sourceAmount: amount,
      sourceToken: tokenSymbol,
      localAmount: 0,
      localCurrency: currencyCode,
      localSymbol: currency.symbol,
      rate: 0,
      isLiveRate: false,
    };
  }

  const localAmount = amount * currency.fallbackRate;

  return {
    sourceAmount: amount,
    sourceToken: tokenSymbol,
    localAmount: Math.round(localAmount * 100) / 100, // Round to 2 decimal places
    localCurrency: currencyCode,
    localSymbol: currency.symbol,
    rate: currency.fallbackRate,
    isLiveRate: false, // Using fallback rates
  };
}

/**
 * Format a conversion result as a display string.
 * Example: "₹876.75 INR" or "€9.20 EUR"
 */
export function formatLocalAmount(result: ConversionResult): string {
  if (result.rate === 0) {
    return `${result.sourceAmount} ${result.sourceToken}`;
  }

  const formatted = result.localAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${result.localSymbol}${formatted} ${result.localCurrency}`;
}

/**
 * Get a one-line conversion summary for the UI.
 * Example: "10.50 AUSD ≈ ₹876.75 INR"
 */
export function getConversionSummary(
  amount: number,
  tokenSymbol: string,
  targetCurrency?: string,
): string {
  const result = convertToLocal(amount, tokenSymbol, targetCurrency);

  if (result.rate === 0) {
    return `${amount} ${tokenSymbol}`;
  }

  return `${amount} ${tokenSymbol} ≈ ${formatLocalAmount(result)}`;
}

// ─── Currency Selection ──────────────────────────────────────────

/**
 * Set the user's preferred local currency.
 */
export function setLocalCurrency(currencyCode: string): boolean {
  if (FIAT_CURRENCIES[currencyCode]) {
    _selectedCurrency = currencyCode;
    return true;
  }
  return false;
}

/**
 * Get the currently selected local currency code.
 */
export function getLocalCurrency(): string {
  return _selectedCurrency;
}

/**
 * Get all supported fiat currencies for the currency picker UI.
 */
export function getSupportedCurrencies(): FiatCurrency[] {
  return Object.values(FIAT_CURRENCIES);
}
