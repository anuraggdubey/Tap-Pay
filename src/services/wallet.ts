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
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {normalizeMnemonic, walletFromRecoveryPhrase} from '../utils/recovery';
import {FanoutProvider} from './fanoutProvider';
import {readStoredCustomRpc, storeCustomRpc, validateRpcUrl} from './rpcSettings';
import {MONAD_CONFIG, GAS_LIMIT_FALLBACK, TX_POLL_INTERVAL_MS, TX_MAX_WAIT_MS} from '../config/monad';

const KEYCHAIN_SERVICE = 'com.tappay.wallet';
const PHRASE_SERVICE = 'com.tappay.wallet.phrase';
const ADDRESS_STORAGE_KEY = '@tappay_wallet_address';

export type WalletErrorCode =
  | 'WALLET_EXISTS'
  | 'NO_DEVICE_AUTH'
  | 'AUTHENTICATION_FAILED'
  | 'NO_SECURE_HARDWARE'
  | 'INVALID_SECRET'
  | 'STORAGE_FAILED';

/** Error with a stable code so the UI can show an exact, honest message. */
export class WalletError extends Error {
  code: WalletErrorCode;
  constructor(code: WalletErrorCode, message: string) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
  }
}

// Public RPC endpoints, used only while the user has not set their own RPC.
// Privacy: every endpoint that serves a request sees the sender's IP. A signed payment is
// broadcast to ALL of them (see FanoutProvider) so one honest node is enough, and receipts are
// accepted only when two endpoints agree. Users who prefer a single trusted node can set their
// own RPC, which then replaces these completely (no silent fallback). See docs/RPC_AND_PRIVACY.md.
const DEFAULT_RPC_ENDPOINTS = [
  MONAD_CONFIG.rpcUrls.primary,
  MONAD_CONFIG.rpcUrls.fallback1,
  MONAD_CONFIG.rpcUrls.fallback2,
];

const PROVIDER_NETWORK = {chainId: MONAD_CONFIG.chainId, name: MONAD_CONFIG.chainName};
const PROBE_TIMEOUT_MS = 8000;

let customRpcUrl: string | null = null;
let _currentRpcIndex = 0;
let _provider: FanoutProvider | null = null;
const _readProviders = new Map<string, ethers.JsonRpcProvider>();

function rpcEndpoints(): string[] {
  return customRpcUrl ? [customRpcUrl] : DEFAULT_RPC_ENDPOINTS;
}

function applyCustomRpc(url: string | null) {
  customRpcUrl = url;
  _currentRpcIndex = 0;
  _provider = null;
  _readProviders.clear();
}

/** Resolves once the stored custom RPC (if any) has been loaded. Awaited before any RPC call. */
export const rpcReady: Promise<void> = readStoredCustomRpc()
  .then(url => {
    if (url) {
      applyCustomRpc(url);
    }
  })
  .catch(() => {});

/** The endpoint currently serving requests (full URL; use describeRpc() to display it). */
export function getActiveRpcUrl(): string {
  const endpoints = rpcEndpoints();
  return endpoints[_currentRpcIndex % endpoints.length];
}

/** The user's own RPC URL, or null when the default public endpoints are in use. */
export function getCustomRpcUrl(): string | null {
  return customRpcUrl;
}

export function getDefaultRpcEndpoints(): string[] {
  return [...DEFAULT_RPC_ENDPOINTS];
}

/**
 * Set (or clear with null / empty) the user's own RPC endpoint. The endpoint must be https and
 * must report Monad's chain id, so a wrong or hostile network cannot be selected by mistake.
 */
export async function setCustomRpc(input: string | null): Promise<{ok: true} | {ok: false; error: string}> {
  if (input === null || !input.trim()) {
    await storeCustomRpc(null);
    applyCustomRpc(null);
    return {ok: true};
  }
  const check = validateRpcUrl(input);
  if (!check.ok) {
    return check;
  }
  const probe = new ethers.JsonRpcProvider(check.url);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const reported = await Promise.race<string>([
      probe.send('eth_chainId', []),
      new Promise<string>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), PROBE_TIMEOUT_MS);
      }),
    ]);
    if (BigInt(reported) !== BigInt(MONAD_CONFIG.chainId)) {
      return {
        ok: false,
        error: `That endpoint is on a different network (chain ID ${BigInt(reported).toString()}). TapPay needs Monad (${MONAD_CONFIG.chainId}).`,
      };
    }
  } catch {
    return {ok: false, error: 'Could not reach that endpoint. Check the URL and try again.'};
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
    probe.destroy();
  }
  await storeCustomRpc(check.url);
  applyCustomRpc(check.url);
  return {ok: true};
}

