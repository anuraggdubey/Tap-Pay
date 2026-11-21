import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {Alert, Text} from 'react-native';

const mockConfigured = {value: true};
jest.mock('../src/config/passkey', () => ({
  PASSKEY_RP_ID: 'tappay.test',
  PASSKEY_RP_NAME: 'TapPay',
  PASSKEY_FUNCTION: 'passkey-recovery',
  isPasskeyRecoveryConfigured: () => mockConfigured.value,
}));

const PHRASE = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima';
const ADDRESS = '0x1111111111111111111111111111111111111111';
const mockReveal = jest.fn();
jest.mock('../src/context/WalletContext', () => ({
  useWallet: () => ({address: ADDRESS, revealRecoveryPhrase: mockReveal}),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({
    colors: jest.requireActual('../src/theme').darkColors,
    glass: jest.requireActual('../src/theme').darkGlass,
    isDark: true,
    setDarkMode: jest.fn(),
  }),
}));
jest.mock('../src/services/wallet', () => ({
  loadPrivateKey: jest.fn().mockResolvedValue(null),
  hasWallet: jest.fn(),
  signMessage: jest.fn(),
}));

const mockLink = jest.fn();
const mockRemove = jest.fn();
const mockStatus = jest.fn();
jest.mock('../src/services/passkeyRecovery', () => ({
  getPasskeyStatus: () => mockStatus(),
  linkPasskey: (...args: unknown[]) => mockLink(...args),
  removePasskey: (...args: unknown[]) => mockRemove(...args),
  passkeyErrorMessage: (e: {message?: string}) => e?.message || 'Something went wrong. Please try again.',
}));

import PasskeyRecoveryScreen from '../src/screens/PasskeyRecoveryScreen';

let tree: ReactTestRenderer.ReactTestRenderer;
const alerts: Array<{title: string; message?: string; buttons?: any[]}> = [];

async function render() {
  await act(async () => {
    tree = ReactTestRenderer.create(<PasskeyRecoveryScreen navigation={{} as never} />);
  });
}
const texts = () => tree.root.findAllByType(Text).map(n => String(n.props.children));
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
async function confirm(buttonText: string) {
  const last = alerts[alerts.length - 1];
  const button = last.buttons!.find(b => b.text === buttonText);
  await act(async () => {
    await button.onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  alerts.length = 0;
  mockConfigured.value = true;
  mockStatus.mockResolvedValue({linked: false});
  mockReveal.mockResolvedValue(PHRASE);
  jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
    alerts.push({title, message, buttons: buttons as any[]});
  });
});

afterEach(() => {
  act(() => tree?.unmount());
  jest.restoreAllMocks();
});

describe('Passkey recovery screen', () => {
  it('shows status and explains the phrase stays the primary backup', async () => {
    await render();
    const all = texts().join(' ');
    expect(all).toContain('Not set up');
    expect(all).toMatch(/primary backup/i);
  });

  it('links after device authentication without exposing the secret', async () => {
    mockLink.mockResolvedValue({linked: true, credentialId: 'abc', updatedAt: new Date().toISOString()});
    await render();
    await press('Set Up Passkey Recovery');
    expect(alerts[0].title).toMatch(/Set up passkey recovery/i);
    await confirm('Continue');

    expect(mockReveal).toHaveBeenCalledTimes(1);
    expect(mockLink).toHaveBeenCalledWith({t: 'phrase', v: PHRASE}, ADDRESS);
    for (const a of alerts) {
      expect(`${a.title} ${a.message}`).not.toContain('alpha');
    }
    expect(alerts[alerts.length - 1].title).toMatch(/is on/i);
    expect(texts().join(' ')).not.toContain('alpha');
  });

  it('does nothing when device authentication is cancelled', async () => {
    mockReveal.mockResolvedValue(null);
    await render();
    await press('Set Up Passkey Recovery');
    await confirm('Continue');
    expect(mockLink).not.toHaveBeenCalled();
    expect(alerts[alerts.length - 1].title).toMatch(/Not confirmed/i);
  });

  it('shows an honest error when linking fails', async () => {
    mockLink.mockRejectedValue(Object.assign(new Error('This phone cannot use passkeys for recovery.'), {}));
    await render();
    await press('Set Up Passkey Recovery');
    await confirm('Continue');
    const last = alerts[alerts.length - 1];
    expect(last.title).toMatch(/was not set up/i);
    expect(last.message).toContain('cannot use passkeys');
  });

  it('removes passkey recovery after confirmation', async () => {
    mockStatus.mockResolvedValue({linked: true, credentialId: 'abc', updatedAt: new Date().toISOString()});
    mockRemove.mockResolvedValue({linked: false});
    await render();
    expect(texts().join(' ')).toContain('Linked');
    await press('Remove Passkey Recovery');
    await confirm('Remove');
    expect(mockRemove).toHaveBeenCalledWith(ADDRESS);
    expect(texts().join(' ')).toContain('Not set up');
  });

  it('is unavailable until the RP domain is configured', async () => {
    mockConfigured.value = false;
    await render();
    const all = texts().join(' ');
    expect(all).toContain('Unavailable');
    expect(all).not.toContain('Set Up Passkey Recovery');
  });
});
