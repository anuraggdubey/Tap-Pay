/**
 * HCE Service — Host Card Emulation session management for One-Way NFC
 *
 * Receiver acts as Card (HCE) broadcasting their address.
 */

import {NativeModules, Platform} from 'react-native';
import {HCESession, NFCTagType4, NFCTagType4NDEFContentType} from 'react-native-hce';
import {SESSION_TIMEOUT_MS} from '../config/monad';
import {
  encodeReceiverAddress,
  type TapEncodeOptions,
  type TapPaymentRequest,
} from '../utils/apdu';

type TapHcePreferenceNative = {
  setPreferredService?: () => Promise<boolean>;
  unsetPreferredService?: () => Promise<boolean>;
  isDefaultServiceForAid?: () => Promise<boolean>;
  categoryAllowsForegroundPreference?: () => Promise<boolean>;
};

function getHcePreferenceModule(): TapHcePreferenceNative | undefined {
  if (Platform.OS !== 'android') {
    return undefined;
  }
  return NativeModules?.TapHcePreference as TapHcePreferenceNative | undefined;
}

async function setPreferredHceService(): Promise<void> {
  try {
    await getHcePreferenceModule()?.setPreferredService?.();
  } catch {
    // Non-fatal: HCE still works when no conflicting NDEF app is installed.
  }
}

async function unsetPreferredHceService(): Promise<void> {
  try {
    await getHcePreferenceModule()?.unsetPreferredService?.();
  } catch {
    // Ignore cleanup failures.
  }
}

export type HceReceiverLease = {
  start(
    receiverAddress: string,
    expiresAt?: number,
    options?: string | TapPaymentRequest | TapEncodeOptions,
  ): Promise<boolean>;
  stop(): Promise<void>;
};

let _activeSession: HCESession | null = null;
let _owner: HceReceiverLease | null = null;
let _sessionTimer: ReturnType<typeof setTimeout> | null = null;
let _nativeQueue: Promise<void> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = _nativeQueue.then(operation);
  _nativeQueue = result.then(() => {}, () => {});
  return result;
}

function clearExpiry(): void {
  if (_sessionTimer !== null) {
    clearTimeout(_sessionTimer);
    _sessionTimer = null;
  }
}

function scheduleExpiry(owner: HceReceiverLease, expiresAt: number): void {
  if (_owner !== owner) return;
  clearExpiry();
  _sessionTimer = setTimeout(() => { owner.stop(); }, Math.max(0, expiresAt - Date.now()));
}

async function ensureSession(): Promise<HCESession> {
  if (!_activeSession) {
    _activeSession = await HCESession.getInstance();
  }
  return _activeSession;
}

export function createHceReceiverLease(): HceReceiverLease {
  let stopped = false;
  let started = false;
  let stopPromise: Promise<void> | undefined;
  const ownsSession = () => _owner === lease && !stopped;

  const lease: HceReceiverLease = {
    async start(receiverAddress, expiresAt, options) {
      if (!ownsSession() || started) return false;
      started = true;
      const expired = () => expiresAt !== undefined && Date.now() >= expiresAt;
      try {
        if (!await preparation || !ownsSession()) return false;
        const encodeOptions: TapEncodeOptions =
          typeof options === 'string'
            ? {sessionNonce: options, expiresAt}
            : options && 'amount' in options && 'tokenSymbol' in options
            ? {paymentRequest: options, expiresAt}
            : {...options, expiresAt: options?.expiresAt ?? expiresAt};
        const tag = new NFCTagType4({
          type: NFCTagType4NDEFContentType.URL,
          content: encodeReceiverAddress(receiverAddress, encodeOptions),
          writable: false,
        });

        const session = await serialize(async () => {
          if (!ownsSession()) return null;
          const current = await ensureSession();
          if (!ownsSession()) return null;
          await current.setApplication(tag);
          return ownsSession() ? current : null;
        });
        if (!session || !ownsSession()) return false;

        // Allow SharedPreferences to commit before enabling the service.
        await new Promise(resolve => setTimeout(resolve, 100));
        const enabled = await serialize(async () => {
          if (!ownsSession() || expired()) return false;
          await session.setEnabled(true);
          if (!ownsSession()) return false;
          await setPreferredHceService();
          return ownsSession();
        });
        if (!enabled) {
          await lease.stop();
          return false;
        }
        if (expiresAt !== undefined) scheduleExpiry(lease, expiresAt);

        // Allow Android to register the HostApduService.
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!ownsSession()) return false;
        if (expired()) {
          await lease.stop();
          return false;
        }
        if (expiresAt === undefined) scheduleExpiry(lease, Date.now() + SESSION_TIMEOUT_MS);
        return true;
      } catch (error) {
        console.error('Failed to start HCE session:', error);
        await lease.stop();
        return false;
      }
    },
    stop() {
      if (stopPromise) return stopPromise;
      stopped = true;
      if (_owner !== lease) return Promise.resolve();
      clearExpiry();
      stopPromise = serialize(async () => {
        if (_owner === lease) {
          await unsetPreferredHceService();
          if (_activeSession) {
            await _activeSession.setEnabled(false);
          }
        }
      }).catch(error => { console.error('Failed to stop HCE session:', error); });
      return stopPromise;
    },
  };

  _owner = lease;
  clearExpiry();
  const preparation = serialize(async () => {
    if (!ownsSession()) return false;
    if (_activeSession) await _activeSession.setEnabled(false);
    return ownsSession();
  }).catch(async error => {
    console.error('Failed to prepare HCE session:', error);
    await lease.stop();
    return false;
  });
  return lease;
}

export function stopHceSession(): Promise<void> {
  return _owner?.stop() ?? Promise.resolve();
}

export function isHceActive(): boolean {
  return _activeSession?.enabled ?? false;
}

export function teardownHce(): void {
  stopHceSession();
}

export {HCESession};
