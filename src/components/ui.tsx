/**
 * Shared TapPay UI primitives — presentation only.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import PressableScale from './PressableScale';
import {useTheme} from '../context/ThemeContext';
import {shadows, spacing} from '../theme';

/** White premium surface card — single uniform plate */
export function SurfaceCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const {premiumCard} = useTheme();
  return <View style={[premiumCard, style]}>{children}</View>;
}

type SegmentOption<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

/** Apple-style segmented control */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const {colors, isDark} = useTheme();
  const trackBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15, 40, 80, 0.06)';
  const trackBorder = isDark
    ? 'rgba(255,255,255,0.1)'
    : 'rgba(15, 40, 80, 0.08)';
  const countBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15, 40, 80, 0.08)';

  return (
    <View
      style={[
        segmentStyles.track,
        {backgroundColor: trackBg, borderColor: trackBorder},
        style,
      ]}>
      {options.map(opt => {
        const active = opt.key === value;
        return (
          <PressableScale
            key={opt.key}
            style={[
              segmentStyles.item,
              active && {
                backgroundColor: colors.surfaceSolid,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: trackBorder,
                ...shadows.soft,
              },
            ]}
            contentStyle={segmentStyles.itemInner}
            onPress={() => onChange(opt.key)}
            scaleTo={0.97}>
            <Text
              style={[
                segmentStyles.label,
                {color: colors.text},
                active && {color: colors.accent, fontWeight: '700'},
              ]}>
              {opt.label}
            </Text>
            {opt.count != null && (
              <Text
                style={[
                  segmentStyles.count,
                  {
                    color: colors.textMuted,
                    backgroundColor: countBg,
                  },
                  active && {
                    color: colors.accent,
                    backgroundColor: colors.accentWash,
                  },
                ]}>
                {opt.count}
              </Text>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}

const segmentStyles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  item: {
    flex: 1,
    borderRadius: 11,
    minHeight: 36,
  },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    gap: 5,
    minHeight: 36,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 20,
    textAlign: 'center',
  },
});

export function SectionLabel({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  const {colors} = useTheme();
  return (
    <Text style={[sectionLabelStyles.label, {color: colors.textSubtle}, style]}>
      {children}
    </Text>
  );
}

const sectionLabelStyles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
});

export function IconBadge({
  children,
  tone = 'blue',
  size = 38,
}: {
  children: React.ReactNode;
  tone?: 'blue' | 'green' | 'red' | 'neutral';
  size?: number;
}) {
  const {colors} = useTheme();
  const bg =
    tone === 'green'
      ? 'rgba(52, 199, 89, 0.14)'
      : tone === 'red'
        ? 'rgba(255, 59, 48, 0.12)'
        : tone === 'neutral'
          ? colors.surfaceSolidElevated
          : colors.accentWash;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {children}
    </View>
  );
}
