/**
 * TransactionHistoryScreen — light TapPay activity feed
 * Presentation only; history data + navigation unchanged.
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {
  getTransactionHistory,
  getTxTokenSymbol,
  subscribeHistory,
  initHistory,
  TransactionRecord,
} from '../services/history';
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress, formatTimestamp} from '../utils/format';
import {useWallet} from '../context/WalletContext';
import {useTheme} from '../context/ThemeContext';
import LivePulseDot from '../components/LivePulseDot';
import {RefreshIcon} from '../components/AppIcons';
import PressableScale from '../components/PressableScale';
import {SegmentedControl, SurfaceCard} from '../components/ui';
import {radii, shadows} from '../theme';
import type {AppColors, AppGlass} from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FilterTab = 'all' | 'sent' | 'received';

export default function TransactionHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const {address, username} = useWallet();
  const {colors, glass} = useTheme();
  const styles = useMemo(() => createStyles(colors, glass), [colors, glass]);
  const [history, setHistory] = useState<TransactionRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = useCallback(() => {
    const all = getTransactionHistory();
    setHistory(all);
  }, []);

  useEffect(() => {
    initHistory().then(() => loadHistory());
    const unsubscribe = subscribeHistory(() => loadHistory());
    return () => unsubscribe();
  }, [loadHistory]);

  const onRefresh = async () => {
    triggerHaptic.impactMedium();
    setRefreshing(true);
    setTimeout(() => {
      loadHistory();
      setRefreshing(false);
    }, 400);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredHistory = history.filter(tx => {
    if (filter === 'sent' && tx.direction !== 'sent') return false;
    if (filter === 'received' && tx.direction !== 'received') return false;
    if (!normalizedQuery) return true;
    return [
      tx.counterparty,
      tx.counterpartyUsername || '',
      tx.txHash,
      tx.direction,
      tx.status,
      tx.amount,
      getTxTokenSymbol(tx),
    ].some(value => value.toLowerCase().includes(normalizedQuery));
  });

  const sentCount = history.filter(tx => tx.direction === 'sent').length;
  const receivedCount = history.filter(tx => tx.direction === 'received').length;

  const renderItem = ({item}: {item: TransactionRecord}) => {
    const isSent = item.direction === 'sent';
    const isConfirmed = item.status === 'confirmed';
    const isPending = item.status === 'pending';
    const tokenSymbol = getTxTokenSymbol(item);
    const counterparty = item.counterpartyUsername
      ? `@${item.counterpartyUsername}`
      : truncateAddress(item.counterparty, 6, 4);

    return (
      <PressableScale
        style={styles.txRow}
        contentStyle={styles.txRowInner}
        onPress={() => {
          triggerHaptic.selection();
          navigation.navigate('TransactionStatus', {
            txHash: item.txHash,
            amount: item.amount,
            recipient: item.counterparty,
            direction: item.direction,
            counterpartyUsername: item.counterpartyUsername,
            tokenSymbol,
            initialStatus: item.status,
            completedAt: item.timestamp,
          });
        }}>
        <View style={styles.txLeft}>
          <View
            style={[
              styles.directionBadge,
              isSent ? styles.badgeSent : styles.badgeReceived,
            ]}>
            <Text
              style={[
                styles.directionGlyph,
                {color: isSent ? colors.accent : colors.success},
              ]}>
              {isSent ? '↑' : '↓'}
            </Text>
          </View>

          <View style={styles.txMeta}>
            <Text style={styles.txName}>
              {isSent ? `Sent to ${counterparty}` : `Received from ${counterparty}`}
            </Text>
            <View style={styles.txSubRow}>
              <Text style={styles.txTime}>{formatTimestamp(item.timestamp)}</Text>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isConfirmed
                      ? colors.success
                      : isPending
                      ? colors.warning
                      : colors.danger,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: isConfirmed
                      ? colors.success
                      : isPending
                      ? colors.warning
                      : colors.danger,
                  },
                ]}>
                {isConfirmed ? 'Confirmed' : isPending ? 'Pending' : 'Failed'}
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.txAmount,
            isSent ? styles.amountSent : styles.amountReceived,
          ]}>
          {isSent ? '-' : '+'}
          {item.amount} {tokenSymbol}
        </Text>
      </PressableScale>
    );
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top + 8}]}>
      <View style={styles.header}>
        <View style={styles.identityRow}>
          <View style={styles.identityMark}>
            <Text style={styles.identityMarkText}>
              {(username || address?.slice(2, 3) || 'T').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.identityName} numberOfLines={1}>
              {username ? `@${username}` : 'TapPay wallet'}
            </Text>
            <Text style={styles.identityAddress} numberOfLines={1}>
              {address ? truncateAddress(address, 6, 5) : 'Monad Mainnet'}
            </Text>
          </View>
          <View style={styles.networkPill}>
            <LivePulseDot active size={7} />
            <Text style={styles.networkText}>Monad</Text>
          </View>
        </View>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.pageTitle}>Transactions</Text>
            <Text style={styles.pageSubtitle}>Your recent activity</Text>
          </View>
          <Text style={styles.totalCount}>{history.length}</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <View style={styles.searchGlyph}>
            <View style={styles.searchGlyphHandle} />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search transactions"
            placeholderTextColor={colors.textSubtle}
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search transactions"
            underlineColorAndroid="transparent"
          />
          {searchQuery.length > 0 && (
            <PressableScale
              onPress={() => setSearchQuery('')}
              accessibilityLabel="Clear search"
              style={styles.clearSearchButton}>
              <Text style={styles.clearSearchText}>×</Text>
            </PressableScale>
          )}
        </View>
      </View>

      <SegmentedControl
        style={styles.filterRow}
        value={filter}
        onChange={setFilter}
        options={[
          {key: 'all', label: 'All', count: history.length},
          {key: 'sent', label: 'Sent', count: sentCount},
          {key: 'received', label: 'Received', count: receivedCount},
        ]}
      />

      <View style={styles.listHeading}>
        <Text style={styles.listHeadingText}>
          {filteredHistory.length === history.length ? 'LATEST ACTIVITY' : `${filteredHistory.length} RESULTS`}
        </Text>
        <PressableScale
          style={styles.refreshButton}
          contentStyle={styles.refreshButtonInner}
          onPress={onRefresh}
          accessibilityLabel="Refresh transaction history">
          <RefreshIcon size={14} color={colors.accent} />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </PressableScale>
      </View>

      {filteredHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <SurfaceCard style={styles.emptyIconBox}>
            <Text style={styles.emptyIconText}>—</Text>
          </SurfaceCard>
          <Text style={styles.emptyTitle}>
            {normalizedQuery
              ? 'No Matching Transactions'
              : filter === 'all'
              ? 'No Transactions Yet'
              : filter === 'sent'
              ? 'No Sent Transactions'
              : 'No Received Transactions'}
          </Text>
          <Text style={styles.emptyHint}>
            {normalizedQuery
              ? 'Try a different name, address, or transaction hash'
              : filter === 'all'
                ? 'Your payment activity will appear here'
                : `Transactions you have ${filter} will appear here`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        />
      )}
    </View>
  );
}

function createStyles(colors: AppColors, glass: AppGlass) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  identityMark: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  identityMarkText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  identityName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  identityAddress: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSolidElevated,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginLeft: 8,
  },
  networkText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.8,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
  },
  totalCount: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: colors.accentWash,
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingHorizontal: 8,
  },
  searchRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSolid,
    borderRadius: 15,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  searchGlyph: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.8,
    borderColor: colors.textMuted,
    marginRight: 11,
    position: 'relative',
  },
  searchGlyphHandle: {
    position: 'absolute',
    width: 7,
    height: 1.8,
    backgroundColor: colors.textMuted,
    right: -5,
    bottom: -2,
    borderRadius: 1,
    transform: [{rotate: '45deg'}],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: '#0B1220',
  },
  clearSearchButton: {
    width: 30,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchText: {
    color: colors.textMuted,
    fontSize: 24,
    lineHeight: 26,
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listHeadingText: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  refreshButton: {
    borderRadius: 11,
    backgroundColor: colors.accentWash,
  },
  refreshButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  refreshButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  filterRow: {
    marginHorizontal: 20,
    marginBottom: 14,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  txRow: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.lg,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
    ...shadows.soft,
  },
  txRowInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  directionBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSent: {
    backgroundColor: colors.accentWash,
  },
  badgeReceived: {
    backgroundColor: 'rgba(52, 199, 89, 0.14)',
  },
  directionGlyph: {
    fontSize: 16,
    fontWeight: '700',
  },
  txMeta: {
    flex: 1,
  },
  txName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  amountSent: {
    color: colors.text,
  },
  amountReceived: {
    color: colors.success,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 22,
    color: colors.textSubtle,
    fontWeight: '300',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  });
}
