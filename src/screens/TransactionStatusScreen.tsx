/**
 * TransactionStatusScreen — Pending/confirmed/failed with Monad receipt polling
 * Confirmed UI inspired by Glow-style Sent/Received receipt.
 */

import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RootStackParamList} from '../navigation/AppNavigator';
import {getExplorerTxUrl} from '../config/monad';
import {truncateAddress} from '../utils/format';
import {waitForReceipt, getBalance} from '../services/wallet';
import {useWallet} from '../context/WalletContext';
import {triggerHaptic} from '../utils/haptics';
import {updateTransactionStatus} from '../services/history';
import {ExternalLinkIcon, ContactlessWave} from '../components/AppIcons';
import PressableScale from '../components/PressableScale';
import {GradientFill} from '../components/Gradient';
import AmbientBackground from '../components/AmbientBackground';
import SuccessBurst from '../components/SuccessBurst';
import {playSound} from '../utils/sounds';
import {useTheme} from '../context/ThemeContext';
import type {AppColors} from '../theme';
import {getTokenBySymbol} from '../config/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionStatus'>;
  route: RouteProp<RootStackParamList, 'TransactionStatus'>;
};

export default function TransactionStatusScreen({navigation, route}: Props) {
  const {
    txHash,
    amount,
    recipient,
    direction = 'sent',
    counterpartyUsername,
    waitForBalance,
    expectedAmountWei,
    tokenSymbol = 'MON',
    initialStatus,
    completedAt: completedAtParam,
  } = route.params;
  const {address, username, balance, refreshBalance} = useWallet();
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  // 'delayed' = no receipt yet after waiting. It is NOT a failure: the payment may still confirm.
  const [status, setStatus] = useState<'pending' | 'delayed' | 'confirmed' | 'failed'>(
    initialStatus ?? 'pending',
  );
  const [attempt, setAttempt] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const checkmarkScale = useRef(
    new Animated.Value(initialStatus === 'confirmed' ? 1 : 0),
  ).current;
  const completedAt = useRef(
    completedAtParam ? new Date(completedAtParam) : new Date(),
  ).current;

  const isRealTxHash =
    txHash &&
    !txHash.startsWith('0x...') &&
    txHash !== 'pending' &&
    !txHash.startsWith('tap-');

  const isReceived = direction === 'received';

  useEffect(() => {
    navigation.setOptions({headerShown: false});
  }, [navigation]);

  const markConfirmed = () => {
    triggerHaptic.notificationSuccess();
    if (isRealTxHash) {
      updateTransactionStatus(txHash, 'confirmed');
    }
    setStatus('confirmed');
    Animated.spring(checkmarkScale, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
    refreshBalance();
  };

  // Timed out without a receipt: keep the history row pending (it is reconciled later).
  const markDelayed = () => {
    setStatus('delayed');
  };

  const checkAgain = () => {
    triggerHaptic.selection();
    setStatus('pending');
    setAttempt(n => n + 1);
  };

  const markFailed = (message: string) => {
    triggerHaptic.notificationError();
    if (isRealTxHash) {
      updateTransactionStatus(txHash, 'failed');
    }
    setStatus('failed');
    setErrorMessage(message);
  };

  useEffect(() => {
    // History / already-finalized txs: show the stored outcome, don't re-enter waiting UI.
    if (initialStatus === 'confirmed' || initialStatus === 'failed') {
      if (initialStatus === 'confirmed' && checkmarkScale) {
        checkmarkScale.setValue(1);
      }
      return;
    }

    let isMounted = true;

    (async () => {
      if (waitForBalance && address && expectedAmountWei) {
        const expected = BigInt(expectedAmountWei);
        const baseline = balance;
        const deadline = Date.now() + 30_000;

        while (Date.now() < deadline && isMounted) {
          try {
            const current = await getBalance(address);
            if (current >= baseline + expected) {
              if (isMounted) {
                markConfirmed();
              }
              return;
            }
          } catch {
            // Continue polling
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (isMounted) {
          markDelayed();
        }
        return;
      }

      if (!isRealTxHash) {
        // Receiver tap flow already confirmed via balance poll before navigate
        // (placeholder hash like "tap-payment" — no on-chain receipt to wait on).
        if (txHash?.startsWith('tap-')) {
          markConfirmed();
        }
        return;
      }

      try {
        const result = await waitForReceipt(txHash);
        if (!isMounted) {
          return;
        }

        if (result.confirmed) {
          markConfirmed();
        } else if (result.reverted) {
          // A reverted receipt is the only authoritative failure.
          markFailed(result.error || 'Transaction reverted');
        } else {
          markDelayed();
        }
      } catch {
        // Could not reach the network: nothing is known, so do not report a failure.
        if (isMounted) {
          markDelayed();
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [txHash, waitForBalance, expectedAmountWei, address, balance, refreshBalance, initialStatus, attempt]);

  const openExplorer = () => {
    if (isRealTxHash) {
      Linking.openURL(getExplorerTxUrl(txHash));
    }
  };

  const isUnknownRecipient =
    !recipient ||
    recipient.startsWith('Unknown') ||
    !recipient.startsWith('0x');

  const counterpartyPrimary = counterpartyUsername
    ? `@${counterpartyUsername}`
    : isUnknownRecipient
    ? recipient || 'Unknown'
    : truncateAddress(recipient, 6, 5);

  const counterpartySecondary =
    counterpartyUsername && !isUnknownRecipient && recipient.startsWith('0x')
      ? truncateAddress(recipient, 6, 5)
      : undefined;

  const selfPrimary = username
    ? `@${username}`
    : address
    ? truncateAddress(address, 6, 5)
    : 'You';
  const selfSecondary =
    username && address ? truncateAddress(address, 6, 5) : undefined;

  const fromParty = isReceived
    ? {
        primary: counterpartyPrimary,
        secondary: counterpartySecondary,
      }
    : {
        primary: selfPrimary,
        secondary: selfSecondary,
      };

  const toParty = isReceived
    ? {
        primary: selfPrimary,
        secondary: selfSecondary,
      }
    : {
        primary: counterpartyPrimary,
        secondary: counterpartySecondary,
      };

  const timestampLabel = useMemo(() => {
    return completedAt.toLocaleString([], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [completedAt]);

  const tokenInfo = getTokenBySymbol(tokenSymbol);
  const tokenName = tokenInfo?.name || 'Monad';
  const displaySymbol = tokenInfo?.symbol || 'MON';
  const badgeLetter = displaySymbol.charAt(0);

  const signedAmount = `${isReceived ? '+' : '-'}${amount} ${displaySymbol}`;
  const sentAmountColor = colors.text;
  const amountColor = isReceived ? colors.success : sentAmountColor;
  const iconMuted = colors.textSubtle;

  const onSuccessStart = useCallback(() => {
    // Replaying a stored receipt from History should stay quiet.
    if (initialStatus === 'confirmed') {
      return;
    }
    playSound('pay_success');
  }, [initialStatus]);

  const onFailedStart = useRef(false);
  useEffect(() => {
    if (status === 'failed' && !onFailedStart.current && initialStatus !== 'failed') {
      onFailedStart.current = true;
      playSound('pay_fail');
    }
  }, [status, initialStatus]);

  const background = <AmbientBackground />;

  if (status === 'pending') {
    return (
      <View style={[styles.container, {paddingTop: insets.top + 40}]}>
        {background}
        <View style={styles.centerState}>
          <PendingPulse accent={colors.accent} />
          <Text style={styles.stateTitle}>{isReceived ? 'Receiving…' : 'Sending…'}</Text>
          <Text style={styles.stateHint}>
            {isReceived
              ? 'Waiting for the sender to finish the transfer'
              : 'Waiting for network confirmation (about 1–2s)'}
          </Text>
          <View style={styles.amountChip}>
            <Text style={styles.amountChipText}>
              {amount} {displaySymbol}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (status === 'delayed') {
    return (
      <View style={[styles.container, {paddingTop: insets.top + 40}]}>
        {background}
        <View style={styles.centerState}>
          <PendingPulse accent={colors.accent} />
          <Text style={styles.stateTitle}>Still confirming</Text>
          <Text style={styles.stateHint}>
            {isReceived
              ? 'We have not seen this payment yet. It may still arrive. Check History in a moment.'
              : 'This is taking longer than usual. Your payment may still go through, so please do not send it again. It will update in History once the network confirms it.'}
          </Text>
          <View style={styles.amountChip}>
            <Text style={styles.amountChipText}>
              {amount} {displaySymbol}
            </Text>
          </View>
        </View>
        <View style={[styles.actions, {paddingBottom: insets.bottom + 20}]}>
          <PressableScale style={styles.secondaryBtn} contentStyle={styles.btnInner} onPress={checkAgain}>
            <Text style={styles.secondaryBtnText}>Check Again</Text>
          </PressableScale>
          <PressableScale style={styles.primaryBtn} contentStyle={styles.btnInner} onPress={() => navigation.popToTop()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View style={[styles.container, {paddingTop: insets.top + 40}]}>
        {background}
        <View style={styles.centerState}>
          <SuccessBurst colors={['#FF453A', '#FF453A']} reduced />
          <Text style={styles.stateTitle}>Payment failed</Text>
          {errorMessage && <Text style={styles.stateHint}>{errorMessage}</Text>}
        </View>
        <View style={[styles.actions, {paddingBottom: insets.bottom + 20}]}>
          <PressableScale style={styles.primaryBtn} contentStyle={styles.btnInner} onPress={() => navigation.popToTop()}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  const rows: {k: string; v: string; sub?: string}[] = [
    {k: 'From', v: fromParty.primary, sub: fromParty.secondary},
    {k: 'To', v: toParty.primary, sub: toParty.secondary},
    {k: 'Network', v: 'Monad'},
    {k: 'Time', v: timestampLabel},
  ];
  if (isRealTxHash) {
    rows.push({k: 'Reference', v: truncateAddress(txHash, 6, 5)});
  }

  return (
    <View style={[styles.container, {paddingTop: insets.top + 8}]}>
      {background}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, {paddingBottom: 16}]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <SuccessBurst
            colors={['#30D158', '#30D158']}
            onStart={onSuccessStart}
          />
          <Text style={styles.stateTitle}>{isReceived ? 'Payment received' : 'Payment sent'}</Text>
          <Text style={[styles.bigAmount, {color: amountColor}]} numberOfLines={1} adjustsFontSizeToFit>
            {isReceived ? '+' : '−'}
            {amount}
            <Text style={styles.bigUnit}> {displaySymbol}</Text>
          </Text>
          <Text style={styles.heroSub}>
            {isReceived ? 'from ' : 'to '}
            {isReceived ? fromParty.primary : toParty.primary}
          </Text>
        </View>

        <View style={styles.ticket}>
          {rows.map((r, i) => (
            <View key={r.k} style={[styles.ticketRow, i > 0 && styles.ticketRowBorder]}>
              <Text style={styles.ticketKey}>{r.k}</Text>
              <View style={styles.ticketValWrap}>
                <Text style={styles.ticketVal} numberOfLines={1}>
                  {r.v}
                </Text>
                {!!r.sub && <Text style={styles.ticketSub}>{r.sub}</Text>}
              </View>
            </View>
          ))}
                  </View>

        {isRealTxHash && (
          <PressableScale onPress={openExplorer} contentStyle={styles.explorerLink}>
            <Text style={styles.explorerLinkText}>View on explorer</Text>
            <ExternalLinkIcon size={14} color={colors.accent} />
          </PressableScale>
        )}
      </ScrollView>

      <View style={[styles.actions, {paddingBottom: insets.bottom + 20}]}>
        <PressableScale style={styles.primaryBtn} contentStyle={styles.btnInner} onPress={() => navigation.popToTop()}>
            <Text style={styles.primaryBtnText}>Done</Text>
        </PressableScale>
      </View>
    </View>
  );
}

function PendingPulse({accent}: {accent: string}) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(p, {toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true}),
    );
    loop.start();
    return () => loop.stop();
  }, [p]);
  const ring = (off: number) => {
    const v = Animated.modulo(Animated.add(p, off), 1);
    return (
      <Animated.View
        style={{
          position: 'absolute',
          width: 88,
          height: 88,
          borderRadius: 44,
          borderWidth: 2,
          borderColor: accent,
          opacity: v.interpolate({inputRange: [0, 0.2, 1], outputRange: [0, 0.6, 0]}),
          transform: [{scale: v.interpolate({inputRange: [0, 1], outputRange: [1, 2.2]})}],
        }}
      />
    );
  };
  return (
    <View style={{width: 200, height: 200, alignItems: 'center', justifyContent: 'center'}}>
      {ring(0)}
      {ring(0.5)}
      <View style={{width: 88, height: 88, borderRadius: 44, overflow: 'hidden', backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center'}}>
        <ContactlessWave size={38} color="#FFFFFF" />
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: colors.background},
    scrollContent: {paddingHorizontal: 20},
    centerState: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10},
    hero: {alignItems: 'center', marginTop: 4, marginBottom: 8},
    stateTitle: {fontSize: 17, fontWeight: '600', color: colors.textMuted, marginTop: -30},
    stateHint: {fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20},
    amountChip: {marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceSolid, borderWidth: 1, borderColor: colors.border},
    amountChipText: {fontSize: 16, fontWeight: '700', color: colors.text},
    bigAmount: {fontSize: 44, fontWeight: '700', letterSpacing: -1, marginTop: 6, maxWidth: '100%'},
    bigUnit: {fontSize: 18, fontWeight: '700', color: colors.textMuted, letterSpacing: 0},
    heroSub: {fontSize: 14, color: colors.textMuted, marginTop: 4},
    ticket: {
      marginTop: 18,
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 18,
    },
    ticketRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 15, gap: 16},
    ticketRowBorder: {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator},
    ticketKey: {fontSize: 13, color: colors.textMuted, fontWeight: '500'},
    ticketValWrap: {flex: 1, alignItems: 'flex-end'},
    ticketVal: {fontSize: 14, color: colors.text, fontWeight: '600'},
    ticketSub: {fontSize: 12, color: colors.textSubtle, marginTop: 2},
    notch: {position: 'absolute', top: '50%', width: 18, height: 18, borderRadius: 9, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, marginTop: -9},
    notchL: {left: -10},
    notchR: {right: -10},
    explorerLink: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 18},
    explorerLinkText: {fontSize: 15, fontWeight: '400', color: colors.accent},
    actions: {paddingHorizontal: 20, paddingTop: 8},
    secondaryBtn: {borderRadius: 26, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginBottom: 12},
    secondaryBtnText: {fontSize: 17, fontWeight: '600', color: colors.text},
    primaryBtn: {borderRadius: 26, overflow: 'hidden', backgroundColor: colors.text},
    btnInner: {height: 52, alignItems: 'center', justifyContent: 'center'},
    primaryBtnText: {fontSize: 17, fontWeight: '600', color: colors.background},
  });
}
