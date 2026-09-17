/**
 * NFC Type 4 Tag (IsoDep) reader utilities
 *
 * Phone-to-phone Tap Pay uses Host Card Emulation (HCE) which emulates an
 * ISO-DEP Type 4 tag — NOT a passive NDEF sticker. The reader must use
 * IsoDep + APDU commands matching react-native-hce's NFCTagType4 protocol.
 */

import NfcManager, {NfcTech, Ndef, NfcAdapter} from 'react-native-nfc-manager';

/** NDEF Tag Application AID (NFC Forum Type 4) */
export const TYPE4_NDEF_APP_AID = [0x00, 0xa4, 0x04, 0x00, 0x07, 0xd2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01, 0x00];

/** Select NDEF data file E104 */
export const TYPE4_SELECT_NDEF_FILE = [0x00, 0xa4, 0x00, 0x0c, 0x02, 0xe1, 0x04];

const SCAN_TIMEOUT_MS = 12_000;

function apduOk(response: number[]): boolean {
  return (
    response.length >= 2 &&
    response[response.length - 2] === 0x90 &&
    response[response.length - 1] === 0x00
  );
}

function stripSw(response: number[]): number[] {
  return response.slice(0, -2);
}

function readBinaryApdu(offset: number, length: number): number[] {
  return [0x00, 0xb0, (offset >> 8) & 0xff, offset & 0xff, length];
}

function decodeNdefRecords(ndefBytes: number[]): string | null {
  try {
    const records = Ndef.decodeMessage(ndefBytes);
    const record = records?.[0];
    if (!record?.payload) {
      return null;
    }

    const payload = new Uint8Array(record.payload as number[]);

    if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
      return Ndef.text.decodePayload(payload);
    }

    if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
      return Ndef.uri.decodePayload(payload);
    }

    return Ndef.util.bytesToString(payload);
  } catch {
    return null;
  }
}

/**
 * Read NDEF text content from an emulated Type 4 HCE card via IsoDep APDUs.
 */
export async function readType4HceText(): Promise<string | null> {
  await NfcManager.requestTechnology(NfcTech.IsoDep, {
    alertMessage: 'Hold phones together to read',
    isReaderModeEnabled: true,
    readerModeFlags:
      NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
  });

  try {
    await NfcManager.setTimeout(5000);
  } catch {
    // Optional on some devices
  }

  const selectApp = await NfcManager.isoDepHandler.transceive(TYPE4_NDEF_APP_AID);
  if (!apduOk(selectApp)) {
    throw new Error('HCE card not found. Ensure sender has Tap Pay open on Send screen.');
  }

  const selectFile = await NfcManager.isoDepHandler.transceive(TYPE4_SELECT_NDEF_FILE);
  if (!apduOk(selectFile)) {
    throw new Error('Could not select NDEF file on HCE card.');
  }

  const lenResponse = await NfcManager.isoDepHandler.transceive(readBinaryApdu(0, 2));
  if (!apduOk(lenResponse)) {
    throw new Error('Could not read NDEF length from HCE card.');
  }

  const lenData = stripSw(lenResponse);
  const ndefLength = (lenData[0] << 8) | lenData[1];
  if (ndefLength <= 0 || ndefLength > 0x7ffd) {
    throw new Error('Invalid NDEF length on HCE card.');
  }

  const readLength = ndefLength + 2;
  const ndefResponse = await NfcManager.isoDepHandler.transceive(
    readBinaryApdu(0, readLength),
  );
  if (!apduOk(ndefResponse)) {
    throw new Error('Could not read NDEF message from HCE card.');
  }

  const ndefWithPrefix = stripSw(ndefResponse);
  const ndefMessage = ndefWithPrefix.slice(2, 2 + ndefLength);

  return decodeNdefRecords(ndefMessage);
}

/**
 * Connect to HCE card with a timeout so scanning can retry quickly.
 */
export async function readType4HceTextWithTimeout(
  timeoutMs = SCAN_TIMEOUT_MS,
): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    const result = await Promise.race([
      readType4HceText(),
      new Promise<null>((_, reject) => {
        timer = setTimeout(() => reject(new Error('NFC scan timeout')), timeoutMs);
      }),
    ]);
    return result;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
    NfcManager.cancelTechnologyRequest({delayMsAndroid: 200}).catch(() => {});
  }
}
