import {ethers} from 'ethers';
import {
  encodeReceiverAddress,
  decodeReceiverAddress,
  decodeReceiverPayload,
} from '../../src/utils/apdu';
import {createTapSessionNonce, hashSessionId} from '../../src/utils/paymentSession';

const mockQueryFilter = jest.fn();
const mockGetBlockNumber = jest.fn();
const mockGetTransactionReceipt = jest.fn();
const mockSendPayment = jest.fn();
const mockCorroborate = jest.fn(async (..._args: any[]) => 'confirmed');

jest.mock('../../src/services/wallet', () => ({
  withRpcFailover: jest.fn(async (fn: any) =>
    fn({
      getBlockNumber: mockGetBlockNumber,
      getTransactionReceipt: mockGetTransactionReceipt,
    }),
  ),
  sendPayment: (...args: any[]) => mockSendPayment(...args),
  getActiveRpcUrl: () => 'https://rpc-a.example',
  corroborateLog: (...args: any[]) => mockCorroborate(...args),
}));

jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  class MockContract {
    filters = {
      PaymentLogged: jest.fn(() => ({})),
    };
    queryFilter = mockQueryFilter;
  }
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: MockContract,
    },
  };
});

import {
  broadcastTapPayment,
  scanForIncomingTapPayment,
} from '../../src/services/tapPayment';

const RECEIVER = '0x1111111111111111111111111111111111111111';
const SENDER = '0x2222222222222222222222222222222222222222';

describe('Tap session nonce binding (#117)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBlockNumber.mockResolvedValue(100);
    mockGetTransactionReceipt.mockResolvedValue({status: 1});
  });

  it('encodes and decodes receiver URI with session nonce and remains backward compatible', () => {
    const nonce = createTapSessionNonce();
    const withNonce = encodeReceiverAddress(RECEIVER, nonce);
    expect(withNonce).toBe(`tappay://tap/${RECEIVER}?s=${nonce}`);
    expect(decodeReceiverPayload(withNonce)).toEqual({
      receiverAddress: RECEIVER,
      sessionNonce: nonce,
    });
    expect(decodeReceiverAddress(withNonce)).toBe(RECEIVER);

    // Legacy bare URI without ?s=
    const legacy = encodeReceiverAddress(RECEIVER);
    expect(legacy).toBe(`tappay://tap/${RECEIVER}`);
    expect(decodeReceiverPayload(legacy)).toEqual({receiverAddress: RECEIVER});
    expect(decodeReceiverAddress(legacy)).toBe(RECEIVER);

    // Invalid nonce rejected
    expect(decodeReceiverPayload(`tappay://tap/${RECEIVER}?s=bad!`)).toBeNull();
  });

  it('broadcastTapPayment hashes the NFC session nonce into sessionIdHash', async () => {
    const nonce = 'aabbccdd11223344556677889900aabb';
    const expectedHash = hashSessionId(nonce);
    mockSendPayment.mockResolvedValue({txHash: '0xabc'});

    const res = await broadcastTapPayment(RECEIVER, ethers.parseEther('1'), nonce);
    expect(res.txHash).toBe('0xabc');
    expect(mockSendPayment).toHaveBeenCalledWith(
      RECEIVER,
      ethers.parseEther('1'),
      expectedHash,
      'Confirm to send this payment',
    );
  });

  it('scanForIncomingTapPayment ignores concurrent payments with a different sessionIdHash', async () => {
    const expectedHash = hashSessionId('11112222333344445555666677778888');
    const unrelatedHash = hashSessionId('ffffffffffffffffffffffffffffffff');

    // Only an unrelated payment exists -> must return null
    mockQueryFilter.mockResolvedValueOnce([
      {
        blockNumber: 100,
        index: 0,
        transactionHash: '0xunrelated',
        args: {from: SENDER, amount: ethers.parseEther('5'), sessionId: unrelatedHash},
      },
    ]);
    // MultiTokenLedger returns empty
    mockQueryFilter.mockResolvedValueOnce([]);

    const noMatch = await scanForIncomingTapPayment(RECEIVER, 100, undefined, expectedHash);
    expect(noMatch).toBeNull();

    // Now both an unrelated payment and the matching tap payment exist -> returns the matching one
    mockQueryFilter.mockResolvedValueOnce([
      {
        blockNumber: 100,
        index: 0,
        transactionHash: '0xmatching',
        args: {from: SENDER, amount: ethers.parseEther('2'), sessionId: expectedHash},
      },
      {
        blockNumber: 100,
        index: 1,
        transactionHash: '0xunrelated2',
        args: {from: SENDER, amount: ethers.parseEther('9'), sessionId: unrelatedHash},
      },
    ]);
    mockQueryFilter.mockResolvedValueOnce([]);

    const match = await scanForIncomingTapPayment(RECEIVER, 100, undefined, expectedHash);
    expect(match).not.toBeNull();
    expect(match?.txHash).toBe('0xmatching');
    expect(match?.amountWei).toBe(ethers.parseEther('2'));
  });
});

describe('receiver needs a second endpoint to agree (#123)', () => {
  const event = {
    blockNumber: 100,
    index: 3,
    address: '0x03907aE845E016f5F1605BAE4e6392C3491e03f1',
    topics: ['0xaa', '0xbb'],
    data: '0x01',
    transactionHash: '0xforged',
    args: {from: SENDER, amount: ethers.parseEther('5'), sessionId: hashSessionId('11112222333344445555666677778888')},
  };
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBlockNumber.mockResolvedValue(100);
    mockGetTransactionReceipt.mockResolvedValue({status: 1});
  });

  async function scanWith(corroboration: string) {
    mockCorroborate.mockResolvedValueOnce(corroboration);
    mockQueryFilter.mockResolvedValueOnce([event]).mockResolvedValueOnce([]);
    return scanForIncomingTapPayment(RECEIVER, 100);
  }

  it('a log only endpoint A reports (B and C have no receipt) is not detected', async () => {
    await expect(scanWith('pending')).resolves.toBeNull();
  });

  it('a log another endpoint contradicts is not detected', async () => {
    await expect(scanWith('mismatch')).resolves.toBeNull();
  });

  it('a corroborated log is detected, checked against the exact log and its finder', async () => {
    const match = await scanWith('confirmed');
    expect(match?.txHash).toBe('0xforged');
    expect(mockCorroborate).toHaveBeenCalledWith(
      '0xforged',
      {address: event.address, topics: event.topics, data: event.data, index: 3},
      'https://rpc-a.example',
    );
  });
});
