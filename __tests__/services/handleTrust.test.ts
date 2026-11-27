/**
 * #129: warn before paying a handle that is new or now points to a different wallet.
 */
import {handleWarning, lastPaidAddressForHandle, NEW_HANDLE_WARNING_DAYS} from '../../src/services/handleTrust';
import type {TransactionRecord} from '../../src/services/history';

jest.mock('../../src/services/secureHistoryStore', () => ({loadHistoryJson: jest.fn(), saveHistoryJson: jest.fn()}));

const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';
const NOW = Date.parse('2026-06-01T00:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function row(overrides: Partial<TransactionRecord>): TransactionRecord {
  return {
    id: 'x', direction: 'sent', counterparty: A, counterpartyUsername: 'alice', amount: '1',
    status: 'confirmed', txHash: '0x1', timestamp: '2026-05-01T00:00:00Z', ...overrides,
  };
}

describe('lastPaidAddressForHandle', () => {
  it('returns the most recent wallet paid under the handle', () => {
    const history = [
      row({counterparty: A, timestamp: '2026-01-01T00:00:00Z'}),
      row({counterparty: B, timestamp: '2026-03-01T00:00:00Z'}),
    ];
    expect(lastPaidAddressForHandle(history, '@Alice')).toBe(B);
  });

  it('ignores received, failed and other-handle rows', () => {
    const history = [
      row({direction: 'received', counterparty: B}),
      row({status: 'failed', counterparty: B, timestamp: '2026-05-30T00:00:00Z'}),
      row({counterpartyUsername: 'bob', counterparty: B}),
      row({counterpartyUsername: undefined, counterparty: B}),
    ];
    expect(lastPaidAddressForHandle(history, 'alice')).toBeNull();
    expect(lastPaidAddressForHandle([...history, row({})], 'alice')).toBe(A);
  });
});

describe('handleWarning', () => {
  const old = new Date(NOW - 400 * DAY).toISOString();

  it('warns when the handle now points to a different wallet than the one paid before', () => {
    const warning = handleWarning({username: 'alice', address: B, registeredAt: old, previousAddress: A, now: NOW});
    expect(warning).toMatch(/@alice now points to a different wallet \(0x2222…2222\)/);
    expect(warning).toMatch(/paid before \(0x1111…1111\)/);
  });

  it('does not warn when the wallet is unchanged (address case ignored)', () => {
    expect(handleWarning({username: 'alice', address: A, registeredAt: old, previousAddress: A.toUpperCase().replace('0X', '0x'), now: NOW})).toBeNull();
  });

  it('warns about a handle registered recently', () => {
    const recent = new Date(NOW - 3 * DAY).toISOString();
    expect(handleWarning({username: 'alice', address: B, registeredAt: recent, previousAddress: null, now: NOW}))
      .toMatch(/@alice was registered 3 days ago/);
    expect(handleWarning({username: 'alice', address: B, registeredAt: new Date(NOW - 1000).toISOString(), previousAddress: null, now: NOW}))
      .toMatch(/registered today/);
  });

  it(`stops warning after ${NEW_HANDLE_WARNING_DAYS} days, and without a registration time`, () => {
    const boundary = new Date(NOW - NEW_HANDLE_WARNING_DAYS * DAY).toISOString();
    expect(handleWarning({username: 'alice', address: B, registeredAt: boundary, previousAddress: null, now: NOW})).toBeNull();
    expect(handleWarning({username: 'alice', address: B, registeredAt: null, previousAddress: null, now: NOW})).toBeNull();
  });
});
