/**
 * TransactionStatusScreen — Pending/confirmed/failed with Monad receipt polling
 * Confirmed UI inspired by Glow-style Sent/Received receipt.
 */

import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RootStackParamList} from '../navigation/AppNavigator';
import {getExplorerTxUrl} from '../config/monad';
import {truncateAddress, formatMon} from '../utils/format';
import {waitForReceipt, getBalance} from '../services/wallet';
import {useWallet} from '../context/WalletContext';
import {triggerHaptic} from '../utils/haptics';
import {updateTransactionStatus} from '../services/history';
import {CrossIcon, ExternalLinkIcon, WalletCardIcon} from '../components/AppIcons';
import {useTheme} from '../context/ThemeContext';
import type {AppColors} from '../theme';
import {getTokenBySymbol} from '../config/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionStatus'>;
  route: RouteProp<RootStackParamList, 'TransactionStatus'>;
};

function DirectionArrow({
  direction,
  sentColor,
  receivedColor,
}: {
  direction: 'up' | 'down';
  sentColor: string;
  receivedColor: string;
}) {
  return (
    <Text
      style={{
        fontSize: 28,
        fontWeight: '700',
        color: direction === 'up' ? sentColor : receivedColor,
        marginTop: direction === 'up' ? -2 : 2,
      }}>
      {direction === 'up' ? '↑' : '↓'}
    </Text>
  );
}

