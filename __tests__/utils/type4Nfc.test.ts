jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  default: {
    isoDepHandler: {transceive: jest.fn()},
    requestTechnology: jest.fn(),
    setTimeout: jest.fn(),
    cancelTechnologyRequest: jest.fn(),
  },
  NfcTech: {IsoDep: 'IsoDep'},
  NfcAdapter: {
    FLAG_READER_NFC_A: 1,
    FLAG_READER_SKIP_NDEF_CHECK: 128,
  },
  Ndef: {
    TNF_WELL_KNOWN: 1,
    RTD_URI: [0x55],
    RTD_TEXT: [0x54],
    decodeMessage: jest.fn(),
    isType: jest.fn(),
    uri: {decodePayload: jest.fn()},
    text: {decodePayload: jest.fn()},
  },
}));

import NfcManager, {Ndef} from 'react-native-nfc-manager';
import {
  readType4HceText,
  readType4HceTextWithTimeout,
  TYPE4_NDEF_APP_AID,
  TYPE4_SELECT_CC_FILE,
  TYPE4_SELECT_NDEF_FILE,
} from '../../src/utils/type4Nfc';

const SW_OK = [0x90, 0x00];

function sameBytes(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

describe('type4Nfc reader (#120)', () => {
  const mockTransceive = jest.fn();
  const mockRequestTech = jest.fn();
  const mockSetTimeout = jest.fn();
  const mockCancelTech = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (NfcManager as any).isoDepHandler = {transceive: mockTransceive};
    (NfcManager as any).requestTechnology = mockRequestTech.mockResolvedValue(undefined);
    (NfcManager as any).setTimeout = mockSetTimeout.mockResolvedValue(undefined);
    (NfcManager as any).cancelTechnologyRequest = mockCancelTech.mockResolvedValue(undefined);
  });

  it('reads payloads longer than 255 bytes in chunks respecting CC MLe', async () => {
    const longUri = 'tappay://tap/0x1111111111111111111111111111111111111111?s=' + 'a'.repeat(300);
    // Build a valid NDEF URI message > 255 bytes
    const uriBytes = Array.from(Buffer.from(longUri, 'utf8'));
    const payload = [0x00, ...uriBytes]; // URI prefix 0x00
    // Non-short NDEF record (SR=0): header 0xC1, typeLen=1, payloadLen(4 bytes BE), type='U'
    const pLen = payload.length;
    const ndefMsg = [
      0xc1,
      0x01,
      (pLen >> 24) & 0xff,
      (pLen >> 16) & 0xff,
      (pLen >> 8) & 0xff,
      pLen & 0xff,
      0x55,
      ...payload,
    ];
    expect(ndefMsg.length).toBeGreaterThan(255);

    const fileData = [(ndefMsg.length >> 8) & 0xff, ndefMsg.length & 0xff, ...ndefMsg];
    const mle = 0x003b; // 59 bytes per READ BINARY chunk
    const ccFile = [0x00, 0x0f, 0x20, (mle >> 8) & 0xff, mle & 0xff, 0x00, 0x34, 0x04, 0x06, 0xe1, 0x04, 0x04, 0x00, 0x00, 0x00];

    // Mock Ndef.decodeMessage to parse our long record cleanly in Jest
    (Ndef as any).decodeMessage = jest.fn((bytes: number[]) => {
      const len = (bytes[2] << 24) | (bytes[3] << 16) | (bytes[4] << 8) | bytes[5];
      return [{tnf: Ndef.TNF_WELL_KNOWN, type: Ndef.RTD_URI, payload: bytes.slice(7, 7 + len)}];
    });
    (Ndef as any).isType = jest.fn((_r: any, _tnf: any, type: any) => type === Ndef.RTD_URI);
    (Ndef as any).uri = {
      decodePayload: (p: Uint8Array) => Buffer.from(p.slice(1)).toString('utf8'),
    };

    let selectedFile: 'cc' | 'ndef' | null = null;
    const readBinaryCalls: Array<{offset: number; le: number}> = [];

    mockTransceive.mockImplementation(async (apdu: number[]) => {
      if (sameBytes(apdu, TYPE4_NDEF_APP_AID)) {
        return SW_OK;
      }
      if (sameBytes(apdu, TYPE4_SELECT_CC_FILE)) {
        selectedFile = 'cc';
        return SW_OK;
      }
      if (sameBytes(apdu, TYPE4_SELECT_NDEF_FILE)) {
        selectedFile = 'ndef';
        return SW_OK;
      }
      if (apdu[0] === 0x00 && apdu[1] === 0xb0) {
        const offset = (apdu[2] << 8) | apdu[3];
        const le = apdu[4];
        if (selectedFile === 'cc') {
          return [...ccFile.slice(offset, offset + le), ...SW_OK];
        }
        readBinaryCalls.push({offset, le});
        return [...fileData.slice(offset, offset + le), ...SW_OK];
      }
      return [0x6a, 0x82];
    });

    const result = await readType4HceText();
    expect(result).toBe(longUri);
    // 1 call for NLEN + multiple chunk calls, each <= MLe (59)
    expect(readBinaryCalls.length).toBeGreaterThan(5);
    for (const call of readBinaryCalls.slice(1)) {
      expect(call.le).toBeLessThanOrEqual(mle);
    }
  });

  it('skips CC APDU round-trips for short payloads (<=255 bytes) (#136)', async () => {
    const shortUri = 'tappay://tap/0x1111111111111111111111111111111111111111?s=aabbccdd';
    const uriBytes = Array.from(Buffer.from(shortUri, 'utf8'));
    const payload = [0x00, ...uriBytes];
    const ndefMsg = [0xd1, 0x01, payload.length, 0x55, ...payload];
    expect(ndefMsg.length).toBeLessThanOrEqual(255);

    const fileData = [(ndefMsg.length >> 8) & 0xff, ndefMsg.length & 0xff, ...ndefMsg];
    (Ndef as any).decodeMessage = jest.fn((bytes: number[]) => [
      {tnf: Ndef.TNF_WELL_KNOWN, type: Ndef.RTD_URI, payload: bytes.slice(4)},
    ]);
    (Ndef as any).isType = jest.fn((_r: any, _tnf: any, type: any) => type === Ndef.RTD_URI);
    (Ndef as any).uri = {
      decodePayload: (p: Uint8Array) => Buffer.from(p.slice(1)).toString('utf8'),
    };

    let ccSelected = false;
    mockTransceive.mockImplementation(async (apdu: number[]) => {
      if (sameBytes(apdu, TYPE4_NDEF_APP_AID)) return SW_OK;
      if (sameBytes(apdu, TYPE4_SELECT_CC_FILE)) {
        ccSelected = true;
        return SW_OK;
      }
      if (sameBytes(apdu, TYPE4_SELECT_NDEF_FILE)) return SW_OK;
      if (apdu[0] === 0x00 && apdu[1] === 0xb0) {
        const offset = (apdu[2] << 8) | apdu[3];
        const le = apdu[4];
        return [...fileData.slice(offset, offset + le), ...SW_OK];
      }
      return [0x6a, 0x82];
    });

    const result = await readType4HceText();
    expect(result).toBe(shortUri);
    expect(ccSelected).toBe(false);
    // Only 4 APDUs: SELECT APP, SELECT NDEF, READ NLEN, READ NDEF
    expect(mockTransceive).toHaveBeenCalledTimes(4);
  });

  it('rejects a short NLEN response cleanly without indexing out of bounds', async () => {
    mockTransceive.mockImplementation(async (apdu: number[]) => {
      if (sameBytes(apdu, TYPE4_NDEF_APP_AID)) return SW_OK;
      if (sameBytes(apdu, TYPE4_SELECT_CC_FILE)) return [0x6a, 0x82];
      if (sameBytes(apdu, TYPE4_SELECT_NDEF_FILE)) return SW_OK;
      // Return only 1 data byte + SW_OK instead of 2 NLEN bytes
      if (apdu[1] === 0xb0) return [0x00, ...SW_OK];
      return [0x6a, 0x82];
    });

    await expect(readType4HceText()).rejects.toThrow(/Could not read NDEF length/i);
  });

  it('cancels the NFC technology request when transceive throws', async () => {
    mockTransceive.mockRejectedValue(new Error('Tag was lost'));
    await expect(readType4HceTextWithTimeout(5000)).rejects.toThrow('Tag was lost');
    expect(mockCancelTech).toHaveBeenCalledTimes(1);
  });
});
