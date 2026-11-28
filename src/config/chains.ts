/**
 * Multichain EVM Mainnet Registry
 *
 * Defines verified mainnet configurations for TapPay's EVM networks.
 * Monad Mainnet (143) is the default and primary contactless NFC TapPay network.
 * Ethereum (1) and Base (8453) share the same EVM key/address and ERC-20 stack.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {MONAD_CONFIG} from './monad';
import {SUPPORTED_TOKENS, type TokenInfo} from './tokens';

export type SupportedChainKey = 'monad' | 'ethereum' | 'base';

export interface ChainConfig {
  key: SupportedChainKey;
  chainId: number;
  chainName: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    primary: string;
    fallback1: string;
    fallback2?: string;
  };
  blockExplorer: {
    name: string;
    url: string;
    txPath: string;
    addressPath: string;
  };
  stats: {
    blockTime: string;
    tps: string;
  };
  /** True when TapPayLedger / MultiTokenLedger contracts are deployed on this chain. */
  tapPayLedgerSupported: boolean;
  tokens: Record<string, TokenInfo>;
}

const ACTIVE_CHAIN_STORAGE_KEY = '@tappay_active_chain_id';

export const DEFAULT_CHAIN_ID = MONAD_CONFIG.chainId;

export const CHAINS: Record<SupportedChainKey, ChainConfig> = {
  monad: {
    key: 'monad',
    chainId: MONAD_CONFIG.chainId,
    chainName: MONAD_CONFIG.chainName,
    shortName: 'Monad',
    nativeCurrency: MONAD_CONFIG.nativeCurrency,
    rpcUrls: MONAD_CONFIG.rpcUrls,
    blockExplorer: MONAD_CONFIG.blockExplorer,
    stats: {blockTime: '~1s', tps: '10K'},
    tapPayLedgerSupported: true,
    tokens: SUPPORTED_TOKENS,
  },
  ethereum: {
    key: 'ethereum',
    chainId: 1,
    chainName: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    nativeCurrency: {name: 'Ether', symbol: 'ETH', decimals: 18},
    rpcUrls: {
      primary: 'https://ethereum-rpc.publicnode.com',
      fallback1: 'https://eth.llamarpc.com',
    },
    blockExplorer: {
      name: 'Etherscan',
      url: 'https://etherscan.io',
      txPath: '/tx/',
      addressPath: '/address/',
    },
    stats: {blockTime: '~12s', tps: '15–30'},
    tapPayLedgerSupported: false,
    tokens: {
      AUSD: {
        name: 'Agora Dollar',
        symbol: 'AUSD',
        decimals: 6,
        contractAddress: '0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a',
        logoId: 'ausd',
        isNative: false,
        displayOrder: 1,
      },
      USDC: {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        logoId: 'usdc',
        isNative: false,
        displayOrder: 2,
      },
      USDT: {
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        logoId: 'usdt',
        isNative: false,
        displayOrder: 3,
      },
      ETH: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
        contractAddress: null,
        logoId: 'eth',
        isNative: true,
        displayOrder: 4,
      },
    },
  },
  base: {
    key: 'base',
    chainId: 8453,
    chainName: 'Base Mainnet',
    shortName: 'Base',
    nativeCurrency: {name: 'Ether', symbol: 'ETH', decimals: 18},
    rpcUrls: {
      primary: 'https://mainnet.base.org',
      fallback1: 'https://base-rpc.publicnode.com',
    },
    blockExplorer: {
      name: 'Basescan',
      url: 'https://basescan.org',
      txPath: '/tx/',
      addressPath: '/address/',
    },
    stats: {blockTime: '~2s', tps: '100+'},
    tapPayLedgerSupported: false,
    tokens: {
      USDC: {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        logoId: 'usdc',
        isNative: false,
        displayOrder: 1,
      },
      ETH: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
        contractAddress: null,
        logoId: 'eth',
        isNative: true,
        displayOrder: 2,
      },
    },
  },
};

export const SUPPORTED_CHAINS: ChainConfig[] = [
  CHAINS.monad,
  CHAINS.ethereum,
  CHAINS.base,
];

export const SUPPORTED_MAINNET_CHAIN_IDS: number[] = SUPPORTED_CHAINS.map(
  chain => chain.chainId,
);

let activeChainId: number = DEFAULT_CHAIN_ID;

export function getChainById(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find(chain => chain.chainId === chainId);
}

export function getActiveChain(): ChainConfig {
  return getChainById(activeChainId) ?? CHAINS.monad;
}

export function assertSupportedMainnetChain(chainId: number): ChainConfig {
  const chain = getChainById(chainId);
  if (!chain) {
    throw new Error(
      `Unsupported or non-mainnet chain ID ${chainId}. Supported mainnets: ${SUPPORTED_MAINNET_CHAIN_IDS.join(', ')}.`,
    );
  }
  return chain;
}

export async function setActiveChainId(chainId: number): Promise<ChainConfig> {
  const chain = assertSupportedMainnetChain(chainId);
  activeChainId = chain.chainId;
  try {
    await AsyncStorage.setItem(ACTIVE_CHAIN_STORAGE_KEY, String(chain.chainId));
  } catch {
    // Keep in-memory selection even if storage write fails.
  }
  return chain;
}

export async function loadSavedChainId(): Promise<ChainConfig> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_CHAIN_STORAGE_KEY);
    if (raw) {
      const parsed = Number(raw);
      const found = getChainById(parsed);
      if (found) {
        activeChainId = found.chainId;
        return found;
      }
    }
  } catch {
    // Fall back to default Monad Mainnet.
  }
  activeChainId = DEFAULT_CHAIN_ID;
  return CHAINS.monad;
}

export function getChainTokens(chainId?: number): TokenInfo[] {
  const chain = chainId !== undefined ? getChainById(chainId) ?? CHAINS.monad : getActiveChain();
  return Object.values(chain.tokens).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getChainExplorerTxUrl(txHash: string, chainId?: number): string {
  const chain = chainId !== undefined ? getChainById(chainId) ?? CHAINS.monad : getActiveChain();
  return `${chain.blockExplorer.url}${chain.blockExplorer.txPath}${txHash}`;
}

export function getChainExplorerAddressUrl(address: string, chainId?: number): string {
  const chain = chainId !== undefined ? getChainById(chainId) ?? CHAINS.monad : getActiveChain();
  return `${chain.blockExplorer.url}${chain.blockExplorer.addressPath}${address}`;
}
