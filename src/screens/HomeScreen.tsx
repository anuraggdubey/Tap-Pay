/**
 * HomeScreen — Apple Pay-style dashboard with luxury wallet card,
 * live balance, quick-action tiles, and recent transaction activity.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Clipboard,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useWallet} from '../context/WalletContext';
import {RootStackParamList} from '../navigation/AppNavigator';
import {truncateAddress, formatMon} from '../utils/format';
import {triggerHaptic} from '../utils/haptics';
import {
  getTransactionHistory,
  subscribeHistory,
  TransactionRecord,
} from '../services/history';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({navigation}: Props) {
  const {address, balance, refreshBalance} = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentTxs, setRecentTxs] = useState<TransactionRecord[]>([]);

  const loadRecent = useCallback(() => {
    const list = getTransactionHistory();
    setRecentTxs(list.slice(0, 3));
  }, []);

  useEffect(() => {
    loadRecent();
    const unsub = subscribeHistory(() => {
      loadRecent();
    });
    return () => unsub();
  }, [loadRecent]);

  const onRefresh = async () => {
    triggerHaptic.impactMedium();
    setRefreshing(true);
    await refreshBalance();
    loadRecent();
    setRefreshing(false);
  };

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
          tintColor="#836EF9"
          colors={['#836EF9']}
        />
      }>
      {/* Apple Pay-Style Luxury Wallet Card */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardChipRow}>
              {/* Gold EMV Chip visual */}
              <View style={styles.emvChip}>
                <View style={styles.emvChipLine} />
              </View>
              {/* Contactless waves */}
              <Text style={styles.contactlessSymbol}>〰️</Text>
            </View>
            <View style={styles.networkBadge}>
              <View style={styles.networkDot} />
              <Text style={styles.networkText}>Monad Testnet</Text>
            </View>
          </View>

          <View style={styles.balanceSection}>
            <Text style={styles.cardLabel}>Available Balance</Text>
            <Text style={styles.balanceText}>{formatMon(balance)}</Text>
          </View>

          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.addressPill}
              activeOpacity={0.7}
              onPress={copyAddress}>
              <Text style={styles.addressText}>
                {address ? truncateAddress(address, 6, 4) : '...'}
              </Text>
              <Text style={styles.copyIcon}>{copied ? '✓ Copied' : '❐ Copy'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={onRefresh}>
              <Text style={styles.refreshIcon}>↻</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Primary Action Tiles */}
      <Text style={styles.sectionTitle}>Tap Pay</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.sendButton]}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic.impactMedium();
            navigation.navigate('SendTap');
          }}>
          <View style={styles.actionIconCircle}>
            <Text style={styles.actionIcon}>↑</Text>
          </View>
          <Text style={styles.actionTitle}>Send</Text>
          <Text style={styles.actionSubtitle}>Tap phone to send</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.receiveButton]}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic.impactMedium();
            navigation.navigate('ReceiveTap');
          }}>
          <View style={[styles.actionIconCircle, {backgroundColor: '#4CAF5040'}]}>
            <Text style={styles.actionIcon}>↓</Text>
          </View>
          <Text style={styles.actionTitle}>Receive</Text>
          <Text style={styles.actionSubtitle}>Tap phone to accept</Text>
        </TouchableOpacity>
      </View>

      {/* Username Pay Quick Tile */}
      <TouchableOpacity
        style={styles.usernameTile}
        activeOpacity={0.8}
        onPress={() => {
          triggerHaptic.impactMedium();
          navigation.navigate('UsernamePay');
        }}>
        <View style={styles.usernameTileLeft}>
          <View style={styles.usernameIconCircle}>
            <Text style={styles.usernameTileIcon}>@</Text>
          </View>
          <View>
            <Text style={styles.usernameTileTitle}>Pay by Username</Text>
            <Text style={styles.usernameTileSubtitle}>
              On-chain username lookup & transfer
            </Text>
          </View>
        </View>
        <Text style={styles.arrowIcon}>›</Text>
      </TouchableOpacity>

      {/* Recent Activity Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity
          onPress={() => {
            triggerHaptic.impactMedium();
            navigation.navigate('TransactionHistory');
          }}>
          <Text style={styles.seeAllText}>See All ({recentTxs.length}) ›</Text>
        </TouchableOpacity>
      </View>

      {recentTxs.length === 0 ? (
        <View style={styles.emptyRecentCard}>
          <Text style={styles.emptyRecentText}>No transactions yet</Text>
        </View>
      ) : (
        recentTxs.map(tx => {
          const isSent = tx.direction === 'sent';
          return (
            <TouchableOpacity
              key={tx.id}
              style={styles.txRow}
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.impactMedium();
                navigation.navigate('TransactionStatus', {
                  txHash: tx.txHash,
                  amount: tx.amount,
                  recipient: tx.counterparty,
                });
              }}>
              <View style={styles.txLeft}>
                <View
                  style={[
                    styles.directionBadge,
                    {backgroundColor: isSent ? '#FF444420' : '#00C85320'},
                  ]}>
                  <Text
                    style={[
                      styles.txDirection,
                      {color: isSent ? '#FF6B6B' : '#4CAF50'},
                    ]}>
                    {isSent ? '↑' : '↓'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.txName}>
                    {tx.counterpartyUsername
                      ? `@${tx.counterpartyUsername}`
                      : truncateAddress(tx.counterparty)}
                  </Text>
                  <Text style={styles.txTime}>{tx.timestamp}</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  {color: isSent ? '#FF6B6B' : '#4CAF50'},
                ]}>
                {isSent ? '-' : '+'}
                {tx.amount} MON
              </Text>
            </TouchableOpacity>
          );
        })
      )}

      {/* Settings Navigation Link */}
      <TouchableOpacity
        style={styles.settingsFooterBtn}
        activeOpacity={0.8}
        onPress={() => {
          triggerHaptic.impactMedium();
          navigation.navigate('Settings');
        }}>
        <Text style={styles.settingsFooterText}>⚙️ Wallet Settings & Security</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  cardContainer: {
    marginBottom: 26,
    borderRadius: 24,
    elevation: 12,
    shadowColor: '#836EF9',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  card: {
    backgroundColor: '#16132A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#3D3472',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emvChip: {
    width: 36,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#D4AF37',
    borderWidth: 1,
    borderColor: '#B8972E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emvChipLine: {
    width: 20,
    height: 1,
    backgroundColor: '#8C721F',
  },
  contactlessSymbol: {
    fontSize: 16,
    color: '#D4AF37',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#201A3D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4E3FA8',
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#836EF9',
    marginRight: 6,
  },
  networkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C4B5FD',
    textTransform: 'uppercase',
  },
  balanceSection: {
    marginBottom: 22,
  },
  cardLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#2B2353',
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#211B40',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#C4B5FD',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  copyIcon: {
    fontSize: 11,
    color: '#836EF9',
    fontWeight: '700',
  },
  refreshBtn: {
    padding: 6,
  },
  refreshIcon: {
    fontSize: 18,
    color: '#A78BFA',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
  },
  sendButton: {
    backgroundColor: '#836EF9',
  },
  receiveButton: {
    backgroundColor: '#2E7D32',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF25',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#E0E7FF',
    opacity: 0.9,
  },
  usernameTile: {
    backgroundColor: '#151522',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#252538',
  },
  usernameTileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  usernameIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#836EF920',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#836EF950',
  },
  usernameTileIcon: {
    fontSize: 20,
    color: '#836EF9',
    fontWeight: '800',
  },
  usernameTileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  usernameTileSubtitle: {
    fontSize: 12,
    color: '#8888AA',
  },
  arrowIcon: {
    fontSize: 22,
    color: '#8888AA',
    fontWeight: '300',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    color: '#836EF9',
    fontWeight: '600',
  },
  emptyRecentCard: {
    backgroundColor: '#151522',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#252538',
  },
  emptyRecentText: {
    color: '#8888AA',
    fontSize: 14,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151522',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222235',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  directionBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txDirection: {
    fontSize: 18,
    fontWeight: '700',
  },
  txName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  txTime: {
    fontSize: 12,
    color: '#8888AA',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingsFooterBtn: {
    marginTop: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#161622',
    borderWidth: 1,
    borderColor: '#222235',
  },
  settingsFooterText: {
    fontSize: 14,
    color: '#8888AA',
    fontWeight: '600',
  },
});
