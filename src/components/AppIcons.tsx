/**
 * AppIcons — Crisp, freestanding vector glyph components
 * Pure React Native geometry with zero external font dependencies.
 * Designed to look razor-sharp on every screen density (Pixel, Samsung, Xiaomi, iPhone).
 * Absolutely ZERO emojis.
 */

import React from 'react';
import {View, ViewStyle} from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
  focused?: boolean;
  style?: ViewStyle;
}

// 1. Home Icon — Minimalist clean house silhouette
export function HomeIcon({size = 22, color = '#FFFFFF', focused = false, style}: IconProps) {
  const c = focused ? '#FFFFFF' : color;
  const s = size;
  return (
    <View style={[{width: s, height: s, alignItems: 'center', justifyContent: 'center'}, style]}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: s * 0.42,
          borderRightWidth: s * 0.42,
          borderBottomWidth: s * 0.36,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: c,
        }}
      />
      <View
        style={{
          width: s * 0.62,
          height: s * 0.44,
          backgroundColor: focused ? c : 'transparent',
          borderWidth: focused ? 0 : 1.8,
          borderColor: c,
          borderTopWidth: 0,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 3,
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}>
        <View
          style={{
            width: s * 0.22,
            height: s * 0.24,
            backgroundColor: focused ? '#181820' : c,
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
          }}
        />
      </View>
    </View>
  );
}

// 2. Pay / Contactless Tap Icon — Interlocking dual payment arcs
export function PayIcon({size = 22, color = '#FFFFFF', focused = false, style}: IconProps) {
  const c = focused ? '#FFFFFF' : color;
  const s = size;
  return (
    <View style={[{width: s, height: s, alignItems: 'center', justifyContent: 'center'}, style]}>
      <View
        style={{
          width: s * 0.8,
          height: s * 0.8,
          borderRadius: s * 0.4,
          borderWidth: 1.8,
          borderColor: c,
          borderLeftColor: 'transparent',
          borderBottomColor: 'transparent',
          transform: [{rotate: '-45deg'}],
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: s * 0.52,
          height: s * 0.52,
          borderRadius: s * 0.26,
          borderWidth: 1.8,
          borderColor: c,
          borderLeftColor: 'transparent',
          borderBottomColor: 'transparent',
          transform: [{rotate: '-45deg'}],
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: s * 0.18,
          height: s * 0.18,
          borderRadius: s * 0.09,
          backgroundColor: c,
        }}
      />
    </View>
  );
}

// 3. History Icon — Precision clock / ledger glyph
export function HistoryIcon({size = 22, color = '#FFFFFF', focused = false, style}: IconProps) {
  const c = focused ? '#FFFFFF' : color;
  const s = size;
  return (
    <View style={[{width: s, height: s, alignItems: 'center', justifyContent: 'center'}, style]}>
      <View
        style={{
          width: s * 0.84,
          height: s * 0.84,
          borderRadius: s * 0.42,
          borderWidth: 1.8,
          borderColor: c,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            position: 'absolute',
            width: 1.8,
            height: s * 0.28,
            backgroundColor: c,
            top: s * 0.12,
            borderRadius: 1,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: s * 0.22,
            height: 1.8,
            backgroundColor: c,
            right: s * 0.16,
            borderRadius: 1,
          }}
        />
        <View
          style={{
            width: 3.5,
            height: 3.5,
            borderRadius: 2,
            backgroundColor: c,
          }}
        />
      </View>
    </View>
  );
}

// 4. Settings Icon — Minimalist dual-slider silhouette
export function SettingsIcon({size = 22, color = '#FFFFFF', focused = false, style}: IconProps) {
  const c = focused ? '#FFFFFF' : color;
  const s = size;
  return (
    <View style={[{width: s, height: s, justifyContent: 'center', paddingHorizontal: 2}, style]}>
      <View style={{height: 7, justifyContent: 'center', marginBottom: 3}}>
        <View style={{height: 1.8, backgroundColor: c, borderRadius: 1}} />
        <View
          style={{
            position: 'absolute',
            left: s * 0.18,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: focused ? '#181820' : '#FFFFFF',
            borderWidth: 1.6,
            borderColor: c,
          }}
        />
      </View>
      <View style={{height: 7, justifyContent: 'center'}}>
        <View style={{height: 1.8, backgroundColor: c, borderRadius: 1}} />
        <View
          style={{
            position: 'absolute',
            right: s * 0.18,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: focused ? '#181820' : '#FFFFFF',
            borderWidth: 1.6,
            borderColor: c,
          }}
        />
      </View>
    </View>
  );
}

