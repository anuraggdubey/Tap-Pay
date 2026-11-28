import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {Text} from 'react-native';

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
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({useNavigation: () => ({navigate: mockNavigate})}));
jest.mock('../src/services/txReconcile', () => ({reconcilePendingTransactions: jest.fn().mockResolvedValue(0)}));
jest.mock('../src/utils/sounds', () => ({preloadSounds: jest.fn(), playSound: jest.fn()}));
jest.mock('../src/services/nfcReader', () => ({
  initNfc: jest.fn().mockResolvedValue(undefined),
  isNfcSupported: jest.fn().mockResolvedValue(true),
  isNfcEnabled: jest.fn().mockResolvedValue(true),
}));

const mockWallet = {
  address: '0x7a3F' + '0'.repeat(32) + 'B9d4',
  balance: 2418000000000000000n,
  ausdBalance: 1284500000n,
  username: 'anurag' as string | null,
  refreshBalance: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../src/context/WalletContext', () => ({useWallet: () => mockWallet}));

const now = new Date();
let mockRows: any[] = [];
jest.mock('../src/services/history', () => ({
  getTransactionHistory: () => mockRows,
  getTxTokenSymbol: (tx: {tokenSymbol?: string}) => (tx.tokenSymbol || 'MON').toUpperCase(),
  initHistory: () => Promise.resolve(),
  isStuck: () => false,
}));

import HomeScreen, {shortWhen} from '../src/screens/HomeScreen';
import {slotOf} from '../src/components/WalletCardStack';

let tree: ReactTestRenderer.ReactTestRenderer;
const texts = () => tree.root.findAllByType(Text).map(n => [n.props.children].flat().join(''));
const has = (s: string) => texts().some(t => t.includes(s));
function press(label: string) {
  const node = tree.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
  expect(node).toBeTruthy();
  return act(async () => {
    node.props.onPress();
  });
}
async function render() {
  await act(async () => {
    tree = ReactTestRenderer.create(<HomeScreen />);
  });
  await act(async () => {});
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockWallet.username = 'anurag';
  mockRows = [
    {id: '1', direction: 'received', counterparty: '0x' + '2'.repeat(40), counterpartyUsername: 'misbah', amount: '120', tokenSymbol: 'AUSD', status: 'confirmed', txHash: '0x' + 'b2'.repeat(32), timestamp: now.toISOString()},
    {id: '2', direction: 'sent', counterparty: '0x' + '4'.repeat(40), counterpartyUsername: 'kai', amount: '0.8', tokenSymbol: 'MON', status: 'failed', txHash: '0x' + 'd4'.repeat(32), timestamp: now.toISOString()},
  ];
});
afterEach(() => {
  act(() => tree?.unmount());
});

describe('HomeScreen', () => {
  it('shows the balance, both assets and the wallet cards', async () => {
    await render();
    expect(has('Total balance')).toBe(true);
    expect(has('1,284.50')).toBe(true);
    expect(has('+ 2.418 MON')).toBe(true);
    expect(has('Agora Dollar')).toBe(true);
    expect(has('Monad')).toBe(true);
    expect(has('Ready to tap')).toBe(true);
  });

  it('hides and shows the balance', async () => {
    await render();
    await press('Hide balance');
    expect(has('1,284.50')).toBe(false);
    await press('Show balance');
    expect(has('1,284.50')).toBe(true);
  });

  it('opens the right screens from the quick actions', async () => {
    await render();
    await press('Receive');
    await press('Tap to Pay');
    await press('Activity');
    expect(mockNavigate.mock.calls.map(c => c[0])).toEqual(['ReceiveTap', 'SendTap', 'History']);
  });

  it('lists recent payments and opens one', async () => {
    await render();
    expect(has('@misbah')).toBe(true);
    expect(has('+120 AUSD')).toBe(true);
    expect(has('Failed')).toBe(true);
    await press('Received from @misbah, 120 AUSD');
    expect(mockNavigate).toHaveBeenCalledWith('TransactionStatus', expect.objectContaining({amount: '120', direction: 'received', tokenSymbol: 'AUSD'}));
  });

  it('shows the empty state with no payments and no username', async () => {
    mockRows = [];
    mockWallet.username = null;
    await render();
    expect(has('No payments yet')).toBe(true);
    expect(has('0x7a3F')).toBe(true);
    await press('Receive a payment');
    expect(mockNavigate).toHaveBeenCalledWith('ReceiveTap');
  });

  it('brings a tapped card to the front', async () => {
    await render();
    const selected = (label: string) =>
      tree.root.findAll(n => n.props.accessibilityLabel === label && n.props.accessibilityState)[0].props.accessibilityState.selected;
    expect(selected('AUSD card')).toBe(true);
    expect(selected('MON card')).toBe(false);
    await press('MON card');
    expect(selected('MON card')).toBe(true);
    expect(selected('AUSD card')).toBe(false);
    expect(has('2.418 MON')).toBe(true);
    await press('Tap to Pay card');
    expect(selected('Tap to Pay card')).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('hides the card balances with the balance', async () => {
    await render();
    expect(has('1,284.50 AUSD')).toBe(true);
    await press('Hide balance');
    expect(has('1,284.50 AUSD')).toBe(false);
  });

  it('drops the old wallet shortcuts section', async () => {
    await render();
    expect(has('Your wallet')).toBe(false);
    expect(has('TapPay ID')).toBe(false);
  });
});

describe('slotOf', () => {
  it('puts the front card in the middle and the others on each side', () => {
    expect([0, 1, 2].map(i => slotOf(i, 0))).toEqual([0, 1, -1]);
    expect([0, 1, 2].map(i => slotOf(i, 1))).toEqual([-1, 0, 1]);
    expect([0, 1, 2].map(i => slotOf(i, 2))).toEqual([1, -1, 0]);
  });
});

describe('shortWhen', () => {
  const ref = new Date(2026, 10, 21, 12, 0, 0);
  it('gives a time today, Yesterday, or a short date', () => {
    expect(shortWhen(new Date(2026, 10, 21, 9, 5).toISOString(), ref)).toBe(new Date(2026, 10, 21, 9, 5).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}));
    expect(shortWhen(new Date(2026, 10, 20, 9).toISOString(), ref)).toBe('Yesterday');
    expect(shortWhen(new Date(2026, 9, 3).toISOString(), ref)).toBe(new Date(2026, 9, 3).toLocaleDateString([], {month: 'short', day: 'numeric'}));
    expect(shortWhen('nope', ref)).toBe('');
  });
});
