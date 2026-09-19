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
        <View style={[styles.infoRow, {borderBottomWidth: 0}]}>
          <Text style={styles.infoKey}>TapPay Ledger</Text>
          <Text style={[styles.infoVal, styles.monoSmall]}>
            {MONAD_CONFIG.contracts.tapPayLedger || 'Not deployed'}
          </Text>
        </View>
      </View>

      {/* Quick Links (Clean Monochromatic — No highlighted colored avatars) */}
      <Text style={styles.sectionHeader}>NETWORK RESOURCES</Text>
      <View style={styles.card}>
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
              <Text style={styles.linkSubtitle}>Request testnet MON tokens</Text>
            </View>
          </View>
          <ExternalLinkIcon size={16} color="#8E8E93" />
        </TouchableOpacity>

        <View style={styles.rpcDivider} />

        <TouchableOpacity
          style={styles.linkRow}
          activeOpacity={0.7}
          onPress={() => {
            triggerHaptic.selection();
            Linking.openURL(MONAD_CONFIG.blockExplorer.url);
          }}>
          <View style={styles.linkLeft}>
            <View style={styles.linkIconNeutral}>
              <ExplorerIcon size={16} color="#FFFFFF" />
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
    backgroundColor: '#09090D',
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
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#30D158',
  },
  networkName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#14141E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222232',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2C',
  },
  infoKey: {
    color: '#8E8E93',
    fontSize: 14,
  },
  infoVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chainIdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chainIdText: {
    color: '#FFFFFF',
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
    backgroundColor: '#30D158',
  },
  rpcLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rpcUrl: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  rpcDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#1E1E2C',
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
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  linkSubtitle: {
    color: '#8E8E93',
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
    color: '#FFFFFF',
  },
  perfLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
    fontWeight: '600',
  },
  perfDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#222232',
  },
});
