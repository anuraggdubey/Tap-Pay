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
import {colors, radii, shadows, spacing, premiumCard} from '../theme';

/** White premium surface card — single uniform plate */
export function SurfaceCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[surfaceStyles.card, style]}>{children}</View>;
}

const surfaceStyles = StyleSheet.create({
  card: {
    ...premiumCard,
  },
});

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
  return (
    <View style={[segmentStyles.track, style]}>
      {options.map(opt => {
        const active = opt.key === value;
        return (
          <PressableScale
            key={opt.key}
            style={[segmentStyles.item, active && segmentStyles.itemActive]}
            contentStyle={segmentStyles.itemInner}
            onPress={() => onChange(opt.key)}
            scaleTo={0.97}>
            <Text
              style={[
                segmentStyles.label,
                active && segmentStyles.labelActive,
              ]}>
              {opt.label}
            </Text>
            {opt.count != null && (
              <Text
                style={[
                  segmentStyles.count,
                  active && segmentStyles.countActive,
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
    backgroundColor: 'rgba(15, 40, 80, 0.06)',
    borderRadius: 14,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 40, 80, 0.08)',
    gap: 2,
  },
  item: {
    flex: 1,
    borderRadius: 11,
    minHeight: 36,
  },
  itemActive: {
    backgroundColor: colors.surfaceSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 40, 80, 0.08)',
    ...shadows.soft,
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
    color: colors.text,
    letterSpacing: -0.1,
  },
  labelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    backgroundColor: 'rgba(15, 40, 80, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 20,
    textAlign: 'center',
  },
  countActive: {
    color: colors.accent,
    backgroundColor: colors.accentWash,
  },
});

export function SectionLabel({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[sectionLabelStyles.label, style]}>{children}</Text>;
}

const sectionLabelStyles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
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
