/**
 * HomeScreen — Wallet home: greeting row, big centred balance over a fan of wallet
 * cards, address chip, quick actions, assets, recent activity and wallet shortcuts in
 * rounded grouped cards. Solid surfaces in both themes (white on soft grey in light,
 * graphite on black in dark).
 */

import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl, useWindowDimensions, Platform} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {ethers} from 'ethers';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import {truncateAddress} from '../utils/format';
import {triggerHaptic} from '../utils/haptics';
import {RootStackParamList} from '../navigation/AppNavigator';
import {
  getTransactionHistory,
  getTxTokenSymbol,
  initHistory,
  isStuck,
  TransactionRecord,
} from '../services/history';
import {initNfc, isNfcEnabled, isNfcSupported} from '../services/nfcReader';
import PressableScale from '../components/PressableScale';
import FadeInView from '../components/FadeInView';
import Svg, {Defs, RadialGradient, Rect, Stop} from 'react-native-svg';
import WalletCardStack from '../components/WalletCardStack';
import SendMethodSheet, {SendMethod} from '../components/SendMethodSheet';
import {ContactlessMark} from '../components/OnboardingIcons';
import {
  AlertIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
} from '../components/HomeIcons';
import {preloadSounds} from '../utils/sounds';
import {reconcilePendingTransactions} from '../services/txReconcile';
import type {AppColors} from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HIDDEN = '••••';

/** Icon tile colours (iOS system palette); the same in both themes. */
const tint = {
  blue: '#0A84FF',
  green: '#30C85A',
  indigo: '#5E5CE6',
  orange: '#FF9F0A',
  purple: '#AF52DE',
  red: '#FF453A',
};

function txTitle(tx: TransactionRecord): string {
  if (tx.counterpartyUsername) {
    return `@${tx.counterpartyUsername}`;
  }
  return truncateAddress(tx.counterparty, 6, 4);
}

function txStatus(tx: TransactionRecord): string {
  switch (tx.status) {
    case 'pending':
      return isStuck(tx) ? 'Stuck' : 'Pending';
    case 'failed':
      return 'Failed';
    case 'dropped':
      return 'Not sent';
    case 'cancelled':
      return 'Cancelled';
    default:
      return '';
  }
}

function txSubtitle(tx: TransactionRecord): string {
  const kind =
    tx.direction === 'received' ? 'Received' : tx.counterpartyUsername ? 'Sent' : 'Tap payment';
  const status = txStatus(tx);
  return `${status || kind} · ${shortWhen(tx.timestamp)}`;
}

/** Compact time for a home row: "4:02 PM" today, "Yesterday", else "Nov 25". */
export function shortWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
  }
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString([], {month: 'short', day: 'numeric'});
}

