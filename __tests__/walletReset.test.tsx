import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {Alert, Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WalletContext from '../src/context/WalletContext';
import * as wallet from '../src/services/wallet';
import SettingsScreen from '../src/screens/SettingsScreen';
import WalletSetupScreen from '../src/screens/WalletSetupScreen';

jest.mock('../src/services/wallet', () => ({
  ...jest.requireActual('../src/services/wallet'),
  deleteWallet: jest.fn(),
  hasWallet: jest.fn(),
  hasRecoveryPhrase: jest.fn().mockResolvedValue(true),
  getWalletAddress: jest.fn().mockResolvedValue('0x1111111111111111111111111111111111111111'),
  getBalance: jest.fn().mockResolvedValue(0n),
}));
jest.mock('../src/services/registry', () => ({
  reverseResolve: jest.fn().mockResolvedValue(null),
  registerUsername: jest.fn(),
}));
jest.mock('../src/services/tokens/tokenBalance', () => ({
  getTokenBalance: jest.fn().mockResolvedValue({balanceRaw: 0n}),
}));
jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({
    colors: jest.requireActual('../src/theme').lightColors,
    glass: jest.requireActual('../src/theme').lightGlass,
    isDark: false,
    setDarkMode: jest.fn(),
  }),
}));

const address = '0x1111111111111111111111111111111111111111';
const authError = new wallet.WalletError('AUTHENTICATION_FAILED', 'Authentication cancelled. Nothing was removed.');
let tree: ReactTestRenderer.ReactTestRenderer;

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await AsyncStorage.clear();
});

afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('wallet context reset', () => {
  it.each(['authorized', 'cancelled', 'storage failure'])(
    'clears state and metadata only after an authorized deletion: %s',
    async outcome => {
      (wallet.hasWallet as jest.Mock).mockResolvedValue(true);
      let state: ReturnType<typeof WalletContext.useWallet>;
      function Probe() {
        state = WalletContext.useWallet();
        return null;
      }
      await act(async () => {
        tree = ReactTestRenderer.create(<WalletContext.WalletProvider><Probe /></WalletContext.WalletProvider>);
      });
      await act(async () => {
        await state.saveUsername('alice');
        await state.markBackupVerified();
        await AsyncStorage.setItem(
          '@tappay_passkey_recovery',
          JSON.stringify({credentialId: 'cred-0000000000000000', updatedAt: 'x', walletAddress: address.toLowerCase()}),
        );
      });
      expect(state!.address).toBe(address);
      (AsyncStorage.removeItem as jest.Mock).mockClear();
      if (outcome === 'cancelled') {
        (wallet.deleteWallet as jest.Mock).mockRejectedValueOnce(authError);
      } else {
        (wallet.deleteWallet as jest.Mock).mockResolvedValueOnce(outcome === 'authorized');
      }

      await act(async () => {
        if (outcome === 'cancelled') {
          await expect(state.resetWallet()).rejects.toBe(authError);
        } else {
          expect(await state.resetWallet()).toBe(outcome === 'authorized');
        }
      });

      expect(state!.address).toBe(outcome === 'authorized' ? null : address);
      expect(state!.username).toBe(outcome === 'authorized' ? null : 'alice');
      expect(state!.backupVerified).toBe(outcome !== 'authorized');
      if (outcome === 'authorized') {
        expect(await AsyncStorage.getItem('@tappay_username')).toBeNull();
        expect(await AsyncStorage.getItem('@tappay_backup_verified')).toBeNull();
        // #126: the passkey link belonged to the deleted wallet.
        expect(await AsyncStorage.getItem('@tappay_passkey_recovery')).toBeNull();
      } else {
        expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
        expect(await AsyncStorage.getItem('@tappay_username')).toBe('alice');
        expect(await AsyncStorage.getItem('@tappay_backup_verified')).toBe('1');
        expect(await AsyncStorage.getItem('@tappay_passkey_recovery')).not.toBeNull();
      }
    },
  );
});

describe.each([
  {name: 'Settings', Screen: SettingsScreen, label: 'Reset Wallet'},
  {name: 'locked onboarding', Screen: WalletSetupScreen, label: 'Reset wallet on this device'},
])('$name reset UX', ({name, Screen, label}) => {
  it.each(['authorized', 'cancelled', 'storage failure'])(
    'leaves the current screen unless reset succeeds: %s',
    async outcome => {
      const resetWallet = jest.fn();
      if (outcome === 'cancelled') {
        resetWallet.mockRejectedValueOnce(authError);
      } else {
        resetWallet.mockResolvedValueOnce(outcome === 'authorized');
      }
      jest.spyOn(WalletContext, 'useWallet').mockReturnValue({
        address, username: null, walletLocked: true, isInitialized: false,
        backupVerified: false, resetWallet,
      } as any);
      const navigation = {reset: jest.fn(), replace: jest.fn(), navigate: jest.fn(), addListener: jest.fn(() => jest.fn())};
      await act(async () => {
        tree = ReactTestRenderer.create(<Screen navigation={navigation as any} />);
      });
      let button = tree.root.findAllByType(Text).find(node => node.props.children === label);
      while (button && !button.props.onPress) {
        button = button.parent || undefined;
      }
      if (!button) {
        throw new Error('Reset button not found');
      }
      act(() => button?.props.onPress());
      expect(resetWallet).not.toHaveBeenCalled();
      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
      const confirm = buttons.find((item: {style: string}) => item.style === 'destructive');
      await act(async () => confirm.onPress());
      expect(resetWallet).toHaveBeenCalledTimes(1);

      if (outcome !== 'authorized') {
        expect(navigation.reset).not.toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenLastCalledWith(
          outcome === 'cancelled' ? 'Wallet not reset' : 'Reset failed', expect.any(String),
        );
        if (outcome === 'cancelled') {
          expect(Alert.alert).toHaveBeenLastCalledWith('Wallet not reset', authError.message);
        }
      } else if (name === 'Settings') {
        expect(navigation.reset).toHaveBeenCalledWith({index: 0, routes: [{name: 'WalletSetup'}]});
      }
      if (name === 'locked onboarding') {
        expect(tree.root.findAllByType(Text).some(node => node.props.children === 'WALLET LOCKED'))
          .toBe(outcome !== 'authorized');
      }
    },
  );
});
