/**
 * HomeScreen — Premium dashboard with wallet card, NFC actions, and quick pay
 */

import React, {useState, useCallback} from 'react';
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
import {truncateAddress, formatMon} from '../utils/format';
import {triggerHaptic} from '../utils/haptics';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const {address, balance, username, refreshBalance} = useWallet();
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const onRefresh = useCallback(async () => {
    triggerHaptic.impactMedium();
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  }, [refreshBalance]);

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

      {/* Greeting */}
      <Text style={styles.greeting}>
        {username ? `Hello, @${username}` : 'Welcome back'}
      </Text>

      {/* Wallet Card */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardBrand}>
              <View style={styles.brandMark}>
                <Text style={styles.brandLetter}>T</Text>
              </View>
              <Text style={styles.brandName}>TapPay</Text>
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
              <View style={styles.copyIndicator}>
                <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={onRefresh}
              activeOpacity={0.7}>
              <Text style={styles.refreshIcon}>↻</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* NFC Actions */}
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
          <View style={[styles.actionIconCircle, {backgroundColor: '#10B98130'}]}>
            <Text style={styles.actionIcon}>↓</Text>
          </View>
          <Text style={styles.actionTitle}>Receive</Text>
          <Text style={styles.actionSubtitle}>Tap phone to accept</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Send Tile */}
      <TouchableOpacity
        style={styles.quickSendTile}
        activeOpacity={0.8}
        onPress={() => {
          triggerHaptic.impactMedium();
          navigation.navigate('SendPayment');
        }}>
        <View style={styles.quickSendLeft}>
          <View style={styles.quickSendIcon}>
            <Text style={styles.quickSendIconText}>→</Text>
          </View>
          <View>
            <Text style={styles.quickSendTitle}>Send Payment</Text>
            <Text style={styles.quickSendSubtitle}>
              Pay by @username or wallet address
            </Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Account Quick View */}
      {username && (
        <View style={styles.identityCard}>
          <View style={styles.identityLeft}>
            <View style={styles.identityAvatar}>
              <Text style={styles.identityAvatarText}>
                {username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.identityName}>@{username}</Text>
              <Text style={styles.identityHint}>Your Monad identity</Text>
            </View>
          </View>
        </View>
      )}
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
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B6B88',
    marginBottom: 18,
  },
  cardContainer: {
    marginBottom: 28,
    borderRadius: 24,
    elevation: 12,
    shadowColor: '#836EF9',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  card: {
    backgroundColor: '#16132A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2450',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#836EF9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLetter: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C4B5FD',
    letterSpacing: 0.5,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#201A3D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2450',
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  networkText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B7FCC',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceSection: {
    marginBottom: 22,
  },
  cardLabel: {
    fontSize: 11,
    color: '#7B6FC0',
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
    borderTopColor: '#2A2450',
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#201A3D',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 10,
  },
  addressText: {
    fontSize: 12,
    color: '#8B7FCC',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  copyIndicator: {
    backgroundColor: '#836EF920',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copyText: {
    fontSize: 10,
    color: '#836EF9',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#201A3D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 18,
    color: '#8B7FCC',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 18,
    padding: 20,
  },
  sendButton: {
    backgroundColor: '#836EF9',
  },
  receiveButton: {
    backgroundColor: '#0D7A3E',
  },
  actionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#FFFFFFBB',
  },
  quickSendTile: {
    backgroundColor: '#131320',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E1E30',
  },
  quickSendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  quickSendIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#836EF918',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#836EF930',
  },
  quickSendIconText: {
    fontSize: 18,
    color: '#836EF9',
    fontWeight: '700',
  },
  quickSendTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  quickSendSubtitle: {
    fontSize: 12,
    color: '#6B6B88',
  },
  chevron: {
    fontSize: 22,
    color: '#4A4A66',
    fontWeight: '300',
  },
  identityCard: {
    backgroundColor: '#131320',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E30',
  },
  identityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  identityAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#836EF920',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#836EF940',
  },
  identityAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#836EF9',
  },
  identityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  identityHint: {
    fontSize: 11,
    color: '#6B6B88',
  },
});
