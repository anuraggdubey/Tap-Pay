const mockLoad = jest.fn();
const mockSave = jest.fn();
jest.mock('../../src/services/secureHistoryStore', () => ({
  loadHistoryJson: () => mockLoad(),
  saveHistoryJson: (json: string) => mockSave(json),
}));

type History = typeof import('../../src/services/history');
let history: History;
const oldRow = {
  id: 'old', timestamp: '2026-01-01T00:00:00.000Z', direction: 'sent' as const,
  counterparty: '0x1111111111111111111111111111111111111111', amount: '2',
  status: 'pending' as const, txHash: '0x' + 'ab'.repeat(32),
};
function record(hash: string) {
  return history.recordTransaction({direction: 'sent', counterparty: oldRow.counterparty, amount: '1', status: 'pending', txHash: hash});
}
const drain = () => new Promise<void>(resolve => setImmediate(resolve));
const saved = () => JSON.parse(mockSave.mock.calls.at(-1)![0]);

beforeEach(() => {
  jest.resetModules();
  mockLoad.mockReset().mockResolvedValue(null);
  mockSave.mockReset().mockResolvedValue(undefined);
  history = require('../../src/services/history');
});

it('merges early payments with a delayed disk read before persisting any snapshot', async () => {
  let finish!: (json: string) => void;
  mockLoad.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const initializing = history.initHistory();
  const first = record('first');
  const second = record('second');
  expect(history.getTransactionHistory()).toEqual([second, first]);
  await drain();
  expect(mockSave).not.toHaveBeenCalled();
  finish(JSON.stringify([oldRow]));
  await initializing;
  await drain();
  expect(history.getTransactionHistory()).toEqual([second, first, oldRow]);
  expect(saved()).toEqual([second, first, oldRow]);
  record('third');
  await drain();
  expect(saved().map((row: {txHash: string}) => row.txHash)).toEqual(['third', 'second', 'first', oldRow.txHash]);
});

it('uses one read for overlapping init/get callers and preserves updates to unloaded rows', async () => {
  let finish!: (json: string) => void;
  mockLoad.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const one = history.initHistory();
  const two = history.initHistory();
  history.getTransactionHistory();
  history.updateTransactionStatus(oldRow.txHash.toUpperCase(), 'confirmed');
  expect(mockLoad).toHaveBeenCalledTimes(1);
  finish(JSON.stringify([oldRow]));
  await Promise.all([one, two]);
  await drain();
  expect(history.getTransactionHistory()).toEqual([{...oldRow, status: 'confirmed'}]);
  expect(saved()).toEqual([{...oldRow, status: 'confirmed'}]);
});

it.each([null, '[]', '{bad json', '{}'])('preserves early payments with empty or malformed storage: %s', async stored => {
  mockLoad.mockResolvedValueOnce(stored);
  const row = record('early');
  await history.initHistory();
  await drain();
  expect(history.getTransactionHistory()).toEqual([row]);
  expect(saved()).toEqual([row]);
});

it('retains early payments when storage cannot be read', async () => {
  mockLoad.mockRejectedValueOnce(new Error('Storage unavailable'));
  const row = record('early');
  await history.initHistory();
  await drain();
  expect(history.getTransactionHistory()).toEqual([row]);
  expect(saved()).toEqual([row]);
});

it('recovers the write queue after an encryption/storage error without losing earlier records', async () => {
  mockSave.mockRejectedValueOnce(new Error('Keystore locked'));
  const first = record('first');
  await drain();
  const second = record('second');
  await drain();
  expect(saved()).toEqual([second, first]);
  expect(history.getTransactionHistory()).toEqual([second, first]);
});
