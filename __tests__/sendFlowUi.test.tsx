import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {Alert, Text, TextInput} from 'react-native';

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({
    colors: jest.requireActual('../src/theme').darkColors,
    glass: jest.requireActual('../src/theme').darkGlass,
    isDark: true,
    setDarkMode: jest.fn(),
  }),
}));
jest.mock('../src/utils/haptics', () => ({
  triggerHaptic: {selection: jest.fn(), impactMedium: jest.fn(), notificationSuccess: jest.fn(), notificationError: jest.fn()},
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));
jest.mock('@react-native-clipboard/clipboard', () => ({__esModule: true, default: {setString: jest.fn()}}));
const mockResolve = jest.fn();
jest.mock('../src/services/registry', () => ({resolveUsernameDetails: (...a: unknown[]) => mockResolve(...a)}));
jest.mock('../src/context/WalletContext', () => ({
  useWallet: () => ({address: '0x1111111111111111111111111111111111111111', balance: 5n * 10n ** 18n, refreshBalance: jest.fn()}),
}));
jest.mock('@react-navigation/native', () => ({useRoute: () => ({name: 'SendPayment'})}));
jest.mock('../src/services/wallet', () => ({
  checkSufficientBalance: jest.fn(),
  estimateGasCost: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/services/crossBorder/transferService', () => ({executeCrossBorderTransfer: jest.fn()}));
jest.mock('../src/services/history', () => ({recordTransaction: jest.fn(), getTransactionHistory: jest.fn(() => [])}));

import Clipboard from '@react-native-clipboard/clipboard';
import SendPaymentScreen from '../src/screens/SendPaymentScreen';
import InsufficientBalanceModal from '../src/components/InsufficientBalanceModal';
import ConfirmPaymentModal from '../src/components/ConfirmPaymentModal';

let tree: ReactTestRenderer.ReactTestRenderer;
const texts = () => tree.root.findAllByType(Text).map(n => String(n.props.children));
const has = (s: string) => texts().some(t => t.includes(s));
function press(label: string) {
  let node: any = tree.root.findAllByType(Text).find(n => n.props.children === label);
  expect(node).toBeTruthy();
  while (node && !node.props.onPress) {
    node = node.parent;
  }
  return act(async () => {
    await node.props.onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  act(() => tree?.unmount());
  jest.restoreAllMocks();
});

describe('Send Payment screen', () => {
  const navigation = {setOptions: jest.fn(), navigate: jest.fn(), goBack: jest.fn()};

  it('asks for a recipient and switches between @username and address', async () => {
    await act(async () => {
      tree = ReactTestRenderer.create(<SendPaymentScreen navigation={navigation as never} />);
    });
    expect(has('Send')).toBe(true);
    expect(has('@Username')).toBe(true);
    expect(has('Search')).toBe(true);
    await press('Address');
    expect(has('Verify')).toBe(true);
  });

  it('moves to amount entry once a username resolves, showing the handle and keypad', async () => {
    mockResolve.mockResolvedValue({address: '0x2222222222222222222222222222222222222222', registeredAt: null});
    await act(async () => {
      tree = ReactTestRenderer.create(<SendPaymentScreen navigation={navigation as never} />);
    });
    await act(async () => {
      tree.root.findByType(TextInput).props.onChangeText('rhea');
    });
    await press('Search');
    expect(mockResolve).toHaveBeenCalledWith('rhea');
    expect(has('@rhea')).toBe(true);
    expect(has('Pay')).toBe(true);
    await press('7');
    expect(has('7')).toBe(true);
  });

  it('rejects an invalid address without leaving the recipient step', async () => {
    await act(async () => {
      tree = ReactTestRenderer.create(<SendPaymentScreen navigation={navigation as never} />);
    });
    await press('Address');
    await act(async () => {
      tree.root.findByType(TextInput).props.onChangeText('nope');
    });
    await press('Verify');
    expect(Alert.alert).toHaveBeenCalledWith('Invalid Address', expect.any(String));
    expect(has('Verify')).toBe(true);
  });
});

describe('Insufficient balance modal', () => {
  it('shows the shortfall and copies the address with the real clipboard module', async () => {
    await act(async () => {
      tree = ReactTestRenderer.create(
        <InsufficientBalanceModal
          visible
          onClose={jest.fn()}
          requiredWei={3n * 10n ** 18n}
          currentBalanceWei={10n ** 18n}
          userAddress="0x1111111111111111111111111111111111111111"
        />,
      );
    });
    expect(has('Not Enough MON')).toBe(true);
    await press('Copy Wallet Address');
    expect(Clipboard.setString).toHaveBeenCalledWith('0x1111111111111111111111111111111111111111');
  });
});

describe('Confirm payment modal', () => {
  it('shows recipient, fee and total, and confirms or cancels', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await act(async () => {
      tree = ReactTestRenderer.create(
        <ConfirmPaymentModal
          visible
          onConfirm={onConfirm}
          onCancel={onCancel}
          recipient="0x2222222222222222222222222222222222222222"
          recipientUsername="rhea"
          amountWei={0n}
          gasCostWei={10n ** 15n}
          tokenSymbol="USDC"
          displayAmount="25"
        />,
      );
    });
    expect(has('Confirm Payment')).toBe(true);
    expect(has('rhea')).toBe(true);
    expect(has('25 USDC')).toBe(true);
    await press('Confirm & Pay');
    expect(onConfirm).toHaveBeenCalled();
    await press('Cancel');
    expect(onCancel).toHaveBeenCalled();
  });
});
