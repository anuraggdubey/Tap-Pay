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

/** Select Capability Container E103 */
export const TYPE4_SELECT_CC_FILE = [0x00, 0xa4, 0x00, 0x0c, 0x02, 0xe1, 0x03];

/** Select NDEF data file E104 */
export const TYPE4_SELECT_NDEF_FILE = [0x00, 0xa4, 0x00, 0x0c, 0x02, 0xe1, 0x04];

const SCAN_TIMEOUT_MS = 12_000;
const MAX_SHORT_APDU_LE = 0xff;

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
    readerModeDelay: 250,
  });

  try {
    await NfcManager.setTimeout(5000);
  } catch {
    // Optional on some devices
  }

  let selectApp = await NfcManager.isoDepHandler.transceive(TYPE4_NDEF_APP_AID);
  if (!apduOk(selectApp)) {
    // Retry without Le byte — some devices send 12-byte SELECT
    const selectNoLe = TYPE4_NDEF_APP_AID.slice(0, 12);
    selectApp = await NfcManager.isoDepHandler.transceive(selectNoLe);
    if (!apduOk(selectApp)) {
      throw new Error('HCE card not found. Ensure sender has Tap Pay open on Send screen.');
    }
  }

  const readMaxChunkSize = async (): Promise<number> => {
    const selectCc = await NfcManager.isoDepHandler.transceive(TYPE4_SELECT_CC_FILE);
    if (!apduOk(selectCc)) {
      return MAX_SHORT_APDU_LE;
    }
    const ccResp = await NfcManager.isoDepHandler.transceive(readBinaryApdu(0, 0x0f));
    if (!apduOk(ccResp) || ccResp.length < 7) {
      return MAX_SHORT_APDU_LE;
    }
    const mle = ((ccResp[3] & 0xff) << 8) | (ccResp[4] & 0xff);
    return mle > 0 ? Math.min(mle, MAX_SHORT_APDU_LE) : MAX_SHORT_APDU_LE;
  };

  const maxChunk = await readMaxChunkSize();

  const selectFile = await NfcManager.isoDepHandler.transceive(TYPE4_SELECT_NDEF_FILE);
  if (!apduOk(selectFile)) {
    throw new Error('Could not select NDEF file on HCE card.');
  }

  const lenResponse = await NfcManager.isoDepHandler.transceive(readBinaryApdu(0, 2));
  if (!apduOk(lenResponse) || lenResponse.length < 4) {
    throw new Error('Could not read NDEF length from HCE card.');
  }

  const lenData = stripSw(lenResponse);
  const ndefLength = ((lenData[0] & 0xff) << 8) | (lenData[1] & 0xff);
  if (ndefLength <= 0 || ndefLength > 0x7ffd) {
    throw new Error('Invalid NDEF length on HCE card.');
  }

  const ndefMessage: number[] = [];
  let offset = 2;
  while (ndefMessage.length < ndefLength) {
    const toRead = Math.min(maxChunk, ndefLength - ndefMessage.length);
    const chunkResponse = await NfcManager.isoDepHandler.transceive(
      readBinaryApdu(offset, toRead),
    );
    if (!apduOk(chunkResponse)) {
      throw new Error('Could not read NDEF message from HCE card.');
    }
    const chunkData = stripSw(chunkResponse);
    if (chunkData.length === 0) {
      throw new Error('Truncated NDEF response from HCE card.');
    }
    const take = Math.min(chunkData.length, ndefLength - ndefMessage.length);
    for (let i = 0; i < take; i++) {
      ndefMessage.push(chunkData[i]);
    }
    offset += take;
  }

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