// 5. Contactless Radio Wave (Apple Card / Visa chip companion)
export function ContactlessWave({size = 24, color = '#FFFFFF'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          width: s * 0.88,
          height: s * 0.88,
          borderRadius: s * 0.44,
          borderWidth: 2,
          borderColor: color,
          borderLeftColor: 'transparent',
          borderBottomColor: 'transparent',
          transform: [{rotate: '45deg'}],
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: s * 0.6,
          height: s * 0.6,
          borderRadius: s * 0.3,
          borderWidth: 2,
          borderColor: color,
          borderLeftColor: 'transparent',
          borderBottomColor: 'transparent',
          transform: [{rotate: '45deg'}],
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: s * 0.32,
          height: s * 0.32,
          borderRadius: s * 0.16,
          borderWidth: 2,
          borderColor: color,
          borderLeftColor: 'transparent',
          borderBottomColor: 'transparent',
          transform: [{rotate: '45deg'}],
          position: 'absolute',
        }}
      />
    </View>
  );
}

// 6. Smart Card Chip Icon
export function CardChip({size = 28, color = '#D1D5DB'}: {size?: number; color?: string}) {
  const w = size;
  const h = size * 0.75;
  return (
    <View
      style={{
        width: w,
        height: h,
        borderRadius: 4,
        borderWidth: 1.2,
        borderColor: color,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <View style={{width: '75%', height: '40%', borderWidth: 0.8, borderColor: color, borderRadius: 2}} />
      <View style={{position: 'absolute', width: '100%', height: 0.8, backgroundColor: color}} />
      <View style={{position: 'absolute', width: 0.8, height: '100%', backgroundColor: color}} />
    </View>
  );
}

// 7. Checkmark Circle Icon
export function CheckCircleIcon({size = 32, color = '#FFFFFF', bg = '#24242E'}: {size?: number; color?: string; bg?: string}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: size * 0.36,
          height: size * 0.2,
          borderLeftWidth: 2.2,
          borderBottomWidth: 2.2,
          borderColor: color,
          transform: [{rotate: '-45deg'}],
          marginBottom: 3,
        }}
      />
    </View>
  );
}

// 7b. Raw Check glyph (without circle container)
export function CheckGlyph({size = 24, color = '#FFFFFF'}: {size?: number; color?: string}) {
  return (
    <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          width: size * 0.52,
          height: size * 0.28,
          borderLeftWidth: 3,
          borderBottomWidth: 3,
          borderColor: color,
          transform: [{rotate: '-45deg'}],
          marginBottom: size * 0.1,
        }}
      />
    </View>
  );
}

// 7c. Cross / Close Icon
export function CrossIcon({size = 24, color = '#FFFFFF'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          position: 'absolute',
          width: s * 0.7,
          height: 2.5,
          borderRadius: 1.5,
          backgroundColor: color,
          transform: [{rotate: '45deg'}],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: s * 0.7,
          height: 2.5,
          borderRadius: 1.5,
          backgroundColor: color,
          transform: [{rotate: '-45deg'}],
        }}
      />
    </View>
  );
}

// 8. User / Profile Icon — Clean geometric human silhouette
export function UserIcon({size = 18, color = '#FFFFFF'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      {/* Head */}
      <View
        style={{
          width: s * 0.44,
          height: s * 0.44,
          borderRadius: s * 0.22,
          backgroundColor: color,
          marginBottom: 2,
        }}
      />
      {/* Torso */}
      <View
        style={{
          width: s * 0.76,
          height: s * 0.38,
          borderTopLeftRadius: s * 0.38,
          borderTopRightRadius: s * 0.38,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// 9. Wallet Card Icon — Sleek debit/credit card outline
export function WalletCardIcon({size = 18, color = '#FFFFFF'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          width: s * 0.88,
          height: s * 0.6,
          borderRadius: 3,
          borderWidth: 1.6,
          borderColor: color,
          justifyContent: 'center',
          paddingHorizontal: 2,
        }}>
        <View style={{height: 1.5, backgroundColor: color, width: '100%', marginBottom: 2}} />
        <View style={{width: s * 0.2, height: 1.5, backgroundColor: color}} />
      </View>
    </View>
  );
}

// 10. Key / Secret Lock Icon
export function KeyIcon({size = 18, color = '#FFFFFF'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          transform: [{rotate: '-45deg'}],
        }}>
        {/* Ring */}
        <View
          style={{
            width: s * 0.46,
            height: s * 0.46,
            borderRadius: s * 0.23,
            borderWidth: 1.6,
            borderColor: color,
          }}
        />
        {/* Shaft */}
        <View
          style={{
            width: s * 0.44,
            height: 1.8,
            backgroundColor: color,
            marginLeft: -1,
          }}
        />
        {/* Tooth */}
        <View
          style={{
            width: 1.8,
            height: s * 0.18,
            backgroundColor: color,
            marginLeft: -3,
            marginTop: 4,
          }}
        />
      </View>
    </View>
  );
}

