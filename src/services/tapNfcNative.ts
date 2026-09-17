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
  onError?: (message: string) => void,
): () => void {
  if (!emitter) {
    return () => {};
  }

  const readSub = emitter.addListener(TAP_NFC_TAG_READ, (event: {text?: string}) => {
    if (event?.text) {
      onText(event.text);
    }
  });

  const errorSub = emitter.addListener(TAP_NFC_TAG_ERROR, (event: {error?: string}) => {
    if (event?.error && onError) {
      onError(event.error);
    }
  });

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
