/**
 * Light / dark color + glass palettes for TapPay.
 */

import {Platform, StyleSheet} from 'react-native';

export type AppColors = {
  background: string;
  backgroundSoft: string;
  surface: string;
  surfaceElevated: string;
  surfaceSolid: string;
  surfaceSolidElevated: string;
  surfaceBlue: string;
  border: string;
  borderSubtle: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textOnAccent: string;
  accent: string;
  accentSoft: string;
  accentDeep: string;
  accentWash: string;
  accentPurple: string;
  accentPurpleSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  warning: string;
  black: string;
  separator: string;
};

export type AppGlass = {
  fill: string;
  fillElevated: string;
  fillHeavy: string;
  fillBlue: string;
  border: string;
  borderSubtle: string;
  borderBright: string;
  edge: string;
};

export const lightColors: AppColors = {
  background: '#EEF3FA',
  backgroundSoft: '#F7FAFF',
  surface: 'rgba(255, 255, 255, 0.72)',
  surfaceElevated: 'rgba(255, 255, 255, 0.92)',
  surfaceSolid: '#FFFFFF',
  surfaceSolidElevated: '#F2F6FC',
  surfaceBlue: 'rgba(10, 132, 255, 0.08)',
  border: 'rgba(10, 132, 255, 0.12)',
  borderSubtle: 'rgba(15, 40, 80, 0.06)',
  borderStrong: 'rgba(10, 132, 255, 0.22)',
  text: '#0B1220',
  textMuted: '#6B7280',
  textSubtle: '#9AA3B2',
  textOnAccent: '#FFFFFF',
  accent: '#0A84FF',
  accentSoft: '#64D2FF',
  accentDeep: '#0066DB',
  accentWash: 'rgba(10, 132, 255, 0.12)',
  accentPurple: '#6E54FF',
  accentPurpleSoft: '#836EF9',
  success: '#34C759',
  successSoft: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9F0A',
  black: '#000000',
  separator: 'rgba(60, 60, 67, 0.12)',
};

export const darkColors: AppColors = {
  background: '#0B1220',
  backgroundSoft: '#111827',
  surface: 'rgba(28, 36, 56, 0.78)',
  surfaceElevated: 'rgba(36, 48, 72, 0.92)',
  surfaceSolid: '#1C2438',
  surfaceSolidElevated: '#243048',
  surfaceBlue: 'rgba(10, 132, 255, 0.16)',
  border: 'rgba(10, 132, 255, 0.28)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(10, 132, 255, 0.4)',
  text: '#F5F7FA',
  textMuted: '#9AA3B2',
  textSubtle: '#6B7280',
  textOnAccent: '#FFFFFF',
  accent: '#0A84FF',
  accentSoft: '#64D2FF',
  accentDeep: '#3B9BFF',
  accentWash: 'rgba(10, 132, 255, 0.22)',
  accentPurple: '#8B7CFF',
  accentPurpleSoft: '#A99BFF',
  success: '#30D158',
  successSoft: '#30D158',
  danger: '#FF453A',
  warning: '#FF9F0A',
  black: '#000000',
  separator: 'rgba(255, 255, 255, 0.12)',
};

export const lightGlass: AppGlass = {
  fill: 'rgba(255, 255, 255, 0.72)',
  fillElevated: 'rgba(255, 255, 255, 0.88)',
  fillHeavy: 'rgba(255, 255, 255, 0.94)',
  fillBlue: 'rgba(10, 132, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.85)',
  borderSubtle: 'rgba(15, 40, 80, 0.08)',
  borderBright: 'rgba(10, 132, 255, 0.18)',
  edge: 'rgba(255, 255, 255, 0.95)',
};

export const darkGlass: AppGlass = {
  fill: 'rgba(28, 36, 56, 0.78)',
  fillElevated: 'rgba(36, 48, 72, 0.9)',
  fillHeavy: 'rgba(28, 36, 56, 0.96)',
  fillBlue: 'rgba(10, 132, 255, 0.16)',
  border: 'rgba(255, 255, 255, 0.14)',
  borderSubtle: 'rgba(255, 255, 255, 0.1)',
  borderBright: 'rgba(10, 132, 255, 0.32)',
  edge: 'rgba(255, 255, 255, 0.2)',
};

export function getPremiumCardStyle(c: AppColors, isDark: boolean) {
  return {
    backgroundColor: c.surfaceSolid,
    borderRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15, 22, 40, 0.14)',
    borderLeftColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 40, 80, 0.07)',
    borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 40, 80, 0.07)',
    borderBottomColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255, 255, 255, 0.95)',
    overflow: 'hidden' as const,
    ...Platform.select({
      ios: {
        shadowColor: isDark ? '#000000' : '#0B1F3A',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 18,
      },
      android: {
        elevation: isDark ? 5 : 3,
      },
      default: {},
    }),
  };
}
