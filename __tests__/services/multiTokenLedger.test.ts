import {ethers} from 'ethers';
import {sendErc20ViaMultiTokenLedger} from '../../src/services/multiTokenLedger';

jest.mock('../../src/utils/paymentSession', () => ({
  createSessionIdHash: () => '0x' + '11'.repeat(32),
}));
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {...original, ethers: {...original.ethers, Contract: jest.fn()}};
});

const tokenAddress = '0x' + '22'.repeat(20);
const recipient = '0x' + '33'.repeat(20);
const approvalInterface = new ethers.Interface([
  'function approve(address spender, uint256 amount) returns (bool)',
]);
const boolResult = (value: boolean) => approvalInterface.encodeFunctionResult('approve', [value]);

describe('sendErc20ViaMultiTokenLedger', () => {
  let allowance: jest.Mock;
  let pay: jest.Mock;
  let call: jest.Mock;
  let sendTransaction: jest.Mock;
  let paymentWait: jest.Mock;
  let approvalWait: jest.Mock;
  let signer: ethers.Wallet;

  const send = () => sendErc20ViaMultiTokenLedger(signer, tokenAddress, recipient, 10n);
  const approvedAmounts = () => sendTransaction.mock.calls.map(([request]) =>
    approvalInterface.decodeFunctionData('approve', request.data)[1],
  );

  beforeEach(() => {
    allowance = jest.fn().mockResolvedValue(0n);
    paymentWait = jest.fn().mockResolvedValue({status: 1});
    pay = jest.fn().mockResolvedValue({wait: paymentWait});
    call = jest.fn().mockResolvedValue(boolResult(true));
    approvalWait = jest.fn().mockResolvedValue({status: 1});
    sendTransaction = jest.fn().mockResolvedValue({wait: approvalWait});
    signer = {address: recipient, call, sendTransaction} as unknown as ethers.Wallet;
    (ethers.Contract as unknown as jest.Mock).mockImplementation((_address, abi) =>
      abi.some((entry: string) => entry.includes('allowance('))
        ? {allowance} : {payERC20WithLog: pay},
    );
  });

  it.each([boolResult(true), '0x'])('accepts approval return data %s', async result => {
    call.mockResolvedValue(result);
    const tx = await send();
    expect(approvedAmounts()).toEqual([10n]);
    expect(approvalWait).toHaveBeenCalledTimes(1);
    expect(paymentWait).not.toHaveBeenCalled();
    expect(tx.wait).toBe(paymentWait);
  });

  it.each([1n, 20n])('resets existing allowance %s before approving exactly', async value => {
    allowance.mockResolvedValue(value);
    await send();
    expect(approvedAmounts()).toEqual([0n, 10n]);
  });

  it('reuses an already exact allowance', async () => {
    allowance.mockResolvedValue(10n);
    await send();
    expect(sendTransaction).not.toHaveBeenCalled();
  });

  it('rejects explicit false without broadcasting the approval or payment', async () => {
    call.mockResolvedValueOnce(boolResult(false));
    await expect(send()).rejects.toThrow('Token approval returned false');
    expect(sendTransaction).not.toHaveBeenCalled();
    expect(pay).not.toHaveBeenCalled();
  });

  it('rejects malformed return data', async () => {
    call.mockResolvedValueOnce('0x12');
    await expect(send()).rejects.toThrow();
    expect(sendTransaction).not.toHaveBeenCalled();
    expect(pay).not.toHaveBeenCalled();
  });

  it('skips revocation when submission fails with no existing allowance', async () => {
    const error = new Error('submission rejected');
    sendTransaction.mockRejectedValue(error);
    await expect(send()).rejects.toBe(error);
    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(pay).not.toHaveBeenCalled();
  });

  it('revokes an existing allowance even if no new approval was sent', async () => {
    allowance.mockResolvedValue(10n);
    pay.mockRejectedValue(new Error('payment failed'));
    await expect(send()).rejects.toThrow('payment failed');
    expect(approvedAmounts()).toEqual([0n]);
  });

  it.each([null, {status: 0}])('rejects unsuccessful approval receipt %s', async receipt => {
    approvalWait.mockResolvedValueOnce(receipt);
    await expect(send()).rejects.toThrow('Token approval was not confirmed successfully');
    expect(pay).not.toHaveBeenCalled();
    expect(approvedAmounts()).toEqual([10n, 0n]);
  });

  it('revokes after payment submission failure', async () => {
    pay.mockRejectedValue(new Error('submission failed'));
    await expect(send()).rejects.toThrow('submission failed');
    expect(approvedAmounts()).toEqual([10n, 0n]);
  });

  it.each([null, {status: 0}])('returns broadcast payment without checking receipt %s or revoking', async receipt => {
    paymentWait.mockResolvedValue(receipt);
    const tx = await send();
    expect(tx).toBe(await pay.mock.results[0].value);
    expect(paymentWait).not.toHaveBeenCalled();
    expect(approvedAmounts()).toEqual([10n]);
  });

  it('preserves the broadcast hash when later receipt polling fails without revoking', async () => {
    const error = new Error('receipt timeout');
    paymentWait.mockRejectedValue(error);
    const broadcast = {hash: '0x' + '44'.repeat(32), wait: paymentWait};
    pay.mockResolvedValue(broadcast);
    const tx = await send();
    expect(tx).toBe(broadcast);
    expect(paymentWait).not.toHaveBeenCalled();
    await expect(tx.wait()).rejects.toBe(error);
    expect(tx.hash).toBe(broadcast.hash);
    expect(approvedAmounts()).toEqual([10n]);
  });

  it('reports both errors when revocation fails', async () => {
    const paymentError = new Error('payment failed');
    const revokeError = new Error('revoke failed');
    pay.mockRejectedValue(paymentError);
    sendTransaction.mockResolvedValueOnce({wait: approvalWait}).mockRejectedValueOnce(revokeError);
    const failure = await send().catch(error => error);
    expect(failure).toBeInstanceOf(Error);
    expect(failure.constructor).toBe(Error);
    expect(failure).toMatchObject({
      message: expect.stringContaining('revoke the ledger allowance manually'),
      errors: [paymentError, revokeError],
    });
  });
});
