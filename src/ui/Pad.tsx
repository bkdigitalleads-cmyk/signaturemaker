import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, StyleSheet, Text, View } from 'react-native';
import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { RawPoint, Stroke, PenId, SizeStep, strokePath } from '../stroke';
import { Theme, radius, space, type } from '../theme';

/**
 * The drawing pad: a sheet of paper with a thin signing line and a small
 * cross where the pen starts, and Skia drawing the pen engine's filled
 * outlines. Finger or Apple Pencil (iOS reports Pencil pressure as force,
 * which the Ink pen follows). Touches are read from the plain responder
 * on a view over the canvas, so the points are in the pad's own space
 * even when wide mode turns the pad sideways.
 */
export default function Pad({
  theme,
  width,
  height,
  strokes,
  onStroke,
  pen,
  size,
  inkHex,
  placeholder = 'Draw with a finger or Apple Pencil',
  baseline = 0.7,
}: {
  theme: Theme;
  width: number;
  height: number;
  strokes: Stroke[];
  onStroke: (s: Stroke) => void;
  pen: PenId;
  size: SizeStep;
  inkHex: string;
  placeholder?: string;
  /** Where the signing line sits, as a share of the height. */
  baseline?: number;
}) {
  const live = useRef<RawPoint[] | null>(null);
  const start = useRef(0);
  const frame = useRef<number | null>(null);
  const [, setTick] = useState(0);

  // Finished strokes are outlined once; only the live one is redrawn while you draw.
  const done = useMemo(() => strokes.map((s) => strokePath(s)), [strokes]);

  const redraw = useCallback(() => {
    if (frame.current != null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setTick((t) => t + 1);
    });
  }, []);

  const point = (e: GestureResponderEvent): RawPoint => {
    const n = e.nativeEvent as any;
    const force = typeof n.force === 'number' && n.force > 0 ? Math.min(1, n.force) : 0;
    return [n.locationX, n.locationY, Date.now() - start.current, force];
  };

  const begin = (e: GestureResponderEvent) => {
    start.current = Date.now();
    live.current = [point(e)];
    redraw();
  };
  const move = (e: GestureResponderEvent) => {
    if (!live.current) return;
    // Every coalesced touch since the last frame, when iOS hands them over.
    live.current.push(point(e));
    redraw();
  };
  const end = () => {
    const pts = live.current;
    live.current = null;
    if (pts && pts.length > 0) onStroke({ pen, size, pts });
    redraw();
  };

  const liveStroke = live.current ? strokePath({ pen, size, pts: live.current }) : null;
  const empty = strokes.length === 0 && !live.current;
  const lineY = Math.round(height * baseline);

  return (
    <View style={[styles.paper, { width, height, backgroundColor: theme.paper, borderColor: theme.edge }]}>
      <View pointerEvents="none" style={[styles.line, { top: lineY, backgroundColor: theme.baseline, left: space.xl, right: space.xl }]} />
      <Text pointerEvents="none" style={[styles.cross, { top: lineY - 30, left: space.xl, color: theme.paperInkSoft }]} accessible={false}>
        ×
      </Text>
      {empty ? (
        <Text pointerEvents="none" style={[type.small, styles.hint, { top: lineY + space.s, left: space.xl, color: theme.paperInkSoft }]} accessible={false}>
          {placeholder}
        </Text>
      ) : null}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Group>
          {done.map((d, i) => (
            <Path key={i} path={d} color={inkHex} />
          ))}
          {liveStroke ? <Path path={liveStroke} color={inkHex} /> : null}
        </Group>
      </Canvas>
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={begin}
        onResponderMove={move}
        onResponderRelease={end}
        onResponderTerminate={end}
        accessible
        accessibilityRole="image"
        accessibilityLabel={empty ? 'Signature pad, empty. Draw your signature with a finger or Apple Pencil, or choose Type instead.' : `Signature pad with ${strokes.length} ${strokes.length === 1 ? 'stroke' : 'strokes'}`}
        accessibilityHint="Draw with one finger. Type instead is above the pad."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { borderRadius: radius.large, borderWidth: 1, overflow: 'hidden' },
  line: { position: 'absolute', height: 1 },
  cross: { position: 'absolute', fontSize: 22, lineHeight: 26 },
  hint: { position: 'absolute' },
});
