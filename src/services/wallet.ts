/**
 * Wallet Service — Key generation, secure storage, signing, and broadcasting
 *
 * Private keys are stored in Android Keystore via react-native-keychain.
 * Keys NEVER leave the device, are NEVER logged, and are NEVER sent to any backend.
 */

import 'react-native-get-random-values';
import '@ethersproject/shims';
import {ethers} from 'ethers';
import * as Keychain from 'react-native-keychain';
import {MONAD_CONFIG, GAS_LIMIT_FALLBACK, TX_POLL_INTERVAL_MS, TX_MAX_WAIT_MS} from '../config/monad';

const KEYCHAIN_SERVICE = 'com.tappay.wallet';

// List of Monad RPC endpoints for automatic failover rotation
const RPC_ENDPOINTS = [
  MONAD_CONFIG.rpcUrls.primary,
  MONAD_CONFIG.rpcUrls.fallback1,
  MONAD_CONFIG.rpcUrls.fallback2,
];

let _currentRpcIndex = 0;
let _provider: ethers.JsonRpcProvider | null = null;

// Create a provider for the current RPC endpoint
function createProvider(endpointIndex = _currentRpcIndex): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(
    RPC_ENDPOINTS[endpointIndex],
    {
      chainId: MONAD_CONFIG.chainId,
      name: MONAD_CONFIG.chainName,
    },
    {
      staticNetwork: true,
    },
  );
}

export function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = createProvider();
  }
  return _provider;
}

/**
 * Rotate to the next fallback RPC if the current one is unresponsive or rate-limited
 */
export function rotateRpcProvider(): ethers.JsonRpcProvider {
  _currentRpcIndex = (_currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  console.log(`[RPC Failover] Switching to RPC endpoint #${_currentRpcIndex}: ${RPC_ENDPOINTS[_currentRpcIndex]}`);
  _provider = createProvider(_currentRpcIndex);
  return _provider;
}

/**
 * Execute an RPC action with automatic retry & rotation on failover
 */
export async function withRpcFailover<T>(action: (provider: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
  let attempts = 0;
  let lastError: any = null;

  while (attempts < RPC_ENDPOINTS.length) {
    try {
      const provider = getProvider();
      return await action(provider);
    } catch (err: any) {
      lastError = err;
      console.warn(`RPC call failed on endpoint #${_currentRpcIndex}, rotating... Error:`, err?.message || err);
      rotateRpcProvider();
      attempts++;
    }
  }

  throw lastError;
}

/**
 * Generate a new random wallet
 * @returns The wallet's address and private key (key should be saved immediately)
 */
export function generateWallet(): {address: string; privateKey: string} {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * Check if the device has biometric authentication hardware and enrolled biometrics
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  try {
    const biometryType = await Keychain.getSupportedBiometryType();
    return biometryType !== null;
  } catch {
    return false;
  }
}

/**
 * Save a private key to Android Keystore via react-native-keychain
 */
export async function savePrivateKey(privateKey: string): Promise<boolean> {
  try {
    const wallet = new ethers.Wallet(privateKey);
    await Keychain.setGenericPassword(wallet.address, privateKey, {
      service: KEYCHAIN_SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      storage: Keychain.STORAGE_TYPE.AES_GCM,
    });
    return true;
  } catch (error) {
    console.error('Failed to save private key:', error);
    return false;
  }
}

/**
 * Load the private key from Android Keystore with biometric authorization
 * @param promptTitle Optional prompt title to display in Android BiometricPrompt
 * @returns The private key string, or null if cancelled or not found
 */
export async function loadPrivateKey(promptTitle?: string): Promise<string | null> {
  try {
    const options: Keychain.Options = {
      service: KEYCHAIN_SERVICE,
    };

    if (promptTitle) {
      options.authenticationPrompt = {
        title: promptTitle,
        subtitle: 'TapPay Authorization',
        description: 'Confirm your identity using biometrics to proceed',
        cancel: 'Cancel',
      };
    }

    const credentials = await Keychain.getGenericPassword(options);
    if (credentials) {
      return credentials.password;
    }
    return null;
  } catch (error: any) {
    console.warn('Biometric/Keystore authentication cancelled or failed:', error?.message || error);
    return null;
  }
}

/**
 * Check if a wallet exists in secure storage without prompting for biometrics
 */
export async function hasWallet(): Promise<boolean> {
  try {
    const credentials = await Keychain.getGenericPassword({service: KEYCHAIN_SERVICE});
    return credentials !== false && !!credentials;
  } catch {
    return false;
  }
}

/**
 * Delete the stored wallet (for reset/testing)
 */
export async function deleteWallet(): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
    return true;
  } catch (error) {
    console.error('Failed to delete wallet:', error);
    return false;
  }
}

