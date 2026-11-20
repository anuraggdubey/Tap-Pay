import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Alert} from 'react-native';
import ReceiveTapScreen from '../src/screens/ReceiveTapScreen';

const ADDRESS = '0x1111111111111111111111111111111111111111';
const mockWallet = {address: ADDRESS, balance: 0n, refreshBalance: jest.fn()};
const mockInit = jest.fn();
const mockSupported = jest.fn();
const mockNfcEnabled = jest.fn();
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockWait = jest.fn();
let mockAdvertising = false;

jest.mock('../src/context/WalletContext', () => ({useWallet: () => mockWallet}));
jest.mock('../src/context/ThemeContext', () => ({useTheme: () => jest.requireActual('../src/theme')}));
jest.mock('../src/services/nfcReader', () => ({
  initNfc: () => mockInit(), isNfcSupported: () => mockSupported(), isNfcEnabled: () => mockNfcEnabled(), openNfcSettings: jest.fn(),
}));
jest.mock('../src/services/tapPayment', () => ({
  startReceiverBroadcast: (...args: unknown[]) => mockStart(...args),
  stopReceiverBroadcast: () => mockStop(),
  waitForIncomingPayment: (...args: unknown[]) => mockWait(...args),
}));
jest.mock('../src/services/registry', () => ({reverseResolveAddress: jest.fn()}));
jest.mock('../src/services/history', () => ({recordTransaction: jest.fn()}));
jest.mock('../src/utils/haptics', () => ({triggerHaptic: {notificationSuccess: jest.fn()}}));

const navigation = {setOptions: jest.fn(), replace: jest.fn(), goBack: jest.fn(), navigate: jest.fn()};
let tree: TestRenderer.ReactTestRenderer | undefined;

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>(resolveValue => { resolve = resolveValue; });
  return {promise, resolve};
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockWallet.address = ADDRESS;
  mockAdvertising = false;
  mockInit.mockResolvedValue(true);
  mockSupported.mockResolvedValue(true);
  mockNfcEnabled.mockResolvedValue(true);
  mockStart.mockImplementation(async () => { mockAdvertising = true; return true; });
  mockStop.mockImplementation(async () => { mockAdvertising = false; });
  mockWait.mockImplementation(() => new Promise(() => {}));
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(async () => {
  await act(async () => { tree?.unmount(); });
  tree = undefined;
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function mount() {
  await act(async () => { tree = TestRenderer.create(<ReceiveTapScreen navigation={navigation as never} />); });
}

it.each(['init', 'support', 'enabled'] as const)('does not start HCE if unmounted during %s', async stage => {
  const pending = deferred<boolean>();
  const check = {init: mockInit, support: mockSupported, enabled: mockNfcEnabled}[stage];
  check.mockReturnValueOnce(pending.promise);
  await mount();
  expect(mockStart).not.toHaveBeenCalled();
  await act(async () => { tree!.unmount(); });
  tree = undefined;
  expect(mockStop).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve(true); });
  expect(mockStart).not.toHaveBeenCalled();
  expect(mockWait).not.toHaveBeenCalled();
  expect(mockAdvertising).toBe(false);
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('disables a broadcast that finishes enabling after cleanup', async () => {
  const pending = deferred<boolean>();
  mockStart.mockImplementationOnce(async () => {
    await pending.promise;
    mockAdvertising = true;
    return true;
  });
  await mount();
  expect(mockStart).toHaveBeenCalledTimes(1);
  await act(async () => { tree!.unmount(); });
  tree = undefined;
  expect(mockStop).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve(true); });
  expect(mockStop).toHaveBeenCalledTimes(2);
  expect(mockAdvertising).toBe(false);
  expect(mockWait).not.toHaveBeenCalled();
});

it('does not alert about a failed start after leaving the screen', async () => {
  const pending = deferred<boolean>();
  mockStart.mockReturnValueOnce(pending.promise);
  await mount();
  await act(async () => { tree!.unmount(); });
  tree = undefined;
  await act(async () => { pending.resolve(false); });
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(mockWait).not.toHaveBeenCalled();
  expect(mockAdvertising).toBe(false);
});

it('does not revive an older initialization after an address change', async () => {
  const pending = deferred<boolean>();
  mockInit.mockReturnValueOnce(pending.promise);
  await mount();
  const newAddress = '0x2222222222222222222222222222222222222222';
  mockWallet.address = newAddress;
  await act(async () => { tree!.update(<ReceiveTapScreen navigation={navigation as never} />); });
  expect(mockStart).toHaveBeenCalledTimes(1);
  expect(mockStart.mock.calls[0][0]).toBe(newAddress);
  expect(mockAdvertising).toBe(true);
  await act(async () => { pending.resolve(true); });
  expect(mockStart).toHaveBeenCalledTimes(1);
  expect(mockWait).toHaveBeenCalledTimes(1);
  expect(mockAdvertising).toBe(true);
});

it('still starts and monitors a live receive session', async () => {
  await mount();
  expect(mockStart).toHaveBeenCalledTimes(1);
  expect(mockStart.mock.calls[0][0]).toBe(ADDRESS);
  expect(mockWait).toHaveBeenCalledTimes(1);
  expect(mockWait.mock.calls[0][0]).toBe(ADDRESS);
  expect(mockAdvertising).toBe(true);
});

it.each(['unsupported', 'disabled'])('does not start with NFC %s', async status => {
  if (status === 'unsupported') mockSupported.mockResolvedValueOnce(false);
  else mockNfcEnabled.mockResolvedValueOnce(false);
  await mount();
  expect(mockStart).not.toHaveBeenCalled();
  expect(mockWait).not.toHaveBeenCalled();
  expect(mockAdvertising).toBe(false);
});

it('reports a failed live broadcast without starting the monitor', async () => {
  mockStart.mockResolvedValueOnce(false);
  await mount();
  expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to start NFC broadcast.');
  expect(mockWait).not.toHaveBeenCalled();
  expect(mockAdvertising).toBe(false);
});
