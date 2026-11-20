/**
 * Tap payment: the sender must read + confirm the recipient BEFORE any signing/broadcast.
 */

const mockReadReceiverAddress = jest.fn();
const mockStopContinuousHceScan = jest.fn().mockResolvedValue(undefined);
const mockSendPayment = jest.fn();
const mockReverseResolve = jest.fn();

jest.mock('../../src/services/nfcReader', () => ({
  readReceiverAddress: (...a: unknown[]) => mockReadReceiverAddress(...a),
  cancelNfcRead: jest.fn().mockResolvedValue(undefined),
  stopContinuousHceScan: (...a: unknown[]) => mockStopContinuousHceScan(...a),
}));
jest.mock('../../src/services/hce', () => ({
  createHceReceiverLease: jest.fn(),
  stopHceSession: jest.fn(),
}));
jest.mock('../../src/services/wallet', () => ({
  getBalance: jest.fn(),
  withRpcFailover: jest.fn(),
  sendPayment: (...a: unknown[]) => mockSendPayment(...a),
}));
jest.mock('../../src/services/registry', () => ({
  reverseResolveAddress: (...a: unknown[]) => mockReverseResolve(...a),
}));

import {readTapRecipient, broadcastTapPayment} from '../../src/services/tapPayment';

const SENDER = '0x1111111111111111111111111111111111111111';
const RECEIVER_LOWER = '0xabcdef1234567890abcdef1234567890abcdef12';

beforeEach(() => {
  jest.clearAllMocks();
  mockStopContinuousHceScan.mockResolvedValue(undefined);
});

describe('readTapRecipient', () => {
  it('returns the checksummed recipient and never signs', async () => {
    mockReadReceiverAddress.mockResolvedValue({status: 'SUCCESS', receiverAddress: RECEIVER_LOWER});
    mockReverseResolve.mockResolvedValue('bob');

    const result = await readTapRecipient(SENDER);

    expect(result.recipient?.receiverAddress).toBe('0xabCDEF1234567890ABcDEF1234567890aBCDeF12');
    expect(result.recipient?.receiverUsername).toBe('bob');
    expect(mockSendPayment).not.toHaveBeenCalled();
    expect(mockStopContinuousHceScan).toHaveBeenCalled();
  });

  it('rejects a self-payment without signing', async () => {
    mockReadReceiverAddress.mockResolvedValue({status: 'SUCCESS', receiverAddress: SENDER});
    const result = await readTapRecipient(SENDER);
    expect(result.recipient).toBeUndefined();
    expect(result.error).toMatch(/your own address/i);
    expect(mockSendPayment).not.toHaveBeenCalled();
  });

  it('rejects an invalid address payload', async () => {
    mockReadReceiverAddress.mockResolvedValue({status: 'SUCCESS', receiverAddress: '0xnothex'});
    const result = await readTapRecipient(SENDER);
    expect(result.error).toMatch(/invalid address/i);
    expect(mockSendPayment).not.toHaveBeenCalled();
  });

  it('surfaces a read failure', async () => {
    mockReadReceiverAddress.mockResolvedValue({status: 'TIMEOUT', errorMessage: 'No NFC signal.'});
    const result = await readTapRecipient(SENDER);
    expect(result.error).toBe('No NFC signal.');
    expect(mockSendPayment).not.toHaveBeenCalled();
  });

  it('still returns the recipient when username lookup fails', async () => {
    mockReadReceiverAddress.mockResolvedValue({status: 'SUCCESS', receiverAddress: RECEIVER_LOWER});
    mockReverseResolve.mockRejectedValue(new Error('network'));
    const result = await readTapRecipient(SENDER);
    expect(result.recipient?.receiverAddress).toBeTruthy();
    expect(result.recipient?.receiverUsername).toBeUndefined();
  });
});

describe('broadcastTapPayment', () => {
  it('signs/broadcasts to the confirmed recipient and returns the hash', async () => {
    mockSendPayment.mockResolvedValue({txHash: '0xdead'});
    const result = await broadcastTapPayment(RECEIVER_LOWER, 1000n);
    expect(result.txHash).toBe('0xdead');
    expect(mockSendPayment).toHaveBeenCalledWith(RECEIVER_LOWER, 1000n, expect.any(String), expect.any(String));
  });

  it('returns the error when the broadcast fails', async () => {
    mockSendPayment.mockResolvedValue({txHash: null, error: 'Insufficient MON balance'});
    const result = await broadcastTapPayment(RECEIVER_LOWER, 1000n);
    expect(result.txHash).toBeNull();
    expect(result.error).toBe('Insufficient MON balance');
  });
});