/**
 * Get the wallet address from stored credentials
 */
export async function getWalletAddress(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({service: KEYCHAIN_SERVICE});
    if (!credentials) {
      return null;
    }
    // If username stores the address, return it immediately
    if (credentials.username && credentials.username.startsWith('0x')) {
      return credentials.username;
    }
    const wallet = new ethers.Wallet(credentials.password);
    return wallet.address;
  } catch {
    return null;
  }
}

/**
 * Parse contract revert reasons and common RPC errors into human-readable messages
 */
export function parseContractError(error: any): string {
  if (!error) {
    return 'Unknown transaction error occurred';
  }

  const message = error.message || error.toString();
  const data = error.data || error.error?.data || '';

  // TapPayLedger custom error signatures / names
  if (message.includes('SessionAlreadyProcessed') || data.includes('0x408b04d1')) {
    return 'This payment session was already processed.';
  }
  if (message.includes('InvalidRecipient') || data.includes('0x1879c3f3')) {
    return 'Invalid recipient address or self-payment is not allowed.';
  }
  if (message.includes('ZeroAmount') || data.includes('0x1f2a2005')) {
    return 'Payment amount must be greater than zero.';
  }
  if (message.includes('TransferFailed') || data.includes('0x90b98a11')) {
    return 'Transfer to recipient contract failed.';
  }

  // UsernameRegistry custom errors
  if (message.includes('UsernameTaken')) {
    return 'This username is already taken by another user.';
  }
  if (message.includes('AlreadyRegistered')) {
    return 'This wallet already has a registered username.';
  }
  if (message.includes('NotRegistered')) {
    return 'This wallet does not have a registered username.';
  }
  if (message.includes('InvalidUsernameLength')) {
    return 'Username must be between 3 and 20 characters.';
  }
  if (message.includes('InvalidCharacter')) {
    return 'Username contains invalid characters (use a-z, 0-9, and _).';
  }

  // Standard EVM / RPC errors
  if (message.includes('insufficient funds') || message.includes('exceeds balance')) {
    return 'Insufficient MON balance for payment and network gas fee.';
  }
  if (message.includes('nonce too low') || message.includes('replacement transaction underpriced')) {
    return 'Transaction nonce conflict. Please wait a moment and retry.';
  }
  if (message.includes('user rejected') || message.includes('User denied')) {
    return 'Payment cancelled by user.';
  }

  return error.reason || error.shortMessage || message;
}

export interface BalanceCheckResult {
  canAfford: boolean;
  balance: bigint;
  requiredTotal: bigint;
  amountWei: bigint;
  gasCostWei: bigint;
  missingWei: bigint;
}

/**
 * Pre-check if the wallet balance can cover the payment amount plus estimated gas cost
 */
export async function checkSufficientBalance(
  fromAddress: string,
  toAddress: string,
  amountWei: bigint,
): Promise<BalanceCheckResult> {
  const provider = getProvider();
  const balance = await getBalance(fromAddress);

  // Estimate gas or use safe fallback
  const gasInfo = await estimateGasCost(fromAddress, toAddress, amountWei);
  const gasCostWei = gasInfo ? gasInfo.gasCostWei : GAS_LIMIT_FALLBACK * ethers.parseUnits('50', 'gwei');

  const requiredTotal = amountWei + gasCostWei;
  const canAfford = balance >= requiredTotal;
  const missingWei = canAfford ? 0n : requiredTotal - balance;

  return {
    canAfford,
    balance,
    requiredTotal,
    amountWei,
    gasCostWei,
    missingWei,
  };
}

/**
 * Get the wallet's MON balance with failover support
 */
export async function getBalance(address: string): Promise<bigint> {
  return await withRpcFailover(async provider => {
    return await provider.getBalance(address);
  });
}

/**
 * Sign a message with the stored wallet key (gated by biometric authorization)
 */
export async function signMessage(
  message: string | Uint8Array,
  authPromptTitle = 'Confirm Biometric Authorization to Sign',
): Promise<string | null> {
  const key = await loadPrivateKey(authPromptTitle);
  if (!key) {
    return null;
  }
  const wallet = new ethers.Wallet(key);
  return await wallet.signMessage(message);
}