function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) {
    return 'Good evening';
  }
  if (h < 12) {
    return 'Good morning';
  }
  if (h < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const {address, balance, ausdBalance, username, refreshBalance} = useWallet();
  const {colors, isDark} = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
  const shortAddress = address ? truncateAddress(address, 6, 4) : '—';
  const holder = username ? `@${username}` : shortAddress;

  const loadRecent = useCallback(() => {
    setRecentTx(getTransactionHistory().slice(0, 4));
  }, []);

  useEffect(() => {
    initHistory().then(() => {
      loadRecent();
      // Settle payments that were still pending when the app last stopped waiting.
      reconcilePendingTransactions().then(updated => {
        if (updated > 0) {
          loadRecent();
        }
      });
    });
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
    await reconcilePendingTransactions();
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

  const openTx = (tx: TransactionRecord) => {
    triggerHaptic.selection();
    navigation.navigate('TransactionStatus', {
      txHash: tx.txHash,
      amount: tx.amount,
      recipient: tx.counterparty,
      direction: tx.direction,
      counterpartyUsername: tx.counterpartyUsername,
      tokenSymbol: getTxTokenSymbol(tx),
      initialStatus: tx.status,
      completedAt: tx.timestamp,
    });
  };

  const actions: {key: string; label: string; color: string; icon: React.ReactNode; onPress: () => void}[] = [
    {
      key: 'send',
      label: 'Send',
      color: tint.blue,
      icon: <ArrowUpRightIcon size={22} color="#FFFFFF" />,
      onPress: () => setSendSheet(true),
    },
    {
      key: 'receive',
      label: 'Receive',
      color: tint.green,
      icon: <ArrowDownLeftIcon size={22} color="#FFFFFF" />,
      onPress: () => navigation.navigate('ReceiveTap'),
    },
    {
      key: 'tap',
      label: 'Tap to Pay',
      color: tint.indigo,
      icon: <ContactlessMark size={22} color="#FFFFFF" />,
      onPress: () => navigation.navigate('SendTap'),
    },
    {
      key: 'activity',
      label: 'Activity',
      color: tint.orange,
      icon: <ClockIcon size={22} color="#FFFFFF" />,
      onPress: () => navigation.navigate('History'),
    },
  ];

  const contentWidth = width - 40;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 10, paddingBottom: insets.bottom + 128},
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
        {/* Greeting row */}
        <FadeInView delay={0} translateY={6}>
          <View style={styles.header}>
            <PressableScale
              onPress={() => navigation.navigate('AccountInfo')}
              accessibilityLabel="Open profile"
              contentStyle={styles.profile}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.flexShrink}>
                <Text style={styles.greeting}>{greeting()}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {holder}
                </Text>
              </View>
            </PressableScale>
            <PressableScale
              hitSlop={8}
              contentStyle={styles.roundButton}
              onPress={() => {
                triggerHaptic.selection();
                setHidden(v => !v);
              }}
              accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}>
              {hidden ? <EyeOffIcon size={20} color={colors.text} /> : <EyeIcon size={20} color={colors.text} />}
            </PressableScale>
          </View>
        </FadeInView>

        {/* Balance + cards */}
        <FadeInView delay={40} translateY={10}>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Total balance</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {hidden ? '••••••' : displayAusd}
              </Text>
              <Text style={styles.unit}>AUSD</Text>
            </View>
            <Text style={styles.subAmount}>{hidden ? `${HIDDEN} MON` : `+ ${balanceMon} MON`}</Text>

            <View style={styles.cards}>
              <View style={styles.glow} pointerEvents="none">
                <Svg width="100%" height="100%">
                  <Defs>
                    <RadialGradient id="homeGlow" cx="50%" cy="50%" r="50%">
                      <Stop offset="0" stopColor="#3B82F6" stopOpacity={isDark ? 0.32 : 0.16} />
                      <Stop offset="1" stopColor="#3B82F6" stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#homeGlow)" />
                </Svg>
              </View>
              <WalletCardStack holder={holder} width={contentWidth} />
            </View>

            <PressableScale
              onPress={copyAddress}
              accessibilityLabel="Copy wallet address"
              contentStyle={styles.chip}>
              {copied ? (
                <CheckIcon size={14} color={colors.success} />
              ) : (
                <CopyIcon size={14} color={colors.textMuted} />
              )}
              <Text style={[styles.chipText, copied && {color: colors.success}]}>
                {copied ? 'Address copied' : shortAddress}
              </Text>
            </PressableScale>
          </View>
        </FadeInView>

        {/* Quick actions */}
        <FadeInView delay={80} translateY={10}>
          <View style={styles.actions}>
            {actions.map(a => (
              <PressableScale
                key={a.key}
                style={styles.flex}
                contentStyle={styles.action}
                accessibilityLabel={a.label}
                onPress={() => {
                  triggerHaptic.impactMedium();
                  a.onPress();
                }}>
                <View style={[styles.actionIcon, {backgroundColor: a.color}]}>{a.icon}</View>
                <Text style={styles.actionLabel} numberOfLines={1}>
                  {a.label}
                </Text>
              </PressableScale>
            ))}
          </View>
          <View style={styles.nfcRow}>
            <View style={[styles.dot, {backgroundColor: nfcReady ? colors.success : colors.textSubtle}]} />
            <Text style={styles.nfcText}>
              {nfcReady ? 'Ready to tap' : 'NFC is off. Turn it on in Settings.'}
            </Text>
          </View>
        </FadeInView>

        {/* Assets */}
        <FadeInView delay={110} translateY={10}>
          <Text style={styles.sectionTitle}>Assets</Text>
          <View style={styles.group}>
            <AssetRow
              styles={styles}
              color={tint.blue}
              glyph="$"
              name="Agora Dollar"
              detail="AUSD · Stablecoin"
              amount={hidden ? HIDDEN : displayAusd}
              symbol="AUSD"
            />
            <View style={styles.sep} />
            <AssetRow
              styles={styles}
              color={tint.purple}
              glyph="M"
              name="Monad"
              detail="MON · Pays network fees"
              amount={hidden ? HIDDEN : balanceMon}
              symbol="MON"
            />
          </View>
        </FadeInView>

        {/* Recent activity */}
        <FadeInView delay={140} translateY={10}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>Recent activity</Text>
            {recentTx.length > 0 ? (
              <PressableScale onPress={() => navigation.navigate('History')} hitSlop={10} accessibilityLabel="See all activity">
                <Text style={styles.link}>See all</Text>
              </PressableScale>
            ) : null}
          </View>
          <View style={styles.group}>
            {recentTx.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <ContactlessMark size={26} color={colors.accent} />
                </View>
                <Text style={styles.emptyTitle}>No payments yet</Text>
                <Text style={styles.emptySub}>
                  Hold phones together to pay, or share{'\n'}your TapPay ID to get paid.
                </Text>
                <PressableScale
                  onPress={() => navigation.navigate('ReceiveTap')}
                  accessibilityLabel="Receive a payment"
                  contentStyle={styles.emptyButton}>
                  <Text style={styles.emptyButtonText}>Receive a payment</Text>
                </PressableScale>
              </View>
            ) : (
              recentTx.map((tx, i) => {
                const received = tx.direction === 'received';
                const status = tx.status;
                const problem = status === 'failed' || status === 'dropped' || status === 'cancelled';
                const iconColor = problem
                  ? tint.red
                  : status === 'pending'
                  ? tint.orange
                  : received
                  ? tint.green
                  : tint.blue;
                return (
                  <React.Fragment key={tx.id}>
                    {i > 0 && <View style={styles.sep} />}
                    <PressableScale
                      scaleTo={0.99}
                      onPress={() => openTx(tx)}
                      accessibilityLabel={`${received ? 'Received from' : 'Sent to'} ${txTitle(tx)}, ${tx.amount} ${getTxTokenSymbol(tx)}`}
                      contentStyle={styles.row}>
                      <View style={[styles.rowIcon, {backgroundColor: iconColor}]}>
                        {problem ? (
                          <AlertIcon size={20} color="#FFFFFF" />
                        ) : status === 'pending' ? (
                          <ClockIcon size={18} color="#FFFFFF" />
                        ) : received ? (
                          <ArrowDownLeftIcon size={18} color="#FFFFFF" />
                        ) : (
                          <ArrowUpRightIcon size={18} color="#FFFFFF" />
                        )}
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {txTitle(tx)}
                        </Text>
                        <Text
                          style={[
                            styles.rowSub,
                            status === 'pending' && {color: colors.warning},
                            status === 'failed' && {color: colors.danger},
                          ]}
                          numberOfLines={1}>
                          {txSubtitle(tx)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.rowAmount,
                          received && !problem && {color: colors.success},
                          problem && styles.rowAmountMuted,
                        ]}
                        numberOfLines={1}>
                        {hidden ? HIDDEN : `${received ? '+' : '−'}${tx.amount}`} {getTxTokenSymbol(tx)}
                      </Text>
                    </PressableScale>
                  </React.Fragment>
                );
              })
            )}
          </View>
        </FadeInView>

      </ScrollView>

      <SendMethodSheet visible={sendSheet} onClose={() => setSendSheet(false)} onSelect={onSelectSend} />
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

