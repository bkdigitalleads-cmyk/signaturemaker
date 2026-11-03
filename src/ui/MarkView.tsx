import React from 'react';
import { Image, StyleProp, ViewStyle, View } from 'react-native';
import { aspectOf, Mark } from '../library';
import { libraryPngUri } from '../store';

/** A saved mark's transparent PNG, fitted into its box with its own shape. */
export default function MarkView({ mark, height, maxWidth, style, label }: { mark: Mark; height: number; maxWidth?: number; style?: StyleProp<ViewStyle>; label?: string }) {
  const a = aspectOf(mark);
  let h = height;
  let w = h * a;
  if (maxWidth != null && w > maxWidth) {
    w = maxWidth;
    h = w / a;
  }
  return (
    <View style={[{ width: w, height: h }, style]} accessible={label != null} accessibilityRole="image" accessibilityLabel={label}>
      <Image source={{ uri: libraryPngUri(mark.png) }} style={{ width: w, height: h }} resizeMode="contain" />
    </View>
  );
}
