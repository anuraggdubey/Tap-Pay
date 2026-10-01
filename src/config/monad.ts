// Monad Mainnet configuration
// See: https://docs.monad.xyz/developer-essentials/network-information

export const MONAD_CONFIG = {
  chainId: 143,
  chainName: 'Monad Mainnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    primary: 'https://rpc.monad.xyz',
    fallback1: 'https://rpc.ankr.com/monad',
    fallback2: 'https://monad-rpc.publicnode.com',
  },
  blockExplorer: {
    name: 'Monadscan',
    url: 'https://monadscan.com',
    txPath: '/tx/',
    addressPath: '/address/',
  },
  faucetUrl: '', // No faucet on mainnet

  // Contract addresses — fill these after deployment
  contracts: {
    usernameRegistry: '0x458DD61Db411ec1feFC069B7B094a983E3a3E265' as `0x${string}`,
    tapPayLedger: '0x03907aE845E016f5F1605BAE4e6392C3491e03f1' as `0x${string}`,
    multiTokenLedger: '0x15319f757FC0e600E681bC0bffD69541916F8860' as `0x${string}`,
  },
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
