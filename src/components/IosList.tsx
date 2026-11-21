/**
 * iOS-style inset grouped list kit (Apple Settings / Wallet look).
 * Group = rounded solid card with hairline separators; Row = icon tile + title + value + chevron.
 */

import React, {useMemo} from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import {useTheme} from '../context/ThemeContext';
import PressableScale from './PressableScale';
import {triggerHaptic} from '../utils/haptics';
import type {AppColors} from '../theme';

export function LargeTitle({children}: {children: string}) {
  const {colors} = useTheme();
  return (
    <Text style={{fontSize: 34, fontWeight: '700', color: colors.text, letterSpacing: 0.4, marginBottom: 6}}>
      {children}
    </Text>
  );
}

export function Group({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const {colors} = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={s.groupWrap}>
      {!!title && <Text style={s.groupTitle}>{title}</Text>}
      <View style={s.group}>
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={s.sep} />}
            {child}
          </React.Fragment>
        ))}
      </View>
      {!!footer && <Text style={s.footer}>{footer}</Text>}
    </View>
  );
}

type IconSpec = {bg: string; glyph?: string; node?: React.ReactNode};

export function Row({
  icon,
  title,
  subtitle,
  value,
  onPress,
  chevron,
  destructive,
  right,
  center,
  mono,
}: {
  icon?: IconSpec;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  right?: React.ReactNode;
  center?: boolean;
  mono?: boolean;
}) {
  const {colors} = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const showChevron = chevron ?? !!onPress;
  const body = (
    <View style={[s.row, center && {justifyContent: 'center'}]}>
      {icon && (
        <View style={[s.tile, {backgroundColor: icon.bg}]}>
          {icon.node ?? <Text style={s.glyph}>{icon.glyph}</Text>}
        </View>
      )}
      <View style={center ? undefined : s.flex}>
        <Text style={[s.title, destructive && {color: colors.danger}]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
      {!!value && (
        <Text style={[s.value, mono && {fontFamily: 'monospace'}]} numberOfLines={1}>
          {value}
        </Text>
      )}
      {right}
      {showChevron && <Text style={s.chevron}>›</Text>}
    </View>
  );
  if (!onPress) {
    return body;
  }
  return (
    <PressableScale
      scaleTo={0.99}
      onPress={() => {
        triggerHaptic.selection();
        onPress();
      }}>
      {body}
    </PressableScale>
  );
}

export function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon?: IconSpec;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const {colors} = useTheme();
  return (
    <Row
      icon={icon}
      title={title}
      subtitle={subtitle}
      chevron={false}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{false: colors.surfaceElevated, true: '#30D158'}}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.surfaceElevated}
          accessibilityLabel={title}
        />
      }
    />
  );
}

export const tileColors = {
  blue: '#0A84FF',
  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF453A',
  purple: '#BF5AF2',
  indigo: '#5E5CE6',
  teal: '#32ADE6',
  gray: '#8E8E93',
};

function createStyles(c: AppColors) {
  return StyleSheet.create({
    flex: {flex: 1},
    groupWrap: {marginTop: 22},
    groupTitle: {fontSize: 13, color: c.textMuted, textTransform: 'uppercase', marginLeft: 16, marginBottom: 7, letterSpacing: 0.2},
    group: {borderRadius: 14, backgroundColor: c.surfaceSolid, overflow: 'hidden'},
    sep: {height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginLeft: 16},
    footer: {fontSize: 13, color: c.textMuted, marginHorizontal: 16, marginTop: 7, lineHeight: 18},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, minHeight: 48},
    tile: {width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center'},
    glyph: {fontSize: 16, color: '#FFFFFF', fontWeight: '600'},
    title: {fontSize: 17, color: c.text},
    subtitle: {fontSize: 13, color: c.textMuted, marginTop: 1},
    value: {fontSize: 17, color: c.textMuted, maxWidth: '55%'},
    chevron: {fontSize: 22, color: c.textSubtle, marginLeft: -2},
  });
}
