/**
 * NetworkScreen — Monad network details, RPC endpoints, faucet & explorer links
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {MONAD_CONFIG} from '../config/monad';
import {triggerHaptic} from '../utils/haptics';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NetworkInfo'>;
};

export default function NetworkScreen({navigation}: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Network Status Header */}
      <View style={styles.statusHeader}>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Connected</Text>
        </View>
        <Text style={styles.networkName}>{MONAD_CONFIG.chainName}</Text>
      </View>

      {/* Chain Details */}
      <Text style={styles.sectionHeader}>CHAIN DETAILS</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Network</Text>
          <Text style={styles.infoVal}>{MONAD_CONFIG.chainName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Chain ID</Text>
          <View style={styles.chainIdBadge}>
            <Text style={styles.chainIdText}>{MONAD_CONFIG.chainId}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Currency</Text>
          <Text style={styles.infoVal}>
            {MONAD_CONFIG.nativeCurrency.name} ({MONAD_CONFIG.nativeCurrency.symbol})
          </Text>
        </View>
        <View style={[styles.infoRow, {borderBottomWidth: 0}]}>
          <Text style={styles.infoKey}>Decimals</Text>
          <Text style={styles.infoVal}>{MONAD_CONFIG.nativeCurrency.decimals}</Text>
        </View>
      </View>

      {/* RPC Endpoints */}
      <Text style={styles.sectionHeader}>RPC ENDPOINTS</Text>
      <View style={styles.card}>
        <View style={styles.rpcRow}>
          <View style={styles.rpcLeft}>
            <View style={styles.rpcStatusDot} />
            <View>
              <Text style={styles.rpcLabel}>Primary</Text>
              <Text style={styles.rpcUrl}>{MONAD_CONFIG.rpcUrls.primary}</Text>
            </View>
          </View>
        </View>

        <View style={styles.rpcDivider} />

        <View style={styles.rpcRow}>
          <View style={styles.rpcLeft}>
            <View style={[styles.rpcStatusDot, {backgroundColor: '#F59E0B'}]} />
            <View>
              <Text style={styles.rpcLabel}>Fallback 1</Text>
              <Text style={styles.rpcUrl}>{MONAD_CONFIG.rpcUrls.fallback1}</Text>
            </View>
          </View>
        </View>

        <View style={styles.rpcDivider} />

        <View style={styles.rpcRow}>
          <View style={styles.rpcLeft}>
            <View style={[styles.rpcStatusDot, {backgroundColor: '#F59E0B'}]} />
            <View>
              <Text style={styles.rpcLabel}>Fallback 2</Text>
              <Text style={styles.rpcUrl}>{MONAD_CONFIG.rpcUrls.fallback2}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Contract Addresses */}
      <Text style={styles.sectionHeader}>CONTRACTS</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Username Registry</Text>
          <Text style={[styles.infoVal, styles.monoSmall]}>
            {MONAD_CONFIG.contracts.usernameRegistry || 'Not deployed'}
          </Text>
        </View>
        <View style={[styles.infoRow, {borderBottomWidth: 0}]}>
          <Text style={styles.infoKey}>TapPay Ledger</Text>
          <Text style={[styles.infoVal, styles.monoSmall]}>
            {MONAD_CONFIG.contracts.tapPayLedger || 'Not deployed'}
          </Text>
        </View>
      </View>

      {/* Quick Links */}
      <Text style={styles.sectionHeader}>QUICK LINKS</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.linkRow}
          activeOpacity={0.7}
          onPress={() => {
            triggerHaptic.impactMedium();
            Linking.openURL(MONAD_CONFIG.faucetUrl);
          }}>
          <View style={styles.linkLeft}>
            <View style={[styles.linkIconCircle, {backgroundColor: '#3B82F620'}]}>
              <Text style={styles.linkIcon}>🚰</Text>
            </View>
            <View>
              <Text style={styles.linkTitle}>Monad Faucet</Text>
              <Text style={styles.linkSubtitle}>Get testnet MON tokens</Text>
            </View>
          </View>
          <Text style={styles.chevron}>↗</Text>
        </TouchableOpacity>

        <View style={styles.rpcDivider} />

        <TouchableOpacity
          style={styles.linkRow}
          activeOpacity={0.7}
          onPress={() => {
            triggerHaptic.impactMedium();
            Linking.openURL(MONAD_CONFIG.blockExplorer.url);
          }}>
          <View style={styles.linkLeft}>
            <View style={[styles.linkIconCircle, {backgroundColor: '#10B98120'}]}>
              <Text style={styles.linkIcon}>🔍</Text>
            </View>
            <View>
              <Text style={styles.linkTitle}>{MONAD_CONFIG.blockExplorer.name}</Text>
              <Text style={styles.linkSubtitle}>View transactions & blocks</Text>
            </View>
          </View>
          <Text style={styles.chevron}>↗</Text>
        </TouchableOpacity>
      </View>

      {/* Performance Info */}
      <Text style={styles.sectionHeader}>PERFORMANCE</Text>
      <View style={styles.card}>
        <View style={styles.perfRow}>
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>~1s</Text>
            <Text style={styles.perfLabel}>Block Time</Text>
          </View>
          <View style={styles.perfDivider} />
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>10K</Text>
            <Text style={styles.perfLabel}>TPS</Text>
          </View>
          <View style={styles.perfDivider} />
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>EVM</Text>
            <Text style={styles.perfLabel}>Compatible</Text>
          </View>
        </View>
      </View>
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
  statusHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  networkName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8888AA',
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#161622',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#222235',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E30',
  },
  infoKey: {
    color: '#8888AA',
    fontSize: 14,
  },
  infoVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  monoSmall: {
    fontFamily: 'monospace',
    fontSize: 11,
    maxWidth: '55%',
    textAlign: 'right',
  },
  chainIdBadge: {
    backgroundColor: '#836EF920',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chainIdText: {
    color: '#C4B5FD',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  rpcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rpcLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rpcStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  rpcLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  rpcUrl: {
    fontSize: 11,
    color: '#8888AA',
    fontFamily: 'monospace',
  },
  rpcDivider: {
    height: 1,
    backgroundColor: '#1E1E30',
    marginVertical: 8,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  linkIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkIcon: {
    fontSize: 20,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  linkSubtitle: {
    fontSize: 12,
    color: '#8888AA',
  },
  chevron: {
    fontSize: 18,
    color: '#836EF9',
    fontWeight: '600',
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  perfItem: {
    alignItems: 'center',
    flex: 1,
  },
  perfValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  perfLabel: {
    fontSize: 12,
    color: '#8888AA',
    fontWeight: '500',
  },
  perfDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#2A2A3E',
  },
});
