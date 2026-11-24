import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Alert, Text} from 'react-native';
import SendTapScreen from '../src/screens/SendTapScreen';
import ConfirmPaymentModal from '../src/components/ConfirmPaymentModal';
import PressableScale from '../src/components/PressableScale';
import {broadcastTapPayment} from '../src/services/tapPayment';
import {recordTransaction} from '../src/services/history';

const mockRefresh = jest.fn();
jest.mock('../src/context/WalletContext', () => ({useWallet: () => ({
  address: '0x1111111111111111111111111111111111111111', balance: 10n ** 20n, refreshBalance: mockRefresh,
})}));
jest.mock('../src/context/ThemeContext', () => ({useTheme: () => ({
  colors: jest.requireActual('../src/theme').darkColors, isDark: true,
})}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 0, bottom: 0})}));
jest.mock('../src/services/wallet', () => ({
  checkSufficientBalance: jest.fn().mockResolvedValue({canAfford: true}),
  estimateGasCost: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/services/nfcReader', () => ({
  isNfcSupported: jest.fn().mockResolvedValue(true), isNfcEnabled: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/services/tapPayment', () => ({
  cancelTapSession: jest.fn().mockResolvedValue(undefined),
  readTapRecipient: jest.fn().mockResolvedValue({recipient: {receiverAddress: '0x2222222222222222222222222222222222222222'}}),
  broadcastTapPayment: jest.fn(),
}));
jest.mock('../src/services/history', () => ({recordTransaction: jest.fn()}));
jest.mock('../src/components/ConfirmPaymentModal', () => 'ConfirmPaymentModal');
jest.mock('../src/components/NfcWaitingCard', () => 'NfcWaitingCard');
jest.mock('../src/components/AmbientBackground', () => 'AmbientBackground');
jest.mock('../src/utils/haptics', () => ({triggerHaptic: {
  selection: jest.fn(), impactMedium: jest.fn(), notificationSuccess: jest.fn(), notificationError: jest.fn(),
}}));

const HASH = '0x' + 'ab'.repeat(32);
const navigation = {setOptions: jest.fn(), replace: jest.fn(), goBack: jest.fn()};
let tree: TestRenderer.ReactTestRenderer | undefined;
let complete: (result: {txHash: string | null; error?: string}) => void;
let sending: Promise<void>;

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers({doNotFake: ['queueMicrotask']});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(broadcastTapPayment).mockReturnValue(new Promise(resolve => { complete = resolve; }));
  await act(async () => { tree = TestRenderer.create(<SendTapScreen navigation={navigation as never} />); });
  const button = (label: string) => tree!.root.findAllByType(PressableScale).find(node =>
    node.findAllByType(Text).some(text => text.props.children === label),
  )!;
  await act(async () => { button('1').props.onPress(); });
  await act(async () => { await button('Pay').props.onPress(); });
  await act(async () => { sending = tree!.root.findByType(ConfirmPaymentModal).props.onConfirm(); });
});

afterEach(async () => {
  await act(async () => { tree?.unmount(); });
  tree = undefined;
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('persists the returned hash after unmount without navigating or updating the old screen', async () => {
  await act(async () => { tree!.unmount(); });
  tree = undefined;
  await act(async () => { complete({txHash: HASH}); await sending; });
  expect(recordTransaction).toHaveBeenCalledTimes(1);
  expect(recordTransaction).toHaveBeenCalledWith(expect.objectContaining({txHash: HASH, status: 'pending', direction: 'sent'}));
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(mockRefresh).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
});

it('records and navigates once when the sender remains mounted', async () => {
  await act(async () => { complete({txHash: HASH}); await sending; });
  expect(recordTransaction).toHaveBeenCalledTimes(1);
  expect(navigation.replace).toHaveBeenCalledTimes(1);
  expect(mockRefresh).toHaveBeenCalledTimes(1);
});

it('does not invent a history entry or show an error on the unmounted screen after failure', async () => {
  await act(async () => { tree!.unmount(); });
  tree = undefined;
  await act(async () => { complete({txHash: null, error: 'Cancelled'}); await sending; });
  expect(recordTransaction).not.toHaveBeenCalled();
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
});
