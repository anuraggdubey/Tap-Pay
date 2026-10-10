/**
 * Shared TapPay design tokens — light Apple glass, blue accent.
 * Prefer `useTheme()` from ThemeContext for live light/dark switching.
 */

import {Platform, StyleSheet} from 'react-native';
import {lightColors, lightGlass} from './palettes';

export {
  lightColors,
  darkColors,
  lightGlass,
  darkGlass,
  getPremiumCardStyle,
} from './palettes';
export type {AppColors, AppGlass} from './palettes';

/** Default light tokens (static imports / StyleSheet fallbacks). */
export const colors = lightColors;
export const glass = lightGlass;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  card: 28,
  pill: 40,
};

/**
 * Premium white card surface — one uniform fill + Apple-style hairline edges.
 * Use on the OUTER container only; never nest another white/gray plate inside.
 * Must be declared after `radii` (uses radii.lg).
 */
export const premiumCard = {
  backgroundColor: colors.surfaceSolid,
  borderRadius: radii.lg,
  borderTopWidth: StyleSheet.hairlineWidth,
  borderLeftWidth: StyleSheet.hairlineWidth,
  borderRightWidth: StyleSheet.hairlineWidth,
  borderBottomWidth: StyleSheet.hairlineWidth,
  /** Subtle darker upper hairline */
  borderTopColor: 'rgba(15, 22, 40, 0.14)',
  /** Soft side edge */
  borderLeftColor: 'rgba(15, 40, 80, 0.07)',
  borderRightColor: 'rgba(15, 40, 80, 0.07)',
  /** Lighter bottom edge */
  borderBottomColor: 'rgba(255, 255, 255, 0.95)',
  overflow: 'hidden' as const,
  ...Platform.select({
    ios: {
      shadowColor: '#0B1F3A',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.08,
      shadowRadius: 18,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }),
};

/** Apple-style motion */
export const motion = {
  pressMs: 110,
  chipMs: 160,
  enterMs: 280,
  sheetMs: 320,
  pressScale: 0.97,
  enterScale: 0.96,
  easeOut: {x1: 0.23, y1: 1, x2: 0.32, y2: 1} as const,
  easeSheet: {x1: 0.32, y1: 0.72, x2: 0, y2: 1} as const,
};

export const typography = {
  display: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    lineHeight: 25,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  callout: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 19,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 16,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    lineHeight: 13,
  },
};

export const shadows = Platform.select({
  ios: {
    soft: {
      shadowColor: '#0A84FF',
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: 0.1,
      shadowRadius: 16,
    },
    medium: {
      shadowColor: '#0B1F3A',
      shadowOffset: {width: 0, height: 10},
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    heavy: {
      shadowColor: '#0B1F3A',
      shadowOffset: {width: 0, height: 14},
      shadowOpacity: 0.16,
      shadowRadius: 28,
    },
    card: {
      shadowColor: '#0066DB',
      shadowOffset: {width: 0, height: 12},
      shadowOpacity: 0.28,
      shadowRadius: 24,
    },
  },
  android: {
    soft: {elevation: 2},
    medium: {elevation: 6},
    heavy: {elevation: 10},
    card: {elevation: 8},
  },
  default: {
    soft: {},
    medium: {},
    heavy: {},
    card: {},
  },
})!;

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
    backgroundColor: colors.surfaceSolid,
    minHeight: 52,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
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
    backgroundColor: glass.fill,
    minHeight: 52,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
  },
  ghostDanger: {
    minHeight: 44,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.22)',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
  },
  disabled: {
    opacity: 0.45,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textOnAccent,
  },
  primaryLightText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
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
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
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
    backgroundColor: glass.fillBlue,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderBright,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.accent,
  },
  glassCard: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderSubtle,
    overflow: 'hidden',
    ...shadows.soft,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.7,
  },
  pageSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
});
