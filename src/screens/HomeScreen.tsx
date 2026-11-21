/**
 * HomeScreen — TapPay wallet dashboard.
 * Gradient balance card with ripple motif, quick actions, activity feed,
 * and a floating dock with a pulsing Tap button.
 */

import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {
  AccessibilityInfo,
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {ethers} from 'ethers';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import {truncateAddress, formatTimestamp} from '../utils/format';
import {triggerHaptic} from '../utils/haptics';
import {RootStackParamList} from '../navigation/AppNavigator';
import {
  HistoryIcon,
  SendTapIcon,
  ReceiveTapIcon,
  UserIcon,
} from '../components/AppIcons';
import {
  getTransactionHistory,
  getTxTokenSymbol,
  initHistory,
  TransactionRecord,
} from '../services/history';
import {initNfc, isNfcEnabled, isNfcSupported} from '../services/nfcReader';
import PressableScale from '../components/PressableScale';
import FadeInView from '../components/FadeInView';
import LivePulseDot from '../components/LivePulseDot';
import {GradientFill, RippleRings} from '../components/Gradient';
import SendMethodSheet, {SendMethod} from '../components/SendMethodSheet';
import {preloadSounds} from '../utils/sounds';
import type {AppColors} from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function getTxTitle(tx: TransactionRecord): string {
  if (tx.direction === 'received') {
    return tx.counterpartyUsername
      ? `@${tx.counterpartyUsername}`
      : truncateAddress(tx.counterparty, 6, 4);
  }
  if (tx.counterpartyUsername) {
    return `@${tx.counterpartyUsername}`;
  }
  return truncateAddress(tx.counterparty, 6, 4);
}

function getTxSubtitle(tx: TransactionRecord): string {
  const kind =
    tx.direction === 'received'
      ? 'Received'
      : tx.counterpartyUsername
        ? 'Sent'
        : 'Tap payment';
  return `${kind} · ${formatTimestamp(tx.timestamp)}`;
}

const AVATAR_GRADIENTS = [
  ['#3D7BFF', '#7C5CFF'],
  ['#14B8A6', '#2DD4A0'],
  ['#F59E0B', '#FF6B6B'],
  ['#EC4899', '#8B5CF6'],
];

function avatarGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function Avatar({label, seed, size = 44}: {label: string; seed: string; size?: number}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <GradientFill colors={avatarGradient(seed)} angle={135} />
      <Text style={{color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.4}}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {address, balance, ausdBalance, username, refreshBalance} = useWallet();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();

  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [recentTx, setRecentTx] = useState<TransactionRecord[]>([]);
  const [nfcReady, setNfcReady] = useState(false);
  const [sendSheet, setSendSheet] = useState(false);

  const balanceMon = useMemo(() => {
    const num = parseFloat(ethers.formatEther(balance));
    return num.toLocaleString(undefined, {maximumFractionDigits: 3});
  }, [balance]);

  const displayAusd = useMemo(() => {
    if (ausdBalance === undefined) {
      return '0.00';
    }
    const num = parseFloat(ethers.formatUnits(ausdBalance || 0n, 6));
    return num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }, [ausdBalance]);

  const profileLetter = useMemo(() => {
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    if (address) {
      return address.slice(2, 3).toUpperCase();
    }
    return 'T';
  }, [username, address]);

  const loadRecent = useCallback(() => {
    setRecentTx(getTransactionHistory().slice(0, 5));
  }, []);

  useEffect(() => {
    initHistory().then(() => loadRecent());
    preloadSounds();
  }, [loadRecent]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) {
        setReducedMotion(enabled);
      }
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      await initNfc();
      const supported = await isNfcSupported();
      const enabled = supported ? await isNfcEnabled() : false;
      setNfcReady(supported && enabled);
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    triggerHaptic.impactMedium();
    setRefreshing(true);
    await refreshBalance();
    loadRecent();
    setRefreshing(false);
  }, [refreshBalance, loadRecent]);

  const copyAddress = () => {
    if (!address) {
      return;
    }
    triggerHaptic.impactMedium();
    Clipboard.setString(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const onSelectSend = (method: SendMethod) => {
    setSendSheet(false);
    // Let the sheet finish closing before the screen transition starts.
    setTimeout(() => {
      navigation.navigate(method === 'nfc' ? 'SendTap' : 'SendPayment');
    }, 120);
  };

  const quick = [
    {label: 'Send', colors: ['#3D7BFF', '#7C5CFF'], icon: <SendTapIcon size={22} color="#FFFFFF" />, onPress: () => setSendSheet(true)},
    {label: 'Receive', colors: ['#14B8A6', '#2DD4A0'], icon: <ReceiveTapIcon size={22} color="#FFFFFF" />, onPress: () => navigation.navigate('ReceiveTap')},
    {label: 'Activity', colors: ['#F59E0B', '#FF6B6B'], icon: <HistoryIcon size={22} color="#FFFFFF" />, onPress: () => navigation.navigate('History')},
    {label: 'Profile', colors: ['#EC4899', '#8B5CF6'], icon: <UserIcon size={20} color="#FFFFFF" />, onPress: () => navigation.navigate('AccountInfo')},
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, {paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120}]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }>
        <FadeInView delay={0} translateY={6}>
          <View style={styles.topBar}>
            <PressableScale
              onPress={() => navigation.navigate('AccountInfo')}
              accessibilityLabel="Open profile"
              contentStyle={styles.who}>
              <Avatar label={profileLetter} seed={username || address || 'tap'} />
              <View>
                <Text style={styles.hello}>Welcome back</Text>
                <Text style={styles.handle}>{username ? `@${username}` : 'TapPay user'}</Text>
              </View>
            </PressableScale>
            <View style={styles.nfcPill} accessibilityLabel={nfcReady ? 'NFC ready' : 'NFC off'}>
              <LivePulseDot active={nfcReady} size={7} />
              <Text style={styles.nfcPillText}>{nfcReady ? 'NFC ready' : 'NFC off'}</Text>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={50} translateY={14}>
          <View style={styles.hero}>
            <GradientFill
              colors={['#2B5BE8', '#5B4BFF', '#8B5CF6']}
              angle={125}
              glows={[
                {color: '#64D2FF', cx: 0.95, cy: 0.05, r: 0.7, opacity: 0.55},
                {color: '#FF7AC6', cx: 0.0, cy: 1.0, r: 0.6, opacity: 0.35},
              ]}
            />
            <RippleRings size={280} style={styles.heroRipple} opacity={0.22} rings={6} />
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>TOTAL BALANCE</Text>
              <PressableScale
                onPress={() => {
                  triggerHaptic.selection();
                  setBalanceHidden(v => !v);
                }}
                hitSlop={12}
                accessibilityLabel={balanceHidden ? 'Show balances' : 'Hide balances'}
                contentStyle={styles.eye}>
                <Text style={styles.eyeText}>{balanceHidden ? 'Show' : 'Hide'}</Text>
              </PressableScale>
            </View>
            <View style={styles.heroAmountRow}>
              <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {balanceHidden ? '••••••' : displayAusd}
              </Text>
              <Text style={styles.heroUnit}>AUSD</Text>
            </View>
            <View style={styles.heroBottom}>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipLabel}>MON</Text>
                <Text style={styles.heroChipValue}>{balanceHidden ? '••••' : balanceMon}</Text>
              </View>
              <PressableScale onPress={copyAddress} accessibilityLabel="Copy wallet address" contentStyle={styles.heroChip}>
                <Text style={styles.heroChipValue}>
                  {copied ? 'Copied' : address ? truncateAddress(address, 6, 4) : '—'}
                </Text>
              </PressableScale>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={100} translateY={12}>
          <View style={styles.quickRow}>
            {quick.map(q => (
              <PressableScale
                key={q.label}
                style={styles.quickItem}
                contentStyle={styles.quickInner}
                accessibilityLabel={q.label}
                onPress={() => {
                  triggerHaptic.impactMedium();
                  q.onPress();
                }}>
                <View style={styles.quickIcon}>
                  <GradientFill colors={q.colors} angle={135} />
                  {q.icon}
                </View>
                <Text style={styles.quickLabel}>{q.label}</Text>
              </PressableScale>
            ))}
          </View>
        </FadeInView>

        <FadeInView delay={150} translateY={12}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <PressableScale onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAll}>See all</Text>
            </PressableScale>
          </View>
          {recentTx.length === 0 ? (
            <View style={styles.empty}>
              <RippleRings size={120} color={colors.accent} opacity={0.5} rings={4} />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySub}>Make your first tap payment and it shows up here.</Text>
            </View>
          ) : (
            <View style={styles.feed}>
              {recentTx.map(tx => {
                const received = tx.direction === 'received';
                const title = getTxTitle(tx);
                return (
                  <View key={tx.id} style={styles.txRow}>
                    <Avatar
                      label={received ? '↓' : title.replace('@', '').charAt(0).toUpperCase() || '↑'}
                      seed={tx.counterparty}
                      size={44}
                    />
                    <View style={styles.txMeta}>
                      <Text style={styles.txTitle} numberOfLines={1}>{title}</Text>
                      <Text style={styles.txSub} numberOfLines={1}>{getTxSubtitle(tx)}</Text>
                    </View>
                    <Text style={[styles.txAmount, received && styles.txAmountIn]}>
                      {received ? '+' : '−'}
                      {tx.amount} {getTxTokenSymbol(tx)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </FadeInView>
      </ScrollView>

      <SendMethodSheet visible={sendSheet} onClose={() => setSendSheet(false)} onSelect={onSelectSend} />
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.background},
    content: {paddingHorizontal: 20, gap: 22},
    topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    who: {flexDirection: 'row', alignItems: 'center', gap: 12},
    hello: {fontSize: 12, color: c.textMuted, fontWeight: '500'},
    handle: {fontSize: 17, color: c.text, fontWeight: '700', letterSpacing: -0.3},
    nfcPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: c.surfaceSolid,
      borderWidth: 1,
      borderColor: c.border,
    },
    nfcPillText: {fontSize: 12, fontWeight: '600', color: c.text},
    hero: {borderRadius: 30, overflow: 'hidden', padding: 22, minHeight: 200, justifyContent: 'space-between'},
    heroRipple: {position: 'absolute', right: -90, top: -90},
    heroTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    heroLabel: {fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 1.6},
    eye: {paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)'},
    eyeText: {fontSize: 12, fontWeight: '600', color: '#FFFFFF'},
    heroAmountRow: {flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10},
    heroAmount: {flexShrink: 1, fontSize: 46, fontWeight: '800', color: '#FFFFFF', letterSpacing: -2},
    heroUnit: {fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.8)'},
    heroBottom: {flexDirection: 'row', gap: 8, marginTop: 18},
    heroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: 'rgba(10,11,30,0.28)',
    },
    heroChipLabel: {fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1},
    heroChipValue: {fontSize: 13, fontWeight: '700', color: '#FFFFFF'},
    quickRow: {flexDirection: 'row', justifyContent: 'space-between'},
    quickItem: {flex: 1},
    quickInner: {alignItems: 'center', gap: 8},
    quickIcon: {width: 60, height: 60, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'},
    quickLabel: {fontSize: 12, fontWeight: '600', color: c.text},
    sectionHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12},
    sectionTitle: {fontSize: 18, fontWeight: '800', color: c.text, letterSpacing: -0.4},
    seeAll: {fontSize: 13, fontWeight: '600', color: c.accent},
    feed: {gap: 4},
    txRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10},
    txMeta: {flex: 1},
    txTitle: {fontSize: 15, fontWeight: '600', color: c.text},
    txSub: {fontSize: 12, color: c.textMuted, marginTop: 2},
    txAmount: {fontSize: 15, fontWeight: '700', color: c.text},
    txAmountIn: {color: c.success},
    empty: {alignItems: 'center', paddingVertical: 26, gap: 6},
    emptyTitle: {fontSize: 16, fontWeight: '700', color: c.text, marginTop: -60},
    emptySub: {fontSize: 13, color: c.textMuted, textAlign: 'center', maxWidth: 240, marginTop: 2, marginBottom: 40},
  });
}
