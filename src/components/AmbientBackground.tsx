/**
 * AmbientBackground — a few very soft color blooms behind the content so glass
 * surfaces have something to pick up (the iOS "liquid glass" wallpaper effect).
 * Non-interactive, sits at the back of a screen.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Defs, RadialGradient, Rect, Stop} from 'react-native-svg';
import {useTheme} from '../context/ThemeContext';

export default function AmbientBackground() {
  const {isDark} = useTheme();
  const k = isDark ? 1 : 0.55;
  const blobs = [
    {id: 'a', cx: '88%', cy: '4%', r: '60%', color: '#0A84FF', op: 0.3 * k},
    {id: 'b', cx: '0%', cy: '46%', r: '52%', color: '#BF5AF2', op: 0.17 * k},
    {id: 'c', cx: '95%', cy: '96%', r: '58%', color: '#32ADE6', op: 0.16 * k},
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          {blobs.map(b => (
            <RadialGradient key={b.id} id={b.id} cx={b.cx} cy={b.cy} r={b.r} fx={b.cx} fy={b.cy}>
              <Stop offset="0" stopColor={b.color} stopOpacity={b.op} />
              <Stop offset="1" stopColor={b.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {blobs.map(b => (
          <Rect key={b.id} width="100%" height="100%" fill={`url(#${b.id})`} />
        ))}
      </Svg>
    </View>
  );
}
