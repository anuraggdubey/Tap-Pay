/**
 * NetworkScreen — Monad network details, RPC endpoints, faucet & explorer links
 * Clean monochromatic styling matching Apple / Opal design system.
 * Absolutely ZERO highlighted badge tags or emojis.
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
import {FaucetIcon, ExplorerIcon, ExternalLinkIcon} from '../components/AppIcons';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NetworkInfo'>;
};

export default function NetworkScreen({_navigation}: Props) {
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
            <View style={[styles.rpcStatusDot, {backgroundColor: '#FF9F0A'}]} />
            <View>
              <Text style={styles.rpcLabel}>Fallback 1</Text>
              <Text style={styles.rpcUrl}>{MONAD_CONFIG.rpcUrls.fallback1}</Text>
            </View>
          </View>
        </View>

        <View style={styles.rpcDivider} />

        <View style={styles.rpcRow}>
          <View style={styles.rpcLeft}>
            <View style={[styles.rpcStatusDot, {backgroundColor: '#FF9F0A'}]} />
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
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>TapPay Ledger</Text>
          <Text style={[styles.infoVal, styles.monoSmall]}>
            {MONAD_CONFIG.contracts.tapPayLedger || 'Not deployed'}
          </Text>
        </View>
        <View style={[styles.infoRow, {borderBottomWidth: 0}]}>
          <Text style={styles.infoKey}>Multi-Token Ledger</Text>
          <Text style={[styles.infoVal, styles.monoSmall]}>
            {MONAD_CONFIG.contracts.multiTokenLedger || 'Not deployed'}
          </Text>
        </View>
      </View>

      {/* Quick Links (Clean Monochromatic — No highlighted colored avatars) */}
      <Text style={styles.sectionHeader}>NETWORK RESOURCES</Text>
      <View style={styles.card}>
        {MONAD_CONFIG.faucetUrl?.trim() ? (
          <>
            <TouchableOpacity
              style={styles.linkRow}
              activeOpacity={0.7}
              onPress={() => {
                triggerHaptic.selection();
                Linking.openURL(MONAD_CONFIG.faucetUrl);
              }}>
              <View style={styles.linkLeft}>
                <View style={styles.linkIconNeutral}>
                  <FaucetIcon size={16} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.linkTitle}>Monad Faucet</Text>
                  <Text style={styles.linkSubtitle}>Request MON tokens</Text>
                </View>
              </View>
              <ExternalLinkIcon size={16} color="#8E8E93" />
            </TouchableOpacity>
            <View style={styles.rpcDivider} />
          </>
        ) : null}

        <TouchableOpacity
          style={styles.linkRow}
          activeOpacity={0.7}
          onPress={() => {
            triggerHaptic.selection();
            Linking.openURL(MONAD_CONFIG.blockExplorer.url);
          }}>
          <View style={styles.linkLeft}>
            <View style={styles.linkIconNeutral}>
              <ExplorerIcon size={16} color="#0A84FF" />
            </View>
            <View>
              <Text style={styles.linkTitle}>{MONAD_CONFIG.blockExplorer.name}</Text>
              <Text style={styles.linkSubtitle}>View transactions & blocks</Text>
            </View>
          </View>
          <ExternalLinkIcon size={16} color="#8E8E93" />
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
    backgroundColor: '#EEF3FA',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  statusHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 6,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34C759',
  },
  networkName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0B1220',
    letterSpacing: -0.3,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9AA3B2',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 40, 80, 0.08)',
    marginBottom: 10,
    shadowColor: '#0A84FF',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  infoKey: {
    color: '#6B7280',
    fontSize: 14,
  },
  infoVal: {
    color: '#0B1220',
    fontSize: 14,
    fontWeight: '600',
  },
  chainIdBadge: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chainIdText: {
    color: '#0A84FF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  monoSmall: {
    fontFamily: 'monospace',
    fontSize: 11,
    maxWidth: '55%',
    textAlign: 'right',
  },
  rpcRow: {
    paddingVertical: 8,
  },
  rpcLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rpcStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
  },
  rpcLabel: {
    color: '#0B1220',
    fontSize: 14,
    fontWeight: '600',
  },
  rpcUrl: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  rpcDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(60, 60, 67, 0.12)',
    marginVertical: 10,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkIconNeutral: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkTitle: {
    color: '#0B1220',
    fontSize: 14,
    fontWeight: '600',
  },
  linkSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  perfItem: {
    alignItems: 'center',
  },
  perfValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0A84FF',
  },
  perfLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  perfDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(60, 60, 67, 0.12)',
  },
});
