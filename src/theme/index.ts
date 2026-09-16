/**
 * Shared TapPay design tokens for consistent UI across all screens.
 */

import {Platform, StyleSheet} from 'react-native';

export const colors = {
  background: '#09090D',
  surface: '#14141E',
  surfaceElevated: '#1C1C26',
  border: '#242433',
  borderStrong: '#2D2D3E',
  text: '#FFFFFF',
  textMuted: '#8E8E93',
  textSubtle: '#71717A',
  accent: '#6E54FF',
  accentSoft: '#836EF9',
  success: '#10B981',
  successSoft: '#30D158',
  danger: '#EF4444',
  black: '#000000',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 10,
  md: 12,
  lg: 16,
  pill: 36,
};

export const shadows = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  android: {
    elevation: 8,
  },
  default: {},
});

export const buttons = StyleSheet.create({
  primary: {
    backgroundColor: colors.accent,
    minHeight: 52,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryLight: {
    backgroundColor: colors.text,
    minHeight: 52,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  success: {
    backgroundColor: colors.success,
    minHeight: 52,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  secondary: {
    backgroundColor: colors.surface,
    minHeight: 52,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostDanger: {
    minHeight: 44,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#331D1D',
    backgroundColor: '#1C1212',
  },
  disabled: {
    opacity: 0.55,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  primaryLightText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  ghostDangerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
});

export const screen = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  badge: {
    marginTop: spacing.lg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
