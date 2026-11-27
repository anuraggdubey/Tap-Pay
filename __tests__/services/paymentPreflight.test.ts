/**
 * Issue #128: a payment the ledger would reject is never signed or broadcast.
 *  - an estimate that reverts stops the payment (no fallback gas limit, no sendTransaction)
 *  - minPayment / maxPayment / paused() are checked before signing
 *  - the balance must cover amount + worst-case gas fee
 */

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(async () => ({username: 'tappay', password: '0x' + '11'.repeat(32)})),
  hasGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  canImplyAuthentication: jest.fn(),
  getSupportedBiometryType: jest.fn(),
  AUTHENTICATION_TYPE: {},
  ACCESS_CONTROL: {},
  SECURITY_LEVEL: {},
  STORAGE_TYPE: {},
  ACCESSIBLE: {},
}));

import {ethers} from 'ethers';
import {
  checkSufficientBalance,
  isRevertError,
  parseContractError,
  resetLedgerLimitsCache,
  sendPayment,
} from '../../src/services/wallet';
import {checkPaymentLimits, validateAmount} from '../../src/utils/validation';

const ledger = new ethers.Interface([
  'function minPayment() view returns (uint256)',
  'function maxPayment() view returns (uint256)',
  'function paused() view returns (bool)',
  'error BelowMinPayment(uint256 amount, uint256 minPayment)',
  'error EnforcedPause()',
]);
const TO = '0x2222222222222222222222222222222222222222';
const SESSION = '0x' + 'ab'.repeat(32);
const MIN = ethers.parseEther('0.0001');
const MAX = ethers.parseEther('10000');
const GWEI = ethers.parseUnits('1', 'gwei');

type Chain = {
  balance: bigint;
  min: bigint;
  max: bigint;
  paused: boolean;
  estimate: () => Promise<bigint>;
  limitsFail?: boolean;
};
let chain: Chain;
let sendTransaction: jest.SpyInstance;
let estimateGas: jest.SpyInstance;

