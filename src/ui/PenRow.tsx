import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PENS, PenId, SizeStep, sampleStroke, strokePath } from '../stroke';
import { INKS, InkId } from '../library';
import { Theme, radius, space, type } from '../theme';
import { Tap } from './Kit';
import Glyph from './Glyph';
import { tick } from './motion';

/** A pen's glyph: a real squiggle from the pen engine, so the row shows what each pen does. */
export function PenGlyph({ pen, color, size = 1 }: { pen: PenId; color: string; size?: SizeStep }) {
  const d = useMemo(() => strokePath(sampleStroke(pen, size)), [pen, size]);
  return (
    <Svg width={44} height={22} viewBox="0 0 44 22">
      <Path d={d} fill={color} />
    </Svg>
  );
}

/** The pen row: four pens, then the four inks and three thicknesses. Locked pens show a small lock and open the paywall. */
export default function PenRow({
  theme,
  pen,
  ink,
  size,
  onPen,
  onInk,
  onSize,
  locked,
}: {
  theme: Theme;
  pen: PenId;
  ink: InkId;
  size: SizeStep;
  onPen: (p: PenId) => void;
  onInk: (i: InkId) => void;
  onSize: (s: SizeStep) => void;
  locked: (p: PenId) => boolean;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.pens} accessibilityRole="radiogroup" accessibilityLabel="Pen">
        {PENS.map((p) => {
          const on = p.id === pen;
          const lock = locked(p.id);
          return (
            <Tap
              key={p.id}
              onPress={() => {
                tick();
                onPen(p.id);
              }}
              style={[styles.pen, { backgroundColor: on ? theme.surface : 'transparent', borderColor: on ? theme.pickedEdge : 'transparent' }]}
              pressedStyle={{ backgroundColor: theme.raised }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={lock ? `${p.label} pen, Pro` : `${p.label} pen`}
              accessibilityHint={p.hint}
            >
              <PenGlyph pen={p.id} color={theme.ink} size={size} />
              <View style={styles.penLabel}>
                <Text style={[type.small, { color: on ? theme.ink : theme.inkSoft, fontWeight: on ? '600' : '400' }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
                  {p.label}
                </Text>
                {lock ? <Glyph name="lock" size={12} color={theme.inkFaint} /> : null}
              </View>
            </Tap>
          );
        })}
      </View>
      <View style={styles.second}>
        <View style={styles.inks} accessibilityRole="radiogroup" accessibilityLabel="Ink color">
          {INKS.map((i) => {
            const on = i.id === ink;
            return (
              <Tap
                key={i.id}
                onPress={() => {
                  tick();
                  onInk(i.id);
                }}
                style={[styles.dotWrap, { borderColor: on ? theme.ink : 'transparent' }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${i.label} ink`}
              >
                <View style={[styles.dot, { backgroundColor: i.hex }]} />
              </Tap>
            );
          })}
        </View>
        <View style={styles.inks} accessibilityRole="radiogroup" accessibilityLabel="Thickness">
          {([0, 1, 2] as SizeStep[]).map((s) => {
            const on = s === size;
            return (
              <Tap
                key={s}
                onPress={() => {
                  tick();
                  onSize(s);
                }}
                style={[styles.dotWrap, { borderColor: on ? theme.ink : 'transparent' }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={['Thin', 'Medium', 'Thick'][s]}
              >
                <View style={{ width: 5 + s * 4, height: 5 + s * 4, borderRadius: radius.round, backgroundColor: theme.ink }} />
              </Tap>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.m },
  pens: { flexDirection: 'row', gap: space.xs },
  pen: { flex: 1, alignItems: 'center', paddingVertical: space.s, borderRadius: radius.small, borderWidth: 1, gap: space.xs },
  penLabel: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  second: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inks: { flexDirection: 'row', gap: space.xs },
  dotWrap: { width: 44, height: 44, borderRadius: radius.round, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 24, height: 24, borderRadius: radius.round },
});
