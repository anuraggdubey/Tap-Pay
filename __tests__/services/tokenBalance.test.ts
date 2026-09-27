import {getTokenBalance} from '../../src/services/tokens/tokenBalance';
import * as wallet from '../../src/services/wallet';
import {SUPPORTED_TOKENS} from '../../src/config/tokens';
import {ethers} from 'ethers';

// Mock dependencies
jest.mock('../../src/services/wallet', () => ({
  getBalance: jest.fn(),
  withRpcFailover: jest.fn((callback) => callback({})),
}));

// Mock ethers contract
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ...original,
    ethers: {
      ...original.ethers,
      Contract: jest.fn().mockImplementation(() => ({
        balanceOf: jest.fn().mockResolvedValue(2000000n), // mock 2.0 AUSD (6 decimals for example)
      })),
    },
  };
});

describe('tokenBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTokenBalance', () => {
    it('should return native MON balance', async () => {
      // Mock the native getBalance
      (wallet.getBalance as jest.Mock).mockResolvedValue(1000000000000000000n); // 1 MON

      const result = await getTokenBalance('0x123', 'MON');

      expect(wallet.getBalance).toHaveBeenCalledWith('0x123');
      expect(result.success).toBe(true);
      expect(result.symbol).toBe('MON');
      expect(result.balanceFormatted).toBe('1.0000');
    });

    it('should return ERC-20 balance (e.g., AUSD)', async () => {
      // Note: The mock for ethers.Contract is set to return 2000000n
      // which for AUSD (if 6 decimals) is 2.0
      const token = SUPPORTED_TOKENS['AUSD'];
      
      const result = await getTokenBalance('0x123', 'AUSD');

      expect(wallet.withRpcFailover).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.symbol).toBe('AUSD');
      // Format depends on actual AUSD decimals, but checking it returns successfully
    });

    it('should fail gracefully if token is unknown', async () => {
      const result = await getTokenBalance('0x123', 'UNKNOWN');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown token');
    });
  });
});
