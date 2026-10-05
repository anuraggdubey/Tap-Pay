/**
 * HomeScreen — TapPay wallet dashboard
 */

import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {ethers} from 'ethers';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWallet} from '../context/WalletContext';
import {truncateAddress, formatTimestamp} from '../utils/format';
import {triggerHaptic} from '../utils/haptics';
import {RootStackParamList} from '../navigation/AppNavigator';
import BrandLogo from '../components/BrandLogo';
import {ContactlessWave, SettingsIcon, UserIcon} from '../components/AppIcons';
import {getTransactionHistory, initHistory, TransactionRecord} from '../services/history';
import {initNfc, isNfcEnabled, isNfcSupported} from '../services/nfcReader';
import PressableScale from '../components/PressableScale';
import FadeInView from '../components/FadeInView';
import LivePulseDot from '../components/LivePulseDot';
import {colors, glass, shadows, premiumCard} from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function getTxBadge(tx: TransactionRecord): {label: string; variant: 'tap' | 'direct' | 'received'} {
  if (tx.direction === 'received') {
    return {label: 'Received', variant: 'received'};
  }
  if (tx.counterpartyUsername) {
    return {label: 'Direct Transfer', variant: 'direct'};
  }
  return {label: 'Paid with Tap', variant: 'tap'};
}

function getTxIconMeta(tx: TransactionRecord): {letter: string; color: string; bg: string} {
  if (tx.direction === 'received') {
    return {letter: '↓', color: '#30D158', bg: 'rgba(48, 209, 88, 0.15)'};
  }
  const letter = tx.counterpartyUsername
    ? tx.counterpartyUsername.charAt(0).toUpperCase()
    : tx.counterparty.slice(2, 3).toUpperCase();
  if (tx.counterpartyUsername) {
    return {letter: `@${letter}`.slice(0, 2) === '@@' ? letter : letter, color: '#0A84FF', bg: 'rgba(10, 132, 255, 0.16)'};
  }
  return {letter, color: '#64D2FF', bg: 'rgba(100, 210, 255, 0.14)'};
}

function getTxTitle(tx: TransactionRecord): string {
  if (tx.direction === 'received') {
    return tx.counterpartyUsername
      ? `Received from @${tx.counterpartyUsername}`
      : `Received from ${truncateAddress(tx.counterparty, 6, 4)}`;
  }
  if (tx.counterpartyUsername) {
    return `Sent to @${tx.counterpartyUsername}`;
  }
  return `Sent to ${truncateAddress(tx.counterparty, 8, 4)}`;
}

type ProfileDestination = 'AccountInfo' | 'Settings';

