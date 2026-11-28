import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {Image, Text} from 'react-native';
import WalletSetupScreen from '../src/screens/WalletSetupScreen';

const mockCreateWallet = jest.fn();
let mockIsDark = true;
let mockPasskeyConfigured = false;

jest.mock('../src/context/WalletContext', () => ({
  useWallet: () => ({
    isInitialized: false,
    backupVerified: false,
    walletLocked: false,
    createWallet: mockCreateWallet,
    restoreFromPhrase: jest.fn(),
    importPrivateKey: jest.fn(),
    markBackupVerified: jest.fn(),
    revealRecoveryPhrase: jest.fn(),
    unlockWallet: jest.fn(),
    resetWallet: jest.fn(),
    saveUsername: jest.fn(),
    address: null,
  }),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => {
    const theme = jest.requireActual('../src/theme');
    return {
      colors: mockIsDark ? theme.darkColors : theme.lightColors,
      glass: mockIsDark ? theme.darkGlass : theme.lightGlass,
      isDark: mockIsDark,
      setDarkMode: jest.fn(),
    };
  },
}));
jest.mock('../src/config/passkey', () => ({
  ...jest.requireActual('../src/config/passkey'),
  isPasskeyRecoveryConfigured: () => mockPasskeyConfigured,
}));
jest.mock('../src/services/registry', () => ({registerUsername: jest.fn()}));

let tree: ReactTestRenderer.ReactTestRenderer;
const navigation = {replace: jest.fn()} as any;

function render() {
  act(() => {
    tree = ReactTestRenderer.create(<WalletSetupScreen navigation={navigation} />);
  });
}

function texts() {
  return tree.root.findAllByType(Text).map(t => [t.props.children].flat().join(''));
}

function button(label: string) {
  return tree.root.find(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsDark = true;
  mockPasskeyConfigured = false;
  mockCreateWallet.mockResolvedValue({mnemonic: 'a b c d e f g h i j k l'});
});

afterEach(() => {
  act(() => tree?.unmount());
});

describe('onboarding welcome screen', () => {
  it.each([true, false])('shows the redesigned welcome in dark mode = %s', dark => {
    mockIsDark = dark;
    render();
    expect(texts()).toEqual(
      expect.arrayContaining([
        'TapPay',
        'Tap. Pay.\nOnchain.',
        'Crypto and local payments,\nwith a simple tap.',
        'Create a new wallet',
        'Import or Restore Wallet',
      ]),
    );
    const hero = tree.root.findByType(Image);
    expect(hero.props.source).toBe(
      dark ? require('../src/assets/onboarding-hero-dark.jpg') : require('../src/assets/onboarding-hero-light.jpg'),
    );
  });

  it('creates a new wallet from the primary button', async () => {
    render();
    await act(async () => {
      await button('Create a new wallet').props.onPress();
    });
    expect(mockCreateWallet).toHaveBeenCalledTimes(1);
    expect(texts()).toContain('Your recovery phrase');
  });

  it('shows passkey recovery only when it is configured', () => {
    render();
    expect(texts()).not.toContain('Recover with Passkey');
    act(() => tree.unmount());
    mockPasskeyConfigured = true;
    render();
    expect(texts()).toContain('Recover with Passkey');
  });

  it('keeps restore and private key import reachable', () => {
    render();
    act(() => button('Import or restore wallet').props.onPress());
    expect(texts()).toContain('Recovery phrase');
    const importLink = tree.root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        node.findAllByType(Text).some(t => t.props.children === 'Import a private key instead (advanced)'),
    );
    act(() => importLink.props.onPress());
    expect(texts()).toContain('Import private key');
  });
});
