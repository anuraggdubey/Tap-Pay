import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Alert, Animated, Text, TouchableOpacity} from 'react-native';
import AccountInfoScreen from '../src/screens/AccountInfoScreen';
import TransactionStatusScreen from '../src/screens/TransactionStatusScreen';

const PHRASE = 'test-only phrase not a real recovery phrase';
const HASH = '0x' + 'a'.repeat(64);
const mockWallet = {
  address: '0x1111111111111111111111111111111111111111', username: 'alice', balance: 0n,
  revealRecoveryPhrase: jest.fn(), saveUsername: jest.fn(), refreshBalance: jest.fn(),
};
const mockWaitForReceipt = jest.fn();
const mockUpdateStatus = jest.fn();

jest.mock('../src/context/WalletContext', () => ({useWallet: () => mockWallet}));
jest.mock('../src/context/ThemeContext', () => ({useTheme: () => jest.requireActual('../src/theme')}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})}));
jest.mock('../src/services/wallet', () => ({waitForReceipt: (...args: unknown[]) => mockWaitForReceipt(...args), getBalance: jest.fn()}));
jest.mock('../src/services/history', () => ({updateTransactionStatus: (...args: unknown[]) => mockUpdateStatus(...args)}));
jest.mock('../src/services/registry', () => ({resolveUsername: jest.fn(), registerUsername: jest.fn()}));
jest.mock('../src/utils/haptics', () => ({triggerHaptic: {impactMedium: jest.fn(), notificationError: jest.fn(), notificationSuccess: jest.fn()}}));

const navigation = {setOptions: jest.fn(), goBack: jest.fn(), navigate: jest.fn(), popToTop: jest.fn()};
let tree: TestRenderer.ReactTestRenderer | undefined;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockWallet.username = 'alice';
  mockWallet.revealRecoveryPhrase.mockResolvedValue(PHRASE);
  mockWaitForReceipt.mockResolvedValue({confirmed: true});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const animation = {
    start: jest.fn((callback?: (result: {finished: boolean}) => void) => callback?.({finished: true})),
    stop: jest.fn(), reset: jest.fn(),
  };
  jest.spyOn(Animated, 'timing').mockReturnValue(animation);
  jest.spyOn(Animated, 'spring').mockReturnValue(animation);
});

afterEach(async () => {
  await act(async () => { tree?.unmount(); });
  tree = undefined;
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function revealPhrase() {
  await act(async () => { tree = TestRenderer.create(<AccountInfoScreen navigation={navigation as never} />); });
  const button = tree!.root.findAllByType(TouchableOpacity).find(node =>
    node.findAllByType(Text).some(text => text.props.children === 'Show Recovery Phrase'))!;
  act(() => { button.props.onPress(); });
  const buttons = jest.mocked(Alert.alert).mock.calls[0][2]!;
  await act(async () => { await buttons.find(item => item.text === 'Authenticate & Reveal')!.onPress!(); });
}

function transactionScreen(txHash = HASH, initialStatus?: 'confirmed') {
  const route = {params: {txHash, amount: '1', recipient: mockWallet.address, initialStatus}};
  return <TransactionStatusScreen navigation={navigation as never} route={route as never} />;
}

it('hides a revealed phrase after 30 seconds even across unrelated renders', async () => {
  await revealPhrase();
  expect(JSON.stringify(tree!.toJSON())).toContain(PHRASE);
  act(() => { jest.advanceTimersByTime(29_999); });
  mockWallet.username = 'bob';
  await act(async () => { tree!.update(<AccountInfoScreen navigation={navigation as never} />); });
  act(() => { jest.advanceTimersByTime(1); });
  expect(JSON.stringify(tree!.toJSON())).not.toContain(PHRASE);
  expect(mockWallet.revealRecoveryPhrase).toHaveBeenCalledTimes(1);
});

it('does not show an empty or cancelled phrase result', async () => {
  mockWallet.revealRecoveryPhrase.mockResolvedValueOnce(null);
  await revealPhrase();
  expect(JSON.stringify(tree!.toJSON())).not.toContain(PHRASE);
  expect(Alert.alert).toHaveBeenLastCalledWith('Not available', expect.any(String));
});

it('does not reveal a phrase after authentication errors', async () => {
  mockWallet.revealRecoveryPhrase.mockRejectedValueOnce(new Error('authentication failed'));
  await revealPhrase();
  expect(JSON.stringify(tree!.toJSON())).not.toContain(PHRASE);
  expect(Alert.alert).toHaveBeenLastCalledWith('Error', 'Could not retrieve the recovery phrase.');
});

it('confirms a receipt once without restarting the effect on unrelated renders', async () => {
  await act(async () => { tree = TestRenderer.create(transactionScreen()); });
  mockWallet.username = 'bob';
  await act(async () => { tree!.update(transactionScreen()); });
  expect(mockWaitForReceipt).toHaveBeenCalledTimes(1);
  expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
  expect(mockUpdateStatus).toHaveBeenCalledWith(HASH, 'confirmed');
  expect(mockWallet.refreshBalance).toHaveBeenCalledTimes(1);
});

it('does not poll a finalized placeholder transaction', async () => {
  await act(async () => { tree = TestRenderer.create(transactionScreen('tap-payment', 'confirmed')); });
  expect(mockWaitForReceipt).not.toHaveBeenCalled();
  expect(mockUpdateStatus).not.toHaveBeenCalled();
  expect(mockWallet.refreshBalance).not.toHaveBeenCalled();
});

it('records a rejected receipt once without restarting the effect', async () => {
  mockWaitForReceipt.mockResolvedValueOnce({confirmed: false, error: 'Receipt rejected'});
  await act(async () => { tree = TestRenderer.create(transactionScreen()); });
  await act(async () => { tree!.update(transactionScreen()); });
  expect(mockWaitForReceipt).toHaveBeenCalledTimes(1);
  expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
  expect(mockUpdateStatus).toHaveBeenCalledWith(HASH, 'failed');
  expect(JSON.stringify(tree!.toJSON())).toContain('Receipt rejected');
});

it('handles receipt polling errors without an effect loop', async () => {
  mockWaitForReceipt.mockRejectedValueOnce(new Error('RPC unavailable'));
  await act(async () => { tree = TestRenderer.create(transactionScreen()); });
  await act(async () => { tree!.update(transactionScreen()); });
  expect(mockWaitForReceipt).toHaveBeenCalledTimes(1);
  expect(mockUpdateStatus).toHaveBeenCalledTimes(1);
  expect(mockUpdateStatus).toHaveBeenCalledWith(HASH, 'failed');
  expect(JSON.stringify(tree!.toJSON())).toContain('RPC unavailable');
});
