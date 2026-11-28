import {MONAD_CONFIG} from './monad';
import {SUPPORTED_CHAINS, SUPPORTED_MAINNET_CHAIN_IDS} from './chains';

/** TapPay primary production target — Monad Mainnet */
export const TAPPAY_CHAIN_ID = 143;

export {SUPPORTED_MAINNET_CHAIN_IDS};

/**
 * Ensures the app cannot sign transactions against testnet RPC while claiming mainnet.
 * Validates both the primary Monad config and all registered multichain EVM mainnets.
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

  for (const chain of SUPPORTED_CHAINS) {
    const rpcList = [chain.rpcUrls.primary, chain.rpcUrls.fallback1, chain.rpcUrls.fallback2].filter(
      (url): url is string => Boolean(url),
    );
    for (const rpc of rpcList) {
      const lower = rpc.toLowerCase();
      if (!lower.startsWith('https://') || lower.includes('testnet') || lower.includes('sepolia')) {
        throw new Error(`Invalid mainnet RPC configured for ${chain.chainName}: ${rpc}`);
      }
    }
  }
}
