import React, { useEffect, useRef, useState } from 'react';
import { Alert, GestureResponderEvent, Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MailComposer from 'expo-mail-composer';
import { useTheme, radius, space, type, Theme } from '../theme';
import { useApp } from '../state';
import { afterPaywall, canUseStamp, documentDecision, Stamp } from '../gates';
import { aspectOf, defaultSignature, Signature } from '../library';
import {
  clampBox,
  defaultBox,
  displaySize,
  fitRect,
  hitTest,
  Placement,
  resizeBox,
  scaleBox,
  shortDate,
  TEXT_SIZE_RATIO,
  toFront,
  viewToDisplay,
} from '../placement';
import { finishDocument, Finished, OpenDoc } from '../documents';
import { shareUri } from '../exporting';
import { maybeRequestReview } from '../reviews';
import { libraryPngUri } from '../store';
import PageView from '../ui/PageView';
import MarkView from '../ui/MarkView';
import Glyph from '../ui/Glyph';
import { Caption, Drawer, Field, GlyphButton, InkButton, Panel, Pill, QuietButton, Row, Tap, TopBar } from '../ui/Kit';
import { MODAL_ANIMATION, placeHaptic, savedHaptic, tick } from '../ui/motion';
import Create from './Create';
import PaywallModal from './Paywall';
import { PRIVACY_URL } from '../links';

let seq = 0;
const pid = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * Signing a document: the pages one at a time, filling the space; "Add
 * signature" puts the default (or the one picked) on the page. Drag to
 * move, pinch anywhere on the page to resize the selected one, or pull its
 * corner handle. Initials, the date and a line of text are Pro. "Done
 * signing" writes a new file; the original is never touched.
 */
export default function Sign({ doc, onClose }: { doc: OpenDoc; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { library, isPro, askPro, usage, countUsage, prefs, recent, addRecentDoc, setDocOpen, say, setNestedPaywall } = useApp();
  const [page, setPage] = useState(0);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [picker, setPicker] = useState<'signature' | 'initials' | null>(null);
  const [creating, setCreating] = useState<null | { initialsFor?: Signature }>(null);
  const [askFormat, setAskFormat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Finished | null>(null);

  useEffect(() => {
    setNestedPaywall(creating != null);
    return () => setNestedPaywall(false);
  }, [creating, setNestedPaywall]);

  useEffect(() => {
    setDocOpen(result == null);
    return () => setDocOpen(false);
  }, [result, setDocOpen]);

  const box = doc.pages[page];
  const shown = displaySize(box);
  const frame = fitRect(shown, { width: area.width, height: area.height });
  const onPage = placements.filter((p) => p.page === page);
  const sel = placements.find((p) => p.id === selected) ?? null;

  const update = (id: string, fn: (p: Placement) => Placement) => setPlacements((all) => all.map((p) => (p.id === id ? fn(p) : p)));

  const place = (kind: Placement['kind'], opts: { sig?: Signature; text?: string }) => {
    const mark = kind === 'initials' ? opts.sig?.initials : opts.sig?.main;
    const aspect = mark ? aspectOf(mark) : kind === 'date' ? 5 : 7;
    const b = defaultBox(shown, aspect, kind);
    // A second one on the same page lands a little lower, not on top of the first.
    const offset = onPage.length * Math.min(24, shown.height * 0.03);
    const p: Placement = clampBox({ id: pid(), page, kind, ...b, y: b.y + offset, signatureId: opts.sig?.id, text: opts.text }, shown);
    setPlacements((all) => [...all, p]);
    setSelected(p.id);
    placeHaptic();
  };

  const addStamp = async (stamp: Stamp) => {
    if (!canUseStamp(stamp, isPro) && !(await askPro('stamp'))) return;
    if (stamp === 'signature' || stamp === 'initials') {
      if (library.length === 0) return setCreating({});
      if (stamp === 'initials' && !library.some((s) => s.initials)) {
        const d = defaultSignature(library)!;
        return setCreating({ initialsFor: d });
      }
      return setPicker(stamp);
    }
    if (stamp === 'date') place('date', { text: shortDate(Date.now()) });
    else place('text', { text: prefs.typedName || 'Your name' });
  };

  // ---------- touch: one responder over the page ----------
  const g = useRef<{ id: string | null; mode: 'move' | 'resize' | 'none'; start: Placement | null; x0: number; y0: number; pinch: number | null; pinchStart: Placement | null; moved: boolean }>({
    id: null,
    mode: 'none',
    start: null,
    x0: 0,
    y0: 0,
    pinch: null,
    pinchStart: null,
    moved: false,
  });
  const placementsRef = useRef(placements);
  placementsRef.current = placements;
  const selRef = useRef(selected);
  selRef.current = selected;

  const dist = (e: GestureResponderEvent) => {
    const t = e.nativeEvent.touches;
    if (t.length < 2) return null;
    return Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
  };

  const grant = (e: GestureResponderEvent) => {
    const n = e.nativeEvent;
    const pt = viewToDisplay({ x: 0, y: 0, scale: frame.scale }, n.locationX, n.locationY);
    const hit = hitTest(placementsRef.current, page, pt.x, pt.y, { selectedId: selRef.current, handle: 22 / frame.scale, slop: 8 / frame.scale });
    const cur = hit ? placementsRef.current.find((p) => p.id === hit.id)! : placementsRef.current.find((p) => p.id === selRef.current && p.page === page) ?? null;
    g.current = { id: cur?.id ?? null, mode: hit ? hit.mode : 'none', start: cur, x0: n.pageX, y0: n.pageY, pinch: dist(e), pinchStart: cur, moved: false };
    if (hit) {
      setSelected(hit.id);
      setPlacements((all) => toFront(all, hit.id));
    }
  };

  const move = (e: GestureResponderEvent) => {
    const s = g.current;
    if (!s.id) return;
    const d = dist(e);
    if (d != null) {
      // Two fingers anywhere on the page: pinch the selected one.
      if (s.pinch == null) {
        s.pinch = d;
        s.pinchStart = placementsRef.current.find((p) => p.id === s.id) ?? s.start;
      }
      const k = d / s.pinch;
      if (s.pinchStart) update(s.id, () => clampBox(scaleBox(s.pinchStart!, k), shown));
      s.moved = true;
      return;
    }
    if (s.pinch != null) {
      // Back to one finger after a pinch: carry on from here.
      s.pinch = null;
      s.start = placementsRef.current.find((p) => p.id === s.id) ?? s.start;
      s.x0 = e.nativeEvent.pageX;
      s.y0 = e.nativeEvent.pageY;
      if (s.mode === 'none') s.mode = 'move';
    }
    if (!s.start || s.mode === 'none') return;
    const dx = (e.nativeEvent.pageX - s.x0) / frame.scale;
    const dy = (e.nativeEvent.pageY - s.y0) / frame.scale;
    if (Math.abs(dx) + Math.abs(dy) > 1) s.moved = true;
    const st = s.start;
    update(s.id, () => clampBox(s.mode === 'resize' ? resizeBox(st, dx, dy) : { ...st, x: st.x + dx, y: st.y + dy }, shown));
  };

  const release = () => {
    const s = g.current;
    if (s.mode === 'none' && !s.moved) setSelected(null);
    else if (s.moved) placeHaptic();
    g.current = { ...s, id: null, mode: 'none', pinch: null };
  };

  // ---------- done ----------
  const finish = async (format: 'pdf' | 'jpg') => {
    setAskFormat(false);
    let d = documentDecision(isPro, usage);
    if (d.paywall) d = afterPaywall(d, await askPro('document'));
    setBusy(true);
    try {
      const out = await finishDocument(doc, placements, library, recent, { watermark: d.watermark, format });
      addRecentDoc(out.doc);
      countUsage('documents');
      savedHaptic();
      setResult(out);
    } catch (e: any) {
      Alert.alert('That did not save', e?.message ?? 'Try once more.');
    } finally {
      setBusy(false);
    }
  };

  const done = () => {
    if (placements.length === 0) return;
    setSelected(null);
    if (doc.kind === 'photo') setAskFormat(true);
    else finish('pdf');
  };

  const close = () => {
    if (placements.length === 0 || result) return onClose();
    Alert.alert('Leave without saving?', 'The original document is not changed either way.', [
      { text: 'Keep signing', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: onClose },
    ]);
  };

  if (result) return <Signed theme={theme} result={result} first={usage.documents === 1} onClose={onClose} say={say} />;

  const scale = frame.scale;
  return (
    <View style={{ flex: 1 }}>
      <TopBar
        theme={theme}
        title={doc.name}
        onBack={close}
        closeGlyph="close"
        right={
          doc.pages.length > 1 ? (
            <Text style={[type.small, { color: theme.inkSoft, marginRight: space.s }]} accessibilityLabel={`Page ${page + 1} of ${doc.pages.length}`}>
              {page + 1} of {doc.pages.length}
            </Text>
          ) : null
        }
      />
      <View style={styles.area} onLayout={(e) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        {frame.width > 0 ? (
          <View style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.width, height: frame.height }}>
            <View style={[styles.sheet, { borderColor: theme.edge }]}>
              <PageView doc={doc} page={page} width={frame.width} height={frame.height} />
            </View>
            {onPage.map((p) => (
              <Placed key={p.id} theme={theme} p={p} scale={scale} selected={p.id === selected} library={library} onAction={(a) => {
                if (a === 'delete') setPlacements((all) => all.filter((x) => x.id !== p.id));
                else update(p.id, (x) => clampBox(scaleBox(x, a === 'bigger' ? 1.15 : 1 / 1.15), shown));
              }} />
            ))}
            <View
              style={StyleSheet.absoluteFill}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={grant}
              onResponderMove={move}
              onResponderRelease={release}
              onResponderTerminate={release}
              accessible={false}
              importantForAccessibility="no"
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.bottom, { borderTopColor: theme.edge, paddingBottom: Math.max(insets.bottom, space.m) }]}>
        {sel && (sel.kind === 'date' || sel.kind === 'text') ? (
          <Field theme={theme} value={sel.text ?? ''} onChangeText={(t) => update(sel.id, (x) => ({ ...x, text: t }))} placeholder={sel.kind === 'date' ? 'Date' : 'Text'} accessibilityLabel={sel.kind === 'date' ? 'Date on the page' : 'Text on the page'} returnKeyType="done" />
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools} keyboardShouldPersistTaps="handled">
          <Pill theme={theme} glyph="create" label="Add signature" on={false} onPress={() => addStamp('signature')} />
          <Pill theme={theme} glyph="initials" label="Add initials" on={false} locked={!canUseStamp('initials', isPro)} onPress={() => addStamp('initials')} />
          <Pill theme={theme} glyph="date" label="Add date" on={false} locked={!canUseStamp('date', isPro)} onPress={() => addStamp('date')} />
          <Pill theme={theme} glyph="text" label="Add text" on={false} locked={!canUseStamp('text', isPro)} onPress={() => addStamp('text')} />
          {sel ? <Pill theme={theme} glyph="trash" label="Remove" on={false} onPress={() => { setPlacements((all) => all.filter((x) => x.id !== sel.id)); setSelected(null); }} /> : null}
        </ScrollView>
        <View style={styles.doneRow}>
          {doc.pages.length > 1 ? (
            <View style={styles.pager}>
              <GlyphButton theme={theme} glyph="back" label="Previous page" onPress={() => { tick(); setSelected(null); setPage(Math.max(0, page - 1)); }} disabled={page === 0} filled />
              <GlyphButton theme={theme} glyph="chevron" label="Next page" onPress={() => { tick(); setSelected(null); setPage(Math.min(doc.pages.length - 1, page + 1)); }} disabled={page === doc.pages.length - 1} filled />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <InkButton theme={theme} label="Done signing" onPress={done} disabled={placements.length === 0} busy={busy} hint={placements.length === 0 ? 'Add a signature first' : 'Saves a signed copy. The original stays as it is.'} />
          </View>
        </View>
      </View>

      <Drawer theme={theme} visible={picker != null} onClose={() => setPicker(null)} title={picker === 'initials' ? 'Add initials' : 'Add signature'}>
        <ScrollView style={{ maxHeight: 420 }}>
          <Panel theme={theme} style={{ marginBottom: space.m }}>
            {[...library]
              .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
              .filter((s) => picker !== 'initials' || s.initials)
              .map((s, i) => (
                <Tap
                  key={s.id}
                  onPress={() => {
                    const kind = picker!;
                    setPicker(null);
                    place(kind, { sig: s });
                  }}
                  style={[styles.pick, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }, s.isDefault && { backgroundColor: theme.picked }]}
                  pressedStyle={{ backgroundColor: theme.raised }}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.name}${s.isDefault ? ', default' : ''}`}
                >
                  <View style={[styles.pickPaper, { backgroundColor: theme.paper }]}>
                    <MarkView mark={picker === 'initials' && s.initials ? s.initials : s.main} height={40} maxWidth={150} />
                  </View>
                  <Text style={[type.body, { color: theme.ink, flex: 1 }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                  {s.isDefault ? <Caption theme={theme}>Default</Caption> : null}
                </Tap>
              ))}
          </Panel>
          <QuietButton theme={theme} glyph="plus" label={picker === 'initials' ? 'Make initials' : 'New signature'} onPress={() => {
            const k = picker;
            setPicker(null);
            setTimeout(() => setCreating(k === 'initials' ? { initialsFor: defaultSignature(library)! } : {}), 400);
          }} />
        </ScrollView>
      </Drawer>

      <Drawer theme={theme} visible={askFormat} onClose={() => setAskFormat(false)} title="Save the signed photo as">
        <Panel theme={theme} style={{ marginBottom: space.l }}>
          <Row theme={theme} first glyph="documents" label="PDF" sub="Best for sending back" onPress={() => finish('pdf')} />
          <Row theme={theme} glyph="photo" label="JPG" sub="An image, like the photo" onPress={() => finish('jpg')} />
        </Panel>
      </Drawer>

      <Modal visible={creating != null} animationType={MODAL_ANIMATION} presentationStyle="fullScreen" onRequestClose={() => setCreating(null)}>
        <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          {creating ? (
            <Create
              initialsFor={creating.initialsFor}
              onClose={() => setCreating(null)}
              onSaved={(sig) => {
                const kind = creating.initialsFor ? 'initials' : 'signature';
                setCreating(null);
                place(kind, { sig });
              }}
            />
          ) : null}
        </View>
        <PaywallModal privacyUrl={PRIVACY_URL} nested />
      </Modal>
    </View>
  );
}

/** A placement on the page. Selected: an ink outline and a round corner handle. VoiceOver can resize or remove it. */
function Placed({ theme, p, scale, selected, library, onAction }: { theme: Theme; p: Placement; scale: number; selected: boolean; library: Signature[]; onAction: (a: 'bigger' | 'smaller' | 'delete') => void }) {
  const sig = library.find((s) => s.id === p.signatureId);
  const mark = p.kind === 'initials' ? sig?.initials : p.kind === 'signature' ? sig?.main : undefined;
  const w = p.width * scale;
  const h = p.height * scale;
  const label = p.kind === 'signature' ? 'Signature' : p.kind === 'initials' ? 'Initials' : p.kind === 'date' ? `Date, ${p.text}` : `Text, ${p.text}`;
  return (
    <View
      style={{ position: 'absolute', left: p.x * scale, top: p.y * scale, width: w, height: h }}
      accessible
      accessibilityLabel={label}
      accessibilityHint="Drag to move. Pinch to resize."
      accessibilityActions={[{ name: 'bigger', label: 'Make bigger' }, { name: 'smaller', label: 'Make smaller' }, { name: 'delete', label: 'Remove' }]}
      onAccessibilityAction={(e) => onAction(e.nativeEvent.actionName as 'bigger' | 'smaller' | 'delete')}
    >
      {mark ? (
        <Image source={{ uri: libraryPngUri(mark.png) }} style={{ width: w, height: h }} resizeMode="stretch" />
      ) : (
        <Text style={{ fontFamily: 'Helvetica', fontSize: h * TEXT_SIZE_RATIO, lineHeight: h, height: h, color: '#141418' }} numberOfLines={1} allowFontScaling={false}>
          {p.text}
        </Text>
      )}
      {selected ? (
        <>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.selFrame, { borderColor: theme.paperInk }]} />
          <View pointerEvents="none" style={[styles.handle, { backgroundColor: theme.paper, borderColor: theme.paperInk }]} />
        </>
      ) : null}
    </View>
  );
}

/** After Done signing: the file is saved; send it back. */
function Signed({ theme, result, first, onClose, say }: { theme: Theme; result: Finished; first: boolean; onClose: () => void; say: (t: string) => void }) {
  const [mail, setMail] = useState(false);
  useEffect(() => {
    MailComposer.isAvailableAsync().then(setMail).catch(() => setMail(false));
  }, []);
  const kind = result.doc.format;
  const afterShare = () => {
    if (first) maybeRequestReview('firstDocShare');
  };
  const share = async () => {
    try {
      await shareUri(result.uri, kind, result.doc.name);
      afterShare();
    } catch (e: any) {
      Alert.alert('Sharing did not open', e?.message ?? 'Try once more.');
    }
  };
  const sendMail = async () => {
    try {
      const r = await MailComposer.composeAsync({ subject: result.doc.name.replace(/\.(pdf|jpg)$/i, ''), attachments: [result.uri] });
      if (r.status === 'sent') say('Sent.');
      afterShare();
    } catch (e: any) {
      Alert.alert('Mail did not open', e?.message ?? 'Try once more.');
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <TopBar theme={theme} onBack={onClose} closeGlyph="close" />
      <View style={styles.signed}>
        <View style={[styles.fileIcon, { backgroundColor: theme.paper, borderColor: theme.edge }]}>
          <Glyph name="documents" size={44} color={theme.paperInk} weight={1.4} />
        </View>
        <Text style={[type.title, { color: theme.ink, textAlign: 'center' }]} accessibilityRole="header">
          Signed.
        </Text>
        <Text style={[type.body, { color: theme.inkSoft, textAlign: 'center' }]}>
          {result.doc.name} is saved in Documents. The original is unchanged.
        </Text>
      </View>
      <View style={styles.signedActions}>
        {mail ? <QuietButton theme={theme} glyph="share" label="Send in Mail" onPress={sendMail} /> : null}
        <QuietButton theme={theme} glyph="file" label="Save to Files" onPress={share} hint="Opens the share sheet; choose Save to Files" />
        <InkButton theme={theme} glyph="share" label="Send it back" onPress={share} hint="Mail, Messages, Files and other apps" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, marginHorizontal: space.l, marginVertical: space.s },
  sheet: { borderWidth: 1, borderRadius: 2, overflow: 'hidden' },
  bottom: { borderTopWidth: 1, paddingTop: space.m, paddingHorizontal: space.l, gap: space.m },
  tools: { gap: space.s },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  pager: { flexDirection: 'row', gap: space.s },
  pick: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m },
  pickPaper: { width: 170, height: 56, borderRadius: radius.small, alignItems: 'center', justifyContent: 'center' },
  selFrame: { borderWidth: 1.5, borderRadius: 4, margin: -4 },
  handle: { position: 'absolute', right: -11, bottom: -11, width: 22, height: 22, borderRadius: radius.round, borderWidth: 2 },
  signed: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl, gap: space.m },
  fileIcon: { width: 96, height: 120, borderRadius: radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: space.m },
  signedActions: { paddingHorizontal: space.l, paddingBottom: space.l, gap: space.s },
});