// Create a provider for the current RPC endpoint. Broadcasts fan out to every other endpoint.
function createProvider(endpointIndex = _currentRpcIndex): FanoutProvider {
  const endpoints = rpcEndpoints();
  const index = endpointIndex % endpoints.length;
  return new FanoutProvider(
    endpoints[index],
    PROVIDER_NETWORK,
    {staticNetwork: true},
    endpoints.filter((_, i) => i !== index),
  );
}

export function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = createProvider();
  }
  return _provider;
}

/** Read-only provider for one specific endpoint (used to cross-check receipts). */
function readProviderFor(url: string): ethers.JsonRpcProvider {
  let provider = _readProviders.get(url);
  if (!provider) {
    provider = new ethers.JsonRpcProvider(url, PROVIDER_NETWORK, {staticNetwork: true});
    _readProviders.set(url, provider);
  }
  return provider;
}

/**
 * Rotate to the next endpoint for READS if the current one is unresponsive or rate-limited.
 * (A custom RPC is the only endpoint, so there is nothing to rotate to.)
 */
export function rotateRpcProvider(): ethers.JsonRpcProvider {
  _currentRpcIndex = (_currentRpcIndex + 1) % rpcEndpoints().length;
  _provider = createProvider(_currentRpcIndex);
  return _provider;
}

/**
 * Execute a read-only RPC action with retry & rotation across the configured endpoints.
 * Do not use it to broadcast: broadcasts go through the provider's fan-out.
 */
export async function withRpcFailover<T>(action: (provider: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
  await rpcReady;
  let attempts = 0;
  let lastError: any = null;
  const maxAttempts = rpcEndpoints().length;

  while (attempts < maxAttempts) {
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
 * Generate a new random wallet with a BIP-39 recovery phrase.
 * The caller must persist it with storeWallet() and show the phrase exactly once.
 */
export function generateWallet(): {address: string; privateKey: string; mnemonic: string} {
  const wallet = ethers.Wallet.createRandom();
  const phrase = wallet.mnemonic?.phrase;
  if (!phrase) {
    throw new WalletError('STORAGE_FAILED', 'Could not generate a recovery phrase.');
  }
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: phrase,
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
 * The wallet requires the phone's own authentication (fingerprint, face or screen lock).
 * There is no fallback: if the phone has none set up, wallet creation is refused.
 */
async function assertDeviceAuthReady(): Promise<void> {
  let ready = false;
  try {
    ready = await Keychain.canImplyAuthentication({
      authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
    });
  } catch {
    ready = false;
  }
  if (!ready) {
    throw new WalletError(
      'NO_DEVICE_AUTH',
      'Set up a screen lock, fingerprint or face unlock in your phone settings, then try again.',
    );
  }
}

let _storeInFlight = false;

/**
 * Save a new wallet to the Android Keystore. Strict rules, no fallbacks:
 *  - One wallet per device: refuses if a wallet already exists (delete it first).
 *  - The phone must have a screen lock / biometrics enrolled.
 *  - The key must live in secure hardware (TEE/StrongBox); otherwise creation fails.
 *  - Every later read of the key requires phone authentication.
 *  - The key and (if given) recovery phrase are stored atomically; on any failure
 *    nothing is left behind.
 * Returns the wallet address.
 */
export async function storeWallet(secret: {
  privateKey: string;
  mnemonic?: string;
}): Promise<string> {
  if (_storeInFlight) {
    throw new WalletError('STORAGE_FAILED', 'A wallet operation is already in progress.');
  }
  _storeInFlight = true;
  try {
    if (await hasWallet()) {
      throw new WalletError(
        'WALLET_EXISTS',
        'A wallet is already set up on this device. Reset it in Settings before creating or restoring another one.',
      );
    }

    let wallet: ethers.Wallet;
    try {
      wallet = new ethers.Wallet(secret.privateKey);
    } catch {
      throw new WalletError('INVALID_SECRET', 'Invalid private key.');
    }
    if (secret.mnemonic) {
      let fromPhrase: ethers.HDNodeWallet;
      try {
        fromPhrase = walletFromRecoveryPhrase(secret.mnemonic);
      } catch {
        throw new WalletError('INVALID_SECRET', 'Invalid recovery phrase.');
      }
      if (fromPhrase.address !== wallet.address) {
        throw new WalletError('INVALID_SECRET', 'Recovery phrase does not match the key.');
      }
    }

    await assertDeviceAuthReady();

    const secureOptions = {
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
      storage: Keychain.STORAGE_TYPE.AES_GCM,
    } as const;

    try {
      const savedKey = await Keychain.setGenericPassword(wallet.address, secret.privateKey, {
        service: KEYCHAIN_SERVICE,
        ...secureOptions,
      });
      if (!savedKey) {
        throw new Error('key not saved');
      }
      if (secret.mnemonic) {
        const savedPhrase = await Keychain.setGenericPassword(
          wallet.address,
          normalizeMnemonic(secret.mnemonic),
          {service: PHRASE_SERVICE, ...secureOptions},
        );
        if (!savedPhrase) {
          throw new Error('phrase not saved');
        }
      }
      await AsyncStorage.setItem(ADDRESS_STORAGE_KEY, wallet.address);
    } catch {
      // Roll back so a half-written wallet can never exist.
      try {
        await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
        await Keychain.resetGenericPassword({service: PHRASE_SERVICE});
        await AsyncStorage.removeItem(ADDRESS_STORAGE_KEY);
      } catch {
        // nothing more we can do
      }
      throw new WalletError(
        'NO_SECURE_HARDWARE',
        'This phone cannot store the wallet key in secure hardware, so TapPay cannot create a wallet here.',
      );
    }

    return wallet.address;
  } finally {
    _storeInFlight = false;
  }
}

const AUTH_PROMPT_SUBTITLE = 'TapPay Authorization';

function authPrompt(title: string): Keychain.AuthenticationPrompt {
  return {
    title,
    subtitle: AUTH_PROMPT_SUBTITLE,
    description: 'Confirm with your fingerprint, face or screen lock to continue',
    cancel: 'Cancel',
  };
}

/**
 * Load the private key from the Android Keystore. This always prompts for the phone's
 * authentication (fingerprint / face / screen lock).
 * @returns The private key string, or null if cancelled, failed or not found
 */
export async function loadPrivateKey(
  promptTitle = 'Confirm your identity',
): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
      authenticationPrompt: authPrompt(promptTitle),
    });
    if (credentials && credentials.password) {
      return credentials.password;
    }
    return null;
  } catch (error: any) {
    console.warn('Device authentication cancelled or failed:', error?.message || error);
    return null;
  }
}

