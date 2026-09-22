/**
 * HomeScreen — TapPay wallet dashboard
 */

import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {ethers} from 'ethers';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWallet} from '../context/WalletContext';
import {truncateAddress, formatTimestamp} from '../utils/format';
import {triggerHaptic} from '../utils/haptics';
import {RootStackParamList} from '../navigation/AppNavigator';
import BrandLogo from '../components/BrandLogo';
import {ContactlessWave} from '../components/AppIcons';
import {getTransactionHistory, initHistory, TransactionRecord} from '../services/history';
import {initNfc, isNfcEnabled, isNfcSupported} from '../services/nfcReader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MON_USD_ESTIMATE = 0.238;

function getTxBadge(tx: TransactionRecord): {label: string; variant: 'tap' | 'direct' | 'received'} {
  if (tx.direction === 'received') {
    return {label: 'Received', variant: 'received'};
  }
  if (tx.counterpartyUsername) {
    return {label: 'Direct Transfer', variant: 'direct'};
  }
  return {label: 'Paid with Tap', variant: 'tap'};
}

function getTxIconMeta(tx: TransactionRecord): {letter: string; color: string; bg: string} {
  if (tx.direction === 'received') {
    return {letter: '↓', color: '#30D158', bg: 'rgba(48, 209, 88, 0.15)'};
  }
  const letter = tx.counterpartyUsername
    ? tx.counterpartyUsername.charAt(0).toUpperCase()
    : tx.counterparty.slice(2, 3).toUpperCase();
  if (tx.counterpartyUsername) {
    return {letter: `@${letter}`.slice(0, 2) === '@@' ? letter : letter, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.16)'};
  }
  return {letter, color: '#64D2FF', bg: 'rgba(100, 210, 255, 0.14)'};
}

