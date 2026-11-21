/**
 * HomeScreen — Wallet (Apple Pay style): large title, solid card, Send/Receive
 * buttons, grouped "Latest Transactions" list.
 */

import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl} from 'react-native';
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
import {ContactlessWave} from '../components/AppIcons';
import {
  getTransactionHistory,
  getTxTokenSymbol,
  initHistory,
  TransactionRecord,
} from '../services/history';
import {initNfc, isNfcEnabled, isNfcSupported} from '../services/nfcReader';
import PressableScale from '../components/PressableScale';
import FadeInView from '../components/FadeInView';
import GlassSurface from '../components/GlassSurface';
import AmbientBackground from '../components/AmbientBackground';
import SendMethodSheet, {SendMethod} from '../components/SendMethodSheet';
import {preloadSounds} from '../utils/sounds';
import type {AppColors} from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function txTitle(tx: TransactionRecord): string {
  if (tx.counterpartyUsername) {
    return `@${tx.counterpartyUsername}`;
  }
  return truncateAddress(tx.counterparty, 6, 4);
}

function txSubtitle(tx: TransactionRecord): string {
  const kind =
    tx.direction === 'received' ? 'Received' : tx.counterpartyUsername ? 'Sent' : 'Tap payment';
  return `${kind} · ${formatTimestamp(tx.timestamp)}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {address, balance, ausdBalance, username, refreshBalance} = useWallet();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();

  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false);
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

  const initial = useMemo(
    () => (username ? username.charAt(0) : address ? address.slice(2, 3) : 'T').toUpperCase(),
    [username, address],
  );

  const loadRecent = useCallback(() => {
    setRecentTx(getTransactionHistory().slice(0, 5));
  }, []);

  useEffect(() => {
    initHistory().then(() => loadRecent());
    preloadSounds();
  }, [loadRecent]);

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
    setTimeout(() => {
      navigation.navigate(method === 'nfc' ? 'SendTap' : 'SendPayment');
    }, 120);
  };

  return (
    <View style={styles.screen}>
      <AmbientBackground />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120},
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textMuted}
            colors={[colors.accent]}
          />
        }>
        <FadeInView delay={0} translateY={6}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Wallet</Text>
            <PressableScale
              onPress={() => navigation.navigate('AccountInfo')}
              accessibilityLabel="Open profile"
              contentStyle={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </PressableScale>
          </View>
        </FadeInView>

        <FadeInView delay={40} translateY={10}>
          <GlassSurface radius={30} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.brandRow}>
                <ContactlessWave size={20} color={colors.text} />
                <Text style={styles.brand}>TapPay</Text>
              </View>
              <PressableScale
                hitSlop={12}
                onPress={() => {
                  triggerHaptic.selection();
                  setHidden(v => !v);
                }}
                accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}>
                <Text style={styles.link}>{hidden ? 'Show' : 'Hide'}</Text>
              </PressableScale>
            </View>
            <View>
              <Text style={styles.cardLabel}>Balance</Text>
              <View style={styles.amountRow}>
                <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {hidden ? '••••••' : displayAusd}
                </Text>
                <Text style={styles.unit}>AUSD</Text>
              </View>
            </View>
            <View style={styles.cardBottom}>
              <Text style={styles.meta}>
                {hidden ? '•••• MON' : `${balanceMon} MON`}
              </Text>
              <PressableScale onPress={copyAddress} accessibilityLabel="Copy wallet address">
                <Text style={styles.meta}>
                  {copied ? 'Copied' : address ? truncateAddress(address, 6, 4) : '—'}
                </Text>
              </PressableScale>
            </View>
          </GlassSurface>
        </FadeInView>

        <FadeInView delay={80} translateY={10}>
          <View style={styles.actions}>
            <PressableScale
              style={styles.flex}
              contentStyle={[styles.btn, styles.btnPrimary]}
              accessibilityLabel="Send"
              onPress={() => {
                triggerHaptic.impactMedium();
                setSendSheet(true);
              }}>
              <Text style={styles.btnPrimaryText}>Send</Text>
            </PressableScale>
            <PressableScale
              style={styles.flex}
              contentStyle={[styles.btn, styles.btnSecondary]}
              accessibilityLabel="Receive"
              onPress={() => {
                triggerHaptic.impactMedium();
                navigation.navigate('ReceiveTap');
              }}>
              <Text style={styles.btnSecondaryText}>Receive</Text>
            </PressableScale>
          </View>
          <View style={styles.nfcRow}>
            <View style={[styles.dot, {backgroundColor: nfcReady ? colors.success : colors.textSubtle}]} />
            <Text style={styles.nfcText}>
              {nfcReady ? 'Ready to tap' : 'NFC is off. Turn it on in Settings.'}
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={120} translateY={10}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Latest Transactions</Text>
            <PressableScale onPress={() => navigation.navigate('History')} hitSlop={10}>
              <Text style={styles.link}>See All</Text>
            </PressableScale>
          </View>
          <GlassSurface radius={24} style={styles.group}>
            {recentTx.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No Transactions</Text>
                <Text style={styles.emptySub}>Your payments will appear here.</Text>
              </View>
            ) : (
              recentTx.map((tx, i) => {
                const received = tx.direction === 'received';
                return (
                  <View key={tx.id} style={[styles.txRow, i > 0 && styles.txBorder]}>
                    <View style={styles.txIcon}>
                      <Text style={[styles.txIconText, {color: received ? colors.success : colors.text}]}>
                        {received ? '↓' : '↑'}
                      </Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {txTitle(tx)}
                      </Text>
                      <Text style={styles.txSub} numberOfLines={1}>
                        {txSubtitle(tx)}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, received && {color: colors.success}]}>
                      {received ? '+' : '−'}
                      {tx.amount} {getTxTokenSymbol(tx)}
                    </Text>
                  </View>
                );
              })
            )}
          </GlassSurface>
        </FadeInView>
      </ScrollView>

      <SendMethodSheet visible={sendSheet} onClose={() => setSendSheet(false)} onSelect={onSelectSend} />
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.background},
    flex: {flex: 1},
    content: {paddingHorizontal: 20, gap: 18},
    titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    title: {fontSize: 34, fontWeight: '700', color: c.text, letterSpacing: 0.4},
    avatar: {width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceElevated, alignItems: 'center', justifyContent: 'center'},
    avatarText: {fontSize: 15, fontWeight: '600', color: c.text},
    card: {
      height: 190,
      padding: 22,
      justifyContent: 'space-between',
    },
    cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    brandRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
    brand: {fontSize: 17, fontWeight: '600', color: c.text, letterSpacing: -0.2},
    link: {fontSize: 15, color: c.accent, fontWeight: '400'},
    cardLabel: {fontSize: 13, color: c.textMuted, marginBottom: 2},
    amountRow: {flexDirection: 'row', alignItems: 'baseline', gap: 8},
    amount: {flexShrink: 1, fontSize: 40, fontWeight: '700', color: c.text, letterSpacing: -0.8},
    unit: {fontSize: 17, fontWeight: '500', color: c.textMuted},
    cardBottom: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    meta: {fontSize: 13, color: c.textMuted},
    actions: {flexDirection: 'row', gap: 12},
    btn: {height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
    btnPrimary: {backgroundColor: c.text},
    btnPrimaryText: {fontSize: 17, fontWeight: '600', color: c.background},
    btnSecondary: {backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'},
    btnSecondaryText: {fontSize: 17, fontWeight: '600', color: c.text},
    nfcRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14},
    dot: {width: 7, height: 7, borderRadius: 4},
    nfcText: {fontSize: 13, color: c.textMuted},
    sectionHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, marginTop: 6},
    sectionTitle: {fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: 0.3},
    group: {},
    txRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12},
    txBorder: {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator},
    txIcon: {width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceElevated, alignItems: 'center', justifyContent: 'center'},
    txIconText: {fontSize: 18, fontWeight: '600'},
    txTitle: {fontSize: 17, fontWeight: '400', color: c.text},
    txSub: {fontSize: 13, color: c.textMuted, marginTop: 1},
    txAmount: {fontSize: 17, fontWeight: '400', color: c.text},
    empty: {alignItems: 'center', paddingVertical: 32, gap: 4},
    emptyTitle: {fontSize: 17, fontWeight: '600', color: c.text},
    emptySub: {fontSize: 13, color: c.textMuted},
  });
}
