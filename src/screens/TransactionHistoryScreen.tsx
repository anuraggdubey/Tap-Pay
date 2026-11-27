/**
 * TransactionHistoryScreen — Activity: large title, search, All/Sent/Received filter, and a
 * date-grouped list of glass rows. Presentation only; history data + navigation unchanged.
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, Text, StyleSheet, SectionList, RefreshControl, TextInput} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {
  getTransactionHistory,
  getTxTokenSymbol,
  subscribeHistory,
  initHistory,
  isStuck,
  TransactionRecord,
} from '../services/history';
import {reconcilePendingTransactions} from '../services/txReconcile';
import {triggerHaptic} from '../utils/haptics';
import {truncateAddress} from '../utils/format';
import {groupByDay} from '../utils/historyGroups';
import {useTheme} from '../context/ThemeContext';
import AmbientBackground from '../components/AmbientBackground';
import PressableScale from '../components/PressableScale';
import type {AppColors} from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type FilterTab = 'all' | 'sent' | 'received';

const FILTERS: Array<{key: FilterTab; label: string}> = [
  {key: 'all', label: 'All'},
  {key: 'sent', label: 'Sent'},
  {key: 'received', label: 'Received'},
];

function timeOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'});
}

export default function TransactionHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const {colors, isDark} = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [history, setHistory] = useState<TransactionRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = useCallback(() => {
    setHistory(getTransactionHistory());
  }, []);

  useEffect(() => {
    initHistory().then(() => {
      loadHistory();
      reconcilePendingTransactions();
    });
    const unsubscribe = subscribeHistory(() => loadHistory());
    return () => unsubscribe();
  }, [loadHistory]);

  const onRefresh = async () => {
    triggerHaptic.impactMedium();
    setRefreshing(true);
    await reconcilePendingTransactions();
    setTimeout(() => {
      loadHistory();
      setRefreshing(false);
    }, 400);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredHistory = useMemo(
    () =>
      history.filter(tx => {
        if (filter === 'sent' && tx.direction !== 'sent') {
          return false;
        }
        if (filter === 'received' && tx.direction !== 'received') {
          return false;
        }
        if (!normalizedQuery) {
          return true;
        }
        return [
          tx.counterparty,
          tx.counterpartyUsername || '',
          tx.txHash,
          tx.direction,
          tx.status,
          tx.amount,
          getTxTokenSymbol(tx),
        ].some(value => value.toLowerCase().includes(normalizedQuery));
      }),
    [history, filter, normalizedQuery],
  );
  const sections = useMemo(() => groupByDay(filteredHistory), [filteredHistory]);

  const openTx = (item: TransactionRecord) => {
    triggerHaptic.selection();
    navigation.navigate('TransactionStatus', {
      txHash: item.txHash,
      amount: item.amount,
      recipient: item.counterparty,
      direction: item.direction,
      counterpartyUsername: item.counterpartyUsername,
      tokenSymbol: getTxTokenSymbol(item),
      initialStatus: item.status,
      completedAt: item.timestamp,
    });
  };

  const renderItem = ({
    item,
    index,
    section,
  }: {
    item: TransactionRecord;
    index: number;
    section: {data: TransactionRecord[]};
  }) => {
    const isSent = item.direction === 'sent';
    const first = index === 0;
    const last = index === section.data.length - 1;
    const counterparty = item.counterpartyUsername
      ? `@${item.counterpartyUsername}`
      : truncateAddress(item.counterparty, 6, 4);
    const stuck = isStuck(item);
    const notSent = item.status === 'dropped' || item.status === 'cancelled';
    const statusColor =
      item.status === 'confirmed' || notSent
        ? colors.textMuted
        : item.status === 'pending'
        ? colors.warning
        : colors.danger;
    const statusLabel = {
      confirmed: '',
      pending: stuck ? ' · Stuck' : ' · Pending',
      failed: ' · Failed',
      dropped: ' · Not sent',
      cancelled: ' · Cancelled',
    }[item.status];

    return (
      <PressableScale
        scaleTo={0.99}
        accessibilityLabel={`${isSent ? 'Sent to' : 'Received from'} ${counterparty}, ${item.amount} ${getTxTokenSymbol(item)}`}
        onPress={() => openTx(item)}>
        <View style={[styles.row, first && styles.rowFirst, last && styles.rowLast, !first && styles.rowDivider]}>
          <View style={styles.icon}>
            <Text style={[styles.iconText, {color: isSent ? colors.text : colors.success}]}>{isSent ? '↑' : '↓'}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.name} numberOfLines={1}>
              {counterparty}
            </Text>
            <Text style={[styles.sub, {color: statusColor}]} numberOfLines={1}>
              {isSent ? 'Sent' : 'Received'} · {timeOf(item.timestamp)}
              {statusLabel}
            </Text>
          </View>
          <Text style={[styles.amount, !isSent && {color: colors.success}, (item.status === 'failed' || notSent) && styles.amountFailed]}>
            {isSent ? '−' : '+'}
            {item.amount} {getTxTokenSymbol(item)}
          </Text>
        </View>
      </PressableScale>
    );
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top + 8}]}>
      <AmbientBackground />
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <View style={styles.searchBox}>
          <Text style={styles.searchGlyph}>⌕</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={colors.textSubtle}
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search transactions"
            underlineColorAndroid="transparent"
          />
          {searchQuery.length > 0 && (
            <PressableScale onPress={() => setSearchQuery('')} accessibilityLabel="Clear search" hitSlop={10}>
              <Text style={styles.clear}>×</Text>
            </PressableScale>
          )}
        </View>
        <View style={styles.segment}>
          {FILTERS.map(f => (
            <PressableScale
              key={f.key}
              style={[styles.segmentItem, filter === f.key && styles.segmentActive]}
              accessibilityState={{selected: filter === f.key}}
              onPress={() => {
                triggerHaptic.selection();
                setFilter(f.key);
              }}>
              <Text style={[styles.segmentText, filter === f.key && styles.segmentTextActive]}>{f.label}</Text>
            </PressableScale>
          ))}
        </View>
      </View>

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>⇅</Text>
          </View>
          <Text style={styles.emptyTitle}>
            {normalizedQuery
              ? 'No Results'
              : filter === 'all'
                ? 'No Transactions'
                : filter === 'sent'
                  ? 'Nothing Sent Yet'
                  : 'Nothing Received Yet'}
          </Text>
          <Text style={styles.emptyHint}>
            {normalizedQuery
              ? 'Try a different name, address or transaction hash.'
              : 'Your payments will appear here.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={({section}) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 120}]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textMuted}
              colors={[colors.accent]}
            />
          }
        />
      )}
    </View>
  );
}

function createStyles(c: AppColors, isDark: boolean) {
  const glass = isDark ? 'rgba(255,255,255,0.08)' : c.surfaceSolid;
  const rim = isDark ? 'rgba(255,255,255,0.18)' : c.border;
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    header: {paddingHorizontal: 20, marginBottom: 6},
    title: {fontSize: 34, fontWeight: '700', color: c.text, letterSpacing: 0.4, marginBottom: 12},
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : c.surfaceElevated,
      borderRadius: 14,
      paddingHorizontal: 12,
      height: 40,
      gap: 8,
    },
    searchGlyph: {fontSize: 18, color: c.textMuted},
    searchInput: {flex: 1, fontSize: 17, color: c.text, paddingVertical: 0},
    clear: {fontSize: 22, color: c.textMuted},
    segment: {
      flexDirection: 'row',
      marginTop: 12,
      padding: 3,
      borderRadius: 22,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : c.surfaceElevated,
      borderWidth: 1,
      borderColor: rim,
    },
    segmentItem: {flex: 1, paddingVertical: 9, borderRadius: 19, alignItems: 'center'},
    segmentActive: {backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#FFFFFF'},
    segmentText: {fontSize: 14, fontWeight: '600', color: c.textMuted},
    segmentTextActive: {color: c.text},
    list: {paddingHorizontal: 20},
    sectionTitle: {fontSize: 13, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', marginTop: 20, marginBottom: 8, marginLeft: 6, letterSpacing: 0.3},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: glass,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: rim,
    },
    rowFirst: {borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1},
    rowLast: {borderBottomLeftRadius: 22, borderBottomRightRadius: 22, borderBottomWidth: 1},
    rowDivider: {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator},
    icon: {width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceElevated, alignItems: 'center', justifyContent: 'center'},
    iconText: {fontSize: 18, fontWeight: '600'},
    meta: {flex: 1},
    name: {fontSize: 17, color: c.text},
    sub: {fontSize: 13, marginTop: 1},
    amount: {fontSize: 17, color: c.text},
    amountFailed: {color: c.textSubtle, textDecorationLine: 'line-through'},
    empty: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 120},
    emptyIcon: {width: 72, height: 72, borderRadius: 36, backgroundColor: glass, borderWidth: 1, borderColor: rim, alignItems: 'center', justifyContent: 'center', marginBottom: 14},
    emptyIconText: {fontSize: 30, color: c.textMuted},
    emptyTitle: {fontSize: 20, fontWeight: '700', color: c.text, textAlign: 'center'},
    emptyHint: {fontSize: 15, color: c.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 21},
  });
}
