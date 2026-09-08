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

// Create a provider with fallback
function createProvider(): ethers.JsonRpcProvider {
  // Primary RPC — switch to fallback if this fails
  return new ethers.JsonRpcProvider(
    MONAD_CONFIG.rpcUrls.primary,
    {
      chainId: MONAD_CONFIG.chainId,
      name: MONAD_CONFIG.chainName,
    },
  );
}

let _provider: ethers.JsonRpcProvider | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = createProvider();
  }
  return _provider;
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
 * Save a private key to Android Keystore via react-native-keychain
 */
export async function savePrivateKey(privateKey: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword('tappay_wallet', privateKey, {
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
 * Load the private key from Android Keystore
 * @returns The private key string, or null if not found
 */
export async function loadPrivateKey(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });
    if (credentials) {
      return credentials.password;
    }
    return null;
  } catch (error) {
    console.error('Failed to load private key:', error);
    return null;
  }
}

/**
 * Check if a wallet exists in secure storage
 */
export async function hasWallet(): Promise<boolean> {
  const key = await loadPrivateKey();
  return key !== null;
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
 * Get the wallet address from a stored private key
 */
export async function getWalletAddress(): Promise<string | null> {
  const key = await loadPrivateKey();
  if (!key) {
    return null;
  }
  const wallet = new ethers.Wallet(key);
  return wallet.address;
}

/**
 * Get the wallet's MON balance
 */
export async function getBalance(address: string): Promise<bigint> {
  const provider = getProvider();
  return await provider.getBalance(address);
}

/**
 * Sign a message with the stored wallet key (for payload signing, username registration, etc.)
 */
export async function signMessage(message: string | Uint8Array): Promise<string | null> {
  const key = await loadPrivateKey();
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
  sessionIdHash: string,
): Promise<{txHash: string | null; error?: string}> {
  try {
    const key = await loadPrivateKey();
    if (!key) {
      return {txHash: null, error: 'Wallet not found'};
    }

    const provider = getProvider();
    const wallet = new ethers.Wallet(key, provider);

    // Check balance before sending
    const balance = await provider.getBalance(wallet.address);
    if (balance < amountWei) {
      return {txHash: null, error: 'Insufficient MON balance'};
    }

    // If TapPayLedger contract is configured, call payWithLog
    // Otherwise, fall back to a direct native transfer
    if (MONAD_CONFIG.contracts.tapPayLedger) {
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

    // Estimate gas
    let gasLimit: bigint;
    try {
      const estimate = await provider.estimateGas({
        from: wallet.address,
        to,
        value: amountWei,
      });
      gasLimit = (estimate * 120n) / 100n; // 20% safety margin
    } catch {
      gasLimit = GAS_LIMIT_FALLBACK;
    }

    // Get nonce (pending to avoid conflicts)
    const nonce = await provider.getTransactionCount(wallet.address, 'pending');

    // Build and sign transaction
    const tx = await wallet.sendTransaction({
      to,
      value: amountWei,
      gasLimit,
      nonce,
      chainId: MONAD_CONFIG.chainId,
    });

    return {txHash: tx.hash};
  } catch (error: any) {
    return {txHash: null, error: error.message || 'Transaction failed'};
  }
}

/**
 * Poll for transaction receipt with Monad-optimized interval (500ms)
 */
export async function waitForReceipt(
  txHash: string,
): Promise<{confirmed: boolean; error?: string}> {
  const provider = getProvider();
  const startTime = Date.now();

  while (Date.now() - startTime < TX_MAX_WAIT_MS) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        if (receipt.status === 1) {
          return {confirmed: true};
        } else {
          return {confirmed: false, error: 'Transaction reverted'};
        }
      }
    } catch {
      // RPC error — continue polling
    }

    // Wait 500ms (Monad has ~1s blocks)
    await new Promise(resolve => setTimeout(resolve, TX_POLL_INTERVAL_MS));
  }

  return {confirmed: false, error: 'Confirmation timeout — transaction may still confirm'};
}

/**
 * Estimate gas cost for a payment (for display in confirm modal)
 */
export async function estimateGasCost(
  from: string,
  to: string,
  amountWei: bigint,
): Promise<{gasLimit: bigint; gasPrice: bigint; gasCostWei: bigint} | null> {
  try {
    const provider = getProvider();
    const [estimate, feeData] = await Promise.all([
      provider.estimateGas({from, to, value: amountWei}),
      provider.getFeeData(),
    ]);

    const gasPrice = feeData.gasPrice || 0n;
    const gasCostWei = estimate * gasPrice;

    return {gasLimit: estimate, gasPrice, gasCostWei};
  } catch {
    return null;
  }
}