/**
 * Load the recovery phrase (phone authentication required). Returns null if cancelled,
 * or if this wallet has no phrase (it was imported from a raw private key).
 */
export async function loadRecoveryPhrase(
  promptTitle = 'Confirm to view recovery phrase',
): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: PHRASE_SERVICE,
      authenticationPrompt: authPrompt(promptTitle),
    });
    if (credentials && credentials.password) {
      return credentials.password;
    }
    return null;
  } catch (error: any) {
    console.warn('Device authentication cancelled or failed:', error?.message || error);
    return null;
  }
}

/**
 * Check if a wallet exists in secure storage. Does not prompt for authentication.
 */
export async function hasWallet(throwOnError = false): Promise<boolean> {
  try {
    return await Keychain.hasGenericPassword({service: KEYCHAIN_SERVICE});
  } catch (error) {
    if (throwOnError) throw error;
    return false;
  }
}

/**
 * Check if a recovery phrase is stored for this wallet. Does not prompt.
 */
export async function hasRecoveryPhrase(): Promise<boolean> {
  try {
    return await Keychain.hasGenericPassword({service: PHRASE_SERVICE});
  } catch {
    return false;
  }
}

async function authorizeResetSecret(service: string): Promise<'authenticated' | 'unrecoverable'> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service,
      authenticationPrompt: authPrompt('Authenticate to reset your wallet'),
    });
    if (credentials && credentials.password) {
      return 'authenticated';
    }
  } catch (error: any) {
    if (Platform.OS === 'android' && error?.code === 'E_CRYPTO_FAILED' && (
      error?.message === 'Wrapped error: Key permanently invalidated' ||
      error?.message === 'Decryption failed: Authentication tag verification failed. ' +
        'This usually indicates that the encrypted data was modified, corrupted, ' +
        'or is being decrypted with the wrong key.'
    )) {
      return 'unrecoverable';
    }
  }
  throw new WalletError(
    'AUTHENTICATION_FAILED',
    'Device authentication was cancelled or failed. Your wallet was not reset.',
  );
}

/**
 * Delete stored secrets after phone authentication, or if each secret is unrecoverable.
 * Returns true only if everything was removed.
 */
