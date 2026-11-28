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
  sessionIdHashOverride?: string,
): Promise<ethers.ContractTransactionResponse> {
  const ledgerAddress = getMultiTokenLedgerAddress();
  if (!ledgerAddress) {
    throw new Error('MultiTokenLedger is not configured');
  }

  const sessionIdHash = sessionIdHashOverride ?? createSessionIdHash();
  const ledger = new ethers.Contract(ledgerAddress, MULTI_TOKEN_LEDGER_ABI, signer);
  return await ledger.payWithLog(to, sessionIdHash, {value: amountWei});
}

const ERC20_APPROVE_GAS_FALLBACK = 55_000n;
const ERC20_RESET_APPROVE_GAS_FALLBACK = 35_000n;
const ERC20_LEDGER_PAY_GAS_FALLBACK = 120_000n;

export interface Erc20LedgerGasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  gasCostWei: bigint;
  needsApproval: boolean;
  needsResetApproval: boolean;
}

/**
 * Estimate total gas for an ERC-20 payment through MultiTokenLedger, including
 * any required `approve(0)` reset and `approve(amountRaw)` transactions (#138).
 */
export async function estimateErc20LedgerGasCost(
  from: string,
  tokenAddress: string,
  to: string,
  amountRaw: bigint,
  provider: ethers.Provider,
): Promise<Erc20LedgerGasEstimate | null> {
  const ledgerAddress = getMultiTokenLedgerAddress();
  if (!ledgerAddress || amountRaw <= 0n) {
    return null;
  }

  const allowanceContract = new ethers.Contract(
    tokenAddress,
    ['function allowance(address owner, address spender) view returns (uint256)'],
    provider,
  );
  const approvalInterface = new ethers.Interface([
    'function approve(address spender, uint256 amount) returns (bool)',
  ]);
  const ledgerInterface = new ethers.Interface(MULTI_TOKEN_LEDGER_ABI);

  let allowance = 0n;
  try {
    allowance = BigInt(await allowanceContract.allowance(from, ledgerAddress));
  } catch {
    allowance = 0n;
  }

  const needsApproval = allowance !== amountRaw;
  const needsResetApproval = needsApproval && allowance !== 0n;
  let totalGas = 0n;

  if (needsResetApproval) {
    try {
      const est = await provider.estimateGas({
        from,
        to: tokenAddress,
        data: approvalInterface.encodeFunctionData('approve', [ledgerAddress, 0n]),
      });
      totalGas += (est * 120n) / 100n;
    } catch {
      totalGas += ERC20_RESET_APPROVE_GAS_FALLBACK;
    }
  }

  if (needsApproval) {
    try {
      const est = await provider.estimateGas({
        from,
        to: tokenAddress,
        data: approvalInterface.encodeFunctionData('approve', [ledgerAddress, amountRaw]),
      });
      totalGas += (est * 120n) / 100n;
    } catch {
      totalGas += ERC20_APPROVE_GAS_FALLBACK;
    }
  }

  // Note: eth_estimateGas on payERC20WithLog reverts if allowance < amountRaw,
  // so we fall back to a realistic ledger transfer gas limit when approval is pending.
  if (!needsApproval) {
    try {
      const est = await provider.estimateGas({
        from,
        to: ledgerAddress,
        data: ledgerInterface.encodeFunctionData('payERC20WithLog', [
          tokenAddress,
          to,
          amountRaw,
          createSessionIdHash(),
        ]),
      });
      totalGas += (est * 120n) / 100n;
    } catch {
      totalGas += ERC20_LEDGER_PAY_GAS_FALLBACK;
    }
  } else {
    totalGas += ERC20_LEDGER_PAY_GAS_FALLBACK;
  }

  const feeData = await provider.getFeeData();
  const gasPrice =
    feeData.maxFeePerGas && feeData.maxFeePerGas > 0n
      ? feeData.maxFeePerGas
      : feeData.gasPrice && feeData.gasPrice > 0n
      ? feeData.gasPrice
      : ethers.parseUnits('50', 'gwei');

  return {
    gasLimit: totalGas,
    gasPrice,
    gasCostWei: totalGas * gasPrice,
    needsApproval,
    needsResetApproval,
  };
}

export async function sendErc20ViaMultiTokenLedger(
  signer: ethers.Wallet,
  tokenAddress: string,
  to: string,
  amountRaw: bigint,
  sessionIdHashOverride?: string,
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

    const sessionIdHash = sessionIdHashOverride ?? createSessionIdHash();
    const ledger = new ethers.Contract(ledgerAddress, MULTI_TOKEN_LEDGER_ABI, signer);
    return await ledger.payERC20WithLog(tokenAddress, to, amountRaw, sessionIdHash);
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
