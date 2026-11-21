/**
 * NetworkScreen — Monad network details in iOS grouped lists.
 */

import React, {useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {MONAD_CONFIG} from '../config/monad';
import {useTheme} from '../context/ThemeContext';
import AmbientBackground from '../components/AmbientBackground';
import {Group, Row} from '../components/IosList';
import type {AppColors} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NetworkInfo'>;
};

function Dot({color}: {color: string}) {
  return <View style={{width: 9, height: 9, borderRadius: 5, backgroundColor: color}} />;
}

export default function NetworkScreen(_props: Props) {
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rpc = MONAD_CONFIG.rpcUrls;

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>◍</Text>
        </View>
        <Text style={styles.name}>{MONAD_CONFIG.chainName}</Text>
        <View style={styles.status}>
          <Dot color={colors.success} />
          <Text style={styles.statusText}>Connected</Text>
        </View>
      </View>

      <View style={styles.stats}>
        {[
          ['~1s', 'Block time'],
          ['10K', 'TPS'],
          ['EVM', 'Compatible'],
        ].map(([v, l]) => (
          <View key={l} style={styles.stat}>
            <Text style={styles.statValue}>{v}</Text>
            <Text style={styles.statLabel}>{l}</Text>
          </View>
        ))}
      </View>

      <Group title="Chain">
        <Row title="Network" value={MONAD_CONFIG.chainName} />
        <Row title="Chain ID" value={String(MONAD_CONFIG.chainId)} />
        <Row
          title="Currency"
          value={`${MONAD_CONFIG.nativeCurrency.name} (${MONAD_CONFIG.nativeCurrency.symbol})`}
        />
        <Row title="Decimals" value={String(MONAD_CONFIG.nativeCurrency.decimals)} />
      </Group>

      <Group
        title="RPC Endpoints"
        footer="Payments use the primary endpoint and fall back to the others if it is unreachable.">
        <Row title="Primary" subtitle={rpc.primary} chevron={false} right={<Dot color={colors.success} />} />
        <Row title="Fallback 1" subtitle={rpc.fallback1} chevron={false} right={<Dot color={colors.warning} />} />
        <Row title="Fallback 2" subtitle={rpc.fallback2} chevron={false} right={<Dot color={colors.warning} />} />
      </Group>
      </ScrollView>
    </View>
  );
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: c.background},
    content: {padding: 20, paddingBottom: 48},
    header: {alignItems: 'center', paddingVertical: 12, gap: 6},
    badge: {width: 72, height: 72, borderRadius: 18, backgroundColor: '#30D158', alignItems: 'center', justifyContent: 'center'},
    badgeText: {fontSize: 34, color: '#FFFFFF'},
    name: {fontSize: 24, fontWeight: '700', color: c.text, marginTop: 6},
    status: {flexDirection: 'row', alignItems: 'center', gap: 6},
    statusText: {fontSize: 15, color: c.textMuted},
    stats: {flexDirection: 'row', gap: 10, marginTop: 14},
    stat: {flex: 1, backgroundColor: c.surfaceSolid, borderRadius: 14, paddingVertical: 14, alignItems: 'center'},
    statValue: {fontSize: 20, fontWeight: '700', color: c.text},
    statLabel: {fontSize: 12, color: c.textMuted, marginTop: 2},
  });
}
