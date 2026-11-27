import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {HCESession, NFCTagType4} from 'react-native-hce';
import ReceiveTapScreen from '../src/screens/ReceiveTapScreen';
import * as tapPayment from '../src/services/tapPayment';
import {stopHceSession} from '../src/services/hce';

const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';
const mockWallet = {address: A, balance: 0n, refreshBalance: jest.fn()};
jest.mock('../src/context/WalletContext', () => ({useWallet: () => mockWallet}));
jest.mock('../src/context/ThemeContext', () => ({useTheme: () => jest.requireActual('../src/theme')}));
jest.mock('../src/services/wallet', () => ({
  withRpcFailover: jest.fn(),
  getActiveRpcUrl: () => 'https://rpc-a.example',
  corroborateLog: async () => 'confirmed',
}));
jest.mock('../src/services/nfcReader', () => ({
  initNfc: async () => true, isNfcSupported: async () => true, isNfcEnabled: async () => true,
}));
jest.mock('../src/services/history', () => ({recordTransaction: jest.fn()}));
jest.mock('../src/services/registry', () => ({reverseResolveAddress: jest.fn()}));
jest.mock('../src/components/NfcWaitingCard', () => () => null);
jest.mock('../src/components/NfcNotAvailableModal', () => () => null);
jest.mock('../src/utils/haptics', () => ({triggerHaptic: {notificationSuccess: jest.fn()}}));

const session = {enabled: false, setApplication: jest.fn(), setEnabled: jest.fn()};
const navigation = {setOptions: jest.fn(), replace: jest.fn(), goBack: jest.fn(), navigate: jest.fn()};
let content = '';
let tree: TestRenderer.ReactTestRenderer | undefined;

beforeEach(() => {
  jest.useFakeTimers({doNotFake: ['queueMicrotask']});
  jest.setSystemTime(0);
  jest.clearAllMocks();
  session.enabled = false;
  mockWallet.address = A;
  (HCESession.getInstance as jest.Mock).mockResolvedValue(session);
  (NFCTagType4 as unknown as jest.Mock).mockImplementation(props => ({content: props}));
  session.setApplication.mockImplementation(async tag => { content = tag.content.content; });
  session.setEnabled.mockImplementation(async enabled => { session.enabled = enabled; });
  jest.spyOn(tapPayment, 'waitForIncomingPayment').mockImplementation(() => new Promise(() => {}));
});
afterEach(async () => {
  try {
    await act(async () => { tree?.unmount(); });
    await act(async () => { await stopHceSession(); await jest.advanceTimersByTimeAsync(600); });
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    tree = undefined;
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  }
});
async function advance(ms: number) {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}
async function mount(address: string) {
  mockWallet.address = address;
  await act(async () => { tree = TestRenderer.create(<ReceiveTapScreen navigation={navigation as never} />); });
}
async function unmount() {
  await act(async () => { tree!.unmount(); });
  tree = undefined;
}

it('keeps B enabled with B\'s address when cancelled A finishes starting', async () => {
  await mount(A);
  await advance(100);
  expect(session.enabled).toBe(true);
  await unmount();
  expect(session.enabled).toBe(false);
  await mount(B);
  await advance(100);
  expect(content).toMatch(new RegExp(`^tappay://tap/${B}\\?s=[0-9a-f]{32}$`));
  expect(session.enabled).toBe(true);
  const writes = session.setEnabled.mock.calls.length;
  await advance(400);
  expect(session.setEnabled).toHaveBeenCalledTimes(writes);
  expect(session.enabled).toBe(true);
  expect(content).toMatch(new RegExp(`^tappay://tap/${B}\\?s=[0-9a-f]{32}$`));
  await advance(100);
  expect(tapPayment.waitForIncomingPayment).toHaveBeenCalledTimes(1);
  expect((tapPayment.waitForIncomingPayment as jest.Mock).mock.calls[0][0]).toBe(B);
  expect(session.enabled).toBe(true);
}, 30_000);

it('keeps B enabled after non-overlapping receive sessions', async () => {
  await mount(A);
  await advance(600);
  expect(session.enabled).toBe(true);
  await unmount();
  await mount(B);
  await advance(600);
  expect(content).toMatch(new RegExp(`^tappay://tap/${B}\\?s=[0-9a-f]{32}$`));
  expect(session.enabled).toBe(true);
  expect(tapPayment.waitForIncomingPayment).toHaveBeenCalledTimes(2);
});
