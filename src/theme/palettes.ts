/**
 * Light / dark color palettes for TapPay — Apple Pay / iOS system look.
 * Pure black (dark) or grouped grey (light) backgrounds, solid cards,
 * system blue/green/red. No gradients anywhere.
 */

import {StyleSheet} from 'react-native';

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

/** iOS system colors used for icon tiles and status. */
export const sys = {
  blue: '#0A84FF',
  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF453A',
  purple: '#BF5AF2',
  indigo: '#5E5CE6',
  teal: '#64D2FF',
  pink: '#FF375F',
  gray: '#8E8E93',
};

export const lightColors: AppColors = {
  background: '#F2F2F7',
  backgroundSoft: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#E5E5EA',
  surfaceSolid: '#FFFFFF',
  surfaceSolidElevated: '#F2F2F7',
  surfaceBlue: '#E3F0FF',
  border: '#E5E5EA',
  borderSubtle: '#E5E5EA',
  borderStrong: '#C7C7CC',
  text: '#000000',
  textMuted: '#6C6C70',
  textSubtle: '#8E8E93',
  textOnAccent: '#FFFFFF',
  accent: '#007AFF',
  accentSoft: '#5AA9FF',
  accentDeep: '#0062CC',
  accentWash: '#E3F0FF',
  accentPurple: '#AF52DE',
  accentPurpleSoft: '#BF5AF2',
  success: '#34C759',
  successSoft: '#E4F7E9',
  danger: '#FF3B30',
  warning: '#FF9500',
  black: '#000000',
  separator: 'rgba(60, 60, 67, 0.29)',
};

export const darkColors: AppColors = {
  background: '#000000',
  backgroundSoft: '#0A0A0A',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  surfaceSolid: '#1C1C1E',
  surfaceSolidElevated: '#2C2C2E',
  surfaceBlue: '#0B2A4F',
  border: '#38383A',
  borderSubtle: '#2C2C2E',
  borderStrong: '#48484A',
  text: '#FFFFFF',
  textMuted: '#8E8E93',
  textSubtle: '#636366',
  textOnAccent: '#FFFFFF',
  accent: '#0A84FF',
  accentSoft: '#64D2FF',
  accentDeep: '#0A84FF',
  accentWash: '#0B2A4F',
  accentPurple: '#BF5AF2',
  accentPurpleSoft: '#DA8FFF',
  success: '#30D158',
  successSoft: '#0E2E19',
  danger: '#FF453A',
  warning: '#FF9F0A',
  black: '#000000',
  separator: 'rgba(84, 84, 88, 0.6)',
};

export const lightGlass: AppGlass = {
  fill: '#FFFFFF',
  fillElevated: '#FFFFFF',
  fillHeavy: '#FFFFFF',
  fillBlue: '#E3F0FF',
  border: '#E5E5EA',
  borderSubtle: '#E5E5EA',
  borderBright: '#C7C7CC',
  edge: '#FFFFFF',
};

export const darkGlass: AppGlass = {
  fill: '#1C1C1E',
  fillElevated: '#2C2C2E',
  fillHeavy: '#1C1C1E',
  fillBlue: '#0B2A4F',
  border: '#38383A',
  borderSubtle: '#2C2C2E',
  borderBright: '#48484A',
  edge: '#38383A',
};

/** Flat card: solid surface, continuous corners, no shadow (iOS style). */
export function getPremiumCardStyle(c: AppColors, _isDark: boolean) {
  return {
    backgroundColor: c.surfaceSolid,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden' as const,
  };
}
