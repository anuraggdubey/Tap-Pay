/**
 * Light / dark color palettes for TapPay (ink + single blue accent, flat surfaces).
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
  background: '#F6F7F9',
  backgroundSoft: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSolid: '#FFFFFF',
  surfaceSolidElevated: '#EEF0F4',
  surfaceBlue: '#E3ECFF',
  border: '#E1E4EA',
  borderSubtle: '#ECEEF2',
  borderStrong: '#CBD0DA',
  text: '#0A0B0F',
  textMuted: '#5B6270',
  textSubtle: '#8B91A0',
  textOnAccent: '#FFFFFF',
  accent: '#2F66F0',
  accentSoft: '#5C8DFF',
  accentDeep: '#2350C8',
  accentWash: '#E3ECFF',
  accentPurple: '#6E54FF',
  accentPurpleSoft: '#836EF9',
  success: '#12A77C',
  successSoft: '#DDF6EE',
  danger: '#E5484D',
  warning: '#D98B0B',
  black: '#000000',
  separator: 'rgba(10, 11, 15, 0.08)',
};

export const darkColors: AppColors = {
  background: '#0A0B0F',
  backgroundSoft: '#0F1116',
  surface: '#14161C',
  surfaceElevated: '#1C1F27',
  surfaceSolid: '#14161C',
  surfaceSolidElevated: '#1C1F27',
  surfaceBlue: '#1A2A52',
  border: '#262A34',
  borderSubtle: '#1E222B',
  borderStrong: '#343A47',
  text: '#F4F5F7',
  textMuted: '#8B91A0',
  textSubtle: '#5F6573',
  textOnAccent: '#FFFFFF',
  accent: '#3D7BFF',
  accentSoft: '#7FA6FF',
  accentDeep: '#2F66F0',
  accentWash: '#1A2A52',
  accentPurple: '#8B7CFF',
  accentPurpleSoft: '#A99BFF',
  success: '#2DD4A0',
  successSoft: '#0F2E27',
  danger: '#FF5C5C',
  warning: '#F5A524',
  black: '#000000',
  separator: 'rgba(255, 255, 255, 0.08)',
};

export const lightGlass: AppGlass = {
  fill: '#FFFFFF',
  fillElevated: '#FFFFFF',
  fillHeavy: '#FFFFFF',
  fillBlue: '#E3ECFF',
  border: '#E1E4EA',
  borderSubtle: '#ECEEF2',
  borderBright: '#CBD0DA',
  edge: '#FFFFFF',
};

export const darkGlass: AppGlass = {
  fill: '#14161C',
  fillElevated: '#1C1F27',
  fillHeavy: '#14161C',
  fillBlue: '#1A2A52',
  border: '#262A34',
  borderSubtle: '#1E222B',
  borderBright: '#343A47',
  edge: '#262A34',
};

/** Flat card: solid raised surface + 1px hairline border, no heavy shadow. */
export function getPremiumCardStyle(c: AppColors, isDark: boolean) {
  return {
    backgroundColor: c.surfaceSolid,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: isDark ? c.border : c.border,
    overflow: 'hidden' as const,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: isDark ? 0 : 0.04,
        shadowRadius: 12,
      },
      android: {elevation: 0},
      default: {},
    }),
  };
}