beforeEach(() => {
  resetLedgerLimitsCache();
  chain = {balance: ethers.parseEther('5'), min: MIN, max: MAX, paused: false, estimate: async () => 60_000n};
  const proto = ethers.JsonRpcProvider.prototype as any;
  jest.spyOn(proto, 'getBalance').mockImplementation(async () => chain.balance);
  jest.spyOn(proto, 'getTransactionCount').mockImplementation(async () => 7);
  jest.spyOn(proto, 'getFeeData').mockImplementation(
    async () => new ethers.FeeData(GWEI, 2n * GWEI, GWEI),
  );
  estimateGas = jest.spyOn(proto, 'estimateGas').mockImplementation(() => chain.estimate());
  jest.spyOn(proto, 'call').mockImplementation(async (tx: any) => {
    if (chain.limitsFail) {
      throw new Error('network down');
    }
    const selector = String(tx.data).slice(0, 10);
    const coder = ethers.AbiCoder.defaultAbiCoder();
    if (selector === ledger.getFunction('minPayment')!.selector) {
      return coder.encode(['uint256'], [chain.min]);
    }
    if (selector === ledger.getFunction('maxPayment')!.selector) {
      return coder.encode(['uint256'], [chain.max]);
    }
    if (selector === ledger.getFunction('paused')!.selector) {
      return coder.encode(['bool'], [chain.paused]);
    }
    throw new Error(`unexpected call ${selector}`);
  });
  sendTransaction = jest
    .spyOn(ethers.Wallet.prototype, 'sendTransaction')
    .mockImplementation(async () => ({hash: '0x' + 'cd'.repeat(32)}) as any);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

const revert = (data: string) =>
  Object.assign(new Error('execution reverted'), {code: 'CALL_EXCEPTION', data});

describe('sendPayment pre-flight', () => {
  it('broadcasts a valid payment with the estimated gas limit', async () => {
    const result = await sendPayment(TO, ethers.parseEther('1'), SESSION);
    expect(result).toEqual({txHash: '0x' + 'cd'.repeat(32)});
    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(sendTransaction.mock.calls[0][0].gasLimit).toBe(72_000n);
  });

  it('rejects an amount below minPayment before estimating or signing', async () => {
    const result = await sendPayment(TO, ethers.parseEther('0.00005'), SESSION);
    expect(result.txHash).toBeNull();
    expect(result.error).toMatch(/minimum payment is 0\.0001 MON/);
    expect(estimateGas).not.toHaveBeenCalled();
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('rejects an amount above maxPayment', async () => {
    chain.balance = ethers.parseEther('20000');
    const result = await sendPayment(TO, ethers.parseEther('10001'), SESSION);
    expect(result.error).toMatch(/maximum payment is 10000\.0 MON/);
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('rejects every payment while the ledger is paused', async () => {
    chain.paused = true;
    const result = await sendPayment(TO, ethers.parseEther('1'), SESSION);
    expect(result.error).toMatch(/paused/i);
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('never broadcasts when the gas estimate reverts', async () => {
    chain.estimate = async () => {
      throw revert(ledger.encodeErrorResult('BelowMinPayment', [1n, MIN]));
    };
    const result = await sendPayment(TO, ethers.parseEther('1'), SESSION);
    expect(result.txHash).toBeNull();
    expect(result.error).toMatch(/below the minimum payment of 0\.0001 MON/);
    expect(sendTransaction).not.toHaveBeenCalled();
    // A revert is a final answer: no rotation to other endpoints.
    expect(estimateGas).toHaveBeenCalledTimes(1);
  });

  it('never broadcasts on a revert without data, or a pause revert', async () => {
    chain.estimate = async () => {
      throw Object.assign(new Error('missing revert data'), {code: 'CALL_EXCEPTION'});
    };
    expect((await sendPayment(TO, ethers.parseEther('1'), SESSION)).txHash).toBeNull();
    chain.estimate = async () => {
      throw revert(ledger.encodeErrorResult('EnforcedPause', []));
    };
    const paused = await sendPayment(TO, ethers.parseEther('1'), SESSION);
    expect(paused.error).toMatch(/paused/i);
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('uses the fallback gas limit only for network errors', async () => {
    chain.estimate = async () => {
      throw Object.assign(new Error('request timeout'), {code: 'TIMEOUT'});
    };
    const result = await sendPayment(TO, ethers.parseEther('1'), SESSION);
    expect(result.txHash).not.toBeNull();
    expect(sendTransaction.mock.calls[0][0].gasLimit).toBe(100_000n);
  });

  it('requires balance >= amount + gasLimit * maxFeePerGas (full balance is refused)', async () => {
    chain.balance = ethers.parseEther('1');
    const full = await sendPayment(TO, ethers.parseEther('1'), SESSION);
    expect(full.error).toMatch(/gas fee/i);
    expect(sendTransaction).not.toHaveBeenCalled();

    // 72,000 gas * 2 gwei max fee = 0.000144 MON of headroom needed.
    chain.balance = ethers.parseEther('1') + 72_000n * 2n * GWEI;
    expect((await sendPayment(TO, ethers.parseEther('1'), SESSION)).txHash).not.toBeNull();
  });

  it('still relies on the estimate when the limits cannot be read', async () => {
    chain.limitsFail = true;
    chain.estimate = async () => {
      throw revert(ledger.encodeErrorResult('BelowMinPayment', [1n, MIN]));
    };
    const result = await sendPayment(TO, 1n, SESSION);
    expect(result.txHash).toBeNull();
    expect(sendTransaction).not.toHaveBeenCalled();
  });
});

describe('checkSufficientBalance reports ledger limits', () => {
  it('flags an amount below the minimum before confirmation', async () => {
    const check = await checkSufficientBalance(TO, TO, ethers.parseEther('0.00001'));
    expect(check.limitError).toMatch(/minimum payment/);
  });

  it('does not apply native limits to a zero (token) amount', async () => {
    const check = await checkSufficientBalance(TO, TO, 0n);
    expect(check.limitError).toBeUndefined();
  });
});

describe('limit helpers', () => {
  const limits = {minPayment: MIN, maxPayment: MAX, paused: false};

  it('checkPaymentLimits', () => {
    expect(checkPaymentLimits(MIN, limits)).toBeNull();
    expect(checkPaymentLimits(MIN - 1n, limits)).toMatch(/minimum/);
    expect(checkPaymentLimits(MAX + 1n, limits)).toMatch(/maximum/);
    expect(checkPaymentLimits(MAX + 1n, {...limits, maxPayment: 0n})).toBeNull(); // 0 = unlimited
    expect(checkPaymentLimits(MIN, {...limits, paused: true})).toMatch(/paused/);
    expect(checkPaymentLimits(1n, null)).toBeNull();
  });

  it('validateAmount applies the limits when given', () => {
    expect(validateAmount('0.00005').valid).toBe(true);
    expect(validateAmount('0.00005', limits)).toEqual({valid: false, error: 'The minimum payment is 0.0001 MON.'});
    expect(validateAmount('0.0001', limits).valid).toBe(true);
  });

  it('isRevertError separates reverts from network failures', () => {
    expect(isRevertError({code: 'CALL_EXCEPTION'})).toBe(true);
    expect(isRevertError({code: 'INSUFFICIENT_FUNDS'})).toBe(true);
    expect(isRevertError({error: {code: 3, message: 'execution reverted'}})).toBe(true);
    expect(isRevertError(new Error('execution reverted: nope'))).toBe(true);
    expect(isRevertError({code: 'TIMEOUT', message: 'request timeout'})).toBe(false);
    expect(isRevertError({code: 'NETWORK_ERROR'})).toBe(false);
    expect(isRevertError(null)).toBe(false);
  });

  it('parseContractError decodes ledger custom errors', () => {
    expect(parseContractError(revert(ledger.encodeErrorResult('EnforcedPause', [])))).toMatch(/paused/i);
  });
});
