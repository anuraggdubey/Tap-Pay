/**
 * HomeIcons — line icons for the wallet home screen (react-native-svg), drawn in the
 * same 1.8px rounded style as OnboardingIcons.
 */

import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

type Props = {size?: number; color?: string};

const stroke = (color: string, width = 1.8) => ({
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export function ArrowUpRightIcon({size = 22, color = '#FFFFFF'}: Props) {
  const p = stroke(color, 2);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 17 17 7M9 7h8v8" {...p} />
    </Svg>
  );
}

export function ArrowDownLeftIcon({size = 22, color = '#FFFFFF'}: Props) {
  const p = stroke(color, 2);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M17 7 7 17M15 17H7V9" {...p} />
    </Svg>
  );
}

export function ClockIcon({size = 22, color = '#FFFFFF'}: Props) {
  const p = stroke(color, 2);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8.5} {...p} />
      <Path d="M12 7.5V12l3 2" {...p} />
    </Svg>
  );
}

export function EyeIcon({size = 20, color = '#FFFFFF'}: Props) {
  const p = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...p} />
      <Circle cx={12} cy={12} r={3} {...p} />
    </Svg>
  );
}

export function EyeOffIcon({size = 20, color = '#FFFFFF'}: Props) {
  const p = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9.9 5.8A9.4 9.4 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4" {...p} />
      <Path d="M6.4 7.4C3.9 9.1 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.5 4.2-1.1" {...p} />
      <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" {...p} />
      <Path d="M3.5 3.5l17 17" {...p} />
    </Svg>
  );
}

export function CopyIcon({size = 16, color = '#FFFFFF'}: Props) {
  const p = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={8.5} y={8.5} width={12} height={12} rx={2.6} {...p} />
      <Path d="M15.5 5.6V5.2a2 2 0 0 0-2-2H5.2a2 2 0 0 0-2 2v8.3a2 2 0 0 0 2 2h.4" {...p} />
    </Svg>
  );
}

export function CheckIcon({size = 16, color = '#FFFFFF'}: Props) {
  const p = stroke(color, 2.2);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />
    </Svg>
  );
}

export function AlertIcon({size = 20, color = '#FFFFFF'}: Props) {
  const p = stroke(color, 2.2);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 7v6" {...p} />
      <Circle cx={12} cy={17} r={1.2} fill={color} />
    </Svg>
  );
}
