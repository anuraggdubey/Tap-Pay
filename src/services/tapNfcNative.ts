/**
 * Native Android NFC reader bridge (TapNfcReaderModule)
 * Uses Activity.enableReaderMode for reliable phone-to-phone HCE detection.
 */

import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

type TapNfcReaderNative = {
  startReaderMode: () => Promise<boolean>;
  stopReaderMode: () => Promise<boolean>;
  isReaderModeActive: () => Promise<boolean>;
};

const NativeTapNfcReader: TapNfcReaderNative | undefined =
  NativeModules.TapNfcReader;

const emitter =
  Platform.OS === 'android' && NativeTapNfcReader
    ? new NativeEventEmitter(NativeModules.TapNfcReader)
    : null;

export const TAP_NFC_TAG_READ = 'TapNfcTagRead';
export const TAP_NFC_TAG_ERROR = 'TapNfcTagError';

export type TapNfcErrorCode =
  | 'NOT_ISO_DEP'
  | 'APP_NOT_FOUND'
  | 'TAG_LOST'
  | 'READ_FAILED'
  | 'UNKNOWN';

export interface TapNfcErrorEvent {
  code: TapNfcErrorCode;
  message: string;
}

export function formatNfcErrorHint(event: TapNfcErrorEvent): string {
  switch (event.code) {
    case 'NOT_ISO_DEP':
      return 'Not a TapPay device — ask the receiver to open Receive.';
    case 'APP_NOT_FOUND':
      return 'Ask the receiver to open the Receive screen in TapPay.';
    case 'TAG_LOST':
      return 'Phone moved too fast — hold phones together a moment longer.';
    case 'READ_FAILED':
      return 'Could not read payment tag — hold steady and try again.';
    default:
      return event.message || 'Hold phones together and try again.';
  }
}

export function isNativeTapReaderAvailable(): boolean {
  return Platform.OS === 'android' && !!NativeTapNfcReader;
}

export async function startNativeReaderMode(): Promise<boolean> {
  if (!NativeTapNfcReader) {
    return false;
  }
  return await NativeTapNfcReader.startReaderMode();
}

export async function stopNativeReaderMode(): Promise<boolean> {
  if (!NativeTapNfcReader) {
    return false;
  }
  try {
    return await NativeTapNfcReader.stopReaderMode();
  } catch {
    return false;
  }
}

export function subscribeNativeTagRead(
  onText: (text: string) => void,
  onError?: (event: TapNfcErrorEvent) => void,
): () => void {
  if (!emitter) {
    return () => {};
  }

  const readSub = emitter.addListener(TAP_NFC_TAG_READ, (event: {text?: string}) => {
    if (event?.text) {
      onText(event.text);
    }
  });

  const errorSub = emitter.addListener(
    TAP_NFC_TAG_ERROR,
    (event: {code?: string; error?: string}) => {
      if ((event?.error || event?.code) && onError) {
        const code = (event.code as TapNfcErrorCode) || 'UNKNOWN';
        onError({code, message: event.error || ''});
      }
    },
  );

  return () => {
    readSub.remove();
    errorSub.remove();
  };
}

/**
 * Ensure sender phone is NOT in reader mode before starting HCE
 */
export async function prepareSenderNfc(): Promise<void> {
  await stopNativeReaderMode();
}
