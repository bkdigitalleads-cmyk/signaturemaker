/**
 * The onboarding pictures: the product itself, drawn by the app's own
 * renderer and pen engine. No stock art, no device frames, no gradients.
 *   DrawShow   - the pad, with a signature drawing itself in once in Ink
 *   ExportShow - the same signature on the checkerboard, and at the foot of a letter
 *   SignShow   - a lease page with the signature on the tenant line and the date
 * The page and the letter are drawn documents, so their text uses its own
 * small sizes (like the export screen's letter), not the type scale.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radius, space, type, Theme } from '../theme';
import { inkHex } from '../library';
import { SAMPLE_PAD, SAMPLE_SIGNATURE } from '../sample';
import { transformStrokes } from '../stroke';
import { shortDate } from '../placement';
import Checker from './Checker';
import { InkView, PlayInk } from './InkView';

export function DrawShow({ theme, width }: { theme: Theme; width: number }) {
  // The sample's own pad, scaled to this width, so it sits on the line where it was drawn.
  const k = width / SAMPLE_PAD.width;
  const height = Math.round(SAMPLE_PAD.height * k);
  const lineY = Math.round(SAMPLE_PAD.baseline * k);
  const strokes = React.useMemo(() => transformStrokes(SAMPLE_SIGNATURE, 0, 0, k), [k]);
  return (
    <View style={[styles.paper, { width, height, backgroundColor: theme.paper, borderColor: theme.edge }]} accessible accessibilityRole="image" accessibilityLabel="A signature, Jordan Ellis, being drawn in black ink on the signing line">
      <View style={[styles.line, { top: lineY, left: space.xl, right: space.xl, backgroundColor: theme.baseline }]} />
      <Text style={[styles.cross, { top: lineY - 30, left: space.xl, color: theme.paperInkSoft }]}>×</Text>
      <View style={StyleSheet.absoluteFill}>
        <PlayInk strokes={strokes} width={width} height={height} color={inkHex('black')} frame={{ x: 0, y: 0, width, height }} />
      </View>
    </View>
  );
}

export function ExportShow({ theme, width }: { theme: Theme; width: number }) {
  const w = Math.floor((width - space.m) / 2);
  const h = Math.round(w * 1.22);
  const doc = { fontFamily: fonts.serif, fontSize: 8.5, lineHeight: 12, color: theme.paperInk };
  return (
    <View style={styles.pair} accessible accessibilityRole="image" accessibilityLabel="The same signature as a transparent PNG on a checkerboard, and at the foot of a letter">
      <View style={{ gap: space.s }}>
        <Checker a={theme.checkA} b={theme.checkB} cell={8} style={[styles.card, { width: w, height: h, borderColor: theme.edge }]}>
          <InkView strokes={SAMPLE_SIGNATURE} width={w} height={h} color={inkHex('navy')} margin={space.l} />
        </Checker>
        <Text style={[type.small, { color: theme.inkSoft, textAlign: 'center' }]}>Transparent PNG</Text>
      </View>
      <View style={{ gap: space.s }}>
        <View style={[styles.card, styles.letter, { width: w, height: h, backgroundColor: theme.paper, borderColor: theme.edge }]}>
          <Text style={doc}>Dear Ms. Alvarez,</Text>
          <Text style={[doc, { marginTop: space.s }]}>Thank you for the offer. I have read the terms and I am glad to accept.</Text>
          <Text style={[doc, { marginTop: space.s }]}>Sincerely,</Text>
          <InkView strokes={SAMPLE_SIGNATURE} width={w * 0.62} height={34} color={inkHex('navy')} margin={2} />
          <Text style={doc}>Jordan Ellis</Text>
        </View>
        <Text style={[type.small, { color: theme.inkSoft, textAlign: 'center' }]}>On a letter</Text>
      </View>
    </View>
  );
}

const CLAUSES = [
  ['9. Alterations', 'Tenant will not paint, remodel or install fixtures without written consent.'],
  ['10. Notices', 'Notices to Landlord go to 90 Front Avenue, Suite 300. Notices to Tenant go to the residence.'],
  ['11. Entire agreement', 'This is the entire agreement. Any change must be in writing and signed by both parties.'],
];

export function SignShow({ theme, width }: { theme: Theme; width: number }) {
  // The foot of the page, where the signing lines are, at a size you can read.
  const w = Math.round(width * 0.86);
  const k = w / 230; // laid out at 230 points wide
  const t = (size: number, extra: object = {}) => ({ fontFamily: fonts.serif, fontSize: size * k, lineHeight: size * 1.4 * k, color: '#1B1B1B', ...extra });
  return (
    <View style={[styles.page, { width: w, paddingHorizontal: 22 * k, paddingTop: 20 * k, paddingBottom: 14 * k, borderColor: theme.edge }]} accessible accessibilityRole="image" accessibilityLabel="Page 2 of a lease agreement with the signature on the tenant signature line and today's date beside it">
      {CLAUSES.map(([head, body]) => (
        <View key={head} style={{ marginBottom: 8 * k }}>
          <Text style={t(6, { letterSpacing: 0.4 * k })}>{head.toUpperCase()}</Text>
          <Text style={t(6)}>{body}</Text>
        </View>
      ))}
      <View style={[styles.sigRow, { marginTop: 22 * k, gap: 14 * k }]}>
        <View style={{ flex: 1 }}>
          <View style={{ height: 34 * k, justifyContent: 'flex-end' }}>
            <InkView strokes={SAMPLE_SIGNATURE} width={104 * k} height={36 * k} color={inkHex('navy')} margin={1} style={{ marginBottom: -6 * k }} />
          </View>
          <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: '#333' }} />
          <Text style={t(5, { color: '#555', marginTop: 2 * k })}>Tenant signature</Text>
        </View>
        <View style={{ width: 70 * k }}>
          <View style={{ height: 34 * k, justifyContent: 'flex-end' }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 8 * k, color: '#141418', marginBottom: 2 * k }}>{shortDate(Date.UTC(2026, 10, 3, 17))}</Text>
          </View>
          <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: '#333' }} />
          <Text style={t(5, { color: '#555', marginTop: 2 * k })}>Date</Text>
        </View>
      </View>
      <View style={[styles.sigRow, { marginTop: 20 * k, gap: 14 * k }]}>
        <View style={{ flex: 1 }}>
          <View style={{ height: 34 * k }} />
          <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: '#333' }} />
          <Text style={t(5, { color: '#555', marginTop: 2 * k })}>Landlord signature</Text>
        </View>
        <View style={{ width: 70 * k }}>
          <View style={{ height: 34 * k }} />
          <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: '#333' }} />
          <Text style={t(5, { color: '#555', marginTop: 2 * k })}>Date</Text>
        </View>
      </View>
      <Text style={t(5, { color: '#777', textAlign: 'center', marginTop: 16 * k })}>Residential Lease Agreement, page 2 of 2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { borderRadius: radius.large, borderWidth: 1, overflow: 'hidden' },
  line: { position: 'absolute', height: 1 },
  cross: { position: 'absolute', fontSize: 22, lineHeight: 26 },
  pair: { flexDirection: 'row', gap: space.m },
  card: { borderRadius: radius.large, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  letter: { alignItems: 'flex-start', justifyContent: 'flex-start', padding: space.m },
  page: { backgroundColor: '#FFFFFF', borderWidth: 1, borderRadius: 2, alignSelf: 'center' },
  sigRow: { flexDirection: 'row', alignItems: 'flex-end' },
});
