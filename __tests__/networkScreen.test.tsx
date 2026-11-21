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

const DEFAULTS = ['https://rpc.monad.xyz', 'https://rpc.ankr.com/monad', 'https://monad-rpc.publicnode.com'];
const mockState = {custom: null as string | null};
const mockSetCustom = jest.fn();
jest.mock('../src/services/wallet', () => ({
  getCustomRpcUrl: () => mockState.custom,
  getActiveRpcUrl: () => mockState.custom ?? DEFAULTS[0],
  getDefaultRpcEndpoints: () => DEFAULTS,
  setCustomRpc: (...args: unknown[]) => mockSetCustom(...args),
}));

import NetworkScreen from '../src/screens/NetworkScreen';

let tree: ReactTestRenderer.ReactTestRenderer;
const alerts: Array<{title: string; message?: string; buttons?: any[]}> = [];

async function render() {
  await act(async () => {
    tree = ReactTestRenderer.create(<NetworkScreen navigation={{} as never} />);
  });
}
const texts = () => tree.root.findAllByType(Text).map(n => String(n.props.children));
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

beforeEach(() => {
  jest.clearAllMocks();
  alerts.length = 0;
  mockState.custom = null;
  jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
    alerts.push({title, message, buttons: buttons as any[]});
  });
});
afterEach(() => {
  act(() => tree?.unmount());
  jest.restoreAllMocks();
});

describe('Network screen RPC settings', () => {
  it('shows the public endpoints, which one is active, and the privacy trade-off', async () => {
    await render();
    expect(has('rpc.monad.xyz')).toBe(true);
    expect(has('Active')).toBe(true);
    expect(has('Each one sees your IP')).toBe(true);
  });

  it('warns before switching to a custom RPC, then verifies and applies it', async () => {
    mockSetCustom.mockImplementation(async (url: string) => {
      mockState.custom = url;
      return {ok: true};
    });
    await render();
    await act(async () => {
      tree.root.findByType(TextInput).props.onChangeText('https://my.node.example.com');
    });
    await press('Verify and Use');
    expect(alerts[0].title).toMatch(/own RPC/i);
    expect(alerts[0].message).toMatch(/only this endpoint/i);
    expect(mockSetCustom).not.toHaveBeenCalled(); // not until the user confirms
    await act(async () => {
      await alerts[0].buttons!.find(b => b.text === 'Use this RPC').onPress();
    });
    expect(mockSetCustom).toHaveBeenCalledWith('https://my.node.example.com');
    expect(has('Your RPC')).toBe(true);
    expect(has('my.node.example.com')).toBe(true);
    expect(has('no public fallback')).toBe(true);
    expect(has('Use Default Endpoints')).toBe(true);
  });

  it('shows the reason when an endpoint is rejected and keeps the defaults', async () => {
    mockSetCustom.mockResolvedValue({ok: false, error: 'That endpoint is on a different network (chain ID 1).'});
    await render();
    await act(async () => {
      tree.root.findByType(TextInput).props.onChangeText('https://eth.example.com');
    });
    await press('Verify and Use');
    await act(async () => {
      await alerts[0].buttons!.find(b => b.text === 'Use this RPC').onPress();
    });
    expect(alerts[1].title).toMatch(/not changed/i);
    expect(alerts[1].message).toContain('different network');
    expect(has('Primary')).toBe(true);
  });

  it('can return to the default endpoints', async () => {
    mockState.custom = 'https://my.node.example.com';
    mockSetCustom.mockImplementation(async () => {
      mockState.custom = null;
      return {ok: true};
    });
    await render();
    await press('Use Default Endpoints');
    expect(mockSetCustom).toHaveBeenCalledWith(null);
    expect(has('Primary')).toBe(true);
  });
});
