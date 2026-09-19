// Monad Testnet Configuration
// See: https://docs.monad.xyz

export const MONAD_CONFIG = {
  chainId: 10143,
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    primary: 'https://testnet-rpc.monad.xyz',
    fallback1: 'https://rpc.ankr.com/monad_testnet',
    fallback2: 'https://rpc-testnet.monadinfra.com',
  },
  blockExplorer: {
    name: 'Monadscan',
    url: 'https://testnet.monadscan.com',
    txPath: '/tx/',
    addressPath: '/address/',
  },
  faucetUrl: 'https://faucet.monad.xyz',

  // Contract addresses — fill these after deployment
  contracts: {
    usernameRegistry: '0xEebB05F9AF06908eCb7bFa5F916Dde1EEa231aDD' as `0x${string}`,
    tapPayLedger: '0x5B177FEF554dA84A86be62E45fb49BB52e6D6838' as `0x${string}`,
  },

  // Backend API (for session management + username caching)
  apiBaseUrl: 'http://192.168.7.101:3001/api/v1', // Physical device over local Wi-Fi
};

// AID for NFC HCE — hex for "TapPay" with 0xF0 prefix (proprietary AID)
export const TAPPAY_AID = 'F0546170506179';

// APDU protocol version
export const APDU_VERSION = 0x01;

// Session timeout in milliseconds (120 seconds)
export const SESSION_TIMEOUT_MS = 120_000;

// Transaction polling interval (Monad has ~1s blocks)
export const TX_POLL_INTERVAL_MS = 500;

// Maximum confirmation wait time
export const TX_MAX_WAIT_MS = 30_000;

// Gas limit fallback for payWithLog() contract call
export const GAS_LIMIT_FALLBACK = 100_000n;

// Helper to get explorer URL for a transaction
export function getExplorerTxUrl(txHash: string): string {
  return `${MONAD_CONFIG.blockExplorer.url}${MONAD_CONFIG.blockExplorer.txPath}${txHash}`;
}

// Helper to get explorer URL for an address
export function getExplorerAddressUrl(address: string): string {
  return `${MONAD_CONFIG.blockExplorer.url}${MONAD_CONFIG.blockExplorer.addressPath}${address}`;
}
