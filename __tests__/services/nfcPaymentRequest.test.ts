import {ethers} from 'ethers';
import {
  encodeReceiverAddress,
  decodeReceiverAddress,
  decodeReceiverPayload,
  validateTapPaymentRequest,
} from '../../src/utils/apdu';
import {SUPPORTED_TOKENS} from '../../src/config/tokens';

const mockQueryFilter = jest.fn();
const mockGetBlockNumber = jest.fn();
const mockGetTransactionReceipt = jest.fn();
const mockSendPayment = jest.fn();
const mockCorroborate = jest.fn(async (..._args: any[]) => 'confirmed');
const mockSendTokenTransfer = jest.fn();

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

jest.mock('../../src/services/tokens/tokenTransfer', () => ({
  sendTokenTransfer: (...args: any[]) => mockSendTokenTransfer(...args),
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

describe('NFC payment request / merchant mode (#118)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBlockNumber.mockResolvedValue(200);
    mockGetTransactionReceipt.mockResolvedValue({status: 1});
  });

  it('encodes and decodes valid payment request URIs and keeps bare URIs backward compatible', () => {
    const uri = encodeReceiverAddress(RECEIVER, {amount: '12.5', tokenSymbol: 'USDC'});
    expect(uri).toBe(`tappay://tap/${RECEIVER}?amt=12.5&tok=USDC`);
    expect(decodeReceiverPayload(uri)).toEqual({
      receiverAddress: RECEIVER,
      amount: '12.5',
      tokenSymbol: 'USDC',
    });
    expect(decodeReceiverAddress(uri)).toBe(RECEIVER);

    const legacy = encodeReceiverAddress(RECEIVER);
    expect(legacy).toBe(`tappay://tap/${RECEIVER}`);
    expect(decodeReceiverPayload(legacy)).toEqual({receiverAddress: RECEIVER});
  });

  it('strictly rejects invalid amounts, decimals, missing fields, or unsupported tokens', () => {
    expect(validateTapPaymentRequest('0', 'MON')).toBeNull();
    expect(validateTapPaymentRequest('-5', 'USDC')).toBeNull();
    expect(validateTapPaymentRequest('1e5', 'USDC')).toBeNull();
    expect(validateTapPaymentRequest('1.1234567', 'USDC')).toBeNull(); // > 6 decimals
    expect(validateTapPaymentRequest('10', 'DOGE')).toBeNull();

    expect(decodeReceiverPayload(`tappay://tap/${RECEIVER}?amt=10`)).toBeNull();
    expect(decodeReceiverPayload(`tappay://tap/${RECEIVER}?tok=USDC`)).toBeNull();
    expect(decodeReceiverPayload(`tappay://tap/${RECEIVER}?amt=-1&tok=MON`)).toBeNull();
    expect(decodeReceiverPayload(`tappay://tap/${RECEIVER}?amt=5&tok=FAKE`)).toBeNull();
  });

  it('routes non-MON requested payments through sendTokenTransfer', async () => {
    mockSendTokenTransfer.mockResolvedValue({
      txHash: '0xusdc',
      success: true,
      tokenSymbol: 'USDC',
      amount: '15.25',
    });

    const amountWei = ethers.parseUnits('15.25', 6);
    const res = await broadcastTapPayment(RECEIVER, amountWei, 'USDC', '15.25');
    expect(res.txHash).toBe('0xusdc');
    expect(mockSendTokenTransfer).toHaveBeenCalledWith({
      to: RECEIVER,
      amount: '15.25',
      tokenSymbol: 'USDC',
    });
    expect(mockSendPayment).not.toHaveBeenCalled();
  });

  it('scanForIncomingTapPayment rejects underpayments and wrong tokens when expectedRequest is set', async () => {
    const expected = {
      amountWei: ethers.parseUnits('10', 6),
      tokenSymbol: 'USDC',
    };

    // Event 1: wrong token (MON of 10 ether), Event 2: underpayment (5 USDC)
    mockQueryFilter.mockResolvedValueOnce([
      {
        blockNumber: 200,
        index: 0,
        transactionHash: '0xwrongtoken',
        args: {from: SENDER, amount: ethers.parseEther('10')},
      },
    ]);
    mockQueryFilter.mockResolvedValueOnce([
      {
        blockNumber: 200,
        index: 1,
        transactionHash: '0xunderpay',
        args: {
          from: SENDER,
          token: SUPPORTED_TOKENS.USDC.contractAddress,
          amount: ethers.parseUnits('5', 6),
        },
      },
    ]);

    const rejected = await scanForIncomingTapPayment(RECEIVER, 200, undefined, expected);
    expect(rejected).toBeNull();

    // Now an exact 10 USDC event arrives -> accepted
    mockQueryFilter.mockResolvedValueOnce([]);
    mockQueryFilter.mockResolvedValueOnce([
      {
        blockNumber: 200,
        index: 2,
        transactionHash: '0xexact',
        args: {
          from: SENDER,
          token: SUPPORTED_TOKENS.USDC.contractAddress,
          amount: ethers.parseUnits('10', 6),
        },
      },
    ]);

    const accepted = await scanForIncomingTapPayment(RECEIVER, 200, undefined, expected);
    expect(accepted).not.toBeNull();
    expect(accepted?.txHash).toBe('0xexact');
    expect(accepted?.tokenSymbol).toBe('USDC');
    expect(accepted?.amountWei).toBe(ethers.parseUnits('10', 6));
  });

  it('binds ERC-20 tap payments to the NFC session nonce hash', async () => {
    const nonce = '0123456789abcdef0123456789abcdef';
    mockSendTokenTransfer.mockResolvedValue({txHash: '0xbounderc20', success: true});

    const res = await broadcastTapPayment(
      RECEIVER,
      ethers.parseUnits('10', 6),
      'USDC',
      '10',
      nonce,
    );

    expect(res.txHash).toBe('0xbounderc20');
    expect(mockSendTokenTransfer).toHaveBeenCalledWith({
      to: RECEIVER,
      amount: '10',
      tokenSymbol: 'USDC',
      sessionIdHash: ethers.keccak256(ethers.toUtf8Bytes(nonce)),
    });
  });
});
