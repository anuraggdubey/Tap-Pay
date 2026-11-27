/**
 * #123: a payment log reported by one endpoint counts only when another endpoint has a successful
 * receipt for the same transaction with the same log at the same index.
 */
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  hasGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  canImplyAuthentication: jest.fn(),
  getSupportedBiometryType: jest.fn(),
  AUTHENTICATION_TYPE: {},
  ACCESS_CONTROL: {},
  SECURITY_LEVEL: {},
  STORAGE_TYPE: {},
  ACCESSIBLE: {},
}));

import {ethers} from 'ethers';
import {corroborateLog, getDefaultRpcEndpoints, setCustomRpc} from '../../src/services/wallet';

const TX = '0x' + 'ab'.repeat(32);
const LOG = {
  address: '0x03907aE845E016f5F1605BAE4e6392C3491e03f1',
  topics: ['0x' + '11'.repeat(32), '0x' + '22'.repeat(32)],
  data: '0x' + '33'.repeat(32),
  index: 2,
};
type FakeReceipt = {status: number; logs: Array<typeof LOG>} | null | Error;

let byHost: Record<string, FakeReceipt>;
const [A, B, C] = getDefaultRpcEndpoints();

beforeEach(() => {
  byHost = {};
  jest
    .spyOn(ethers.JsonRpcProvider.prototype, 'getTransactionReceipt')
    .mockImplementation(async function (this: any) {
      const r = byHost[this._getConnection().url];
      if (r instanceof Error) {
        throw r;
      }
      return r as any;
    });
});
afterEach(() => jest.restoreAllMocks());

const ok = (logs = [LOG]) => ({status: 1, logs});

it('needs at least three default endpoints for this test', () => {
  expect([A, B, C].every(Boolean)).toBe(true);
});

it('endpoint A reports the log but B and C have no receipt: not corroborated', async () => {
  byHost = {[A]: ok(), [B]: null, [C]: null};
  await expect(corroborateLog(TX, LOG, A)).resolves.toBe('pending');
});

it('never asks the endpoint that reported the log', async () => {
  byHost = {[A]: ok(), [B]: new Error('down'), [C]: new Error('down')};
  await expect(corroborateLog(TX, LOG, A)).resolves.toBe('pending');
});

it('confirms when another endpoint has the same log at the same index', async () => {
  byHost = {[B]: ok([{...LOG, address: LOG.address.toLowerCase()}])};
  await expect(corroborateLog(TX, LOG, A)).resolves.toBe('confirmed');
});

it.each([
  ['a failed receipt', {status: 0, logs: [LOG]}],
  ['a different amount (data)', ok([{...LOG, data: '0x' + '44'.repeat(32)}])],
  ['a different recipient (topic)', ok([{...LOG, topics: [LOG.topics[0], '0x' + '55'.repeat(32)]}])],
  ['another contract', ok([{...LOG, address: '0x' + '66'.repeat(20)}])],
  ['another log index', ok([{...LOG, index: 3}])],
  ['no logs', ok([])],
])('rejects %s on the other endpoint', async (_label, receipt) => {
  byHost = {[B]: receipt as FakeReceipt};
  await expect(corroborateLog(TX, LOG, A)).resolves.toBe('mismatch');
});

it("trusts the user's own RPC alone (same rule as sent payments)", async () => {
  jest.spyOn(ethers.JsonRpcProvider.prototype, 'send').mockResolvedValue('0x8f'); // chain 143
  await expect(setCustomRpc('https://node.example.com')).resolves.toEqual({ok: true});
  try {
    byHost = {};
    await expect(corroborateLog(TX, LOG, 'https://node.example.com')).resolves.toBe('confirmed');
  } finally {
    await setCustomRpc(null);
  }
});
