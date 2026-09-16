/**
 * HomeScreen — Apple Card & Nordstrom-Grade Virtual Wallet Dashboard
 * Strictly inspired by user reference Images 4 & 5.
 * Features standard ISO-ratio virtual card, hero typography, tactile action pills,
 * dual balance/terminal metric cards, and clean transaction feed.
 */

import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Clipboard,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWallet} from '../context/WalletContext';
import {truncateAddress, formatMon, formatTimestamp} from '../utils/format';
import {triggerHaptic} from '../utils/haptics';
import {RootStackParamList} from '../navigation/AppNavigator';
import BrandLogo from '../components/BrandLogo';
import {ContactlessWave, CardChip, CheckCircleIcon} from '../components/AppIcons';
import {getTransactionHistory, initHistory, TransactionRecord} from '../services/history';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {address, balance, username, refreshBalance} = useWallet();
  const navigation = useNavigation<NavigationProp>();

  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentTx, setRecentTx] = useState<TransactionRecord[]>([]);

  const loadRecent = useCallback(() => {
    const list = getTransactionHistory();
    setRecentTx(list.slice(0, 3));
  }, []);

  useEffect(() => {
    initHistory().then(() => loadRecent());
  }, [loadRecent]);

  const onRefresh = useCallback(async () => {
    triggerHaptic.impactMedium();
    setRefreshing(true);
    await refreshBalance();
    loadRecent();
    setRefreshing(false);
  }, [refreshBalance, loadRecent]);

  const copyAddress = () => {
    if (!address) return;
    triggerHaptic.impactMedium();
    Clipboard.setString(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedCardNumber = address
    ? `${address.slice(0, 4)} •••• •••• ${address.slice(-4)}`.toUpperCase()
    : '0x00 •••• •••• 0000';

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 8, paddingBottom: 120},
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
        {/* Seamless Header Bar (Images 4 & 5) */}
        <View style={styles.topBar}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Card</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Monad</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onRefresh}
              activeOpacity={0.7}>
              <Text style={styles.headerGlyph}>↻</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => (navigation.navigate as any)('Settings')}
              activeOpacity={0.7}>
              <Text style={styles.headerGlyph}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Balance Section (Image 4) */}
        <View style={styles.heroSection}>
          <Text style={styles.heroAmount}>{formatMon(balance)}</Text>
          <Text style={styles.heroSubtitle}>
            Pay in-store with NFC or online on Monad
          </Text>
        </View>

        {/* Virtual Contactless Card (ISO Ratio 1.586 — Images 4 & 5) */}
        <View style={styles.cardContainer}>
          <View style={styles.cardGlowBorder}>
            <View style={styles.cardBody}>
              {/* Card Ambient Curved Overlay */}
              <View style={styles.cardCurveDecoration} />

              {/* Card Header */}
              <View style={styles.cardTopRow}>
                <View style={styles.cardBrand}>
                  <BrandLogo size={26} color="#FFFFFF" />
                  <Text style={styles.cardBrandText}>TapPay</Text>
                </View>
                <View style={styles.cardTopRight}>
                  <ContactlessWave size={22} color="#FFFFFF" />
                  <CardChip size={26} color="#E5E7EB" />
                </View>
              </View>

              {/* Card Number / Monad Address */}
              <View style={styles.cardMidRow}>
                <Text style={styles.cardNumberText}>{formattedCardNumber}</Text>
                <TouchableOpacity
                  style={[styles.copyChip, copied && styles.copiedChip]}
                  onPress={copyAddress}
                  activeOpacity={0.7}>
                  <Text style={styles.copyChipText}>
                    {copied ? 'COPIED' : 'COPY'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Card Footer */}
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
        </View>

        {/* Primary Action Buttons (Images 4 & 5) */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            activeOpacity={0.75}
            onPress={() => {
              triggerHaptic.impactMedium();
              navigation.navigate('SendTap');
            }}>
            <ContactlessWave size={20} color="#000000" />
            <Text style={styles.primaryActionText}>Send Tap (NFC)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            activeOpacity={0.75}
            onPress={() => {
              triggerHaptic.impactMedium();
              navigation.navigate('ReceiveTap');
            }}>
            <Text style={styles.secondaryActionText}>Receive Tap</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Direct Transfer Strip */}
        <TouchableOpacity
          style={styles.directPayBanner}
          activeOpacity={0.75}
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
                Instant pay to @username or wallet address
              </Text>
            </View>
          </View>
          <Text style={styles.chevronArrow}>›</Text>
        </TouchableOpacity>

        {/* Dual Metric & Status Grid (Image 5) */}
        <View style={styles.metricGrid}>
          {/* Card Balance Tile */}
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>Card Balance</Text>
            <Text style={styles.metricValue}>{formatMon(balance)}</Text>
            <Text style={styles.metricCaption}>Available on Monad</Text>
          </View>

          {/* Terminal / NFC Status Tile */}
          <View style={styles.metricTile}>
            <Text style={styles.metricLabel}>Terminal Status</Text>
            <Text style={styles.metricValue}>NFC Ready</Text>
            <View style={styles.checkRow}>
              <CheckCircleIcon size={24} color="#30D158" bg="rgba(48, 209, 88, 0.15)" />
              <Text style={styles.terminalReadyText}>Ready to tap</Text>
            </View>
          </View>
        </View>

        {/* Latest Card Transactions (Image 5) */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Latest Card Transactions</Text>
            <TouchableOpacity
              onPress={() => (navigation.navigate as any)('History')}
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
              recentTx.map((tx, idx) => (
                <View key={tx.id}>
                  {idx > 0 && <View style={styles.txDivider} />}
                  <View style={styles.txRow}>
                    <View style={styles.txLeft}>
                      <View
                        style={[
                          styles.txIconBubble,
                          tx.direction === 'sent'
                            ? styles.txIconSent
                            : styles.txIconReceived,
                        ]}>
                        <Text style={styles.txGlyph}>
                          {tx.direction === 'sent' ? '↑' : '↓'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.txCounterparty}>
                          {tx.counterpartyUsername
                            ? `@${tx.counterpartyUsername}`
                            : truncateAddress(tx.counterparty, 6, 4)}
                        </Text>
                        <Text style={styles.txTime}>
                          {formatTimestamp(tx.timestamp)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        tx.direction === 'sent'
                          ? styles.txAmountSent
                          : styles.txAmountReceived,
                      ]}>
                      {tx.direction === 'sent' ? '-' : '+'}
                      {tx.amount} MON
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#09090D',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  liveBadgeText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#161620',
    borderWidth: 1,
    borderColor: '#242432',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGlyph: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroSection: {
    marginBottom: 20,
  },
  heroAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    fontWeight: '500',
  },
  cardContainer: {
    marginBottom: 20,
  },
  cardGlowBorder: {
    borderRadius: 22,
    padding: 1,
    backgroundColor: '#2A2A3C',
  },
  cardBody: {
    backgroundColor: '#151624',
    borderRadius: 21,
    padding: 22,
    height: 210,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardCurveDecoration: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(110, 84, 255, 0.08)',
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
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  copyChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  copiedChip: {
    backgroundColor: '#30D158',
  },
  copyChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardHolderLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardHolderName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardTypeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
  },
  primaryActionText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161622',
    borderWidth: 1,
    borderColor: '#262638',
    paddingVertical: 15,
    borderRadius: 16,
  },
  secondaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  directPayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#222232',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  directPayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  directPayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directPayGlyph: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  directPayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  directPaySubtitle: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  chevronArrow: {
    fontSize: 20,
    color: '#545458',
    fontWeight: '300',
    marginLeft: 8,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#222232',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  metricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  metricCaption: {
    fontSize: 11,
    color: '#71717A',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  terminalReadyText: {
    fontSize: 11,
    color: '#30D158',
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
  },
  transactionCard: {
    backgroundColor: '#14141E',
    borderWidth: 1,
    borderColor: '#222232',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  emptyFeed: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  txDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#262638',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  txIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconSent: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  txIconReceived: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
  },
  txGlyph: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  txCounterparty: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  txTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  txAmountSent: {
    color: '#FFFFFF',
  },
  txAmountReceived: {
    color: '#30D158',
  },
});
