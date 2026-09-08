import {
  encodePaymentOffer,
  decodePaymentOffer,
  encodeAcceptResponse,
  decodeAcceptResponse,
  PaymentOffer,
} from '../src/utils/apdu';
import {truncateAddress, formatMon, parseMonToWei} from '../src/utils/format';
import {
  validateAmount,
  validateUsername,
  validateAddress,
} from '../src/utils/validation';

describe('APDU Encoding/Decoding', () => {
  test('correctly encodes and decodes PaymentOffer binary payload', () => {
    const offer: PaymentOffer = {
      version: 1,
      amountWei: 1000000000000000000n, // 1 MON
      senderAddress: '0x1234567890123456789012345678901234567890',
      sessionId: '12345678-1234-1234-1234-123456789abc',
      signature: '0x' + 'ab'.repeat(65),
    };

    const encoded = encodePaymentOffer(offer);
    expect(encoded.length).toBe(134);

    const decoded = decodePaymentOffer(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.version).toBe(offer.version);
    expect(decoded?.amountWei).toBe(offer.amountWei);
    expect(decoded?.senderAddress.toLowerCase()).toBe(offer.senderAddress.toLowerCase());
    expect(decoded?.sessionId.toLowerCase()).toBe(offer.sessionId.toLowerCase());
    expect(decoded?.signature.toLowerCase()).toBe(offer.signature.toLowerCase());
  });

  test('correctly encodes and decodes AcceptResponse', () => {
    const receiver = '0xabcdef1234567890abcdef1234567890abcdef12';
    const encoded = encodeAcceptResponse(receiver);
    expect(encoded.length).toBe(20);

    const decoded = decodeAcceptResponse(encoded);
    expect(decoded?.toLowerCase()).toBe(receiver.toLowerCase());
  });
});

describe('Formatting Utils', () => {
  test('truncateAddress shortens 42-char address', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    expect(truncateAddress(addr, 6, 4)).toBe('0x1234...5678');
  });

  test('formatMon formats wei correctly', () => {
    expect(formatMon(1000000000000000000n)).toBe('1 MON');
    expect(formatMon(2500000000000000000n)).toBe('2.5 MON');
  });

  test('parseMonToWei parses decimal string to wei bigint', () => {
    expect(parseMonToWei('1')).toBe(1000000000000000000n);
    expect(parseMonToWei('0.5')).toBe(500000000000000000n);
  });
});

describe('Validation Utils', () => {
  test('validates MON amounts', () => {
    expect(validateAmount('1.5').valid).toBe(true);
    expect(validateAmount('0').valid).toBe(false);
    expect(validateAmount('-1').valid).toBe(false);
    expect(validateAmount('abc').valid).toBe(false);
  });

  test('validates usernames', () => {
    expect(validateUsername('alice').valid).toBe(true);
    expect(validateUsername('alice_123').valid).toBe(true);
    expect(validateUsername('ab').valid).toBe(false);
    expect(validateUsername('Alice').valid).toBe(false); // only lowercase
  });

  test('validates EVM addresses', () => {
    expect(validateAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    expect(validateAddress('0xinvalid')).toBe(false);
  });
});