/**
 * Build, sign, and broadcast a transaction to TapPayLedger.payWithLog()
 * @returns The transaction hash, or null on failure
 */
export async function sendPayment(
  to: string,
  amountWei: bigint,
  sessionIdHash?: string,
  authPromptTitle = 'Confirm Biometric Authorization to Send Payment',
): Promise<{txHash: string | null; error?: string}> {
  try {
    const key = await loadPrivateKey(authPromptTitle);
    if (!key) {
      return {txHash: null, error: 'Authentication cancelled or wallet not found'};
    }

    return await withRpcFailover(async provider => {
      const wallet = new ethers.Wallet(key, provider);

      // Pre-check balance before sending
      const balance = await provider.getBalance(wallet.address);
      if (balance < amountWei) {
        return {txHash: null, error: 'Insufficient MON balance'};
      }

      // If TapPayLedger contract is configured, call payWithLog
      if (MONAD_CONFIG.contracts.tapPayLedger && sessionIdHash) {
        const ledgerAbi = [
          'function payWithLog(address to, bytes32 sessionIdHash) external payable',
        ];
        const ledgerContract = new ethers.Contract(
          MONAD_CONFIG.contracts.tapPayLedger,
          ledgerAbi,
          wallet,
        );
        const tx = await ledgerContract.payWithLog(to, sessionIdHash, {
          value: amountWei,
        });
        return {txHash: tx.hash};
      }

      // Estimate gas with 20% safety margin
      let gasLimit: bigint;
      try {
        const estimate = await provider.estimateGas({
          from: wallet.address,
          to,
          value: amountWei,
        });
        gasLimit = (estimate * 120n) / 100n;
      } catch {
        gasLimit = GAS_LIMIT_FALLBACK;
      }

      // Get nonce (pending to avoid collisions)
      const nonce = await provider.getTransactionCount(wallet.address, 'pending');

      // Fetch fee data
      const feeData = await provider.getFeeData();

      // Build and broadcast transaction
      const tx = await wallet.sendTransaction({
        to,
        value: amountWei,
        gasLimit,
        nonce,
        gasPrice: feeData.gasPrice,
        chainId: MONAD_CONFIG.chainId,
      });

      return {txHash: tx.hash};
    });
  } catch (error: any) {
    const parsedError = parseContractError(error);
    return {txHash: null, error: parsedError};
  }
}

/**
 * Poll for transaction receipt with Monad-optimized interval (500ms)
 */
export async function waitForReceipt(
  txHash: string,
): Promise<{confirmed: boolean; error?: string}> {
  const startTime = Date.now();

  while (Date.now() - startTime < TX_MAX_WAIT_MS) {
    try {
      const provider = getProvider();
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        if (receipt.status === 1) {
          return {confirmed: true};
        } else {
          return {confirmed: false, error: 'Transaction reverted on chain'};
        }
      }
    } catch {
      // RPC transient error — continue polling
    }

    // Wait 500ms (Monad has ~1s blocks)
    await new Promise(resolve => setTimeout(resolve, TX_POLL_INTERVAL_MS));
  }

  return {confirmed: false, error: 'Confirmation timeout — transaction may still confirm'};
}

/**
 * Estimate gas cost for a payment (for display in confirm modal & pre-flight checks)
 */
export async function estimateGasCost(
  from: string,
  to: string,
  amountWei: bigint,
): Promise<{gasLimit: bigint; gasPrice: bigint; gasCostWei: bigint} | null> {
  try {
    return await withRpcFailover(async provider => {
      let estimate: bigint;
      try {
        estimate = await provider.estimateGas({from, to, value: amountWei});
        estimate = (estimate * 120n) / 100n; // 20% safety margin
      } catch {
        estimate = GAS_LIMIT_FALLBACK;
      }

      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice && feeData.gasPrice > 0n
        ? feeData.gasPrice
        : ethers.parseUnits('50', 'gwei');

      const gasCostWei = estimate * gasPrice;

      return {gasLimit: estimate, gasPrice, gasCostWei};
    });
  } catch {
    // Fallback calculation in case of RPC offline
    const fallbackGasLimit = GAS_LIMIT_FALLBACK;
    const fallbackGasPrice = ethers.parseUnits('50', 'gwei');
    return {
      gasLimit: fallbackGasLimit,
      gasPrice: fallbackGasPrice,
      gasCostWei: fallbackGasLimit * fallbackGasPrice,
    };
  }
}