function ProfileDropdown({
  username,
  address,
  profileLetter,
  copied,
  onCopyAddress,
  onNavigate,
  onDismiss,
}: {
  username?: string | null;
  address?: string | null;
  profileLetter: string;
  copied: boolean;
  onCopyAddress: () => void;
  onNavigate: (destination: ProfileDestination) => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const panelY = React.useRef(new Animated.Value(-420)).current;
  const scrimOpacity = React.useRef(new Animated.Value(0)).current;
  const closing = React.useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!mounted) return;
      if (reduced) {
        panelY.setValue(0);
        scrimOpacity.setValue(1);
        return;
      }
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(panelY, {
            toValue: 0,
            duration: 220,
            easing: Easing.bezier(0.32, 0.72, 0, 1),
            useNativeDriver: true,
          }),
          Animated.timing(scrimOpacity, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    });
    return () => {
      mounted = false;
    };
  }, [panelY, scrimOpacity]);

  const dismiss = (afterDismiss?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced) {
        onDismiss();
        afterDismiss?.();
        return;
      }
      Animated.parallel([
        Animated.timing(panelY, {
          toValue: -420,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(({finished}) => {
        if (finished) {
          onDismiss();
          afterDismiss?.();
        }
      });
    });
  };

  const openDestination = (destination: ProfileDestination) => {
    triggerHaptic.selection();
    dismiss(() => onNavigate(destination));
  };

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss()}>
      <View style={styles.profileModalRoot}>
        <Animated.View
          pointerEvents="none"
          style={[styles.profileScrim, {opacity: scrimOpacity}]}
        />
        <Pressable
          style={styles.profileBackdropPressable}
          onPress={() => dismiss()}
          accessibilityRole="button"
          accessibilityLabel="Close profile menu"
        />
        <Animated.View
          style={[
            styles.profilePanel,
            {
              paddingTop: insets.top + 12,
              transform: [{translateY: panelY}],
            },
          ]}>
          <View style={styles.profilePanelHeader}>
            <Text style={styles.profilePanelEyebrow}>TAPPAY ACCOUNT</Text>
            <PressableScale
              style={styles.profilePanelClose}
              onPress={() => dismiss()}
              accessibilityLabel="Close profile menu">
              <Text style={styles.profilePanelCloseText}>×</Text>
            </PressableScale>
          </View>

          <View style={styles.profileIdentityRow}>
            <View style={styles.profileMenuAvatar}>
              <Text style={styles.profileMenuAvatarText}>{profileLetter}</Text>
            </View>
            <View style={styles.profileMenuIdentity}>
              <Text style={styles.profileMenuName} numberOfLines={1}>
                {username ? `@${username}` : 'TapPay User'}
              </Text>
              <View style={styles.profileMenuStatus}>
                <LivePulseDot active size={6} />
                <Text style={styles.profileMenuStatusText}>Monad Testnet</Text>
              </View>
            </View>
          </View>

          <View style={styles.profileAddressCard}>
            <View style={styles.profileAddressText}>
              <Text style={styles.profileAddressLabel}>WALLET ADDRESS</Text>
              <Text style={styles.profileAddressValue} numberOfLines={1}>
                {address ? truncateAddress(address, 8, 6) : 'Not connected'}
              </Text>
            </View>
            <PressableScale
              style={styles.profileCopyButton}
              onPress={onCopyAddress}
              disabled={!address}
              accessibilityLabel="Copy wallet address">
              <Text style={styles.profileCopyText}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </PressableScale>
          </View>

          <View style={styles.profileMenuLinks}>
            <PressableScale
              style={styles.profileMenuLink}
              contentStyle={styles.profileMenuLinkInner}
              onPress={() => openDestination('AccountInfo')}>
              <View style={styles.profileMenuIcon}>
                <UserIcon size={17} color={colors.accent} />
              </View>
              <Text style={styles.profileMenuLinkText}>Profile & Identity</Text>
              <Text style={styles.profileMenuChevron}>›</Text>
            </PressableScale>
            <View style={styles.profileMenuDivider} />
            <PressableScale
              style={styles.profileMenuLink}
              contentStyle={styles.profileMenuLinkInner}
              onPress={() => openDestination('Settings')}>
              <View style={styles.profileMenuIcon}>
                <SettingsIcon size={17} color={colors.accent} />
              </View>
              <Text style={styles.profileMenuLinkText}>Settings</Text>
              <Text style={styles.profileMenuChevron}>›</Text>
            </PressableScale>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {address, balance, ausdBalance, username, refreshBalance} = useWallet();
  const navigation = useNavigation<NavigationProp>();

  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [showingCardBack, setShowingCardBack] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const cardFaceProgress = React.useRef(new Animated.Value(0)).current;
  const [recentTx, setRecentTx] = useState<TransactionRecord[]>([]);
  const [nfcReady, setNfcReady] = useState(false);

  const terminalStatus = useMemo(() => {
    if (nfcReady) {
      return {label: 'NFC Ready', caption: 'Tap to pay in stores', ready: true};
    }
    return {label: 'NFC Off', caption: 'Enable NFC in settings', ready: false};
  }, [nfcReady]);

  const balanceMon = useMemo(() => {
    const num = parseFloat(ethers.formatEther(balance));
    return num.toLocaleString(undefined, {maximumFractionDigits: 3});
  }, [balance]);

  const displayAusd = useMemo(() => {
    if (ausdBalance === undefined) return '0.00';
    const num = parseFloat(ethers.formatUnits(ausdBalance || 0n, 6));
    return num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }, [ausdBalance]);

  const profileLetter = useMemo(() => {
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    if (address) {
      return address.slice(2, 3).toUpperCase();
    }
    return 'A';
  }, [username, address]);

  const loadRecent = useCallback(() => {
    const list = getTransactionHistory();
    setRecentTx(list.slice(0, 4));
  }, []);

  useEffect(() => {
    initHistory().then(() => loadRecent());
  }, [loadRecent]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) {
        setReducedMotion(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      await initNfc();
      const supported = await isNfcSupported();
      const enabled = supported ? await isNfcEnabled() : false;
      setNfcReady(supported && enabled);
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    triggerHaptic.impactMedium();
    setRefreshing(true);
    await refreshBalance();
    loadRecent();
    setRefreshing(false);
  }, [refreshBalance, loadRecent]);

  const copyAddress = () => {
    if (!address) {
      return;
    }
    triggerHaptic.impactMedium();
    Clipboard.setString(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedCardNumber = address
    ? `${address.slice(0, 4)} •••• •••• ${address.slice(-4)}`.toUpperCase()
    : '0X00 •••• •••• 0000';

  const setCardSide = (showBack: boolean) => {
    triggerHaptic.selection();
    setShowingCardBack(showBack);
    const toValue = showBack ? 1 : 0;
    if (reducedMotion) {
      cardFaceProgress.setValue(toValue);
      return;
    }
    Animated.timing(cardFaceProgress, {
      toValue,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const frontFaceOpacity = cardFaceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const backFaceOpacity = cardFaceProgress;

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 10},
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }>
        {/* Header */}
        <FadeInView delay={0} translateY={6}>
          <View style={styles.topBar}>
            <View style={styles.brandBlock}>
              <BrandLogo size={34} color={colors.accent} />
              <View style={styles.brandTextBlock}>
                <Text style={styles.brandTitle}>TapPay</Text>
                <Text style={styles.brandTagline}>TAP • PAY • GO</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <PressableScale
                style={styles.networkPill}
                onPress={() => navigation.navigate('NetworkInfo')}>
                <View style={styles.networkPillInner}>
                  <LivePulseDot active size={6} />
                  <Text style={styles.networkText}>Monad</Text>
                  <Text style={styles.chevronSmall}>⌄</Text>
                </View>
              </PressableScale>

              <PressableScale
                style={styles.profileCircle}
                contentStyle={styles.profileCircleInner}
                accessibilityLabel="Open profile menu"
                onPress={() => {
                  triggerHaptic.selection();
                  setProfileMenuOpen(true);
                }}>
                <Text style={styles.profileLetter}>{profileLetter}</Text>
              </PressableScale>
            </View>
          </View>
        </FadeInView>

        {/* Home hero */}
        <FadeInView delay={20} translateY={8}>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Your Money.</Text>
              <Text style={styles.heroTitleAccent}>Without Limits.</Text>
              <Text style={styles.heroDescription}>
                Pay in-store with NFC or online on Monad.
              </Text>
            </View>
            <View style={styles.heroNfcBadge}>
              <ContactlessWave size={28} color={colors.accent} />
            </View>
          </View>
        </FadeInView>

        {/* Virtual card — Apple Wallet style */}
        <FadeInView delay={40} translateY={12}>
          <View style={styles.cardContainer}>
            <View style={styles.cardFaceStack}>
            <Animated.View
              style={[styles.cardBody, {opacity: frontFaceOpacity}]}
              pointerEvents={showingCardBack ? 'none' : 'auto'}
              accessibilityElementsHidden={showingCardBack}
              importantForAccessibility={showingCardBack ? 'no-hide-descendants' : 'auto'}>
              <View style={styles.cardOrbLarge} />
              <View style={styles.cardOrbSmall} />
              <View style={styles.cardGlassEdge} />

              <View style={styles.cardTopRow}>
                <View style={styles.cardBrand}>
                  <BrandLogo size={22} color="#FFFFFF" />
                  <Text style={styles.cardBrandText}>TapPay</Text>
                </View>
                <PressableScale
                  style={styles.cardFlipHint}
                  contentStyle={styles.cardFlipHintInner}
                  accessibilityLabel="Tap to see balance"
                  onPress={() => setCardSide(true)}>
                  <Text style={styles.cardFlipHintText}>Tap to see balance</Text>
                  <Text style={styles.cardFlipHintChevron}>›</Text>
                </PressableScale>
              </View>

              <View style={styles.cardChipRow}>
                <View style={styles.cardChip}>
                  <View style={styles.cardChipInner} />
                  <View style={styles.cardChipH} />
                  <View style={styles.cardChipV} />
                </View>
                <View style={styles.cardNetworkPill}>
                  <Text style={styles.cardNetworkText}>MONAD</Text>
                </View>
              </View>

              <View style={styles.cardMidRow}>
                <Text style={styles.cardNumberText}>{formattedCardNumber}</Text>
                <PressableScale
                  style={[styles.copyChip, copied && styles.copiedChip]}
                  onPress={copyAddress}>
                  <Text style={styles.copyChipText}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </PressableScale>
              </View>

              <View style={styles.cardBottomRow}>
                <View>
                  <Text style={styles.cardHolderLabel}>CARDHOLDER</Text>
                  <Text style={styles.cardHolderName}>
                    {username ? `@${username}` : 'TAP-PAY USER'}
                  </Text>
                </View>
                <View style={styles.cardTypeBadge}>
                  <Text style={styles.cardTypeText}>NFC PAY</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View
              style={[styles.cardBackBody, {opacity: backFaceOpacity}]}
              pointerEvents={showingCardBack ? 'auto' : 'none'}
              accessibilityElementsHidden={!showingCardBack}
              importantForAccessibility={showingCardBack ? 'auto' : 'no-hide-descendants'}>
              <View style={styles.cardBackOrbLarge} />
              <View style={styles.cardBackOrbSmall} />
              <View style={styles.cardBackTopRow}>
                <View style={styles.cardBrand}>
                  <BrandLogo size={20} color="#FFFFFF" />
                  <Text style={styles.cardBrandText}>TapPay</Text>
                </View>
                <PressableScale
                  style={styles.cardFlipHint}
                  contentStyle={styles.cardFlipHintInner}
                  accessibilityLabel="Return to card"
                  onPress={() => setCardSide(false)}>
                  <Text style={styles.cardFlipHintText}>Back to card</Text>
                  <Text style={styles.cardFlipHintChevron}>‹</Text>
                </PressableScale>
              </View>

              <View style={styles.cardBackBalances}>
                <View style={styles.cardBackBalanceHeading}>
                  <Text style={styles.cardBackEyebrow}>YOUR BALANCES</Text>
                  <PressableScale
                    onPress={() => {
                      triggerHaptic.selection();
                      setBalanceHidden(prev => !prev);
                    }}
                    accessibilityLabel={balanceHidden ? 'Show balances' : 'Hide balances'}
                    hitSlop={10}
                    contentStyle={styles.cardBalanceVisibility}>
                    <Text style={styles.cardBalanceVisibilityIcon}>
                      {balanceHidden ? '◎' : '◉'}
                    </Text>
                    <Text style={styles.cardBalanceVisibilityText}>
                      {balanceHidden ? 'Show' : 'Hide'}
                    </Text>
                  </PressableScale>
                </View>
                <View style={styles.cardBackBalanceRow}>
                  <View>
                    <Text style={styles.cardBackTokenLabel}>AUSD</Text>
                    <Text style={styles.cardBackTokenCaption}>Stablecoin</Text>
                  </View>
                  <Text style={styles.cardBackAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                    {balanceHidden ? '••••••' : displayAusd}
                    <Text style={styles.cardBackUnit}> AUSD</Text>
                  </Text>
                </View>
                <View style={styles.cardBackDivider} />
                <View style={styles.cardBackBalanceRow}>
                  <View>
                    <Text style={styles.cardBackTokenLabel}>MON</Text>
                    <Text style={styles.cardBackTokenCaption}>Monad</Text>
                  </View>
                  <Text style={styles.cardBackAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                    {balanceHidden ? '••••••' : balanceMon}
                    <Text style={styles.cardBackUnit}> MON</Text>
                  </Text>
                </View>
              </View>
            </Animated.View>
            </View>
          </View>
        </FadeInView>

        {/* NFC status */}
        <FadeInView delay={80} translateY={8}>
          <View style={styles.terminalRow}>
            <View style={styles.terminalLeft}>
              <LivePulseDot active={terminalStatus.ready} size={7} />
              <View>
                <Text style={styles.terminalTitle}>{terminalStatus.label}</Text>
                <Text style={styles.terminalCaption}>{terminalStatus.caption}</Text>
              </View>
            </View>
            <ContactlessWave
              size={22}
              color={terminalStatus.ready ? colors.success : colors.textMuted}
            />
          </View>
        </FadeInView>

        {/* Primary actions — equal Apple Pay-style tiles */}
        <FadeInView delay={120} translateY={10}>
          <View style={styles.actionRow}>
            <PressableScale
              style={styles.sendTapButton}
              contentStyle={styles.sendTapContent}
              onPress={() => {
                triggerHaptic.impactMedium();
                navigation.navigate('SendTap');
              }}>
              <View style={styles.sendTapIconWrap}>
                <ContactlessWave size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.sendTapTitle}>Send Tap</Text>
              <Text style={styles.sendTapSubtitle}>NFC pay</Text>
            </PressableScale>

            <PressableScale
              style={styles.receiveTapButton}
              contentStyle={styles.receiveTapContent}
              onPress={() => {
                triggerHaptic.impactMedium();
                navigation.navigate('ReceiveTap');
              }}>
              <View style={styles.receiveIconWrap}>
                <ContactlessWave size={18} color={colors.accent} />
              </View>
              <Text style={styles.receiveTapTitle}>Receive Tap</Text>
              <Text style={styles.receiveTapSubtitle}>Get paid</Text>
            </PressableScale>
          </View>

          <PressableScale
            style={styles.directPayBanner}
            contentStyle={styles.directPayBannerInner}
            onPress={() => {
              triggerHaptic.impactMedium();
              navigation.navigate('SendPayment');
            }}>
            <View style={styles.directPayLeft}>
              <View style={styles.directPayCircle}>
                <Text style={styles.directPayGlyph}>@</Text>
              </View>
              <View style={styles.directPayTextCol}>
                <Text style={styles.directPayTitle}>Direct Transfer</Text>
                <Text style={styles.directPaySubtitle} numberOfLines={1}>
                  Pay @username or address
                </Text>
              </View>
            </View>
            <Text style={styles.chevronArrow}>›</Text>
          </PressableScale>
        </FadeInView>

        {/* Transactions */}
        <FadeInView delay={160} translateY={10}>
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Latest Transactions</Text>
            <PressableScale onPress={() => navigation.navigate('History')}>
              <Text style={styles.viewAllText}>See All ›</Text>
            </PressableScale>
          </View>

          <View style={styles.transactionCard}>
            {recentTx.length === 0 ? (
              <View style={styles.emptyFeed}>
                <Text style={styles.emptyText}>No recent transactions</Text>
                <Text style={styles.emptySubtext}>
                  Tap to pay or receive MON to see activity here
                </Text>
              </View>
            ) : (
              recentTx.map((tx, idx) => {
                const badge = getTxBadge(tx);
                const icon = getTxIconMeta(tx);
                return (
                  <View key={tx.id}>
                    {idx > 0 && <View style={styles.txDivider} />}
                    <View style={styles.txRow}>
                      <View style={styles.txLeft}>
                        <View style={[styles.txIconBubble, {backgroundColor: icon.bg}]}>
                          <Text style={[styles.txGlyph, {color: icon.color}]}>
                            {icon.letter}
                          </Text>
                        </View>
                        <View style={styles.txMeta}>
                          <Text style={styles.txCounterparty}>{getTxTitle(tx)}</Text>
                          <Text style={styles.txTime}>{formatTimestamp(tx.timestamp)}</Text>
                        </View>
                      </View>

                      <View style={styles.txRight}>
                        <Text
                          style={[
                            styles.txAmount,
                            tx.direction === 'received'
                              ? styles.txAmountReceived
                              : styles.txAmountSent,
                          ]}>
                          {tx.direction === 'sent' ? '- ' : '+ '}
                          {tx.amount} MON
                        </Text>
                        <View
                          style={[
                            styles.txBadge,
                            badge.variant === 'tap' && styles.txBadgeTap,
                            badge.variant === 'direct' && styles.txBadgeDirect,
                            badge.variant === 'received' && styles.txBadgeReceived,
                          ]}>
                          <Text
                            style={[
                              styles.txBadgeText,
                              badge.variant === 'tap' && styles.txBadgeTextTap,
                              badge.variant === 'direct' && styles.txBadgeTextDirect,
                              badge.variant === 'received' && styles.txBadgeTextReceived,
                            ]}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
        </FadeInView>
      </ScrollView>
      {profileMenuOpen && (
        <ProfileDropdown
          username={username}
          address={address}
          profileLetter={profileLetter}
          copied={copied}
          onCopyAddress={copyAddress}
          onDismiss={() => setProfileMenuOpen(false)}
          onNavigate={destination => {
            if (destination === 'AccountInfo') {
              navigation.navigate('AccountInfo');
            } else {
              navigation.navigate('Settings');
            }
          }}
        />
      )}
    </View>
  );
}

const ios = {
  bg: colors.background,
  label: colors.text,
  secondaryLabel: colors.textMuted,
  tertiaryLabel: colors.textSubtle,
  blue: colors.accent,
  green: colors.success,
  separator: colors.separator,
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: ios.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  heroCopy: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    color: ios.label,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  heroTitleAccent: {
    color: colors.accent,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  heroDescription: {
    color: ios.secondaryLabel,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    marginTop: 10,
  },
  heroNfcBadge: {
    width: 54,
    height: 54,
    marginTop: 1,
    borderRadius: 16,
    backgroundColor: glass.fillElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTextBlock: {
    gap: 1,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: ios.label,
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkPill: {
    backgroundColor: glass.fillElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderBright,
    borderRadius: 20,
    ...shadows.soft,
  },
  networkPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  networkText: {
    color: ios.label,
    fontSize: 13,
    fontWeight: '600',
  },
  chevronSmall: {
    color: ios.secondaryLabel,
    fontSize: 12,
    marginTop: -2,
  },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    overflow: 'hidden',
    ...shadows.soft,
  },
  profileCircleInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLetter: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  profileModalRoot: {
    flex: 1,
  },
  profileScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(9, 18, 32, 0.28)',
  },
  profileBackdropPressable: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  profilePanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 40, 80, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#0B1F3A',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {elevation: 8},
      default: {},
    }),
  },
  profilePanelHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profilePanelEyebrow: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  profilePanelClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePanelCloseText: {
    color: colors.textMuted,
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '300',
  },
  profileIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  profileMenuAvatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileMenuAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  profileMenuIdentity: {
    flex: 1,
  },
  profileMenuName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  profileMenuStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
  },
  profileMenuStatusText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  profileAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 12,
  },
  profileAddressText: {
    flex: 1,
    minWidth: 0,
  },
  profileAddressLabel: {
    color: colors.textSubtle,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  profileAddressValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  profileCopyButton: {
    backgroundColor: colors.accentWash,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  profileCopyText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  profileMenuLinks: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 40, 80, 0.08)',
    overflow: 'hidden',
  },
  profileMenuLink: {
    minHeight: 55,
  },
  profileMenuLinkInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 11,
  },
  profileMenuIcon: {
    width: 31,
    height: 31,
    borderRadius: 11,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMenuLinkText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  profileMenuChevron: {
    color: colors.textSubtle,
    fontSize: 22,
    lineHeight: 24,
  },
  profileMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: 54,
  },
  cardContainer: {
    marginBottom: 14,
  },
  cardFaceStack: {
    position: 'relative',
  },
  cardBody: {
    backgroundColor: colors.accent,
    borderRadius: 28,
    padding: 20,
    minHeight: 210,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    ...shadows.card,
  },
  cardBackBody: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0875E8',
    borderRadius: 28,
    padding: 20,
    minHeight: 210,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    ...shadows.card,
  },
  cardBackOrbLarge: {
    position: 'absolute',
    top: -76,
    right: -42,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  cardBackOrbSmall: {
    position: 'absolute',
    bottom: -76,
    left: -38,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(0, 72, 165, 0.34)',
  },
  cardOrbLarge: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  cardOrbSmall: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 102, 219, 0.45)',
  },
  cardGlassEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  cardFlipHint: {
    maxWidth: 150,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
  },
  cardFlipHintInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cardFlipHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  cardFlipHintChevron: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 16,
    fontWeight: '500',
  },
  cardBackTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  cardBackBalances: {
    zIndex: 1,
  },
  cardBackBalanceHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  cardBackEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardBalanceVisibility: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  cardBalanceVisibilityIcon: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  cardBalanceVisibilityText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
  cardBackBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  cardBackTokenLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardBackTokenCaption: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    marginTop: 1,
  },
  cardBackAmount: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardBackUnit: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  cardBackDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.23)',
    marginVertical: 4,
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardBrandText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cardChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
    marginTop: 4,
  },
  cardChip: {
    width: 36,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardChipInner: {
    width: '70%',
    height: '42%',
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 2,
  },
  cardChipH: {
    position: 'absolute',
    width: '100%',
    height: 0.8,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  cardChipV: {
    position: 'absolute',
    width: 0.8,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  cardNetworkPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardNetworkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
    marginTop: 8,
  },
  cardNumberText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1.6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  copiedChip: {
    backgroundColor: 'rgba(52, 199, 89, 0.35)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  copyChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  cardHolderLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  cardHolderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardTypeBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  sendTapButton: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: ios.blue,
    minHeight: 112,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.45)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 60, 140, 0.25)',
    ...shadows.soft,
  },
  sendTapContent: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 112,
  },
  sendTapIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendTapTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: 14,
  },
  sendTapSubtitle: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  receiveTapButton: {
    flex: 1,
    minHeight: 112,
    ...premiumCard,
    borderRadius: 22,
  },
  receiveTapContent: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 112,
  },
  receiveIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiveTapTitle: {
    color: ios.label,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: 14,
  },
  receiveTapSubtitle: {
    color: ios.secondaryLabel,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  directPayBanner: {
    marginBottom: 18,
    ...premiumCard,
    borderRadius: 18,
  },
  directPayBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  directPayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  directPayCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directPayGlyph: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '700',
  },
  directPayTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  directPayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ios.label,
    letterSpacing: -0.2,
  },
  directPaySubtitle: {
    fontSize: 13,
    color: ios.secondaryLabel,
    marginTop: 2,
    fontWeight: '400',
  },
  chevronArrow: {
    fontSize: 22,
    color: ios.tertiaryLabel,
    fontWeight: '400',
    marginLeft: 4,
  },
  terminalRow: {
    ...premiumCard,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  terminalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  terminalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ios.label,
    letterSpacing: -0.2,
  },
  terminalCaption: {
    fontSize: 12,
    color: ios.secondaryLabel,
    marginTop: 1,
    fontWeight: '400',
  },
  transactionsSection: {
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ios.label,
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 15,
    color: ios.blue,
    fontWeight: '600',
  },
  transactionCard: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    ...premiumCard,
    borderRadius: 20,
  },
  emptyFeed: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: ios.label,
  },
  emptySubtext: {
    fontSize: 13,
    color: ios.secondaryLabel,
    marginTop: 4,
    textAlign: 'center',
  },
  txDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ios.separator,
    marginLeft: 48,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 10,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  txMeta: {
    flex: 1,
  },
  txIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txGlyph: {
    fontSize: 14,
    fontWeight: '800',
  },
  txCounterparty: {
    fontSize: 15,
    fontWeight: '600',
    color: ios.label,
  },
  txTime: {
    fontSize: 13,
    color: ios.secondaryLabel,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  txAmountSent: {
    color: ios.label,
  },
  txAmountReceived: {
    color: ios.green,
  },
  txBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  txBadgeTap: {
    backgroundColor: colors.accentWash,
  },
  txBadgeDirect: {
    backgroundColor: colors.surfaceSolidElevated,
  },
  txBadgeReceived: {
    backgroundColor: 'rgba(52, 199, 89, 0.14)',
  },
  txBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  txBadgeTextTap: {
    color: colors.accent,
  },
  txBadgeTextDirect: {
    color: ios.secondaryLabel,
  },
  txBadgeTextReceived: {
    color: ios.green,
  },
});