export async function deleteWallet(): Promise<boolean> {
  let keyExists: boolean;
  let phraseExists: boolean;
  try {
    keyExists = await Keychain.hasGenericPassword({service: KEYCHAIN_SERVICE});
    phraseExists = await Keychain.hasGenericPassword({service: PHRASE_SERVICE});
  } catch {
    throw new WalletError('AUTHENTICATION_FAILED', 'Could not verify the stored wallet. Nothing was removed.');
  }

  const keyAccess = keyExists ? await authorizeResetSecret(KEYCHAIN_SERVICE) : null;
  if (phraseExists && keyAccess !== 'authenticated') {
    await authorizeResetSecret(PHRASE_SERVICE);
  }

  try {
    const keyRemoved = !keyExists || await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
    const phraseRemoved = !phraseExists || await Keychain.resetGenericPassword({service: PHRASE_SERVICE});
    await AsyncStorage.removeItem(ADDRESS_STORAGE_KEY);
    return keyRemoved !== false && phraseRemoved !== false;
  } catch (error) {
    console.error('Failed to delete wallet:', error);
    return false;
  }
}

/**
 * Get the wallet's public address. The address is public, so it is cached unprotected to avoid
 * a phone-authentication prompt on every app start. If the cache is missing (older installs),
 * it is recovered once from the key with phone authentication.
 */
