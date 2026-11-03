import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleProp, View, ViewStyle } from 'react-native';
import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { fitInto, playLength, Rect, Stroke, strokePath, strokesAt, strokesBounds } from '../stroke';

/** Strokes drawn by the pen engine, fitted into the box. Not touchable. */
export function InkView({ strokes, width, height, color, margin = 8, style }: { strokes: Stroke[]; width: number; height: number; color: string; margin?: number; style?: StyleProp<ViewStyle> }) {
  const paths = useMemo(() => fitInto(strokes, width, height, margin).map(strokePath), [strokes, width, height, margin]);
  return (
    <View style={[{ width, height }, style]} pointerEvents="none">
      <Canvas style={{ width, height }}>
        <Group>
          {paths.map((d, i) => (
            <Path key={i} path={d} color={color} />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}

/**
 * A signature drawing itself in once, at the speed it was drawn, then
 * stopping. With Reduce Motion on it is shown finished. The framing is the
 * finished signature's, so nothing moves while it grows.
 */
export function PlayInk({ strokes, width, height, color, margin = 8, delay = 350, frame }: { strokes: Stroke[]; width: number; height: number; color: string; margin?: number; delay?: number; /** Draw in these coordinates as they are (no fitting). */ frame?: Rect }) {
  const total = useMemo(() => playLength(strokes), [strokes]);
  const bounds = useMemo(() => frame ?? strokesBounds(strokes), [strokes, frame]);
  const [t, setT] = useState(0);

  useEffect(() => {
    let raf: number | null = null;
    let live = true;
    let start = 0;
    const step = (now: number) => {
      if (!live) return;
      if (!start) start = now;
      const e = now - start - delay;
      setT(Math.max(0, e));
      if (e < total) raf = requestAnimationFrame(step);
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (!live) return;
        if (reduced) setT(total);
        else raf = requestAnimationFrame(step);
      })
      .catch(() => live && setT(total));
    return () => {
      live = false;
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [total, delay]);

  const paths = useMemo(() => fitInto(strokesAt(strokes, t), width, height, frame ? 0 : margin, bounds).map(strokePath), [strokes, t, width, height, margin, bounds, frame]);
  return (
    <View style={{ width, height }} pointerEvents="none">
      <Canvas style={{ width, height }}>
        <Group>
          {paths.map((d, i) => (
            <Path key={i} path={d} color={color} />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}
