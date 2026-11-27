import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {Alert, Text} from 'react-native';

// Stable references, like the real context: the screen's effect depends on them.
const mockWallet = {
  address: '0x1111111111111111111111111111111111111111',
  username: 'me',
  balance: 0n,
  refreshBalance: jest.fn(),
};
jest.mock('../src/context/WalletContext', () => ({
  useWallet: () => mockWallet,
}));
jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({
    colors: jest.requireActual('../src/theme').darkColors,
    glass: jest.requireActual('../src/theme').darkGlass,
    isDark: true,
    setDarkMode: jest.fn(),
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));
jest.mock('../src/utils/sounds', () => ({playSound: jest.fn()}));
jest.mock('../src/utils/haptics', () => ({
  triggerHaptic: {selection: jest.fn(), impactMedium: jest.fn(), notificationSuccess: jest.fn(), notificationError: jest.fn()},
}));
const mockUpdate = jest.fn();
const mockReplaceRow = jest.fn();
jest.mock('../src/services/history', () => ({
  updateTransactionStatus: (...args: unknown[]) => mockUpdate(...args),
  replaceTransaction: (...args: unknown[]) => mockReplaceRow(...args),
}));
const mockWait = jest.fn();
const mockReplaceTx = jest.fn();
jest.mock('../src/services/wallet', () => ({
  waitForReceipt: (...args: unknown[]) => mockWait(...args),
  replacePendingTransaction: (...args: unknown[]) => mockReplaceTx(...args),
  getBalance: jest.fn(),
}));

import TransactionStatusScreen from '../src/screens/TransactionStatusScreen';

const HASH = '0x' + 'ab'.repeat(32);
let tree: ReactTestRenderer.ReactTestRenderer;

async function render(extra: Record<string, unknown> = {}) {
  const navigation = {setOptions: jest.fn(), popToTop: jest.fn(), replace: jest.fn()};
  const route = {params: {txHash: HASH, amount: '5', recipient: '0x2222222222222222222222222222222222222222', ...extra}};
  await act(async () => {
    tree = ReactTestRenderer.create(<TransactionStatusScreen navigation={navigation as never} route={route as never} />);
  });
  await act(async () => {});
  return navigation;
}
const texts = () => tree.root.findAllByType(Text).map(n => String(n.props.children).replace(/,/g, ''));
const has = (s: string) => texts().some(t => t.includes(s));

beforeEach(() => {
  jest.clearAllMocks();
});
afterEach(() => {
  act(() => tree?.unmount());
});

describe('TransactionStatusScreen outcomes (#38)', () => {
  it('a receipt timeout shows "Still confirming" and never marks the payment failed', async () => {
    mockWait.mockResolvedValue({confirmed: false, timedOut: true, error: 'Still confirming.'});
    await render();
    expect(has('Still confirming')).toBe(true);
    expect(has('Payment failed')).toBe(false);
    expect(has('do not send it again')).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('an unreachable network is not reported as a failure', async () => {
    mockWait.mockRejectedValue(new Error('network down'));
    await render();
    expect(has('Still confirming')).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('only a reverted receipt is recorded as failed', async () => {
    mockWait.mockResolvedValue({confirmed: false, reverted: true, error: 'Transaction reverted on chain'});
    await render();
    expect(has('Payment failed')).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(HASH, 'failed');
  });

  it('a confirmed receipt is recorded as confirmed', async () => {
    mockWait.mockResolvedValue({confirmed: true});
    await render();
    expect(has('Payment sent')).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(HASH, 'confirmed');
  });

  it('Check Again polls again and can then confirm', async () => {
    mockWait.mockResolvedValueOnce({confirmed: false, timedOut: true}).mockResolvedValueOnce({confirmed: true});
    await render();
    expect(has('Still confirming')).toBe(true);
    let node: any = tree.root.findAllByType(Text).find(n => n.props.children === 'Check Again');
    while (node && !node.props.onPress) {
      node = node.parent;
    }
    await act(async () => {
      node.props.onPress();
    });
    await act(async () => {});
    expect(mockWait).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledWith(HASH, 'confirmed');
  });
});

describe('stuck payments (#130)', () => {
  const NEW = '0x' + 'cd'.repeat(32);
  // Press the button with this label in the last Alert, like a user would.
  function choose(label: string) {
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
    buttons.find((b: {text: string}) => b.text === label).onPress();
  }
  function pressText(label: string) {
    let node: any = tree.root.findAllByType(Text).find(n => n.props.children === label);
    while (node && !node.props.onPress) {
      node = node.parent;
    }
    return act(async () => node.props.onPress());
  }

  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockWait.mockResolvedValue({confirmed: false, timedOut: true});
  });
  afterEach(() => jest.restoreAllMocks());

  it('a delayed sent payment offers Speed Up and Cancel', async () => {
    await render();
    expect(has('Speed Up')).toBe(true);
    expect(has('Cancel Payment')).toBe(true);
  });

  it('a received payment cannot be sped up or cancelled', async () => {
    await render({direction: 'received'});
    expect(has('Still confirming')).toBe(true);
    expect(has('Speed Up')).toBe(false);
  });

  it('speed up asks first, then replaces the row and follows the new hash', async () => {
    mockReplaceTx.mockResolvedValue({txHash: NEW, nonce: 3});
    const navigation = await render();
    await pressText('Speed Up');
    expect(mockReplaceTx).not.toHaveBeenCalled();
    await act(async () => choose('Speed Up'));
    expect(mockReplaceTx).toHaveBeenCalledWith(HASH, 'speedup');
    expect(mockReplaceRow).toHaveBeenCalledWith(HASH, NEW, 'speedup', 3);
    expect(navigation.replace).toHaveBeenCalledWith('TransactionStatus', expect.objectContaining({txHash: NEW, initialStatus: 'pending'}));
  });

  it('cancel records the cancellation and never marks the payment failed itself', async () => {
    mockReplaceTx.mockResolvedValue({txHash: NEW, nonce: 3});
    await render();
    await pressText('Cancel Payment');
    await act(async () => choose('Cancel Payment'));
    expect(mockReplaceTx).toHaveBeenCalledWith(HASH, 'cancel');
    expect(mockReplaceRow).toHaveBeenCalledWith(HASH, NEW, 'cancel', 3);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('a refused replacement explains why and changes nothing', async () => {
    mockReplaceTx.mockResolvedValue({txHash: null, error: 'This payment has already been processed.'});
    await render();
    await pressText('Speed Up');
    await act(async () => choose('Speed Up'));
    expect(Alert.alert).toHaveBeenLastCalledWith('Could not speed up', 'This payment has already been processed.');
    expect(mockReplaceRow).not.toHaveBeenCalled();
  });

  it.each([
    ['dropped', 'Payment not sent'],
    ['cancelled', 'Payment cancelled'],
  ])('a %s payment from History shows that no money moved', async (initialStatus, title) => {
    await render({initialStatus});
    expect(has(title)).toBe(true);
    expect(mockWait).not.toHaveBeenCalled();
  });
});