function AssetRow({
  styles,
  color,
  glyph,
  name,
  detail,
  amount,
  symbol,
}: {
  styles: Styles;
  color: string;
  glyph: string;
  name: string;
  detail: string;
  amount: string;
  symbol: string;
}) {
  return (
    <View style={styles.row} accessibilityLabel={`${name}, ${amount} ${symbol}`}>
      <View style={[styles.rowIcon, {backgroundColor: color}]}>
        <Text style={styles.rowGlyph}>{glyph}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowAmount} numberOfLines={1}>
          {amount}
        </Text>
        <Text style={styles.rowSub}>{symbol}</Text>
      </View>
    </View>
  );
}

function createStyles(c: AppColors, isDark: boolean) {
  // Solid surfaces: white cards on soft grey (light), graphite cards on black (dark).
  const surface = isDark ? '#1C1C1E' : '#FFFFFF';
  const raised = isDark ? '#2C2C2E' : '#E9E9EE';
  const cardShadow = isDark
    ? {}
    : Platform.select({
        ios: {shadowColor: '#1C2A4A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: {width: 0, height: 3}},
        android: {elevation: 1},
        default: {},
      });
  return StyleSheet.create({
    screen: {flex: 1, backgroundColor: c.background},
    flex: {flex: 1},
    flexShrink: {flexShrink: 1},
    content: {paddingHorizontal: 20},

    header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
    profile: {flexDirection: 'row', alignItems: 'center', gap: 11, flexShrink: 1},
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {fontSize: 17, fontWeight: '700', color: '#FFFFFF'},
    greeting: {fontSize: 13, color: c.textMuted},
    name: {fontSize: 17, fontWeight: '600', color: c.text, letterSpacing: -0.2, marginTop: 1},
    roundButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...cardShadow,
    },

    hero: {alignItems: 'center', marginTop: 26},
    heroLabel: {fontSize: 15, color: c.textMuted, fontWeight: '500'},
    amountRow: {flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4, maxWidth: '100%'},
    amount: {flexShrink: 1, fontSize: 46, fontWeight: '700', color: c.text, letterSpacing: -1.2},
    unit: {fontSize: 18, fontWeight: '600', color: c.textMuted},
    subAmount: {fontSize: 14, color: c.textMuted, marginTop: 2},
    cards: {marginTop: 22},
    glow: {position: 'absolute', left: -24, right: -24, top: -60, bottom: -60},
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 18,
      paddingHorizontal: 14,
      height: 32,
      borderRadius: 16,
      backgroundColor: raised,
    },
    chipText: {fontSize: 13, fontWeight: '500', color: c.textMuted, letterSpacing: 0.2},

    actions: {flexDirection: 'row', gap: 10, marginTop: 26},
    action: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 20,
      backgroundColor: surface,
      ...cardShadow,
    },
    actionIcon: {width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center'},
    actionLabel: {fontSize: 13, fontWeight: '600', color: c.text},
    nfcRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14},
    dot: {width: 7, height: 7, borderRadius: 4},
    nfcText: {fontSize: 13, color: c.textMuted},

    sectionHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 28, marginBottom: 10},
    sectionTitle: {fontSize: 20, fontWeight: '700', color: c.text, letterSpacing: -0.3, marginTop: 28, marginBottom: 10},
    sectionTitleInline: {marginTop: 0, marginBottom: 0},
    link: {fontSize: 15, color: c.accent, fontWeight: '500'},
    group: {backgroundColor: surface, borderRadius: 22, overflow: 'hidden', ...cardShadow},
    sep: {height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginLeft: 70},

    row: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 13},
    rowIcon: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    rowGlyph: {fontSize: 17, fontWeight: '700', color: '#FFFFFF'},
    rowTitle: {fontSize: 16, fontWeight: '500', color: c.text},
    rowSub: {fontSize: 13, color: c.textMuted, marginTop: 2},
    rowRight: {alignItems: 'flex-end'},
    rowAmount: {fontSize: 16, fontWeight: '600', color: c.text, maxWidth: 150},
    rowAmountMuted: {color: c.textSubtle, textDecorationLine: 'line-through'},

    empty: {alignItems: 'center', paddingVertical: 26, paddingHorizontal: 20},
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.accentWash,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {fontSize: 17, fontWeight: '600', color: c.text},
    emptySub: {fontSize: 14, lineHeight: 19, color: c.textMuted, textAlign: 'center', marginTop: 4},
    emptyButton: {
      marginTop: 16,
      paddingHorizontal: 18,
      height: 38,
      borderRadius: 19,
      backgroundColor: raised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyButtonText: {fontSize: 15, fontWeight: '600', color: c.accent},
  });
}
