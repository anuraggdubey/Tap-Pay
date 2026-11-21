import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {Text, TextInput} from 'react-native';

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

const now = new Date();
const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();
const mockRows = [
  {id: '1', direction: 'sent', counterparty: '0x' + '1'.repeat(40), counterpartyUsername: 'rhea', amount: '25', tokenSymbol: 'USDC', status: 'confirmed', txHash: '0x' + 'a1'.repeat(32), timestamp: iso(0)},
  {id: '2', direction: 'received', counterparty: '0x' + '2'.repeat(40), counterpartyUsername: 'dev', amount: '120', tokenSymbol: 'AUSD', status: 'confirmed', txHash: '0x' + 'b2'.repeat(32), timestamp: iso(0)},
  {id: '3', direction: 'sent', counterparty: '0x' + '3'.repeat(40), amount: '8.5', tokenSymbol: 'MON', status: 'pending', txHash: '0x' + 'c3'.repeat(32), timestamp: iso(1)},
  {id: '4', direction: 'sent', counterparty: '0x' + '4'.repeat(40), counterpartyUsername: 'kai', amount: '300', tokenSymbol: 'MON', status: 'failed', txHash: '0x' + 'd4'.repeat(32), timestamp: iso(40)},
];
jest.mock('../src/services/history', () => ({
  getTransactionHistory: () => mockRows,
  getTxTokenSymbol: (tx: {tokenSymbol?: string}) => (tx.tokenSymbol || 'MON').toUpperCase(),
  subscribeHistory: () => () => {},
  initHistory: () => Promise.resolve(),
}));

import TransactionHistoryScreen from '../src/screens/TransactionHistoryScreen';
import {dayLabel, groupByDay} from '../src/utils/historyGroups';

let tree: ReactTestRenderer.ReactTestRenderer;
const texts = () => tree.root.findAllByType(Text).map(n => [n.props.children].flat().join(''));
const has = (s: string) => texts().some(t => t.includes(s));
function press(label: string) {
  let node: any = tree.root.findAllByType(Text).find(n => n.props.children === label);
  expect(node).toBeTruthy();
  while (node && !node.props.onPress) {
    node = node.parent;
  }
  return act(async () => {
    node.props.onPress();
  });
}
async function render() {
  await act(async () => {
    tree = ReactTestRenderer.create(<TransactionHistoryScreen />);
  });
  await act(async () => {});
}

beforeEach(() => {
  mockNavigate.mockClear();
});
afterEach(() => {
  act(() => tree?.unmount());
});

describe('historyGroups', () => {
  const ref = new Date(2026, 10, 21, 12, 0, 0);
  it('labels today, yesterday, weekdays and older dates', () => {
    expect(dayLabel(new Date(2026, 10, 21, 1), ref)).toBe('Today');
    expect(dayLabel(new Date(2026, 10, 20, 23), ref)).toBe('Yesterday');
    expect(dayLabel(new Date(2026, 10, 18, 9), ref)).toBe(new Date(2026, 10, 18).toLocaleDateString(undefined, {weekday: 'long'}));
    expect(dayLabel(new Date(2026, 9, 3), ref)).toBe(new Date(2026, 9, 3).toLocaleDateString(undefined, {month: 'long', day: 'numeric'}));
    expect(dayLabel(new Date(2025, 11, 25), ref)).toContain('2025');
    expect(dayLabel(new Date('nope'), ref)).toBe('Earlier');
  });

  it('groups a newest-first list into contiguous day sections', () => {
    const items = [
      {timestamp: new Date(2026, 10, 21, 10).toISOString(), n: 1},
      {timestamp: new Date(2026, 10, 21, 8).toISOString(), n: 2},
      {timestamp: new Date(2026, 10, 20, 9).toISOString(), n: 3},
    ];
    const sections = groupByDay(items, ref);
    expect(sections.map(s => [s.title, s.data.length])).toEqual([['Today', 2], ['Yesterday', 1]]);
  });
});

describe('Activity screen', () => {
  it('groups rows by day and shows direction, amount and non-confirmed status', async () => {
    await render();
    expect(has('Activity')).toBe(true);
    expect(has('Today')).toBe(true);
    expect(has('Yesterday')).toBe(true);
    expect(has('rhea')).toBe(true);
    expect(has('−25 USDC')).toBe(true);
    expect(has('+120 AUSD')).toBe(true);
    expect(has('Pending')).toBe(true);
    expect(has('Failed')).toBe(true);
  });

  it('filters by Sent and Received', async () => {
    await render();
    await press('Received');
    expect(has('dev')).toBe(true);
    expect(has('rhea')).toBe(false);
    await press('Sent');
    expect(has('rhea')).toBe(true);
    expect(has('dev')).toBe(false);
  });

  it('searches by username and shows an empty state with no matches', async () => {
    await render();
    await act(async () => {
      tree.root.findByType(TextInput).props.onChangeText('kai');
    });
    expect(has('kai')).toBe(true);
    expect(has('rhea')).toBe(false);
    await act(async () => {
      tree.root.findByType(TextInput).props.onChangeText('zzz-nothing');
    });
    expect(has('No Results')).toBe(true);
  });

  it('opens the receipt with the stored status', async () => {
    await render();
    await press('@rhea');
    expect(mockNavigate).toHaveBeenCalledWith(
      'TransactionStatus',
      expect.objectContaining({txHash: mockRows[0].txHash, initialStatus: 'confirmed', direction: 'sent', counterpartyUsername: 'rhea'}),
    );
  });
});
