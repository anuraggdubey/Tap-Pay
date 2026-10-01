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
    'function approve(address spender, uint256 amount) returns (bool)',
  ], signer);

  const allowance: bigint = await tokenContract.allowance(signer.address, ledgerAddress);
  if (allowance < amountRaw) {
    const approveTx = await tokenContract.approve(ledgerAddress, amountRaw);
    await approveTx.wait();
  }

  const sessionIdHash = createSessionIdHash();
  const ledger = new ethers.Contract(ledgerAddress, MULTI_TOKEN_LEDGER_ABI, signer);
  return await ledger.payERC20WithLog(tokenAddress, to, amountRaw, sessionIdHash);
}
