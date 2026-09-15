/**
 * HomeScreen — Apple Pay & Binance Pay-grade dashboard
 * Flat, non-gradient design with solid architecture, crisp typography, and tactile buttons.
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
} from 'react-native';
import {useWallet} from '../context/WalletContext';
import {truncateAddress, formatMon, formatTimestamp} from '../utils/format';
import {triggerHaptic} from '../utils/haptics';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import BrandLogo from '../components/BrandLogo';
import {getTransactionHistory, initHistory, TransactionRecord} from '../services/history';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const {address, balance, username, refreshBalance} = useWallet();
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentTx, setRecentTx] = useState<TransactionRecord[]>([]);

  const loadRecent = useCallback(() => {
    const list = getTransactionHistory();
    setRecentTx(list.slice(0, 2));
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
    if (!address) {
      return;
    }
    triggerHaptic.impactMedium();
    Clipboard.setString(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#6E54FF"
          colors={['#6E54FF']}
        />
      }>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <BrandLogo size={32} showWordmark={true} />
        <View style={styles.networkBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.networkText}>Monad Testnet</Text>
        </View>
      </View>

      {/* Greeting */}
      <View style={styles.greetingRow}>
        <Text style={styles.greetingText}>
          {username ? `@${username}` : 'Welcome back'}
        </Text>
      </View>

      {/* Apple Wallet-Style Card (Solid, Non-Gradient) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardSublabel}>TOTAL BALANCE</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={onRefresh}
            activeOpacity={0.7}>
            <Text style={styles.refreshIcon}>↻</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceValue}>{formatMon(balance)}</Text>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.addressPill}
            activeOpacity={0.7}
            onPress={copyAddress}>
            <Text style={styles.addressMono}>
              {address ? truncateAddress(address, 6, 4) : '...'}
            </Text>
            <View style={[styles.copyChip, copied && styles.copiedChip]}>
              <Text style={styles.copyChipText}>{copied ? 'COPIED' : 'COPY'}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.cardTypeBadge}>
            <Text style={styles.cardTypeText}>NFC • PAY</Text>
          </View>
        </View>
      </View>

      {/* Primary Action Buttons (Solid, Non-Gradient, Apple & Binance Style) */}
      <Text style={styles.sectionHeading}>PAYMENT ACTIONS</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.75}
          onPress={() => {
            triggerHaptic.impactMedium();
            navigation.navigate('SendTap');
          }}>
          <View style={styles.actionIconBox}>
            <Text style={styles.actionGlyph}>↑</Text>
          </View>
          <Text style={styles.actionTitle}>Send Tap</Text>
          <Text style={styles.actionDesc}>NFC phone-to-phone</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.75}
          onPress={() => {
            triggerHaptic.impactMedium();
            navigation.navigate('ReceiveTap');
          }}>
          <View style={[styles.actionIconBox, styles.receiveIconBox]}>
            <Text style={styles.actionGlyph}>↓</Text>
          </View>
          <Text style={styles.actionTitle}>Receive Tap</Text>
          <Text style={styles.actionDesc}>Accept incoming payment</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Direct Pay Tile */}
      <TouchableOpacity
        style={styles.directPayCard}
        activeOpacity={0.75}
        onPress={() => {
          triggerHaptic.impactMedium();
          navigation.navigate('SendPayment');
        }}>
        <View style={styles.directPayLeft}>
          <View style={styles.directPayIconBox}>
            <Text style={styles.directPayAt}>@</Text>
          </View>
          <View>
            <Text style={styles.directPayTitle}>Direct Pay</Text>
            <Text style={styles.directPayDesc}>
              Transfer to @username or wallet address
            </Text>
          </View>
        </View>
        <Text style={styles.chevronArrow}>›</Text>
      </TouchableOpacity>

      {/* Recent Activity */}
      {recentTx.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionHeading}>RECENT ACTIVITY</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('History' as any)}
              activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentCard}>
            {recentTx.map((tx, idx) => (
              <View key={tx.id}>
                {idx > 0 && <View style={styles.recentDivider} />}
                <View style={styles.recentRow}>
                  <View style={styles.recentLeft}>
                    <View
                      style={[
                        styles.directionDot,
                        tx.direction === 'sent'
                          ? styles.directionSent
                          : styles.directionReceived,
                      ]}
                    />
                    <View>
                      <Text style={styles.recentCounterparty}>
                        {tx.counterpartyUsername
                          ? `@${tx.counterpartyUsername}`
                          : truncateAddress(tx.counterparty)}
                      </Text>
                      <Text style={styles.recentTime}>
                        {formatTimestamp(tx.timestamp)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.recentAmount,
                      tx.direction === 'sent'
                        ? styles.amountSent
                        : styles.amountReceived,
                    ]}>
                    {tx.direction === 'sent' ? '-' : '+'}
                    {tx.amount} MON
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090D',
  },
  content: {
    padding: 18,
    paddingTop: 14,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15151C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22222E',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  networkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  greetingRow: {
    marginBottom: 12,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: '#15151E',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#252533',
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardSublabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.2,
  },
  refreshBtn: {
    padding: 4,
  },
  refreshIcon: {
    fontSize: 16,
    color: '#8E8E93',
  },
  balanceRow: {
    marginBottom: 20,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F2C',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2B2B3D',
    gap: 8,
  },
  addressMono: {
    fontSize: 12,
    color: '#D4D4D8',
    fontFamily: 'monospace',
  },
  copyChip: {
    backgroundColor: '#6E54FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  copiedChip: {
    backgroundColor: '#10B981',
  },
  copyChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardTypeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  cardTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#52525B',
    letterSpacing: 1.2,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#15151E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#242433',
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1F1F2D',
    borderWidth: 1,
    borderColor: '#2E2E40',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiveIconBox: {
    backgroundColor: '#14221D',
    borderColor: '#1E362C',
  },
  actionGlyph: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 11,
    color: '#71717A',
  },
  directPayCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#15151E',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242433',
    marginBottom: 24,
  },
  directPayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  directPayIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E1E2C',
    borderWidth: 1,
    borderColor: '#2B2B3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directPayAt: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6E54FF',
  },
  directPayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  directPayDesc: {
    fontSize: 11,
    color: '#71717A',
  },
  chevronArrow: {
    fontSize: 20,
    color: '#52525B',
    fontWeight: '300',
  },
  recentSection: {
    marginTop: 2,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E54FF',
  },
  recentCard: {
    backgroundColor: '#15151E',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#242433',
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  directionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  directionSent: {
    backgroundColor: '#EF4444',
  },
  directionReceived: {
    backgroundColor: '#10B981',
  },
  recentCounterparty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  recentTime: {
    fontSize: 11,
    color: '#52525B',
  },
  recentAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  amountSent: {
    color: '#EF4444',
  },
  amountReceived: {
    color: '#10B981',
  },
  recentDivider: {
    height: 1,
    backgroundColor: '#1E1E2A',
  },
});
