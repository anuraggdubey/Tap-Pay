/**
 * OnboardingIcons — line icons for the wallet onboarding buttons (react-native-svg).
 */

import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

type Props = {size?: number; color?: string};

const stroke = (color: string) => ({
  stroke: color,
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

/** Person with a small key: creating a wallet secured on this phone. */
export function UserKeyIcon({size = 22, color = '#FFFFFF'}: Props) {
  const p = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={9} cy={7.5} r={3.6} {...p} />
      <Path d="M3 20.5c0-3.5 2.7-6.3 6-6.3 1.3 0 2.5.4 3.5 1.1" {...p} />
      <Circle cx={17.5} cy={14.5} r={2.3} {...p} />
      <Path d="M17.5 16.8v4.4M17.5 19.4h1.8" {...p} />
    </Svg>
  );
}

export function ArrowRightIcon({size = 22, color = '#FFFFFF'}: Props) {
  const p = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 12h15M13.5 6l6 6-6 6" {...p} />
    </Svg>
  );
}

export function FingerprintIcon({size = 22, color = '#FFFFFF'}: Props) {
  const p = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.2 5.6A8.8 8.8 0 0 1 20.8 12v.8" {...p} />
      <Path d="M3.6 9.2a9 9 0 0 0-.4 2.8c0 1.3-.2 2.6-.6 3.7" {...p} />
      <Path d="M6.4 18.2c.7-1.9 1-4 1-6.2a4.6 4.6 0 0 1 9.2 0v1.2" {...p} />
      <Path d="M12 12v1.5c0 3-.8 5.8-2.3 8" {...p} />
      <Path d="M16.3 16.6c-.3 1.7-.8 3.3-1.6 4.8" {...p} />
      <Path d="M20.3 16.4c-.2.9-.5 1.8-.8 2.6" {...p} />
    </Svg>
  );
}

export function WalletIcon({size = 22, color = '#FFFFFF'}: Props) {
  const p = stroke(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={2.8} y={5.5} width={18.4} height={14} rx={3.2} {...p} />
      <Path d="M21.2 10.2h-4.4a2.3 2.3 0 0 0 0 4.6h4.4" {...p} />
      <Circle cx={16.9} cy={12.5} r={0.6} fill={color} />
    </Svg>
  );
}

/** Contactless mark used next to the TapPay wordmark: a dot and three waves. */
export function ContactlessMark({size = 24, color = '#FFFFFF'}: Props) {
  const p = {...stroke(color), strokeWidth: 2};
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={4} cy={12} r={1.3} fill={color} />
      <Path d="M8 8.2a5.6 5.6 0 0 1 0 7.6" {...p} />
      <Path d="M11.8 5.4a9.6 9.6 0 0 1 0 13.2" {...p} />
      <Path d="M15.6 2.6a13.6 13.6 0 0 1 0 18.8" {...p} />
    </Svg>
  );
}