export async function getWalletAddress(): Promise<string | null> {
  try {
    if (!(await hasWallet())) {
      await AsyncStorage.removeItem(ADDRESS_STORAGE_KEY);
      return null;
    }
    const cached = await AsyncStorage.getItem(ADDRESS_STORAGE_KEY);
    if (cached && ethers.isAddress(cached)) {
      return cached;
    }
    const key = await loadPrivateKey('Confirm to unlock your wallet');
    if (!key) {
      return null;
    }
    const address = new ethers.Wallet(key).address;
    await AsyncStorage.setItem(ADDRESS_STORAGE_KEY, address);
    return address;
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
  if (
    message.includes('SessionAlreadyProcessed') ||
    message.includes('SessionAlreadyUsed') ||
    data.includes('0x408b04d1')
  ) {
    return 'This payment session was already processed.';
  }
  if (
    message.includes('InvalidRecipient') ||
    message.includes('SelfPayment') ||
    data.includes('0x1879c3f3')
  ) {
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
  const key = await loadPrivateKey(authPromptTitle);
  if (!key) {
    return {txHash: null, error: 'Authentication cancelled or wallet not found'};
  }

  // Payments go only through the TapPayLedger. We never silently fall back to a plain transfer
  // (that would skip the on-chain log and replay protection the receiver relies on).
  const ledgerAddress = MONAD_CONFIG.contracts.tapPayLedger;
  if (!ledgerAddress || !sessionIdHash) {
    return {
      txHash: null,
      error: 'Payment ledger is not configured on this build. Please update the app before sending.',
    };
  }

  try {
    await rpcReady;
    const provider = getProvider();
    const wallet = new ethers.Wallet(key, provider);
    const ledgerAbi = [
      'function payWithLog(address to, bytes32 sessionIdHash) external payable',
    ];
    const ledger = new ethers.Contract(ledgerAddress, ledgerAbi, wallet);

    // Read-only pre-flight — safe to retry across RPC endpoints.
    const balance = await withRpcFailover(p => p.getBalance(wallet.address));
    if (balance < amountWei) {
      return {txHash: null, error: 'Insufficient MON balance'};
    }
    const nonce = await withRpcFailover(p => p.getTransactionCount(wallet.address, 'pending'));
    const feeData = await withRpcFailover(p => p.getFeeData());

    const txRequest = await ledger.payWithLog.populateTransaction(to, sessionIdHash, {
      value: amountWei,
    });

    let gasLimit: bigint;
    try {
      const estimate = await withRpcFailover(p =>
        p.estimateGas({...txRequest, from: wallet.address}),
      );
      gasLimit = (estimate * 120n) / 100n;
    } catch {
      gasLimit = GAS_LIMIT_FALLBACK;
    }

    // Prefer EIP-1559 fees; fall back to legacy gasPrice only if the node reports no 1559 data.
    const feeFields =
      feeData.maxFeePerGas && feeData.maxPriorityFeePerGas
        ? {
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          }
        : {gasPrice: feeData.gasPrice ?? ethers.parseUnits('50', 'gwei')};

    // Sign once and broadcast that exact signed transaction. The provider sends the same raw bytes
    // to every configured endpoint (same hash, same nonce), so it is idempotent and cannot
    // double-spend, while a single dropping or censoring node can no longer stop the payment.
    // It is never re-signed or re-sent with different fields.
    const tx = await wallet.sendTransaction({
      ...txRequest,
      nonce,
      gasLimit,
      chainId: MONAD_CONFIG.chainId,
      ...feeFields,
    });

    return {txHash: tx.hash};
  } catch (error: any) {
    return {txHash: null, error: parseContractError(error)};
  }
}

export type ReceiptStatus = 'confirmed' | 'reverted' | 'pending' | 'unknown';

type EndpointReceipt = 'confirmed' | 'reverted' | 'pending' | 'error';

async function receiptFromEndpoint(url: string, txHash: string): Promise<EndpointReceipt> {
  try {
    const receipt = await readProviderFor(url).getTransactionReceipt(txHash);
    if (!receipt) {
      return 'pending';
    }
    return receipt.status === 1 ? 'confirmed' : 'reverted';
  } catch {
    return 'error';
  }
}

/**
 * Read results are untrusted: a single compromised RPC could invent a confirmed receipt. A
 * receipt is accepted only when two different endpoints report the same status. With a custom
 * RPC there is one endpoint, so the user's own node is trusted on its own.
 *  - confirmed / reverted: enough endpoints agree.
 *  - pending: no receipt yet, only one endpoint has it, or the endpoints disagree.
 *  - unknown: no endpoint could be reached.
 */
async function quorumReceiptStatus(txHash: string): Promise<ReceiptStatus> {
  await rpcReady;
  const endpoints = rpcEndpoints();
  const start = _currentRpcIndex % endpoints.length;
  const order = endpoints.map((_, i) => endpoints[(start + i) % endpoints.length]);
  const needed = Math.min(2, endpoints.length);
  const agreed: Array<'confirmed' | 'reverted'> = [];
  let answered = false;

  for (const url of order) {
    const result = await receiptFromEndpoint(url, txHash);
    if (result === 'error') {
      continue;
    }
    answered = true;
    if (result === 'pending') {
      if (agreed.length === 0) {
        return 'pending'; // the first node to answer has no receipt yet: keep waiting
      }
      continue;
    }
    agreed.push(result);
    if (agreed.length >= needed) {
      break;
    }
  }

  if (agreed.length === 0) {
    return answered ? 'pending' : 'unknown';
  }
  if (agreed.length < needed) {
    return 'pending'; // a receipt exists on one node but could not be corroborated yet
  }
  return agreed.every(status => status === agreed[0]) ? agreed[0] : 'pending';
}

/**
 * Outcome of waiting for a receipt. A receipt is the only authoritative signal:
 *  - `confirmed`: a receipt with status 1.
 *  - `reverted`: a receipt with status 0. The only case that may be reported as a failure.
 *  - `timedOut`: no (corroborated) receipt yet. The transaction may still confirm, so it is NOT
 *    a failure.
 */
export type ReceiptOutcome = {
  confirmed: boolean;
  reverted?: boolean;
  timedOut?: boolean;
  error?: string;
};

/**
 * Poll for transaction receipt with Monad-optimized interval (500ms)
 */
export async function waitForReceipt(txHash: string): Promise<ReceiptOutcome> {
  const startTime = Date.now();

  while (Date.now() - startTime < TX_MAX_WAIT_MS) {
    try {
      const status = await quorumReceiptStatus(txHash);
      if (status === 'confirmed') {
        return {confirmed: true};
      }
      if (status === 'reverted') {
        return {confirmed: false, reverted: true, error: 'Transaction reverted on chain'};
      }
    } catch {
      // RPC transient error — continue polling
    }

    // Wait 500ms (Monad has ~1s blocks)
    await new Promise(resolve => setTimeout(resolve, TX_POLL_INTERVAL_MS));
  }

  return {
    confirmed: false,
    timedOut: true,
    error: 'Still confirming. The transaction may still go through.',
  };
}

/**
 * One-shot receipt lookup (no polling) used to reconcile pending history rows. Applies the same
 * two-endpoint agreement as waitForReceipt. `unknown` = nothing could be reached, so nothing can
 * be concluded.
 */
export async function getReceiptStatus(txHash: string): Promise<ReceiptStatus> {
  try {
    return await quorumReceiptStatus(txHash);
  } catch {
    return 'unknown';
  }
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
      // Prefer the EIP-1559 max fee for the displayed estimate so it matches what is broadcast.
      const gasPrice =
        feeData.maxFeePerGas && feeData.maxFeePerGas > 0n
          ? feeData.maxFeePerGas
          : feeData.gasPrice && feeData.gasPrice > 0n
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