function PartyRow({
  label,
  primary,
  secondary,
  balanceLabel,
  balanceValue,
  styles,
  iconMuted,
}: {
  label: string;
  primary: string;
  secondary?: string;
  balanceLabel?: string;
  balanceValue?: string;
  styles: ReturnType<typeof createStyles>;
  iconMuted: string;
}) {
  return (
    <View style={styles.partyRow}>
      <View style={styles.partyLeft}>
        <View style={styles.partyIcon}>
          <WalletCardIcon size={14} color={iconMuted} />
        </View>
        <View style={styles.partyTextCol}>
          <Text style={styles.partyLabel}>{label}</Text>
          <Text style={styles.partyPrimary} numberOfLines={1}>
            {primary}
          </Text>
          {!!secondary && (
            <Text style={styles.partySecondary} numberOfLines={1}>
              {secondary}
            </Text>
          )}
        </View>
      </View>
      {!!balanceValue && (
        <View style={styles.partyRight}>
          <Text style={styles.partyLabel}>{balanceLabel || 'Balance'}</Text>
          <Text style={styles.partyBalance}>{balanceValue}</Text>
        </View>
      )}
    </View>
  );
}

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
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'failed'>(
    initialStatus ?? 'pending',
  );
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
          markFailed('Payment not detected yet. It may still arrive shortly.');
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
        } else {
          markFailed(result.error || 'Transaction reverted');
        }
      } catch (err: any) {
        if (isMounted) {
          markFailed(err?.message || 'Failed to poll transaction receipt');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [txHash, waitForBalance, expectedAmountWei, address, balance, refreshBalance, initialStatus]);

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
  const sentAmountColor = '#FF6B6B';
  const amountColor = isReceived ? colors.success : sentAmountColor;
  const iconMuted = colors.textSubtle;

  if (status === 'pending') {
    return (
      <View style={[styles.container, {paddingTop: insets.top + 40}]}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.pendingTitle}>
            {isReceived ? 'Receiving…' : 'Broadcasting…'}
          </Text>
          <Text style={styles.pendingHint}>
            {isReceived
              ? 'Waiting for sender to complete the on-chain transfer'
              : 'Waiting for Monad confirmation (~1–2s)'}
          </Text>
          <View style={styles.pendingAmountChip}>
            <Text style={styles.pendingAmount}>{amount} {displaySymbol}</Text>
          </View>
        </View>
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View style={[styles.container, {paddingTop: insets.top + 40}]}>
        <View style={styles.centerState}>
          <View style={styles.failCircle}>
            <CrossIcon size={32} color={colors.text} />
          </View>
          <Text style={styles.pendingTitle}>Transaction Failed</Text>
          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.85}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {paddingTop: insets.top + 8}]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {paddingBottom: insets.bottom + 28},
        ]}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.popToTop()}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={styles.backChevron}>‹</Text>
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.heroIcon,
            {
              backgroundColor: isReceived
                ? 'rgba(16, 185, 129, 0.18)'
                : 'rgba(255, 107, 107, 0.18)',
              transform: [{scale: checkmarkScale}],
            },
          ]}>
          <DirectionArrow
            direction={isReceived ? 'down' : 'up'}
            sentColor={sentAmountColor}
            receivedColor={colors.success}
          />
        </Animated.View>

        <Text style={styles.heroStatus}>{isReceived ? 'Received' : 'Sent'}</Text>
        <Text style={styles.heroAmount}>{amount} {displaySymbol}</Text>
        <Text style={styles.heroTime}>{timestampLabel}</Text>

        <View style={styles.partyBlock}>
          <PartyRow
            label="From"
            primary={fromParty.primary}
            secondary={fromParty.secondary}
            balanceLabel={!isReceived ? 'Balance' : undefined}
            balanceValue={!isReceived ? formatMon(balance) : undefined}
            styles={styles}
            iconMuted={iconMuted}
          />
          <View style={styles.partyConnector}>
            <Text style={styles.partyConnectorIcon}>⌄</Text>
          </View>
          <PartyRow
            label="To"
            primary={toParty.primary}
            secondary={toParty.secondary}
            balanceLabel={isReceived ? 'Balance' : undefined}
            balanceValue={isReceived ? formatMon(balance) : undefined}
            styles={styles}
            iconMuted={iconMuted}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.detailList}>
          <View style={styles.assetRow}>
            <View style={styles.assetLeft}>
              <View style={styles.monBadge}>
                <Text style={styles.monBadgeText}>{badgeLetter}</Text>
              </View>
              <View>
                <Text style={styles.assetName}>{tokenName}</Text>
                <Text style={styles.assetTicker}>{displaySymbol}</Text>
              </View>
            </View>
            <View style={styles.assetRight}>
              <Text style={[styles.assetDelta, {color: amountColor}]}>
                {signedAmount}
              </Text>
            </View>
          </View>

          {isRealTxHash && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Signature</Text>
              <Text style={styles.metaValue}>
                {truncateAddress(txHash, 6, 5)}
              </Text>
            </View>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Network</Text>
            <Text style={styles.metaValue}>Monad Mainnet</Text>
          </View>
        </View>

        {isRealTxHash && (
          <TouchableOpacity
            style={styles.explorerLink}
            onPress={openExplorer}
            activeOpacity={0.7}>
            <Text style={styles.explorerLinkText}>View Raw Transaction</Text>
            <ExternalLinkIcon size={14} color={iconMuted} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.popToTop()}
          activeOpacity={0.85}>
          <Text style={styles.homeBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 22,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    marginBottom: 8,
  },
  backChevron: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '300',
    marginTop: -4,
  },
  heroIcon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  heroStatus: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
  },
  heroAmount: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginTop: 6,
  },
  heroTime: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 28,
  },
  partyBlock: {
    marginBottom: 8,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  partyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  partyTextCol: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  partyPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  partySecondary: {
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  partyRight: {
    alignItems: 'flex-end',
  },
  partyBalance: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  partyConnector: {
    paddingLeft: 10,
    paddingVertical: 4,
  },
  partyConnectorIcon: {
    color: colors.textSubtle,
    fontSize: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: 18,
  },
  detailList: {
    gap: 18,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monBadgeText: {
    color: colors.textOnAccent,
    fontWeight: '800',
    fontSize: 16,
  },
  assetName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  assetTicker: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetDelta: {
    fontSize: 15,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  explorerLink: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  explorerLinkText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  homeBtn: {
    marginTop: 28,
    backgroundColor: colors.accent,
    borderRadius: 28,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  homeBtnText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  pendingTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  pendingHint: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  pendingAmountChip: {
    marginTop: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceSolid,
  },
  pendingAmount: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  failCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
  });
}
