import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

/** The checkerboard behind a transparent image, so you can see the background really is clear. */
export default function Checker({ a, b, cell = 10, style, children }: { a: string; b: string; cell?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="check" width={cell * 2} height={cell * 2} patternUnits="userSpaceOnUse">
            <Rect width={cell * 2} height={cell * 2} fill={a} />
            <Rect width={cell} height={cell} fill={b} />
            <Rect x={cell} y={cell} width={cell} height={cell} fill={b} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#check)" />
      </Svg>
      {children}
    </View>
  );
}
