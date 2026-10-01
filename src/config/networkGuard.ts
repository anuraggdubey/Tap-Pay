import {MONAD_CONFIG} from './monad';

/** TapPay production target — Monad Mainnet */
export const TAPPAY_CHAIN_ID = 143;

/**
 * Ensures the app cannot sign transactions against testnet RPC while claiming mainnet.
 * Call once at app startup.
 */
export function assertMainnetOnlyConfig(): void {
  if (MONAD_CONFIG.chainId !== TAPPAY_CHAIN_ID) {
    throw new Error(
      `TapPay is locked to Monad Mainnet (chain ID ${TAPPAY_CHAIN_ID}). ` +
        `Current config: ${MONAD_CONFIG.chainId}. Update src/config/monad.ts.`,
    );
  }

  const primary = MONAD_CONFIG.rpcUrls.primary.toLowerCase();
  if (primary.includes('testnet')) {
    throw new Error(
      'TapPay RPC must not use a testnet endpoint. Set rpcUrls.primary to https://rpc.monad.xyz',
    );
  }
}
