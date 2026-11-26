import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Alert, Text} from 'react-native';
import {ethers} from 'ethers';
import SendTapScreen from '../src/screens/SendTapScreen';
import ConfirmPaymentModal from '../src/components/ConfirmPaymentModal';
import PressableScale from '../src/components/PressableScale';
import {isNfcSupported} from '../src/services/nfcReader';
import {broadcastTapPayment} from '../src/services/tapPayment';
import {recordTransaction} from '../src/services/history';

jest.mock('../src/context/WalletContext', () => ({useWallet: () => ({
  address: '0x1111111111111111111111111111111111111111',
  balance: 100n * 10n ** 18n,
  refreshBalance: jest.fn(),
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
  isNfcSupported: jest.fn(), isNfcEnabled: jest.fn().mockResolvedValue(true), openNfcSettings: jest.fn(),
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
let tree: TestRenderer.ReactTestRenderer;

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers({doNotFake: ['queueMicrotask']});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(isNfcSupported).mockResolvedValue(true);
  jest.mocked(broadcastTapPayment).mockResolvedValue({txHash: HASH});
  await act(async () => { tree = TestRenderer.create(<SendTapScreen navigation={navigation as never} />); });
});

afterEach(async () => {
  await act(async () => { tree.unmount(); });
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function button(label: string) {
  return tree.root.findAllByType(PressableScale).find(node =>
    node.findAllByType(Text).some(text => text.props.children === label),
  )!;
}

async function enter(value: string) {
  for (const key of value) {
    await act(async () => { button(key).props.onPress(); });
  }
}

it('records the confirmed wei amount, not edits made during NFC setup', async () => {
  let supported!: (value: boolean) => void;
  jest.mocked(isNfcSupported).mockReturnValueOnce(new Promise(resolve => { supported = resolve; }));
  await enter('1');
  let arming!: Promise<void>;
  await act(async () => { arming = button('Pay').props.onPress(); });
  await enter('0');
  await act(async () => { supported(true); await arming; });
  const confirmation = tree.root.findByType(ConfirmPaymentModal);
  expect(confirmation.props.amountWei).toBe(ethers.parseEther('1'));
  await act(async () => { await confirmation.props.onConfirm(); });
  expect(broadcastTapPayment).toHaveBeenCalledWith(expect.any(String), ethers.parseEther('1'));
  expect(recordTransaction).toHaveBeenCalledWith(expect.objectContaining({amount: '1.0', txHash: HASH}));
  expect(navigation.replace).toHaveBeenCalledWith('TransactionStatus', expect.objectContaining({amount: '1.0', txHash: HASH}));
});

it('preserves the exact fractional amount on an ordinary successful payment', async () => {
  await enter('0.000001');
  await act(async () => { await button('Pay').props.onPress(); });
  await act(async () => { await tree.root.findByType(ConfirmPaymentModal).props.onConfirm(); });
  expect(broadcastTapPayment).toHaveBeenCalledWith(expect.any(String), ethers.parseEther('0.000001'));
  expect(recordTransaction).toHaveBeenCalledWith(expect.objectContaining({amount: '0.000001'}));
  expect(navigation.replace).toHaveBeenCalledWith('TransactionStatus', expect.objectContaining({amount: '0.000001'}));
});

it('does not create a receipt or history entry for a failed broadcast', async () => {
  jest.mocked(broadcastTapPayment).mockResolvedValueOnce({txHash: null, error: 'Rejected'});
  await enter('1');
  await act(async () => { await button('Pay').props.onPress(); });
  await act(async () => { await tree.root.findByType(ConfirmPaymentModal).props.onConfirm(); });
  expect(recordTransaction).not.toHaveBeenCalled();
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Payment Failed', 'Rejected', expect.any(Array));
});
