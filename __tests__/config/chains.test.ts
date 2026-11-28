import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CHAINS,
  DEFAULT_CHAIN_ID,
  SUPPORTED_CHAINS,
  SUPPORTED_MAINNET_CHAIN_IDS,
  assertSupportedMainnetChain,
  getActiveChain,
  getChainById,
  getChainExplorerAddressUrl,
  getChainExplorerTxUrl,
  getChainTokens,
  loadSavedChainId,
  setActiveChainId,
} from '../../src/config/chains';
import {assertMainnetOnlyConfig} from '../../src/config/networkGuard';

describe('Multichain EVM configuration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await setActiveChainId(DEFAULT_CHAIN_ID);
  });

  it('registers Monad, Ethereum, and Base mainnets with HTTPS non-testnet RPCs', () => {
    expect(SUPPORTED_MAINNET_CHAIN_IDS).toEqual([143, 1, 8453]);
    expect(SUPPORTED_CHAINS).toHaveLength(3);
    expect(() => assertMainnetOnlyConfig()).not.toThrow();

    for (const chain of SUPPORTED_CHAINS) {
      expect(chain.rpcUrls.primary.startsWith('https://')).toBe(true);
      expect(chain.rpcUrls.primary.toLowerCase()).not.toContain('testnet');
      expect(chain.blockExplorer.url.startsWith('https://')).toBe(true);
    }
  });

  it('defaults to Monad Mainnet and persists chain switching across supported mainnets', async () => {
    expect(getActiveChain().chainId).toBe(143);
    expect(CHAINS.monad.tapPayLedgerSupported).toBe(true);
    expect(CHAINS.ethereum.tapPayLedgerSupported).toBe(false);
    expect(CHAINS.base.tapPayLedgerSupported).toBe(false);

    const eth = await setActiveChainId(1);
    expect(eth.key).toBe('ethereum');
    expect(getActiveChain().chainId).toBe(1);
    expect(getChainExplorerTxUrl('0xabc')).toBe('https://etherscan.io/tx/0xabc');
    expect(getChainExplorerAddressUrl('0x123')).toBe('https://etherscan.io/address/0x123');

    const loaded = await loadSavedChainId();
    expect(loaded.chainId).toBe(1);

    const base = await setActiveChainId(8453);
    expect(base.key).toBe('base');
    expect(getChainTokens(8453).map(t => t.symbol)).toEqual(['USDC', 'ETH']);
  });

  it('rejects unsupported or testnet chain IDs', async () => {
    expect(getChainById(10143)).toBeUndefined(); // Monad testnet
    expect(getChainById(11155111)).toBeUndefined(); // Sepolia
    expect(() => assertSupportedMainnetChain(10143)).toThrow(/Unsupported or non-mainnet/i);
    await expect(setActiveChainId(11155111)).rejects.toThrow(/Unsupported or non-mainnet/i);
  });
});
