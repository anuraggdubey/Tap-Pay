/**
 * NetworkScreen — Monad network details in iOS grouped lists, the endpoint currently serving
 * requests, and an optional "use my own RPC" setting (see docs/RPC_AND_PRIVACY.md).
 */

import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {MONAD_CONFIG} from '../config/monad';
import {SUPPORTED_CHAINS} from '../config/chains';
import {useTheme} from '../context/ThemeContext';
import {Group, Row} from '../components/IosList';
import AmbientBackground from '../components/AmbientBackground';
import PressableScale from '../components/PressableScale';
import {triggerHaptic} from '../utils/haptics';
import {describeRpc} from '../services/rpcSettings';
import {getActiveRpcUrl, getCustomRpcUrl, getDefaultRpcEndpoints, setCustomRpc} from '../services/wallet';
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
  const [, setVersion] = useState(0);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const custom = getCustomRpcUrl();
  const active = getActiveRpcUrl();
  const defaults = getDefaultRpcEndpoints();

  const apply = async (value: string | null) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await setCustomRpc(value);
      if (result.ok) {
        triggerHaptic.notificationSuccess();
        setInput('');
        setVersion(v => v + 1);
      } else {
        triggerHaptic.notificationError();
        Alert.alert('RPC not changed', result.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    Alert.alert(
      'Use your own RPC?',
      'Payments, balances and receipts will use only this endpoint. The public providers are not used as a fallback, and it will see your IP together with your payments. Only use a node you trust.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Use this RPC', onPress: () => apply(input)},
      ],
    );
  };

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          title="Supported EVM Networks"
          footer="Payments and NFC Tap-to-Pay currently run on Monad Mainnet. Ethereum and Base are registered as EVM mainnets for upcoming multichain payment routing.">
          {SUPPORTED_CHAINS.map(chain => {
            const isActive = chain.tapPayLedgerSupported;
            return (
              <Row
                key={chain.key}
                title={chain.chainName}
                subtitle={
                  isActive
                    ? `Chain ${chain.chainId} · NFC Tap-to-Pay Live`
                    : `Chain ${chain.chainId} · Coming Soon`
                }
                value={isActive ? 'Active' : 'Read-only'}
                chevron={false}
                right={<Dot color={isActive ? colors.success : colors.textSubtle} />}
              />
            );
          })}
        </Group>

        <Group
          title="RPC Endpoints"
          footer={
            custom
              ? 'You are using your own RPC. It is the only endpoint used, with no public fallback.'
              : 'Payments are sent to all of these so one honest node is enough, and a receipt is only trusted when two agree. Each one sees your IP with your payments. Set your own RPC below for more privacy.'
          }>
          {custom ? (
            <Row
              title="Your RPC"
              subtitle={describeRpc(custom)}
              chevron={false}
              right={<Dot color={colors.success} />}
            />
          ) : (
            defaults.map((url, i) => (
              <Row
                key={url}
                title={i === 0 ? 'Primary' : `Fallback ${i}`}
                subtitle={describeRpc(url)}
                value={url === active ? 'Active' : undefined}
                chevron={false}
                right={<Dot color={url === active ? colors.success : colors.warning} />}
              />
            ))
          )}
        </Group>

        <Group
          title="Your own RPC (optional)"
          footer="Must be https and report Monad (chain ID 143). Do not paste a URL that contains a secret key unless you trust this phone.">
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="https://your-node.example.com"
              placeholderTextColor={colors.textSubtle}
              value={input}
              onChangeText={setInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              underlineColorAndroid="transparent"
              accessibilityLabel="Custom RPC URL"
            />
          </View>
          <PressableScale onPress={save} disabled={busy || !input.trim()}>
            <View style={styles.action}>
              {busy ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={[styles.actionText, !input.trim() && {opacity: 0.4}]}>Verify and Use</Text>
              )}
            </View>
          </PressableScale>
          {custom ? (
            <PressableScale onPress={() => apply(null)} disabled={busy}>
              <View style={styles.action}>
                <Text style={[styles.actionText, {color: colors.danger}]}>Use Default Endpoints</Text>
              </View>
            </PressableScale>
          ) : null}
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
    inputRow: {paddingHorizontal: 16},
    input: {fontSize: 16, color: c.text, paddingVertical: 14},
    action: {alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 16},
    actionText: {fontSize: 17, color: c.accent},
  });
}
