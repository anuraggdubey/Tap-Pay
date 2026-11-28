import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {Alert, Text, TextInput, TouchableOpacity} from 'react-native';
import SendPaymentScreen from '../src/screens/SendPaymentScreen';
import UsernamePayScreen from '../src/screens/UsernamePayScreen';
import ConfirmPaymentModal from '../src/components/ConfirmPaymentModal';
import {resolveUsernameDetails} from '../src/services/registry';
import {sendTokenTransfer} from '../src/services/tokens/tokenTransfer';
import {checkSufficientBalance} from '../src/services/wallet';
import {recordTransaction} from '../src/services/history';

jest.mock('@react-navigation/native', () => ({useRoute: () => ({name: 'Pay'})}));
jest.mock('../src/context/WalletContext', () => ({
  useWallet: () => ({
    address: '0x3333333333333333333333333333333333333333',
    balance: 1000000000000000000n,
    refreshBalance: jest.fn(),
  }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({colors: jest.requireActual('../src/theme').lightColors}),
}));
jest.mock('../src/services/registry', () => ({resolveUsernameDetails: jest.fn()}));
jest.mock('../src/services/tokens/tokenTransfer', () => ({sendTokenTransfer: jest.fn()}));
jest.mock('../src/services/tokens/tokenBalance', () => ({}));
jest.mock('../src/services/wallet', () => ({
  checkSufficientBalance: jest.fn(),
  estimateGasCost: jest.fn(),
}));
jest.mock('../src/services/history', () => ({recordTransaction: jest.fn(), getTransactionHistory: jest.fn(() => [])}));
jest.mock('../src/components/ConfirmPaymentModal', () => 'ConfirmPaymentModal');
jest.mock('../src/components/InsufficientBalanceModal', () => 'InsufficientBalanceModal');
jest.mock('../src/utils/haptics', () => ({
  triggerHaptic: {
    selection: jest.fn(),
    impactMedium: jest.fn(),
    notificationSuccess: jest.fn(),
    notificationError: jest.fn(),
  },
}));

const ORIGINAL = '0x1111111111111111111111111111111111111111';
const REASSIGNED = '0x2222222222222222222222222222222222222222';
const found = (address: string) => ({address, registeredAt: null});
const transferResult = {success: true, txHash: '0xabc', amount: '1', tokenSymbol: 'AUSD'};

describe.each([
  {name: 'SendPaymentScreen', Screen: SendPaymentScreen, placeholder: 'Enter username'},
  {name: 'UsernamePayScreen', Screen: UsernamePayScreen, placeholder: 'username'},
])('$name confirmed recipient', ({Screen, placeholder, name}) => {
  let tree: ReactTestRenderer.ReactTestRenderer;
  const navigation = {setOptions: jest.fn(), navigate: jest.fn()};

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (resolveUsernameDetails as jest.Mock).mockResolvedValue(found(ORIGINAL));
    (sendTokenTransfer as jest.Mock).mockResolvedValue(transferResult);
    (checkSufficientBalance as jest.Mock).mockResolvedValue({
      canAfford: true,
      amountWei: 1000000000000000000n,
      gasCostWei: 1n,
      requiredTotal: 1000000000000000001n,
      balance: 2000000000000000000n,
    });
    await act(async () => {
      tree = ReactTestRenderer.create(<Screen navigation={navigation as any} />);
    });
  });

  afterEach(() => {
    act(() => tree.unmount());
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function press(label: string) {
    const button = tree.root.findAllByType(TouchableOpacity).find(node =>
      node.findAllByType(Text).some(text =>
        React.Children.toArray(text.props.children).join('') === label,
      ),
    );
    if (!button) {
      throw new Error(`Button not found: ${label}`);
    }
    await act(async () => button.props.onPress());
  }

  async function search() {
    await act(async () => {
      tree.root.findByProps({placeholder}).props.onChangeText('alice');
    });
    await press('Search');
  }

  async function openConfirmation() {
    await search();
    if (name === 'SendPaymentScreen') {
      await press('1');
      await press('Pay');
    } else {
      await act(async () => {
        tree.root.findAllByType(TextInput).find(node =>
          node.props.placeholder === '0.00',
        )?.props.onChangeText('1');
      });
      await press('Send to @alice');
    }
    const modal = tree.root.findByType(ConfirmPaymentModal);
    expect(modal.props.visible).toBe(true);
    expect(modal.props.recipient).toBe(ORIGINAL);
    return modal;
  }

  it.each(['unchanged', 'reassigned', 'released', 'unavailable'])(
    'sends only to the confirmed address when the binding is %s',
    async binding => {
      const modal = await openConfirmation();
      if (binding === 'unavailable') {
        (resolveUsernameDetails as jest.Mock).mockRejectedValue(new Error('Registry offline'));
      } else {
        (resolveUsernameDetails as jest.Mock).mockResolvedValue(
          binding === 'reassigned' ? found(REASSIGNED) : binding === 'released' ? null : found(ORIGINAL),
        );
      }

      await act(async () => modal.props.onConfirm());

      expect(resolveUsernameDetails).toHaveBeenCalledTimes(1);
      expect(resolveUsernameDetails).toHaveBeenCalledWith('alice');
      expect(sendTokenTransfer).toHaveBeenCalledTimes(1);
      expect(sendTokenTransfer).toHaveBeenCalledWith({
        to: modal.props.recipient,
        amount: '1',
        tokenSymbol: 'AUSD',
      });
      expect(recordTransaction).toHaveBeenCalledWith(expect.objectContaining({
        counterparty: ORIGINAL,
        counterpartyUsername: 'alice',
        txHash: transferResult.txHash,
      }));
      expect(navigation.navigate).toHaveBeenCalledWith('TransactionStatus',
        expect.objectContaining({recipient: ORIGINAL, txHash: transferResult.txHash}),
      );
    },
  );

  it('does not record or navigate when the transfer fails', async () => {
    const modal = await openConfirmation();
    (sendTokenTransfer as jest.Mock).mockResolvedValue({
      ...transferResult, success: false, txHash: null, error: 'Rejected',
    });
    await act(async () => modal.props.onConfirm());
    expect(sendTokenTransfer).toHaveBeenCalledWith({to: ORIGINAL, amount: '1', tokenSymbol: 'AUSD'});
    expect(resolveUsernameDetails).toHaveBeenCalledTimes(1);
    expect(recordTransaction).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Payment Failed', 'Rejected');
  });

  it('warns before paying a handle that was registered recently (#129)', async () => {
    (resolveUsernameDetails as jest.Mock).mockResolvedValue({address: ORIGINAL, registeredAt: new Date().toISOString()});
    await search();
    expect(Alert.alert).toHaveBeenCalledWith('Check this recipient', expect.stringMatching(/@alice was registered today/));
  });

  it('does not warn for an established handle', async () => {
    await search();
    expect(Alert.alert).not.toHaveBeenCalledWith('Check this recipient', expect.anything());
  });

  it.each(['missing', 'failed'])('does not offer confirmation after a %s lookup', async lookup => {
    if (lookup === 'missing') {
      (resolveUsernameDetails as jest.Mock).mockResolvedValue(null);
    } else {
      (resolveUsernameDetails as jest.Mock).mockRejectedValue(new Error('Registry offline'));
    }
    await search();
    expect(tree.root.findAllByType(ConfirmPaymentModal)).toHaveLength(0);
    expect(sendTokenTransfer).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      lookup === 'missing' ? 'Not Found' : 'Lookup Failed', expect.any(String),
    );
  });

  it.each([
    ['Cancel', false],
    ['Pay Anyway', true],
  ])('warns before paying behind a stuck payment (#130): %s', async (choice, proceeds) => {
    (checkSufficientBalance as jest.Mock).mockResolvedValue({
      canAfford: true,
      amountWei: 1000000000000000000n,
      gasCostWei: 1n,
      requiredTotal: 1000000000000000001n,
      balance: 2000000000000000000n,
      stuckPayments: 1,
    });
    (Alert.alert as jest.Mock).mockImplementation((title: string, _m: string, buttons?: Array<{text: string; onPress?: () => void}>) => {
      if (title === 'Earlier payment still pending') {
        buttons?.find(b => b.text === choice)?.onPress?.();
      }
    });
    await search();
    if (name === 'SendPaymentScreen') {
      await press('1');
      await press('Pay');
    } else {
      await act(async () => {
        tree.root.findAllByType(TextInput).find(node => node.props.placeholder === '0.00')?.props.onChangeText('1');
      });
      await press('Send to @alice');
    }
    expect(Alert.alert).toHaveBeenCalledWith('Earlier payment still pending', expect.stringMatching(/earlier payment/i), expect.any(Array), expect.any(Object));
    const modals = tree.root.findAllByType(ConfirmPaymentModal).filter(m => m.props.visible);
    expect(modals).toHaveLength(proceeds ? 1 : 0);
  });
});
