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
import {NativeModules, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {normalizeMnemonic, walletFromRecoveryPhrase} from '../utils/recovery';
import {FanoutProvider} from './fanoutProvider';
import {readStoredCustomRpc, storeCustomRpc, validateRpcUrl} from './rpcSettings';
import {MONAD_CONFIG, GAS_LIMIT_FALLBACK, TX_POLL_INTERVAL_MS, TX_MAX_WAIT_MS} from '../config/monad';
import {PaymentLimits, checkPaymentLimits} from '../utils/validation';
import {getStuckPayments} from './history';

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
    ready = Platform.OS === 'android'
      ? await NativeModules.DeviceAuth.isDeviceSecure()
      : await Keychain.canImplyAuthentication({
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
 * Keychain options for the wallet key and recovery phrase.
 * `accessible` matters on iOS only: WHEN_PASSCODE_SET_THIS_DEVICE_ONLY keeps both secrets out of
 * device backups (they can never be restored onto another iPhone) and deletes them if the user
 * removes the device passcode. Without it react-native-keychain defaults to AFTER_FIRST_UNLOCK,
 * which is backed up. Android ignores it and uses secure hardware instead.
 */
function walletSecureOptions() {
  return {
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
    accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    storage: Keychain.STORAGE_TYPE.AES_GCM,
  } as const;
}

// AsyncStorage flag (no secret) set once a keychain item uses walletSecureOptions() (#125).
const migratedFlagKey = (service: string) => `@tappay_keychain_this_device_only:${service}`;

/**
 * iOS installs created before #125 stored the key and phrase without a ThisDeviceOnly attribute.
 * After an authenticated read (the only time the secret is available), rewrite the item with
 * the current options. The native write deletes the old item before adding the new one, so if
 * the add fails the secret is written back with the old options: it is never left missing.
 */
async function migrateItemAccessibility(service: string, username: string, secret: string): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }
  const flag = migratedFlagKey(service);
  try {
    if ((await AsyncStorage.getItem(flag)) === '1') {
      return;
    }
  } catch (error: any) {
    console.warn('Keychain migration check failed:', error?.message || error);
    return;
  }
  // The options these items were created with before #125 (no `accessible` attribute).
  const {accessControl, securityLevel, storage} = walletSecureOptions();
  const legacyOptions = {accessControl, securityLevel, storage};
  try {
    await Keychain.setGenericPassword(username, secret, {service, ...walletSecureOptions()});
  } catch (error: any) {
    console.warn('Keychain migration failed, keeping the previous protection:', error?.message || error);
    try {
      await Keychain.setGenericPassword(username, secret, {service, ...legacyOptions});
    } catch (restoreError: any) {
      console.warn('Keychain restore after failed migration failed:', restoreError?.message || restoreError);
    }
    return;
  }
  try {
    await AsyncStorage.setItem(flag, '1');
  } catch (error: any) {
    // Harmless: the next read rewrites the item again with the same options.
    console.warn('Keychain migration flag not saved:', error?.message || error);
  }
}

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

    const secureOptions = walletSecureOptions();

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

    // Both items were just written with walletSecureOptions(): nothing to migrate later.
    try {
      for (const service of [KEYCHAIN_SERVICE, PHRASE_SERVICE]) {
        await AsyncStorage.setItem(migratedFlagKey(service), '1');
      }
    } catch (error: any) {
      console.warn('Keychain migration flag not saved:', error?.message || error);
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
      await migrateItemAccessibility(KEYCHAIN_SERVICE, credentials.username, credentials.password);
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
      await migrateItemAccessibility(PHRASE_SERVICE, credentials.username, credentials.password);
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
 * TapPayLedger ABI used by the app. The deployed ledger exposes the 2-argument payWithLog
 * overload; the errors let a revert from a gas estimate be decoded into a clear message.
 */
const LEDGER_ABI = [
  'function payWithLog(address to, bytes32 sessionIdHash) external payable',
  'function minPayment() view returns (uint256)',
  'function maxPayment() view returns (uint256)',
  'function paused() view returns (bool)',
  'error InvalidRecipient()',
  'error SelfPayment()',
  'error ZeroAmount()',
  'error BelowMinPayment(uint256 amount, uint256 minPayment)',
  'error AboveMaxPayment(uint256 amount, uint256 maxPayment)',
  'error SessionAlreadyUsed(bytes32 sessionId)',
  'error SessionExpired(bytes32 sessionId, uint256 deadline)',
  'error TransferFailed()',
  'error EnforcedPause()',
];
const ledgerInterface = new ethers.Interface(LEDGER_ABI);

function revertData(error: any): string | null {
  for (const data of [error?.data, error?.error?.data, error?.info?.error?.data, error?.revert?.data]) {
    if (typeof data === 'string' && /^0x[0-9a-fA-F]{8}/.test(data)) {
      return data;
    }
  }
  return null;
}

function decodeLedgerError(error: any): ethers.ErrorDescription | null {
  const data = revertData(error);
  if (!data) {
    return null;
  }
  try {
    return ledgerInterface.parseError(data);
  } catch {
    return null; // not a ledger error: callers fall back to the raw message
  }
}

/**
 * True when an RPC error says the call itself would fail on-chain (a revert or missing funds),
 * as opposed to a network or timeout problem. A transaction that fails this way must never be
 * broadcast: it would be mined as reverted and the user would pay gas for nothing.
 */
export function isRevertError(error: any): boolean {
  if (!error) {
    return false;
  }
  if (error.code === 'CALL_EXCEPTION' || error.code === 'INSUFFICIENT_FUNDS') {
    return true;
  }
  // JSON-RPC error code 3 is "execution reverted".
  if (error.error?.code === 3 || error.info?.error?.code === 3) {
    return true;
  }
  if (revertData(error)) {
    return true;
  }
  const message = String(error.shortMessage || error.message || '');
  return /execution reverted|insufficient funds/i.test(message);
}

/**
 * Parse contract revert reasons and common RPC errors into human-readable messages
 */
export function parseContractError(error: any): string {
  if (!error) {
    return 'Unknown transaction error occurred';
  }

  const decoded = decodeLedgerError(error);
  if (decoded?.name === 'BelowMinPayment') {
    return `Amount is below the minimum payment of ${ethers.formatEther(decoded.args[1])} MON.`;
  }
  if (decoded?.name === 'AboveMaxPayment') {
    return `Amount is above the maximum payment of ${ethers.formatEther(decoded.args[1])} MON.`;
  }
  if (decoded?.name === 'SessionExpired') {
    return 'This payment session has expired. Please tap again.';
  }

  // The decoded error name lets the name checks below match a raw revert as well.
  const message = `${error.message || error.toString()}${decoded ? ` ${decoded.name}` : ''}`;
  const data = error.data || error.error?.data || '';

  if (message.includes('EnforcedPause')) {
    return 'Payments are temporarily paused. Please try again later.';
  }

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

const LEDGER_LIMITS_TTL_MS = 60_000;
let _ledgerLimits: {value: PaymentLimits; at: number} | null = null;

/** Test hook: forget the cached ledger limits. */
export function resetLedgerLimitsCache(): void {
  _ledgerLimits = null;
}

/**
 * Read TapPayLedger's minPayment / maxPayment / paused() rules, cached briefly. Returns null when
 * no ledger is configured or the values cannot be read; the gas estimate in sendPayment still
 * refuses a payment that would revert in that case.
 */
export async function getLedgerLimits(): Promise<PaymentLimits | null> {
  const ledgerAddress = MONAD_CONFIG.contracts.tapPayLedger;
  if (!ledgerAddress) {
    return null;
  }
  if (_ledgerLimits && Date.now() - _ledgerLimits.at < LEDGER_LIMITS_TTL_MS) {
    return _ledgerLimits.value;
  }
  try {
    const value = await withRpcFailover(async provider => {
      const ledger = new ethers.Contract(ledgerAddress, LEDGER_ABI, provider);
      const [minPayment, maxPayment, paused] = await Promise.all([
        ledger.minPayment(),
        ledger.maxPayment(),
        ledger.paused(),
      ]);
      return {minPayment: BigInt(minPayment), maxPayment: BigInt(maxPayment), paused: Boolean(paused)};
    });
    _ledgerLimits = {value, at: Date.now()};
    return value;
  } catch (error: any) {
    console.warn('Could not read payment ledger limits:', error?.shortMessage || error?.message || error);
    return null;
  }
}

/** The ledger rule a native payment of `amountWei` would break, or null if it passes. */
export async function checkLedgerPaymentLimits(amountWei: bigint): Promise<string | null> {
  return checkPaymentLimits(amountWei, await getLedgerLimits());
}

export interface BalanceCheckResult {
  canAfford: boolean;
  balance: bigint;
  requiredTotal: bigint;
  amountWei: bigint;
  gasCostWei: bigint;
  missingWei: bigint;
  /** Set when the ledger would reject this native amount (below min, above max, or paused). */
  limitError?: string;
  /**
   * Earlier payments from this wallet that are still unconfirmed after a while. A new payment
   * takes the next nonce and would wait behind them, so the user is warned first.
   */
  stuckPayments?: number;
}

/**
 * Pre-check if the wallet balance can cover the payment amount plus estimated gas cost, and
 * (for a native amount) whether the ledger would accept it at all.
 */
export async function checkSufficientBalance(
  fromAddress: string,
  toAddress: string,
  amountWei: bigint,
): Promise<BalanceCheckResult> {
  const limitError = amountWei > 0n ? await checkLedgerPaymentLimits(amountWei) : null;
  const stuckPayments = getStuckPayments().length;
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
    ...(limitError ? {limitError} : {}),
    ...(stuckPayments > 0 ? {stuckPayments} : {}),
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
    const ledger = new ethers.Contract(ledgerAddress, LEDGER_ABI, wallet);

    // The ledger rejects amounts outside [minPayment, maxPayment] and every payment while paused.
    // Refuse those here so the user never signs a transaction that can only revert.
    const limitError = await checkLedgerPaymentLimits(amountWei);
    if (limitError) {
      return {txHash: null, error: limitError};
    }

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

    // A failed estimate is the node telling us the call would revert. That answer is final: do
    // not rotate to another endpoint and do not broadcast. Only a network/timeout failure on
    // every endpoint falls back to a fixed gas limit.
    let estimate: {gas: bigint} | {revert: unknown} | null;
    try {
      estimate = await withRpcFailover(async p => {
        try {
          return {gas: await p.estimateGas({...txRequest, from: wallet.address})};
        } catch (error) {
          if (isRevertError(error)) {
            return {revert: error};
          }
          throw error;
        }
      });
    } catch (error: any) {
      console.warn('Gas estimate unavailable, using the fallback limit:', error?.shortMessage || error?.message || error);
      estimate = null;
    }
    if (estimate && 'revert' in estimate) {
      return {txHash: null, error: parseContractError(estimate.revert)};
    }
    const gasLimit = estimate ? (estimate.gas * 120n) / 100n : GAS_LIMIT_FALLBACK;

    // Prefer EIP-1559 fees; fall back to legacy gasPrice only if the node reports no 1559 data.
    const feeFields =
      feeData.maxFeePerGas && feeData.maxPriorityFeePerGas
        ? {
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          }
        : {gasPrice: feeData.gasPrice ?? ethers.parseUnits('50', 'gwei')};

    // The worst-case fee must fit next to the amount, or the node rejects the transaction.
    const worstGasPrice: bigint =
      feeData.maxFeePerGas && feeData.maxPriorityFeePerGas
        ? feeData.maxFeePerGas
        : feeData.gasPrice ?? ethers.parseUnits('50', 'gwei');
    if (balance < amountWei + gasLimit * worstGasPrice) {
      return {txHash: null, error: 'Insufficient MON balance for payment and network gas fee.'};
    }

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

export type LogRef = {address: string; topics: readonly string[]; data: string; index: number};
export type Corroboration = 'confirmed' | 'mismatch' | 'pending';

/**
 * Check a payment log that one endpoint reported against a different endpoint (#123), so one
 * compromised or faulty RPC cannot make the receiver see a payment that never happened. The
 * other endpoint must return a receipt with status 1 for `txHash` that contains the same log
 * (address, topics, data) at the same log index.
 *  - confirmed: corroborated (or the user runs their own RPC, which is trusted alone, the same
 *    rule as for sent payments);
 *  - mismatch: another endpoint has the receipt but it failed or lacks this log: not a payment;
 *  - pending: no other endpoint has the receipt yet (or none could be reached): check again later.
 */
export async function corroborateLog(txHash: string, log: LogRef, foundOn: string): Promise<Corroboration> {
  await rpcReady;
  const endpoints = rpcEndpoints();
  if (endpoints.length < 2) {
    return 'confirmed';
  }
  const lower = (v: string) => v.toLowerCase();
  for (const url of endpoints) {
    if (url === foundOn) {
      continue;
    }
    let receipt: ethers.TransactionReceipt | null;
    try {
      receipt = await readProviderFor(url).getTransactionReceipt(txHash);
    } catch {
      continue;
    }
    if (!receipt) {
      continue;
    }
    if (receipt.status !== 1) {
      return 'mismatch';
    }
    const same = receipt.logs.some(
      l =>
        l.index === log.index &&
        lower(l.address) === lower(log.address) &&
        lower(l.data) === lower(log.data) &&
        l.topics.length === log.topics.length &&
        l.topics.every((topic, i) => lower(topic) === lower(log.topics[i])),
    );
    return same ? 'confirmed' : 'mismatch';
  }
  return 'pending';
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
 * Fetch a pending transaction by hash and check it against the hash: the signed fields are
 * re-serialized and must hash to `txHash`, so an RPC cannot substitute a different recipient,
 * amount or nonce. Returns null if no endpoint knows it (or the answer does not match).
 */
async function fetchVerifiedTransaction(txHash: string): Promise<ethers.Transaction | null> {
  const response = await withRpcFailover(p => p.getTransaction(txHash));
  if (!response) {
    return null;
  }
  try {
    const rebuilt = ethers.Transaction.from({
      type: response.type,
      to: response.to,
      nonce: response.nonce,
      gasLimit: response.gasLimit,
      gasPrice: response.type === 2 ? null : response.gasPrice,
      maxFeePerGas: response.maxFeePerGas,
      maxPriorityFeePerGas: response.maxPriorityFeePerGas,
      data: response.data,
      value: response.value,
      chainId: response.chainId,
      accessList: response.accessList,
      signature: response.signature,
    });
    if (!rebuilt.hash || rebuilt.hash.toLowerCase() !== txHash.toLowerCase()) {
      console.warn('RPC returned a transaction that does not match its hash');
      return null;
    }
    return rebuilt;
  } catch (error: any) {
    console.warn('Could not verify a pending transaction:', error?.message || error);
    return null;
  }
}

/** Sender nonce of a transaction the network still knows, or null. Never throws. */
export async function getTransactionNonce(txHash: string): Promise<number | null> {
  try {
    const tx = await fetchVerifiedTransaction(txHash);
    return tx ? tx.nonce : null;
  } catch {
    return null;
  }
}

/**
 * The wallet's mined ('latest') nonce: every nonce below it is used. The lowest answer of up to
 * two endpoints is taken, so one endpoint reporting a too-high nonce cannot make a pending
 * payment look dropped. Returns null if no endpoint answers.
 */
export async function getLatestNonce(address: string): Promise<number | null> {
  await rpcReady;
  const endpoints = rpcEndpoints();
  const start = _currentRpcIndex % endpoints.length;
  const answers: number[] = [];
  for (let i = 0; i < endpoints.length && answers.length < Math.min(2, endpoints.length); i++) {
    try {
      answers.push(await readProviderFor(endpoints[(start + i) % endpoints.length]).getTransactionCount(address, 'latest'));
    } catch {
      // try the next endpoint
    }
  }
  return answers.length ? Math.min(...answers) : null;
}

export type ReplaceMode = 'speedup' | 'cancel';

// Nodes only replace a pending transaction when the new fees are at least ~10% higher.
const REPLACEMENT_FEE_BUMP_PERCENT = 115n;
const bumpFee = (fee: bigint) => (fee * REPLACEMENT_FEE_BUMP_PERCENT + 99n) / 100n;
const maxBigInt = (a: bigint, b: bigint) => (a > b ? a : b);

/**
 * Replace a pending payment that is stuck. Both modes re-sign the SAME nonce at a higher fee, so
 * at most one of the old and new transactions can ever be mined:
 *  - speedup: the same payment (recipient, amount, data) with a higher fee;
 *  - cancel: a 0-value transfer to this wallet. If it is mined, the payment is not.
 * Requires phone authentication. The original is read from the network and verified against its
 * hash, so an RPC cannot change what gets signed.
 */
export async function replacePendingTransaction(
  txHash: string,
  mode: ReplaceMode,
  authPromptTitle = mode === 'cancel' ? 'Confirm to Cancel Payment' : 'Confirm to Speed Up Payment',
): Promise<{txHash: string | null; nonce?: number; error?: string}> {
  let original: ethers.Transaction | null;
  let mined: number | null;
  const address = await getWalletAddress();
  if (!address) {
    return {txHash: null, error: 'No wallet found on this device.'};
  }
  try {
    original = await fetchVerifiedTransaction(txHash);
    mined = await getLatestNonce(address);
  } catch {
    return {txHash: null, error: 'Could not reach the network. Please try again.'};
  }
  if (!original) {
    return {
      txHash: null,
      error: 'This payment is no longer waiting on the network, so it cannot be changed. Activity will show whether it went through.',
    };
  }
  if (!original.from || original.from.toLowerCase() !== address.toLowerCase()) {
    return {txHash: null, error: 'This payment was not sent from this wallet.'};
  }
  if (mined === null) {
    return {txHash: null, error: 'Could not reach the network. Please try again.'};
  }
  if (mined > original.nonce) {
    return {txHash: null, error: 'This payment has already been processed. Refresh Activity to see the result.'};
  }

  const key = await loadPrivateKey(authPromptTitle);
  if (!key) {
    return {txHash: null, error: 'Authentication cancelled or wallet not found'};
  }

  try {
    const feeData = await withRpcFailover(p => p.getFeeData());
    let feeFields: {maxFeePerGas: bigint; maxPriorityFeePerGas: bigint} | {gasPrice: bigint};
    if (original.maxFeePerGas !== null && original.maxPriorityFeePerGas !== null) {
      const priority = maxBigInt(bumpFee(original.maxPriorityFeePerGas), feeData.maxPriorityFeePerGas ?? 0n);
      const maxFee = maxBigInt(bumpFee(original.maxFeePerGas), feeData.maxFeePerGas ?? 0n);
      feeFields = {maxFeePerGas: maxBigInt(maxFee, priority), maxPriorityFeePerGas: priority};
    } else {
      feeFields = {gasPrice: maxBigInt(bumpFee(original.gasPrice ?? 0n), feeData.gasPrice ?? 0n)};
    }
    const body =
      mode === 'speedup'
        ? {to: original.to, value: original.value, data: original.data, gasLimit: original.gasLimit}
        : {to: address, value: 0n, data: '0x', gasLimit: 21_000n};

    const wallet = new ethers.Wallet(key, getProvider());
    // Same nonce as the original: this replaces it rather than queueing behind it.
    const sent = await wallet.sendTransaction({
      ...body,
      nonce: original.nonce,
      chainId: MONAD_CONFIG.chainId,
      ...feeFields,
    });
    return {txHash: sent.hash, nonce: original.nonce};
  } catch (error: any) {
    return {txHash: null, error: parseContractError(error)};
  }
}

/**
 * Estimate gas cost for a payment (for display in confirm modal & pre-flight checks).
 * A native payment is estimated as the ledger's payWithLog call that is actually broadcast, not
 * as a plain transfer, which costs less gas and would understate the fee.
 */
export async function estimateGasCost(
  from: string,
  to: string,
  amountWei: bigint,
): Promise<{gasLimit: bigint; gasPrice: bigint; gasCostWei: bigint} | null> {
  const ledgerAddress = MONAD_CONFIG.contracts.tapPayLedger;
  const call =
    ledgerAddress && amountWei > 0n
      ? {
          from,
          to: ledgerAddress,
          value: amountWei,
          // Any unused session id: only the gas cost matters here.
          data: ledgerInterface.encodeFunctionData('payWithLog', [to, ethers.hexlify(ethers.randomBytes(32))]),
        }
      : {from, to, value: amountWei};
  try {
    return await withRpcFailover(async provider => {
      let estimate: bigint;
      try {
        estimate = await provider.estimateGas(call);
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
