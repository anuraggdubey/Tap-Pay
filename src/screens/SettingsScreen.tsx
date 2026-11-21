/**
 * SettingsScreen — gradient identity card, colored icon tiles, preference toggles.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert, Switch} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';

import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress} from '../utils/format';
import {MONAD_CONFIG} from '../config/monad';
import {WalletError} from '../services/wallet';
import {getSoundEnabled, setSoundEnabled, playSound} from '../utils/sounds';
import {
  UserIcon,
  WalletCardIcon,
  KeyIcon,
  GlobeIcon,
  InfoIcon,
  PowerIcon,
} from '../components/AppIcons';
import PressableScale from '../components/PressableScale';
import FadeInView from '../components/FadeInView';
import LivePulseDot from '../components/LivePulseDot';
import {GradientFill, RippleRings} from '../components/Gradient';
import type {AppColors} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

type Tile = {colors: string[]; icon: React.ReactNode};

function IconTile({tile}: {tile: Tile}) {
  return (
    <View style={tileStyles.tile}>
      <GradientFill colors={tile.colors} angle={135} />
      {tile.icon}
    </View>
  );
}

const tileStyles = StyleSheet.create({
  tile: {width: 36, height: 36, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'},
});

export default function SettingsScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {address, username, resetWallet} = useWallet();
  const {colors, isDark, setDarkMode} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [addressCopied, setAddressCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    getSoundEnabled().then(setSoundOn);
  }, []);

  const copyAddress = () => {
    if (!address) {
      return;
    }
    triggerHaptic.selection();
    Clipboard.setString(address);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 1800);
  };

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

  const row = (
    key: string,
    title: string,
    tile: Tile,
    onPress: () => void,
    value?: string,
    last?: boolean,
  ) => (
    <PressableScale
      key={key}
      onPress={() => {
        triggerHaptic.selection();
        onPress();
      }}
      contentStyle={[styles.row, !last && styles.rowBorder]}>
      <IconTile tile={tile} />
      <Text style={styles.rowTitle}>{title}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Text style={styles.chevron}>›</Text>
    </PressableScale>
  );

  const toggleRow = (
    title: string,
    sub: string,
    tile: Tile,
    value: boolean,
    onChange: (v: boolean) => void,
    last?: boolean,
  ) => (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <IconTile tile={tile} />
      <View style={styles.rowTextCol}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{false: colors.separator, true: colors.accent}}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.separator}
        accessibilityLabel={title}
      />
    </View>
  );

  const initial = (username || 'T').charAt(0).toUpperCase();

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, {paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120}]}
        showsVerticalScrollIndicator={false}>
        <FadeInView delay={0} translateY={6}>
          <Text style={styles.pageTitle}>Settings</Text>
        </FadeInView>

        <FadeInView delay={40} translateY={10}>
          <PressableScale onPress={() => navigation.navigate('AccountInfo')} style={styles.hero}>
            <GradientFill
              colors={['#2B5BE8', '#5B4BFF', '#8B5CF6']}
              angle={125}
              glows={[{color: '#64D2FF', cx: 1, cy: 0, r: 0.7, opacity: 0.5}]}
            />
            <RippleRings size={240} style={styles.heroRipple} opacity={0.22} rings={5} />
            <View style={styles.heroRow}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              </View>
              <View style={styles.heroText}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {username ? `@${username}` : 'TapPay wallet'}
                </Text>
                <Text style={styles.heroAddr} numberOfLines={1}>
                  {address ? truncateAddress(address, 8, 6) : 'Not connected'}
                </Text>
              </View>
              <PressableScale onPress={copyAddress} disabled={!address} accessibilityLabel="Copy wallet address" contentStyle={styles.copyChip}>
                <Text style={styles.copyChipText}>{addressCopied ? 'Copied' : 'Copy'}</Text>
              </PressableScale>
            </View>
            <View style={styles.netPill}>
              <LivePulseDot active size={7} />
              <Text style={styles.netText}>
                {MONAD_CONFIG.chainName} · ~1s finality
              </Text>
            </View>
          </PressableScale>
        </FadeInView>

        <FadeInView delay={80} translateY={8}>
          <Text style={styles.group}>Preferences</Text>
          <View style={styles.card}>
            {toggleRow(
              'Sound effects',
              'Chime when a payment completes',
              {colors: ['#F59E0B', '#FF6B6B'], icon: <Text style={styles.glyph}>♪</Text>},
              soundOn,
              v => {
                setSoundOn(v);
                setSoundEnabled(v);
                triggerHaptic.selection();
                if (v) {
                  playSound('tap_connect');
                }
              },
            )}
            {toggleRow(
              'Dark mode',
              isDark ? 'On' : 'Off',
              {colors: ['#7C5CFF', '#3D7BFF'], icon: <Text style={styles.glyph}>{isDark ? '☾' : '☀'}</Text>},
              isDark,
              v => {
                triggerHaptic.selection();
                setDarkMode(v);
              },
              true,
            )}
          </View>
        </FadeInView>

        <FadeInView delay={120} translateY={8}>
          <Text style={styles.group}>Account</Text>
          <View style={styles.card}>
            {row('profile', 'Profile & identity', {colors: ['#3D7BFF', '#7C5CFF'], icon: <UserIcon size={16} color="#FFFFFF" />}, () => navigation.navigate('AccountInfo'), username ? `@${username}` : 'Claim handle')}
            {row('addr', 'Wallet address', {colors: ['#14B8A6', '#2DD4A0'], icon: <WalletCardIcon size={16} color="#FFFFFF" />}, () => navigation.navigate('AccountInfo'), address ? truncateAddress(address, 5, 4) : undefined)}
            {row('key', 'Secret key', {colors: ['#EC4899', '#8B5CF6'], icon: <KeyIcon size={16} color="#FFFFFF" />}, () => navigation.navigate('AccountInfo'), 'Encrypted', true)}
          </View>
        </FadeInView>

        <FadeInView delay={160} translateY={8}>
          <Text style={styles.group}>More</Text>
          <View style={styles.card}>
            {row('net', 'Network details', {colors: ['#0EA5E9', '#3D7BFF'], icon: <GlobeIcon size={16} color="#FFFFFF" />}, () => navigation.navigate('NetworkInfo'), 'Live')}
            {row('about', 'About TapPay', {colors: ['#64748B', '#475569'], icon: <InfoIcon size={16} color="#FFFFFF" />}, () => navigation.navigate('AboutTapPay'), 'v0.0.1', true)}
          </View>
        </FadeInView>

        <FadeInView delay={200} translateY={8}>
          <View style={[styles.card, styles.dangerCard]}>
            {row('reset', 'Reset Wallet', {colors: ['#FF5C5C', '#E5484D'], icon: <PowerIcon size={16} color="#FFFFFF" />}, handleResetWallet, undefined, true)}
          </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.background},
    content: {paddingHorizontal: 20, gap: 4},
    pageTitle: {fontSize: 32, fontWeight: '800', color: c.text, letterSpacing: -1, marginBottom: 14},
    hero: {borderRadius: 28, overflow: 'hidden', padding: 18, gap: 16},
    heroRipple: {position: 'absolute', right: -70, top: -80},
    heroRow: {flexDirection: 'row', alignItems: 'center', gap: 14},
    avatarRing: {width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center'},
    avatar: {width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center'},
    avatarText: {fontSize: 22, fontWeight: '800', color: '#FFFFFF'},
    heroText: {flex: 1},
    heroName: {fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5},
    heroAddr: {fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 2, fontFamily: 'monospace'},
    copyChip: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(10,11,30,0.3)'},
    copyChipText: {fontSize: 12, fontWeight: '700', color: '#FFFFFF'},
    netPill: {flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(10,11,30,0.3)'},
    netText: {fontSize: 12, fontWeight: '600', color: '#FFFFFF'},
    group: {fontSize: 13, fontWeight: '700', color: c.textMuted, marginTop: 22, marginBottom: 8, marginLeft: 4},
    card: {borderRadius: 22, backgroundColor: c.surfaceSolid, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14},
    dangerCard: {marginTop: 22},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13},
    rowBorder: {borderBottomWidth: 1, borderBottomColor: c.borderSubtle},
    rowTextCol: {flex: 1},
    rowTitle: {flex: 1, fontSize: 15, fontWeight: '600', color: c.text},
    rowSub: {fontSize: 12, color: c.textMuted, marginTop: 2},
    rowValue: {fontSize: 13, color: c.textMuted},
    chevron: {fontSize: 20, color: c.textSubtle},
    glyph: {fontSize: 17, color: '#FFFFFF', fontWeight: '700'},
  });
}
