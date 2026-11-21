/**
 * SettingsScreen — iOS Settings structure: profile row, then inset grouped lists.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress} from '../utils/format';
import {MONAD_CONFIG} from '../config/monad';
import {WalletError} from '../services/wallet';
import {getSoundEnabled, setSoundEnabled, playSound} from '../utils/sounds';
import {Group, Row, ToggleRow, LargeTitle, tileColors} from '../components/IosList';
import PressableScale from '../components/PressableScale';
import type {AppColors} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function SettingsScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {address, username, resetWallet} = useWallet();
  const {colors, isDark, setDarkMode} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    getSoundEnabled().then(setSoundOn);
  }, []);

  const handleResetWallet = () => {
    triggerHaptic.notificationError();
    Alert.alert(
      'Reset Wallet',
      'This permanently removes your wallet and username from this phone. You can only restore the wallet with your 12-word recovery phrase. If you do not have it, your funds will be lost forever.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset Wallet',
          style: 'destructive',
          onPress: async () => {
            try {
              const done = await resetWallet();
              if (!done) {
                Alert.alert('Reset failed', 'Could not remove the wallet from this phone. Please try again.');
                return;
              }
              navigation.reset({index: 0, routes: [{name: 'WalletSetup'}]});
            } catch (error) {
              Alert.alert(
                'Wallet not reset',
                error instanceof WalletError
                  ? error.message
                  : 'Could not remove the wallet from this phone. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const initial = (username || 'T').charAt(0).toUpperCase();

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, {paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120}]}
        showsVerticalScrollIndicator={false}>
        <LargeTitle>Settings</LargeTitle>

        <View style={styles.profileGroup}>
          <PressableScale scaleTo={0.99} onPress={() => navigation.navigate('AccountInfo')}>
            <View style={styles.profile}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>
                  {username ? `@${username}` : 'TapPay Wallet'}
                </Text>
                <Text style={styles.sub}>Username, Address and Recovery</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </PressableScale>
        </View>

        <Group title="Wallet">
          <Row
            icon={{bg: tileColors.blue, glyph: '▣'}}
            title="Wallet Address"
            value={address ? truncateAddress(address, 5, 4) : 'Not linked'}
            mono
            onPress={() => navigation.navigate('AccountInfo')}
          />
          <Row
            icon={{bg: tileColors.red, glyph: '⚿'}}
            title="Recovery Phrase"
            onPress={() => navigation.navigate('AccountInfo')}
          />
          <Row
            icon={{bg: tileColors.green, glyph: '◍'}}
            title="Network"
            value={MONAD_CONFIG.chainName}
            onPress={() => navigation.navigate('NetworkInfo')}
          />
        </Group>

        <Group title="Preferences" footer="Sound plays a short chime when a payment completes.">
          <ToggleRow
            icon={{bg: tileColors.orange, glyph: '♪'}}
            title="Sound Effects"
            value={soundOn}
            onChange={v => {
              setSoundOn(v);
              setSoundEnabled(v);
              triggerHaptic.selection();
              if (v) {
                playSound('tap_connect');
              }
            }}
          />
          <ToggleRow
            icon={{bg: tileColors.indigo, glyph: '☾'}}
            title="Dark Mode"
            value={isDark}
            onChange={v => {
              triggerHaptic.selection();
              setDarkMode(v);
            }}
          />
        </Group>

        <Group>
          <Row
            icon={{bg: tileColors.gray, glyph: 'i'}}
            title="About TapPay"
            value="0.0.1"
            onPress={() => navigation.navigate('AboutTapPay')}
          />
        </Group>

        <Group>
          <Row title="Reset Wallet" destructive center onPress={handleResetWallet} chevron={false} />
        </Group>
      </ScrollView>
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.background},
    flex: {flex: 1},
    content: {paddingHorizontal: 20},
    profileGroup: {marginTop: 12, borderRadius: 14, backgroundColor: c.surfaceSolid, overflow: 'hidden'},
    profile: {flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16},
    avatar: {width: 60, height: 60, borderRadius: 30, backgroundColor: c.surfaceElevated, alignItems: 'center', justifyContent: 'center'},
    avatarText: {fontSize: 26, fontWeight: '500', color: c.text},
    name: {fontSize: 20, fontWeight: '600', color: c.text},
    sub: {fontSize: 13, color: c.textMuted, marginTop: 2},
    chevron: {fontSize: 22, color: c.textSubtle},
  });
}
