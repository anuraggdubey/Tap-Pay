import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Alert, Text} from 'react-native';
import {HCESession} from 'react-native-hce';
import ReceiveTapScreen from '../src/screens/ReceiveTapScreen';
import PressableScale from '../src/components/PressableScale';
import * as tapPayment from '../src/services/tapPayment';
import {stopHceSession, startHceReceiverSession} from '../src/services/hce';
import {SESSION_TIMEOUT_MS} from '../src/config/monad';

const mockWallet = {address: '0x1111111111111111111111111111111111111111', balance: 0n, refreshBalance: jest.fn()};
const mockProvider = {
  getBlockNumber: jest.fn(), getLogs: jest.fn(),
  get provider(): {getLogs: jest.Mock} { return this; },
};
const mockInit = jest.fn();
const mockSupported = jest.fn();
const mockEnabled = jest.fn();
const mockHistory = jest.fn();
const mockReverse = jest.fn();
jest.mock('../src/context/WalletContext', () => ({useWallet: () => mockWallet}));
jest.mock('../src/context/ThemeContext', () => ({useTheme: () => jest.requireActual('../src/theme')}));
jest.mock('../src/services/wallet', () => ({withRpcFailover: (callback: (p: unknown) => unknown) => callback(mockProvider)}));
jest.mock('../src/services/nfcReader', () => ({
  initNfc: () => mockInit(), isNfcSupported: () => mockSupported(), isNfcEnabled: () => mockEnabled(), openNfcSettings: jest.fn(),
}));
jest.mock('../src/services/registry', () => ({reverseResolveAddress: (...args: unknown[]) => mockReverse(...args)}));
jest.mock('../src/services/history', () => ({recordTransaction: (...args: unknown[]) => mockHistory(...args)}));
jest.mock('../src/utils/haptics', () => ({triggerHaptic: {notificationSuccess: jest.fn()}}));

