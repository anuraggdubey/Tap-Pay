const mockStartReaderMode = jest.fn(async () => true);
const mockStopReaderMode = jest.fn(async () => true);
let capturedOnText: ((text: string) => void) | null = null;
let capturedOnError: ((event: {code: string; message: string}) => void) | null = null;

jest.mock('../../src/services/tapNfcNative', () => {
  const actual = jest.requireActual('../../src/services/tapNfcNative');
  return {
    ...actual,
    isNativeTapReaderAvailable: jest.fn(() => true),
    startNativeReaderMode: (...args: any[]) => mockStartReaderMode(...args),
    stopNativeReaderMode: (...args: any[]) => mockStopReaderMode(...args),
    subscribeNativeTagRead: jest.fn((onText: any, onError: any) => {
      capturedOnText = onText;
      capturedOnError = onError;
      return () => {
        capturedOnText = null;
        capturedOnError = null;
      };
    }),
  };
});

import {readReceiverAddress, stopContinuousHceScan} from '../../src/services/nfcReader';

const VALID_RECEIVER = '0x1111111111111111111111111111111111111111';

describe('NFC reader error feedback (#121)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnText = null;
    capturedOnError = null;
  });

  afterEach(async () => {
    await stopContinuousHceScan();
  });

  it('surfaces inline hint on recoverable error and keeps listening until a valid tag is read', async () => {
    const hints: string[] = [];
    const readPromise = readReceiverAddress({
      timeoutMs: 5000,
      onHint: hint => hints.push(hint),
    });

    await new Promise(resolve => setImmediate(resolve));

    capturedOnError?.({code: 'APP_NOT_FOUND', message: 'SELECT AID failed'});
    expect(hints).toEqual(['Ask the receiver to open the Receive screen in TapPay.']);

    capturedOnError?.({code: 'TAG_LOST', message: 'Tag was lost'});
    expect(hints).toHaveLength(2);
    expect(hints[1]).toMatch(/hold phones together/i);

    capturedOnText?.(`tappay://tap/${VALID_RECEIVER}`);
    const result = await readPromise;
    expect(result.status).toBe('SUCCESS');
    expect(result.receiverAddress).toBe(VALID_RECEIVER);
  });

  it('includes the last recoverable error hint in timeout message', async () => {
    const readPromise = readReceiverAddress({timeoutMs: 30});
    await new Promise(resolve => setImmediate(resolve));

    capturedOnError?.({code: 'APP_NOT_FOUND', message: 'SELECT AID failed'});

    const result = await readPromise;
    expect(result.status).toBe('TIMEOUT');
    expect(result.errorMessage).toBe('Ask the receiver to open the Receive screen in TapPay.');
  });

  it('returns the default timeout hint when no native error occurred', async () => {
    const result = await readReceiverAddress({timeoutMs: 25});
    expect(result.status).toBe('TIMEOUT');
    expect(result.errorMessage).toMatch(/No NFC signal/i);
  });
});
