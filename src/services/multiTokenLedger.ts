/**
 * MultiTokenLedger — on-chain pass-through for MON and whitelisted ERC-20s.
 * Used by Pay tab / cross-border flows (session-logged payments).
 */

import {ethers} from 'ethers';
import {MONAD_CONFIG} from '../config/monad';
import {createSessionIdHash} from '../utils/paymentSession';

export const MULTI_TOKEN_LEDGER_ABI = [
  'function payWithLog(address to, bytes32 sessionIdHash) external payable',
  'function payERC20WithLog(address token, address to, uint256 amount, bytes32 sessionIdHash) external',
  'event PaymentLogged(address indexed from, address indexed to, address indexed token, uint256 amount, bytes32 sessionIdHash)',
  'error ZeroReceivedAmount()',
  'error SafeERC20FailedOperation(address token)',
];

export function getMultiTokenLedgerAddress(): string | null {
  const addr = MONAD_CONFIG.contracts.multiTokenLedger;
  return addr && ethers.isAddress(addr) ? addr : null;
}

export function isMultiTokenLedgerEnabled(): boolean {
  return getMultiTokenLedgerAddress() !== null;
}

export async function sendMonViaMultiTokenLedger(
  signer: ethers.Wallet,
  to: string,
  amountWei: bigint,
): Promise<ethers.ContractTransactionResponse> {
  const ledgerAddress = getMultiTokenLedgerAddress();
  if (!ledgerAddress) {
    throw new Error('MultiTokenLedger is not configured');
  }

  const sessionIdHash = createSessionIdHash();
  const ledger = new ethers.Contract(ledgerAddress, MULTI_TOKEN_LEDGER_ABI, signer);
  return await ledger.payWithLog(to, sessionIdHash, {value: amountWei});
}

export async function sendErc20ViaMultiTokenLedger(
  signer: ethers.Wallet,
  tokenAddress: string,
  to: string,
  amountRaw: bigint,
): Promise<ethers.ContractTransactionResponse> {
  const ledgerAddress = getMultiTokenLedgerAddress();
  if (!ledgerAddress) {
    throw new Error('MultiTokenLedger is not configured');
  }

  const tokenContract = new ethers.Contract(tokenAddress, [
    'function allowance(address owner, address spender) view returns (uint256)',
  ], signer);

  const approvalInterface = new ethers.Interface([
    'function approve(address spender, uint256 amount) returns (bool)',
  ]);
  let approvalSent = false;
  const approve = async (amount: bigint): Promise<void> => {
    const request = {
      to: tokenAddress,
      data: approvalInterface.encodeFunctionData('approve', [ledgerAddress, amount]),
    };
    // Raw calls tolerate legacy tokens with empty return data, but not false.
    const result = await signer.call(request);
    if (result !== '0x' && !approvalInterface.decodeFunctionResult('approve', result)[0]) {
      throw new Error('Token approval returned false');
    }
    const tx = await signer.sendTransaction(request);
    approvalSent = true;
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error('Token approval was not confirmed successfully');
    }
  };

  const allowance: bigint = await tokenContract.allowance(signer.address, ledgerAddress);
  try {
    if (allowance !== amountRaw) {
      if (allowance !== 0n) {
        await approve(0n);
      }
      await approve(amountRaw);
    }

    const sessionIdHash = createSessionIdHash();
    const ledger = new ethers.Contract(ledgerAddress, MULTI_TOKEN_LEDGER_ABI, signer);
    const tx = await ledger.payERC20WithLog(tokenAddress, to, amountRaw, sessionIdHash);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error('Payment was not confirmed successfully');
    }
    return tx;
  } catch (error) {
    if (!approvalSent && allowance === 0n) {
      throw error;
    }
    try {
      await approve(0n);
    } catch (revokeError) {
      const cleanupError = new Error(
        'Payment or approval failed and allowance revocation failed; revoke the ledger allowance manually',
      );
      throw Object.assign(cleanupError, {errors: [error, revokeError]});
    }
    throw error;
  }
}
