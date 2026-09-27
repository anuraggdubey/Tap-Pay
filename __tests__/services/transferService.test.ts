import {executeCrossBorderTransfer} from '../../src/services/crossBorder/transferService';
import * as tokenTransfer from '../../src/services/tokens/tokenTransfer';
import * as registry from '../../src/services/registry';
import {ethers} from 'ethers';

// Mock dependencies
jest.mock('../../src/services/tokens/tokenTransfer');
jest.mock('../../src/services/registry', () => ({
  resolveUsername: jest.fn(),
}));

describe('transferService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeCrossBorderTransfer', () => {
    it('should resolve username and transfer successfully', async () => {
      // Setup mocks
      const mockAddress = '0x1234567890123456789012345678901234567890';
      (registry.resolveUsername as jest.Mock).mockResolvedValue(mockAddress);
      
      const mockTransferResult = {
        success: true,
        txHash: '0xabc123',
        amount: '10.50',
        tokenSymbol: 'AUSD',
      };
      (tokenTransfer.sendTokenTransfer as jest.Mock).mockResolvedValue(mockTransferResult);

      const params = {
        recipient: '@alice',
        amount: '10.50',
        tokenSymbol: 'AUSD',
      };

      const result = await executeCrossBorderTransfer(params);

      expect(registry.resolveUsername).toHaveBeenCalledWith('alice');
      expect(tokenTransfer.sendTokenTransfer).toHaveBeenCalledWith({
        to: mockAddress,
        amount: '10.50',
        tokenSymbol: 'AUSD',
        signer: undefined,
      });
      expect(result).toEqual({
        ...mockTransferResult,
        resolvedAddress: mockAddress,
        recipientInput: '@alice',
        resolvedUsername: 'alice',
      });
    });

    it('should fail if username is not found', async () => {
      (registry.resolveUsername as jest.Mock).mockResolvedValue(null);

      const params = {
        recipient: '@unknown',
        amount: '10.50',
        tokenSymbol: 'AUSD',
      };

      const result = await executeCrossBorderTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Username @unknown not found');
      expect(tokenTransfer.sendTokenTransfer).not.toHaveBeenCalled();
    });

    it('should accept a direct 0x address without resolving', async () => {
      const directAddress = '0x111122223333444455556666777788889999aaaa';
      const mockTransferResult = {
        success: true,
        txHash: '0xdef456',
        amount: '5.0',
        tokenSymbol: 'USDC',
      };
      (tokenTransfer.sendTokenTransfer as jest.Mock).mockResolvedValue(mockTransferResult);

      const params = {
        recipient: directAddress,
        amount: '5.0',
        tokenSymbol: 'USDC',
      };

      const result = await executeCrossBorderTransfer(params);

      expect(registry.resolveUsername).not.toHaveBeenCalled();
      expect(tokenTransfer.sendTokenTransfer).toHaveBeenCalledWith({
        to: directAddress,
        amount: '5.0',
        tokenSymbol: 'USDC',
        signer: undefined,
      });
      expect(result.resolvedAddress).toBe(directAddress);
      expect(result.success).toBe(true);
    });

    it('should fail for invalid address format', async () => {
      const params = {
        recipient: 'not-an-address',
        amount: '10.50',
        tokenSymbol: 'AUSD',
      };

      const result = await executeCrossBorderTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid recipient');
      expect(tokenTransfer.sendTokenTransfer).not.toHaveBeenCalled();
    });
  });
});
