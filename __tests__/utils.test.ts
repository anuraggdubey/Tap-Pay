import {ethers} from 'ethers';
import {
  encodePaymentOffer,
  decodePaymentOffer,
  encodeAcceptResponse,
  decodeAcceptResponse,
  computePayloadHash,
  verifyPaymentOffer,
  PaymentOffer,
} from '../src/utils/apdu';
import {truncateAddress, formatMon, parseMonToWei} from '../src/utils/format';
import {
  validateAmount,
  validateUsername,
  validateAddress,
} from '../src/utils/validation';

describe('APDU Encoding/Decoding & Cryptographic Verification', () => {
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

  test('computes deterministic keccak256 hash of payment payload', () => {
    const hash1 = computePayloadHash(
      1,
      1000000000000000000n,
      '0x1234567890123456789012345678901234567890',
      'test-session-1234',
    );
    const hash2 = computePayloadHash(
      1,
      1000000000000000000n,
      '0x1234567890123456789012345678901234567890',
      'test-session-1234',
    );
    expect(hash1).toBe(hash2);
    expect(hash1.startsWith('0x')).toBe(true);
    expect(hash1.length).toBe(66);
  });

  test('cryptographically verifies genuine signed PaymentOffer', async () => {
    const testWallet = ethers.Wallet.createRandom();
    const version = 1;
    const amountWei = 2500000000000000000n; // 2.5 MON
    const senderAddress = testWallet.address;
    const sessionId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';

    const hash = computePayloadHash(version, amountWei, senderAddress, sessionId);
    const signature = await testWallet.signMessage(ethers.getBytes(hash));

    const offer: PaymentOffer = {
      version,
      amountWei,
      senderAddress,
      sessionId,
      signature,
    };

    // Valid offer should pass verification
    expect(verifyPaymentOffer(offer)).toBe(true);

    // Tampered amount should fail verification
    const tamperedAmountOffer: PaymentOffer = {
      ...offer,
      amountWei: 9990000000000000000n,
    };
    expect(verifyPaymentOffer(tamperedAmountOffer)).toBe(false);

    // Spoofed sender address should fail verification
    const spoofedSenderOffer: PaymentOffer = {
      ...offer,
      senderAddress: '0x0000000000000000000000000000000000000001',
    };
    expect(verifyPaymentOffer(spoofedSenderOffer)).toBe(false);

    // Tampered session ID should fail verification
    const tamperedSessionOffer: PaymentOffer = {
      ...offer,
      sessionId: '00000000-0000-0000-0000-000000000000',
    };
    expect(verifyPaymentOffer(tamperedSessionOffer)).toBe(false);

    // Malformed signature should fail gracefully without throwing
    const malformedSigOffer: PaymentOffer = {
      ...offer,
      signature: '0x1234',
    };
    expect(verifyPaymentOffer(malformedSigOffer)).toBe(false);
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

describe('Contract Error Parsing', () => {
  const {parseContractError} = require('../src/services/wallet');

  test('parses TapPayLedger SessionAlreadyProcessed error', () => {
    const err = {message: 'execution reverted: SessionAlreadyProcessed'};
    expect(parseContractError(err)).toBe('This payment session was already processed.');
  });

  test('parses TapPayLedger InvalidRecipient error', () => {
    const err = {message: 'execution reverted: InvalidRecipient'};
    expect(parseContractError(err)).toBe('Invalid recipient address or self-payment is not allowed.');
  });

  test('parses UsernameRegistry UsernameTaken error', () => {
    const err = {message: 'execution reverted: UsernameTaken'};
    expect(parseContractError(err)).toBe('This username is already taken by another user.');
  });

  test('parses insufficient funds error', () => {
    const err = {message: 'sender doesn\'t have enough funds to send tx or exceeds balance'};
    expect(parseContractError(err)).toBe('Insufficient MON balance for payment and network gas fee.');
  });
});