// 11. Globe / Network Icon — Precision sphere with meridians
export function GlobeIcon({size = 18, color = '#FFFFFF'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          width: s * 0.84,
          height: s * 0.84,
          borderRadius: s * 0.42,
          borderWidth: 1.6,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {/* Equator */}
        <View style={{position: 'absolute', width: '100%', height: 1.4, backgroundColor: color}} />
        {/* Prime meridian */}
        <View
          style={{
            width: s * 0.44,
            height: '100%',
            borderRadius: s * 0.22,
            borderWidth: 1.4,
            borderColor: color,
          }}
        />
      </View>
    </View>
  );
}

// 12. Info Icon — Minimalist circled "i"
export function InfoIcon({size = 18, color = '#FFFFFF'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          width: s * 0.84,
          height: s * 0.84,
          borderRadius: s * 0.42,
          borderWidth: 1.6,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View style={{width: 2.2, height: 2.2, borderRadius: 1.1, backgroundColor: color, marginBottom: 2}} />
        <View style={{width: 1.8, height: s * 0.28, backgroundColor: color, borderRadius: 1}} />
      </View>
    </View>
  );
}

// 13. Power / Reset Icon — Standby power glyph
export function PowerIcon({size = 18, color = '#FF453A'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          width: s * 0.78,
          height: s * 0.78,
          borderRadius: s * 0.39,
          borderWidth: 1.8,
          borderColor: color,
          borderTopColor: 'transparent',
          alignItems: 'center',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: s * 0.12,
          width: 1.8,
          height: s * 0.36,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
    </View>
  );
}

// 14. Refresh / Sync Icon
export function RefreshIcon({size = 18, color = '#FFFFFF'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          width: s * 0.76,
          height: s * 0.76,
          borderRadius: s * 0.38,
          borderWidth: 1.8,
          borderColor: color,
          borderTopColor: 'transparent',
          transform: [{rotate: '-45deg'}],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: s * 0.1,
          right: s * 0.18,
          width: 0,
          height: 0,
          borderLeftWidth: 3,
          borderRightWidth: 3,
          borderBottomWidth: 4,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
    </View>
  );
}

// 15. External Link / Arrow Icon (↗)
export function ExternalLinkIcon({size = 16, color = '#8E8E93'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          width: s * 0.44,
          height: s * 0.44,
          borderTopWidth: 1.8,
          borderRightWidth: 1.8,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: s * 0.6,
          height: 1.8,
          backgroundColor: color,
          transform: [{rotate: '-45deg'}],
        }}
      />
    </View>
  );
}

// 16. Faucet / Droplet Icon (Clean Monad Faucet token symbol)
export function FaucetIcon({size = 18, color = '#FFFFFF'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          width: s * 0.54,
          height: s * 0.54,
          borderTopLeftRadius: s * 0.54,
          borderBottomRightRadius: s * 0.27,
          borderBottomLeftRadius: s * 0.27,
          backgroundColor: color,
          transform: [{rotate: '-45deg'}],
        }}
      />
    </View>
  );
}

// 17. Explorer / Compass Icon (Clean Monad Block Explorer symbol)
export function ExplorerIcon({size = 18, color = '#FFFFFF'}: {size?: number; color?: string}) {
  const s = size;
  return (
    <View style={{width: s, height: s, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          width: s * 0.84,
          height: s * 0.84,
          borderRadius: s * 0.42,
          borderWidth: 1.6,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {/* Diamond needle */}
        <View
          style={{
            width: s * 0.28,
            height: s * 0.28,
            backgroundColor: color,
            transform: [{rotate: '45deg'}],
          }}
        />
      </View>
    </View>
  );
}