function getTxTitle(tx: TransactionRecord): string {
  if (tx.direction === 'received') {
    return tx.counterpartyUsername
      ? `Received from @${tx.counterpartyUsername}`
      : `Received from ${truncateAddress(tx.counterparty, 6, 4)}`;
  }
  if (tx.counterpartyUsername) {
    return `@${tx.counterpartyUsername}`;
  }
  return truncateAddress(tx.counterparty, 8, 4);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {address, balance, username, refreshBalance} = useWallet();
  const navigation = useNavigation<NavigationProp>();

  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [recentTx, setRecentTx] = useState<TransactionRecord[]>([]);
  const [nfcReady, setNfcReady] = useState(false);

  const terminalStatus = useMemo(() => {
    if (nfcReady) {
      return {label: 'NFC Ready', caption: 'Tap to pay in stores', ready: true};
    }
    return {label: 'NFC Off', caption: 'Enable NFC in settings', ready: false};
  }, [nfcReady]);

  const balanceMon = useMemo(() => {
    const num = parseFloat(ethers.formatEther(balance));
    return num.toLocaleString(undefined, {maximumFractionDigits: 3});
  }, [balance]);

  const balanceUsd = useMemo(() => {
    const num = parseFloat(ethers.formatEther(balance));
    return (num * MON_USD_ESTIMATE).toFixed(2);
  }, [balance]);

  const profileLetter = useMemo(() => {
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    if (address) {
      return address.slice(2, 3).toUpperCase();
    }
    return 'A';
  }, [username, address]);

  const loadRecent = useCallback(() => {
    const list = getTransactionHistory();
    setRecentTx(list.slice(0, 4));
  }, []);

  useEffect(() => {
    initHistory().then(() => loadRecent());
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
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedCardNumber = address
    ? `${address.slice(0, 4)} •••• •••• ${address.slice(-4)}`.toUpperCase()
    : '0X00 •••• •••• 0000';

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 10, paddingBottom: 120},
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={['#FFFFFF']}
          />
        }>
        {/* Header */}
        <View style={styles.topBar}>
          <View style={styles.brandBlock}>
            <BrandLogo size={34} color="#FFFFFF" />
            <View style={styles.brandTextBlock}>
              <Text style={styles.brandTitle}>TapPay</Text>
              <Text style={styles.brandTagline}>TAP • PAY • GO</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.networkPill}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('NetworkInfo')}>
              <View style={styles.liveDot} />
              <Text style={styles.networkText}>Monad</Text>
              <Text style={styles.chevronSmall}>⌄</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileCircle}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AccountInfo')}>
              <Text style={styles.profileLetter}>{profileLetter}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero headline */}
        <View style={styles.heroRow}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroLineWhite}>Your Money.</Text>
            <Text style={styles.heroLineAccent}>Without Limits.</Text>
            <Text style={styles.heroSubtitle}>
              Pay in-store with NFC or online on Monad.
            </Text>
          </View>
          <View style={styles.heroWaveWrap}>
            <ContactlessWave size={34} color="#0A84FF" />
          </View>
        </View>

        {/* Virtual card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardBrand}>
                  <BrandLogo size={22} color="#FFFFFF" />
                  <Text style={styles.cardBrandText}>TapPay</Text>
                </View>
                <View style={styles.cardTopRight}>
                  <ContactlessWave size={20} color="#8E8E93" />
                  <View style={styles.monadBadge}>
                    <Text style={styles.monadBadgeText}>M</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardMidRow}>
                <Text style={styles.cardNumberText}>{formattedCardNumber}</Text>
                <TouchableOpacity
                  style={[styles.copyChip, copied && styles.copiedChip]}
                  onPress={copyAddress}
                  activeOpacity={0.7}>
                  <Text style={styles.copyChipText}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardBottomRow}>
                <View>
                  <Text style={styles.cardHolderLabel}>CARDHOLDER</Text>
                  <Text style={styles.cardHolderName}>
                    {username ? `@${username}` : 'TAP-PAY USER'}
                  </Text>
                </View>
                <View style={styles.cardTypeBadge}>
                  <Text style={styles.cardTypeText}>MONAD • NFC</Text>
                </View>
              </View>
          </View>
        </View>

        {/* Primary actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.sendTapButton}
            activeOpacity={0.85}
            onPress={() => {
              triggerHaptic.impactMedium();
              navigation.navigate('SendTap');
            }}>
            <View style={styles.sendTapContent}>
              <View style={styles.sendTapLeft}>
                <View style={styles.sendTapIconWrap}>
                  <ContactlessWave size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.sendTapTitle}>Send Tap (NFC)</Text>
                  <Text style={styles.sendTapSubtitle}>Tap to pay nearby</Text>
                </View>
              </View>
              <Text style={styles.sendTapChevron}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.receiveTapButton}
            activeOpacity={0.85}
            onPress={() => {
              triggerHaptic.impactMedium();
              navigation.navigate('ReceiveTap');
            }}>
            <View style={styles.receiveIconWrap}>
              <View style={styles.scannerCornerTL} />
              <View style={styles.scannerCornerTR} />
              <View style={styles.scannerCornerBL} />
              <View style={styles.scannerCornerBR} />
            </View>
            <View>
              <Text style={styles.receiveTapTitle}>Receive Tap</Text>
              <Text style={styles.receiveTapSubtitle}>Get paid instantly</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.directPayBanner}
          activeOpacity={0.85}
          onPress={() => {
            triggerHaptic.impactMedium();
            navigation.navigate('SendPayment');
          }}>
          <View style={styles.directPayLeft}>
            <View style={styles.directPayCircle}>
              <Text style={styles.directPayGlyph}>@</Text>
            </View>
            <View>
              <Text style={styles.directPayTitle}>Direct Transfer</Text>
              <Text style={styles.directPaySubtitle}>
                Instantly pay to @username or wallet address
              </Text>
            </View>
          </View>
          <Text style={styles.chevronArrow}>›</Text>
        </TouchableOpacity>

        {/* Balance + terminal */}
        <View style={styles.metricGrid}>
          <View style={styles.metricTile}>
            <View style={styles.metricTileHeader}>
              <Text style={styles.metricLabel}>Card Balance</Text>
              <TouchableOpacity
                onPress={() => setBalanceHidden(prev => !prev)}
                activeOpacity={0.7}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Text style={styles.eyeIcon}>{balanceHidden ? '◎' : '◉'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.metricValue}>
              {balanceHidden ? '••••• MON' : `${balanceMon} MON`}
            </Text>
            <Text style={styles.metricUsd}>
              {balanceHidden ? '•••• USD' : `~$${balanceUsd} USD`}
            </Text>

            <View style={styles.balanceFooter}>
              <Text style={styles.metricGain}>+2.4% today</Text>
              <View style={styles.sparkline}>
                {[6, 10, 8, 14, 11, 16, 13].map((h, i) => (
                  <View key={i} style={[styles.sparkBar, {height: h}]} />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.metricTile}>
            <View style={styles.terminalHeader}>
              <View style={styles.terminalDotWrap}>
                <View
                  style={[
                    styles.terminalDot,
                    terminalStatus.ready ? styles.terminalDotOn : styles.terminalDotOff,
                  ]}
                />
              </View>
              <Text style={styles.metricLabel}>Terminal Status</Text>
            </View>

            <Text style={styles.terminalTitle}>{terminalStatus.label}</Text>
            <Text style={styles.terminalCaption}>{terminalStatus.caption}</Text>

            <View style={styles.terminalIconWrap}>
              <ContactlessWave
                size={30}
                color={terminalStatus.ready ? '#30D158' : '#8E8E93'}
              />
            </View>
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Latest Transactions</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('History')}
              activeOpacity={0.7}>
              <Text style={styles.viewAllText}>See All ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionCard}>
            {recentTx.length === 0 ? (
              <View style={styles.emptyFeed}>
                <Text style={styles.emptyText}>No recent transactions</Text>
                <Text style={styles.emptySubtext}>
                  Tap to pay or receive MON to see activity here
                </Text>
              </View>
            ) : (
              recentTx.map((tx, idx) => {
                const badge = getTxBadge(tx);
                const icon = getTxIconMeta(tx);
                return (
                  <View key={tx.id}>
                    {idx > 0 && <View style={styles.txDivider} />}
                    <View style={styles.txRow}>
                      <View style={styles.txLeft}>
                        <View style={[styles.txIconBubble, {backgroundColor: icon.bg}]}>
                          <Text style={[styles.txGlyph, {color: icon.color}]}>
                            {icon.letter}
                          </Text>
                        </View>
                        <View style={styles.txMeta}>
                          <Text style={styles.txCounterparty}>{getTxTitle(tx)}</Text>
                          <Text style={styles.txTime}>{formatTimestamp(tx.timestamp)}</Text>
                        </View>
                      </View>

                      <View style={styles.txRight}>
                        <Text
                          style={[
                            styles.txAmount,
                            tx.direction === 'received'
                              ? styles.txAmountReceived
                              : styles.txAmountSent,
                          ]}>
                          {tx.direction === 'sent' ? '- ' : '+ '}
                          {tx.amount} MON
                        </Text>
                        <View
                          style={[
                            styles.txBadge,
                            badge.variant === 'tap' && styles.txBadgeTap,
                            badge.variant === 'direct' && styles.txBadgeDirect,
                            badge.variant === 'received' && styles.txBadgeReceived,
                          ]}>
                          <Text
                            style={[
                              styles.txBadgeText,
                              badge.variant === 'tap' && styles.txBadgeTextTap,
                              badge.variant === 'direct' && styles.txBadgeTextDirect,
                              badge.variant === 'received' && styles.txBadgeTextReceived,
                            ]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const glass = {
  fill: 'rgba(255, 255, 255, 0.08)',
  fillElevated: 'rgba(255, 255, 255, 0.11)',
  border: 'rgba(255, 255, 255, 0.14)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
};

const ios = {
  bg: '#000000',
  label: '#FFFFFF',
  secondaryLabel: '#8E8E93',
  tertiaryLabel: '#636366',
  blue: '#0A84FF',
  green: '#30D158',
  separator: 'rgba(84, 84, 88, 0.65)',
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: ios.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTextBlock: {
    gap: 1,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ios.label,
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontSize: 9,
    fontWeight: '600',
    color: ios.tertiaryLabel,
    letterSpacing: 1.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glass.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ios.green,
  },
  networkText: {
    color: ios.label,
    fontSize: 13,
    fontWeight: '600',
  },
  chevronSmall: {
    color: ios.secondaryLabel,
    fontSize: 12,
    marginTop: -2,
  },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: glass.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLetter: {
    color: ios.label,
    fontSize: 15,
    fontWeight: '600',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  heroLineWhite: {
    fontSize: 28,
    fontWeight: '700',
    color: ios.label,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  heroLineAccent: {
    fontSize: 28,
    fontWeight: '700',
    color: ios.label,
    letterSpacing: -0.6,
    lineHeight: 34,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: ios.secondaryLabel,
    lineHeight: 20,
    fontWeight: '400',
    maxWidth: 260,
  },
  heroWaveWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: glass.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cardContainer: {
    marginBottom: 16,
  },
  cardBody: {
    backgroundColor: glass.fillElevated,
    borderRadius: 22,
    padding: 20,
    height: 198,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {elevation: 2},
      default: {},
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardBrandText: {
    fontSize: 17,
    fontWeight: '600',
    color: ios.label,
    letterSpacing: -0.3,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monadBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: glass.fill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  monadBadgeText: {
    color: ios.label,
    fontSize: 12,
    fontWeight: '600',
  },
  cardMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardNumberText: {
    fontSize: 15,
    fontWeight: '500',
    color: ios.label,
    letterSpacing: 1.4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyChip: {
    backgroundColor: glass.fill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  copiedChip: {
    backgroundColor: 'rgba(48, 209, 88, 0.18)',
    borderColor: 'rgba(48, 209, 88, 0.3)',
  },
  copyChipText: {
    color: ios.label,
    fontSize: 12,
    fontWeight: '600',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardHolderLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: ios.secondaryLabel,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  cardHolderName: {
    fontSize: 15,
    fontWeight: '600',
    color: ios.label,
  },
  cardTypeBadge: {
    backgroundColor: glass.fill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  cardTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: ios.secondaryLabel,
    letterSpacing: 0.4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  sendTapButton: {
    flex: 1.15,
    borderRadius: 16,
    backgroundColor: ios.blue,
    minHeight: 74,
    justifyContent: 'center',
  },
  sendTapContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendTapLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sendTapIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendTapTitle: {
    color: ios.label,
    fontSize: 15,
    fontWeight: '600',
  },
  sendTapSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  sendTapChevron: {
    color: ios.label,
    fontSize: 20,
    fontWeight: '400',
    marginLeft: 4,
  },
  receiveTapButton: {
    flex: 0.85,
    backgroundColor: glass.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 74,
    justifyContent: 'center',
    gap: 8,
  },
  receiveIconWrap: {
    width: 22,
    height: 22,
    position: 'relative',
  },
  scannerCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: 2,
  },
  scannerCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FFFFFF',
    borderTopRightRadius: 2,
  },
  scannerCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
  },
  scannerCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: 2,
  },
  receiveTapTitle: {
    color: ios.label,
    fontSize: 15,
    fontWeight: '600',
  },
  receiveTapSubtitle: {
    color: ios.secondaryLabel,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  directPayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: glass.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  directPayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  directPayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: glass.fillElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  directPayGlyph: {
    color: ios.label,
    fontSize: 18,
    fontWeight: '600',
  },
  directPayTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: ios.label,
  },
  directPaySubtitle: {
    fontSize: 12,
    color: ios.secondaryLabel,
    marginTop: 2,
    maxWidth: 240,
  },
  chevronArrow: {
    fontSize: 20,
    color: ios.tertiaryLabel,
    fontWeight: '400',
    marginLeft: 8,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  metricTile: {
    flex: 1,
    backgroundColor: glass.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    borderRadius: 16,
    padding: 14,
    minHeight: 148,
    overflow: 'hidden',
  },
  metricTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 13,
    color: ios.secondaryLabel,
    fontWeight: '500',
  },
  eyeIcon: {
    color: ios.secondaryLabel,
    fontSize: 14,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: ios.label,
    letterSpacing: -0.4,
  },
  metricUsd: {
    fontSize: 13,
    color: ios.secondaryLabel,
    marginTop: 2,
    fontWeight: '400',
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metricGain: {
    fontSize: 12,
    color: ios.green,
    fontWeight: '500',
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 18,
  },
  sparkBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(10, 132, 255, 0.65)',
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  terminalDotWrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  terminalDotOn: {
    backgroundColor: ios.green,
  },
  terminalDotOff: {
    backgroundColor: ios.secondaryLabel,
  },
  terminalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ios.label,
    marginTop: 2,
  },
  terminalCaption: {
    fontSize: 12,
    color: ios.secondaryLabel,
    marginTop: 2,
    fontWeight: '400',
  },
  terminalIconWrap: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: glass.fill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  transactionsSection: {
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ios.label,
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 15,
    color: ios.blue,
    fontWeight: '400',
  },
  transactionCard: {
    backgroundColor: glass.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  emptyFeed: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: ios.label,
  },
  emptySubtext: {
    fontSize: 13,
    color: ios.secondaryLabel,
    marginTop: 4,
    textAlign: 'center',
  },
  txDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ios.separator,
    marginLeft: 48,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 10,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  txMeta: {
    flex: 1,
  },
  txIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txGlyph: {
    fontSize: 14,
    fontWeight: '800',
  },
  txCounterparty: {
    fontSize: 15,
    fontWeight: '500',
    color: ios.label,
  },
  txTime: {
    fontSize: 13,
    color: ios.secondaryLabel,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  txAmountSent: {
    color: ios.label,
  },
  txAmountReceived: {
    color: ios.green,
  },
  txBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  txBadgeTap: {
    backgroundColor: 'rgba(48, 209, 88, 0.14)',
  },
  txBadgeDirect: {
    backgroundColor: glass.fillElevated,
  },
  txBadgeReceived: {
    backgroundColor: 'rgba(48, 209, 88, 0.16)',
  },
  txBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  txBadgeTextTap: {
    color: ios.green,
  },
  txBadgeTextDirect: {
    color: ios.secondaryLabel,
  },
  txBadgeTextReceived: {
    color: ios.green,
  },
});
