jest.mock('../../src/services/nfcReader', () => ({
  readReceiverAddress: jest.fn(),
  cancelNfcRead: jest.fn().mockResolvedValue(undefined),
  stopContinuousHceScan: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/registry', () => ({
  reverseResolveAddress: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/services/wallet', () => ({
  corroborateLog: jest.fn(),
  getActiveRpcUrl: jest.fn(() => 'https://rpc.monad.xyz'),
  sendPayment: jest.fn(),
  withRpcFailover: jest.fn(),
}));

import {ethers} from 'ethers';
import {encodeReceiverAddress, decodeReceiverPayload} from '../../src/utils/apdu';
import {readReceiverAddress} from '../../src/services/nfcReader';
import {readTapRecipient} from '../../src/services/tapPayment';
import {estimateErc20LedgerGasCost} from '../../src/services/multiTokenLedger';

const SENDER = '0x1111111111111111111111111111111111111111';
const RECEIVER = '0x2222222222222222222222222222222222222222';
const TOKEN = '0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a';
const NONCE = '0123456789abcdef0123456789abcdef';

describe('#138 NFC session expiry (?exp=) encoding and validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('encodes and decodes ?exp=<unixSeconds> alongside nonce and payment request', () => {
    const expiresAtMs = 1_800_000_000_000;
    const uri = encodeReceiverAddress(RECEIVER, {
      sessionNonce: NONCE,
      paymentRequest: {amount: '25.5', tokenSymbol: 'AUSD'},
      expiresAt: expiresAtMs,
    });

    expect(uri).toBe(
      `tappay://tap/${RECEIVER}?s=${NONCE}&amt=25.5&tok=AUSD&exp=1800000000`,
    );

    const decoded = decodeReceiverPayload(uri);
    expect(decoded).toEqual({
      receiverAddress: RECEIVER,
      sessionNonce: NONCE,
      amount: '25.5',
      tokenSymbol: 'AUSD',
      expiresAt: expiresAtMs,
    });
  });

  test('rejects malformed ?exp= values while keeping payloads without exp valid', () => {
    expect(decodeReceiverPayload(`tappay://tap/${RECEIVER}?exp=abc`)).toBeNull();
    expect(decodeReceiverPayload(`tappay://tap/${RECEIVER}?exp=0`)).toBeNull();
    expect(decodeReceiverPayload(`tappay://tap/${RECEIVER}?exp=-10`)).toBeNull();
    expect(decodeReceiverPayload(`tappay://tap/${RECEIVER}`)).toEqual({
      receiverAddress: RECEIVER,
    });
  });

  test('readTapRecipient rejects an expired receiver session immediately', async () => {
    (readReceiverAddress as jest.Mock).mockResolvedValue({
      status: 'SUCCESS',
      receiverAddress: RECEIVER,
      sessionNonce: NONCE,
      expiresAt: Date.now() - 5_000,
    });

    const result = await readTapRecipient(SENDER, undefined, {skipUsernameLookup: true});
    expect(result.recipient).toBeUndefined();
    expect(result.error).toMatch(/expired/i);
  });

  test('readTapRecipient propagates future expiresAt to recipient', async () => {
    const futureExpiry = Date.now() + 60_000;
    (readReceiverAddress as jest.Mock).mockResolvedValue({
      status: 'SUCCESS',
      receiverAddress: RECEIVER,
      sessionNonce: NONCE,
      expiresAt: futureExpiry,
    });

    const result = await readTapRecipient(SENDER, undefined, {skipUsernameLookup: true});
    expect(result.error).toBeUndefined();
    expect(result.recipient?.expiresAt).toBe(futureExpiry);
  });
});

describe('#138 ERC-20 approval + MultiTokenLedger gas estimation', () => {
  function makeMockProvider(allowance: bigint, gasPerCall: bigint) {
    const encodedAllowance = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [allowance]);
    return {
      call: jest.fn().mockResolvedValue(encodedAllowance),
      estimateGas: jest.fn().mockResolvedValue(gasPerCall),
      getFeeData: jest.fn().mockResolvedValue({
        maxFeePerGas: 20_000_000_000n,
        gasPrice: 20_000_000_000n,
      }),
    } as unknown as ethers.Provider;
  }

  test('includes approve + ledger pay gas when allowance is 0', async () => {
    const provider = makeMockProvider(0n, 50_000n);
    const est = await estimateErc20LedgerGasCost(SENDER, TOKEN, RECEIVER, 1_000_000n, provider);
    expect(est).not.toBeNull();
    expect(est!.needsApproval).toBe(true);
    expect(est!.needsResetApproval).toBe(false);
    // 50_000 * 1.2 (approve) + 120_000 (ledger fallback when allowance < amount) = 180_000
    expect(est!.gasLimit).toBe(180_000n);
    expect(est!.gasCostWei).toBe(180_000n * 20_000_000_000n);
  });

  test('includes reset approve(0) + approve(amount) + ledger pay gas when non-zero mismatched allowance exists', async () => {
    const provider = makeMockProvider(500_000n, 40_000n);
    const est = await estimateErc20LedgerGasCost(SENDER, TOKEN, RECEIVER, 1_000_000n, provider);
    expect(est).not.toBeNull();
    expect(est!.needsApproval).toBe(true);
    expect(est!.needsResetApproval).toBe(true);
    // 48_000 (approve 0) + 48_000 (approve amount) + 120_000 (ledger fallback) = 216_000
    expect(est!.gasLimit).toBe(216_000n);
  });

  test('skips approval gas when exact allowance is already set', async () => {
    const provider = makeMockProvider(1_000_000n, 90_000n);
    const est = await estimateErc20LedgerGasCost(SENDER, TOKEN, RECEIVER, 1_000_000n, provider);
    expect(est).not.toBeNull();
    expect(est!.needsApproval).toBe(false);
    expect(est!.needsResetApproval).toBe(false);
    // 90_000 * 1.2 = 108_000
    expect(est!.gasLimit).toBe(108_000n);
  });
});