const session = {
  enabled: false,
  setApplication: jest.fn(),
  setEnabled: jest.fn(),
};
const navigation = {setOptions: jest.fn(), replace: jest.fn(), goBack: jest.fn(), navigate: jest.fn()};
let tree: TestRenderer.ReactTestRenderer | undefined;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(0);
  jest.clearAllMocks();
  session.enabled = false;
  session.setApplication.mockResolvedValue(undefined);
  session.setEnabled.mockImplementation(async (enabled: boolean) => { session.enabled = enabled; });
  (HCESession.getInstance as jest.Mock).mockResolvedValue(session);
  mockInit.mockResolvedValue(true);
  mockSupported.mockResolvedValue(true);
  mockEnabled.mockResolvedValue(true);
  mockProvider.getBlockNumber.mockResolvedValue(100);
  mockProvider.getLogs.mockResolvedValue([]);
  mockReverse.mockResolvedValue(null);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => {
  await act(async () => { tree?.unmount(); await stopHceSession(); });
  tree = undefined;
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function mount() {
  await act(async () => { tree = TestRenderer.create(<ReceiveTapScreen navigation={navigation as never} />); });
  await advance(600);
}
async function advance(ms: number) {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}
function hasText(value: string) {
  return tree?.root.findAllByType(Text).some(node => node.props.children === value);
}

it('advertises and monitors past 60s, expires both at the shared deadline, and restarts', async () => {
  await mount();
  expect(session.enabled).toBe(true);
  await advance(60_000);
  expect(session.enabled).toBe(true);
  expect(hasText('Session expired')).toBe(false);
  const scans = mockProvider.getLogs.mock.calls.length;
  await advance(SESSION_TIMEOUT_MS - 60_000 - 600);
  expect(session.enabled).toBe(false);
  expect(hasText('Session expired')).toBe(true);
  expect(hasText('NFC Off')).toBe(true);
  expect(mockProvider.getLogs.mock.calls.length).toBeGreaterThan(scans);
  const finalScans = mockProvider.getLogs.mock.calls.length;
  await advance(5000);
  expect(mockProvider.getLogs).toHaveBeenCalledTimes(finalScans);
  const restart = tree!.root.findAllByType(PressableScale).find(node => node.props.accessibilityLabel === 'Restart receive session');
  await act(async () => { restart!.props.onPress(); });
  await advance(600);
  expect(session.enabled).toBe(true);
  expect(hasText('Session expired')).toBe(false);
  await advance(SESSION_TIMEOUT_MS - 600);
  expect(session.enabled).toBe(false);
  expect(hasText('Session expired')).toBe(true);
});

it('disables HCE on an early monitor timeout', async () => {
  jest.spyOn(tapPayment, 'waitForIncomingPayment').mockResolvedValueOnce({detected: false});
  await mount();
  expect(session.enabled).toBe(false);
  expect(hasText('Session expired')).toBe(true);
});

it('disables HCE and offers restart after a monitoring error', async () => {
  jest.spyOn(tapPayment, 'waitForIncomingPayment').mockRejectedValueOnce(new Error('monitor failed'));
  await mount();
  expect(session.enabled).toBe(false);
  expect(hasText('Session expired')).toBe(true);
  expect(Alert.alert).toHaveBeenCalledWith('Receive session ended', expect.any(String));
});

it('stops broadcasting before processing a detected payment', async () => {
  jest.spyOn(tapPayment, 'waitForIncomingPayment').mockResolvedValueOnce({
    detected: true, txHash: '0xpayment', senderAddress: mockWallet.address, amountDisplay: '1', tokenSymbol: 'MON',
  });
  await mount();
  expect(session.enabled).toBe(false);
  expect(mockHistory).toHaveBeenCalledWith(expect.objectContaining({txHash: '0xpayment'}));
  expect(navigation.replace).toHaveBeenCalledWith('TransactionStatus', expect.objectContaining({txHash: '0xpayment'}));
  expect(hasText('Session expired')).toBe(false);
  await advance(SESSION_TIMEOUT_MS);
  expect(session.enabled).toBe(false);
  expect(hasText('Session expired')).toBe(false);
});

it('aborts the monitor and disables HCE on unmount', async () => {
  await mount();
  await act(async () => { tree!.unmount(); });
  tree = undefined;
  expect(session.enabled).toBe(false);
  const scans = mockProvider.getLogs.mock.calls.length;
  await advance(SESSION_TIMEOUT_MS);
  expect(mockProvider.getLogs).toHaveBeenCalledTimes(scans);
  expect(navigation.replace).not.toHaveBeenCalled();
});

it('expires even when the initial RPC never resolves', async () => {
  mockProvider.getBlockNumber.mockReturnValueOnce(new Promise(() => {}));
  await mount();
  expect(session.enabled).toBe(true);
  await advance(SESSION_TIMEOUT_MS - 600);
  expect(session.enabled).toBe(false);
  expect(hasText('Session expired')).toBe(true);
});

it('handles NFC initialization failure without an unhandled rejection', async () => {
  mockInit.mockRejectedValueOnce(new Error('NFC unavailable'));
  await mount();
  expect(session.enabled).toBe(false);
  expect(hasText('Session expired')).toBe(true);
});

it.each(['unsupported', 'disabled'])('does not advertise when NFC is %s', async status => {
  if (status === 'unsupported') mockSupported.mockResolvedValueOnce(false);
  else mockEnabled.mockResolvedValueOnce(false);
  await mount();
  expect(session.setEnabled).not.toHaveBeenCalledWith(true);
  expect(hasText('Session expired')).toBe(true);
});

it('does not enable HCE if startup outlives its deadline', async () => {
  const pending = startHceReceiverSession(mockWallet.address, Date.now() + 50);
  await advance(100);
  expect(await pending).toBe(false);
  expect(session.setEnabled).not.toHaveBeenCalledWith(true);
});
