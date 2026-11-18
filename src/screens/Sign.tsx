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
  clampLive,
  displaySize,
  fitRect,
  hitTest,
  liveToFrame,
  MAX_ZOOM,
  nudge,
  pillSpot,
  Placement,
  placeInView,
  rememberWidth,
  RENDER_ZOOM,
  resizeBox,
  scaleBox,
  shortDate,
  TAP_ZOOM,
  TEXT_SIZE_RATIO,
  toFront,
  viewToDisplay,
  visiblePart,
  zoomAround,
  zoomedFrame,
} from '../placement';
import { finishDocument, Finished, OpenDoc } from '../documents';
import { shareUri } from '../exporting';
import { maybeRequestReview } from '../reviews';
import { libraryPngUri } from '../store';
import PageView from '../ui/PageView';
import MarkView from '../ui/MarkView';
import Glyph, { GlyphName } from '../ui/Glyph';
import { Caption, Drawer, Field, GlyphButton, InkButton, Panel, QuietButton, Row, Tap, TopBar } from '../ui/Kit';
import { MODAL_ANIMATION, placeHaptic, savedHaptic, tick } from '../ui/motion';
import Create from './Create';
import PaywallModal from './Paywall';
import { PRIVACY_URL } from '../links';
import { t } from '../i18n';

let seq = 0;
const pid = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * Signing a document: the pages one at a time, filling the space; "Add
 * signature" puts the default (or the one picked) in the middle of the
 * part of the page on screen, at the size last used for that kind. Drag a
 * placement to move it; pull its corner handle, or use the smaller and
 * bigger buttons in the small pill above it, to resize it. Pinch anywhere to zoom the page (up to
 * 4x) so a small signature line is easy to hit, drag the paper to look
 * around, double tap to go between the whole page and a close look.
 * Initials, the date and a line of text are Pro. "Done signing" writes a
 * new file; the original is never touched.
 */
export default function Sign({ doc, onClose }: { doc: OpenDoc; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { library, isPro, askPro, usage, countUsage, prefs, setPrefs, recent, addRecentDoc, setDocOpen, say, setNestedPaywall } = useApp();
  const [page, setPage] = useState(0);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  // The page at a zoom: z is 1 (whole page) to MAX_ZOOM; origin is the frame's top left in the area.
  const [zoom, setZoom] = useState({ z: 1, origin: { x: 0, y: 0 } });
  // While two fingers are down: the whole frame (page and placements) is scaled with a
  // transform, kept on the area like a settled zoom. When they lift the zoom settles; the
  // page itself is drawn once at RENDER_ZOOM and only its scale changes (PageView).
  const [live, setLive] = useState<{ k: number; tx: number; ty: number } | null>(null);
  // The Whole page pill's spot in the area, so the editing pill never sits under it.
  const [fitPill, setFitPill] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
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
  const fit = fitRect(shown, { width: area.width, height: area.height });
  const frame = zoomedFrame(fit, area, zoom.z, zoom.origin);
  const fitPage = () => setZoom({ z: 1, origin: { x: 0, y: 0 } });
  const onPage = placements.filter((p) => p.page === page);
  const sel = placements.find((p) => p.id === selected) ?? null;

  const update = (id: string, fn: (p: Placement) => Placement) => setPlacements((all) => all.map((p) => (p.id === id ? fn(p) : p)));

  /** A resize finished: the next stamp of this kind starts at this width. */
  const remember = (p: Placement) => {
    const next = rememberWidth(prefs.lastWidth, p.kind, p.width, displaySize(doc.pages[p.page]).width);
    if (next !== prefs.lastWidth) setPrefs({ lastWidth: next });
  };

  /** Smaller or bigger by one step (the pill's buttons and VoiceOver's actions). */
  const step = (p: Placement, k: number) => {
    const next = clampBox(scaleBox(p, k), shown);
    update(p.id, () => next);
    remember(next);
  };

  const place = (kind: Placement['kind'], opts: { sig?: Signature; text?: string }) => {
    const mark = kind === 'initials' ? opts.sig?.initials : opts.sig?.main;
    const aspect = mark ? aspectOf(mark) : kind === 'date' ? 5 : 7;
    // In the middle of what is on screen; one that would land on another goes a little lower.
    const b = nudge(placeInView(shown, visiblePart(frame, area, shown), aspect, kind, prefs.lastWidth[kind]), onPage, shown);
    const p: Placement = { id: pid(), page, kind, ...b, signatureId: opts.sig?.id, text: opts.text };
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
    else place('text', { text: prefs.typedName || t.sign.yourName });
  };

  // ---------- touch: one responder over the page ----------
  // One finger on a placement moves it (its corner handle resizes it). One finger on
  // the paper drags the view around when zoomed in. Two fingers zoom the page about
  // the point between them. A double tap on the paper zooms in there, or back out.
  interface Pinch {
    d0: number;
    /** The point between the fingers at the start, in the frame's own points. */
    fx: number;
    fy: number;
    mx0: number;
    my0: number;
    mx: number;
    my: number;
    /** The live transform as shown (already kept on the area). */
    k: number;
    tx: number;
    ty: number;
  }
  const g = useRef<{ id: string | null; mode: 'move' | 'resize' | 'none'; start: Placement | null; last: Placement | null; x0: number; y0: number; moved: boolean; pinch: Pinch | null; pan: { x: number; y: number } | null; tapped: boolean }>({
    id: null,
    mode: 'none',
    start: null,
    last: null,
    x0: 0,
    y0: 0,
    moved: false,
    pinch: null,
    pan: null,
    tapped: false,
  });
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const placementsRef = useRef(placements);
  placementsRef.current = placements;
  const selRef = useRef(selected);
  selRef.current = selected;

  const startPinch = (e: GestureResponderEvent) => {
    const t = e.nativeEvent.touches;
    const mx0 = (t[0].pageX + t[1].pageX) / 2;
    const my0 = (t[0].pageY + t[1].pageY) / 2;
    g.current.pinch = { d0: Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY) || 1, fx: (t[0].locationX + t[1].locationX) / 2, fy: (t[0].locationY + t[1].locationY) / 2, mx0, my0, mx: mx0, my: my0, k: 1, tx: 0, ty: 0 };
    g.current.id = null;
    g.current.mode = 'none';
    g.current.pan = null;
  };

  /** Two fingers lifted: settle the zoom exactly where the live transform shows the page, so nothing moves. */
  const commitPinch = () => {
    const p = g.current.pinch;
    if (!p) return;
    g.current.pinch = null;
    const next = liveToFrame(frame, fit, area, p.k, p.tx, p.ty);
    setZoom({ z: next.zoom, origin: { x: next.x, y: next.y } });
    setLive(null);
  };

  const grant = (e: GestureResponderEvent) => {
    const n = e.nativeEvent;
    g.current = { id: null, mode: 'none', start: null, last: null, x0: n.pageX, y0: n.pageY, moved: false, pinch: null, pan: null, tapped: false };
    if (n.touches.length >= 2) return startPinch(e);
    const pt = viewToDisplay({ x: 0, y: 0, scale: frame.scale }, n.locationX, n.locationY);
    const hit = hitTest(placementsRef.current, page, pt.x, pt.y, { selectedId: selRef.current, handle: 22 / frame.scale, slop: 8 / frame.scale });
    if (hit) {
      lastTap.current = null;
      const cur = placementsRef.current.find((p) => p.id === hit.id)!;
      g.current.id = cur.id;
      g.current.mode = hit.mode;
      g.current.start = cur;
      setSelected(hit.id);
      setPlacements((all) => toFront(all, hit.id));
      return;
    }
    // On the paper: a second tap within a moment zooms in here, or back out to the whole page.
    const now = Date.now();
    const last = lastTap.current;
    if (last && now - last.t < 320 && Math.hypot(n.pageX - last.x, n.pageY - last.y) < 24) {
      lastTap.current = null;
      const focal = { x: frame.x + n.locationX, y: frame.y + n.locationY };
      const next = zoomAround(frame, fit, area, frame.zoom > 1 ? 1 : TAP_ZOOM, focal);
      setZoom({ z: next.zoom, origin: { x: next.x, y: next.y } });
      tick();
      g.current.tapped = true;
      return;
    }
    lastTap.current = { t: now, x: n.pageX, y: n.pageY };
    if (frame.zoom > 1) g.current.pan = { x: frame.x, y: frame.y };
  };

  const move = (e: GestureResponderEvent) => {
    const s = g.current;
    const t = e.nativeEvent.touches;
    if (t.length >= 2) {
      if (!s.pinch) startPinch(e);
      const p = s.pinch!;
      const d = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
      p.mx = (t[0].pageX + t[1].pageX) / 2;
      p.my = (t[0].pageY + t[1].pageY) / 2;
      p.k = Math.min(MAX_ZOOM, Math.max(1, frame.zoom * (d / p.d0))) / frame.zoom;
      // About the point between the fingers, following them, and never off the area's edge.
      const c = clampLive(frame, fit, area, p.k, (p.fx - frame.width / 2) * (1 - p.k) + (p.mx - p.mx0), (p.fy - frame.height / 2) * (1 - p.k) + (p.my - p.my0));
      p.tx = c.tx;
      p.ty = c.ty;
      setLive({ k: p.k, tx: c.tx, ty: c.ty });
      s.moved = true;
      return;
    }
    if (s.pinch) {
      // One finger lifted after a pinch: settle the zoom and let the rest of this touch go.
      commitPinch();
      s.moved = true;
      return;
    }
    const dxView = e.nativeEvent.pageX - s.x0;
    const dyView = e.nativeEvent.pageY - s.y0;
    if (s.pan) {
      if (Math.abs(dxView) + Math.abs(dyView) > 1) s.moved = true;
      // Kept on the area as it goes, so dragging back responds at once.
      const at = zoomedFrame(fit, area, frame.zoom, { x: s.pan.x + dxView, y: s.pan.y + dyView });
      setZoom((zm) => ({ ...zm, origin: { x: at.x, y: at.y } }));
      return;
    }
    if (!s.id || !s.start || s.mode === 'none') return;
    const dx = dxView / frame.scale;
    const dy = dyView / frame.scale;
    if (Math.abs(dx) + Math.abs(dy) > 1) s.moved = true;
    const st = s.start;
    const next = clampBox(s.mode === 'resize' ? resizeBox(st, dx, dy) : { ...st, x: st.x + dx, y: st.y + dy }, shown);
    s.last = next;
    update(s.id, () => next);
  };

  const release = () => {
    const s = g.current;
    if (s.pinch) commitPinch();
    else if (s.mode === 'none' && !s.moved && !s.tapped) setSelected(null);
    else if (s.moved && s.id) {
      placeHaptic();
      if (s.mode === 'resize' && s.last) remember(s.last);
    }
    g.current = { ...s, id: null, mode: 'none', start: null, last: null, pinch: null, pan: null };
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
      Alert.alert(t.common.didNotSave, e?.message ?? t.common.tryAgain);
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
    Alert.alert(t.sign.leaveTitle, t.sign.leaveBody, [
      { text: t.sign.keepSigning, style: 'cancel' },
      { text: t.sign.leave, style: 'destructive', onPress: onClose },
    ]);
  };

  if (result) {
    // The page that was signed, as it was flattened: the first page with a placement.
    const shownPage = Math.min(...placements.map((p) => p.page));
    return <Signed theme={theme} result={result} first={usage.documents === 1} onClose={onClose} say={say} preview={{ doc, page: shownPage, placements: placements.filter((p) => p.page === shownPage), library }} />;
  }

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
            <Text style={[type.small, { color: theme.inkSoft, marginRight: space.s }]} accessibilityLabel={t.common.pageOf(page + 1, doc.pages.length)}>
              {t.sign.pageCount(page + 1, doc.pages.length)}
            </Text>
          ) : null
        }
      />
      <View style={styles.area} onLayout={(e) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        {frame.width > 0 ? (
          <View style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.width, height: frame.height, transform: live ? [{ translateX: live.tx }, { translateY: live.ty }, { scale: live.k }] : undefined }}>
            <View style={[styles.sheet, { borderColor: theme.edge }]}>
              <PageView doc={doc} page={page} width={fit.width} height={fit.height} zoom={frame.zoom} renderZoom={RENDER_ZOOM} />
            </View>
            {onPage.map((p) => (
              <Placed key={p.id} theme={theme} p={p} scale={scale} selected={p.id === selected} library={library} onAction={(a) => {
                if (a === 'delete') setPlacements((all) => all.filter((x) => x.id !== p.id));
                else step(p, a === 'bigger' ? 1.15 : 1 / 1.15);
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
        {frame.zoom > 1 && !live ? (
          <Tap onPress={() => { tick(); fitPage(); }} onLayout={(e) => setFitPill(e.nativeEvent.layout)} style={[styles.fitBtn, { backgroundColor: theme.surface, borderColor: theme.edge }]} accessibilityRole="button" accessibilityLabel={t.sign.wholePageA11y} accessibilityHint={t.sign.wholePageHint}>
            <Text style={[type.small, { color: theme.ink }]} maxFontSizeMultiplier={1.3}>
              {t.sign.wholePage}
            </Text>
          </Tap>
        ) : null}
        {sel && sel.page === page && !live ? <EditPill theme={theme} p={sel} frame={frame} area={area} avoid={frame.zoom > 1 ? fitPill : null} onStep={(k) => { tick(); step(sel, k); }} onRemove={() => {
          setPlacements((all) => all.filter((x) => x.id !== sel.id));
          setSelected(null);
        }} /> : null}
      </View>

      <View style={[styles.bottom, { borderTopColor: theme.edge, paddingBottom: Math.max(insets.bottom, space.m) }]}>
        {sel && (sel.kind === 'date' || sel.kind === 'text') ? (
          <Field theme={theme} value={sel.text ?? ''} onChangeText={(v) => update(sel.id, (x) => ({ ...x, text: v }))} placeholder={sel.kind === 'date' ? t.sign.dateField : t.sign.textField} accessibilityLabel={sel.kind === 'date' ? t.sign.dateA11y : t.sign.textA11y} returnKeyType="done" />
        ) : null}
        <View style={styles.tools}>
          <Tool theme={theme} glyph="create" label={t.sign.addSignature} short={t.sign.toolSignature} onPress={() => addStamp('signature')} />
          <Tool theme={theme} glyph="initials" label={t.sign.addInitials} short={t.sign.toolInitials} locked={!canUseStamp('initials', isPro)} onPress={() => addStamp('initials')} />
          <Tool theme={theme} glyph="date" label={t.sign.addDate} short={t.sign.toolDate} locked={!canUseStamp('date', isPro)} onPress={() => addStamp('date')} />
          <Tool theme={theme} glyph="text" label={t.sign.addText} short={t.sign.toolText} locked={!canUseStamp('text', isPro)} onPress={() => addStamp('text')} />
        </View>
        <View style={styles.doneRow}>
          {doc.pages.length > 1 ? (
            <View style={styles.pager}>
              <GlyphButton theme={theme} glyph="back" label={t.sign.previousPage} onPress={() => { tick(); setSelected(null); fitPage(); setPage(Math.max(0, page - 1)); }} disabled={page === 0} filled />
              <GlyphButton theme={theme} glyph="chevron" label={t.sign.nextPage} onPress={() => { tick(); setSelected(null); fitPage(); setPage(Math.min(doc.pages.length - 1, page + 1)); }} disabled={page === doc.pages.length - 1} filled />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <InkButton theme={theme} label={t.sign.doneSigning} onPress={done} disabled={placements.length === 0} busy={busy} hint={placements.length === 0 ? t.sign.addFirst : t.sign.doneHint} />
          </View>
        </View>
      </View>

      <Drawer theme={theme} visible={picker != null} onClose={() => setPicker(null)} title={picker === 'initials' ? t.sign.addInitials : t.sign.addSignature}>
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
                  accessibilityLabel={s.isDefault ? t.sign.pickDefault(s.name) : s.name}
                >
                  <View style={[styles.pickPaper, { backgroundColor: theme.paper }]}>
                    <MarkView mark={picker === 'initials' && s.initials ? s.initials : s.main} height={40} maxWidth={150} />
                  </View>
                  <Text style={[type.body, { color: theme.ink, flex: 1 }]} numberOfLines={1}>
                    {s.name}
                  </Text>
                  {s.isDefault ? <Caption theme={theme}>{t.common.default}</Caption> : null}
                </Tap>
              ))}
          </Panel>
          <QuietButton theme={theme} glyph="plus" label={picker === 'initials' ? t.sign.makeInitials : t.sign.newSignature} onPress={() => {
            const k = picker;
            setPicker(null);
            setTimeout(() => setCreating(k === 'initials' ? { initialsFor: defaultSignature(library)! } : {}), 400);
          }} />
        </ScrollView>
      </Drawer>

      <Drawer theme={theme} visible={askFormat} onClose={() => setAskFormat(false)} title={t.sign.saveAs}>
        <Panel theme={theme} style={{ marginBottom: space.l }}>
          <Row theme={theme} first glyph="documents" label="PDF" sub={t.sign.pdfSub} onPress={() => finish('pdf')} />
          <Row theme={theme} glyph="photo" label="JPG" sub={t.sign.jpgSub} onPress={() => finish('jpg')} />
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

// Three 44 pt buttons, the gaps and padding, and the 1 pt edge on each side.
const PILL = { width: 3 * 44 + 2 * space.xs + 2 * space.xs + 2, height: 44 + 2 * space.xs + 2 };

/**
 * Smaller, bigger and remove for the selected placement, in a small pill
 * just above it (below it near the top, never under the Whole page pill),
 * so the bottom bar keeps room for a full Done signing.
 */
function EditPill({ theme, p, frame, area, avoid, onStep, onRemove }: { theme: Theme; p: Placement; frame: { x: number; y: number; scale: number }; area: { width: number; height: number }; avoid: { x: number; y: number; width: number; height: number } | null; onStep: (k: number) => void; onRemove: () => void }) {
  const box = { x: frame.x + p.x * frame.scale, y: frame.y + p.y * frame.scale, width: p.width * frame.scale, height: p.height * frame.scale };
  const at = pillSpot(box, area, PILL, avoid, space.s);
  if (!at) return null;
  return (
    <View style={[styles.editPill, { left: at.x, top: at.y, width: PILL.width, height: PILL.height, backgroundColor: theme.surface, borderColor: theme.edge }]}>
      <GlyphButton theme={theme} glyph="minus" label={t.sign.smaller[p.kind]} onPress={() => onStep(1 / 1.15)} />
      <GlyphButton theme={theme} glyph="plus" label={t.sign.bigger[p.kind]} onPress={() => onStep(1.15)} />
      <GlyphButton theme={theme} glyph="trash" label={t.sign.removeSelected[p.kind]} onPress={onRemove} />
    </View>
  );
}

/** One of the four tools under the page: a glyph over a short word; VoiceOver reads the full action. */
function Tool({ theme, glyph, label, short, onPress, locked = false }: { theme: Theme; glyph: GlyphName; label: string; short: string; onPress: () => void; locked?: boolean }) {
  return (
    <Tap
      onPress={onPress}
      style={[styles.tool, { backgroundColor: theme.surface, borderColor: theme.edge }]}
      pressedStyle={{ backgroundColor: theme.raised }}
      accessibilityRole="button"
      accessibilityLabel={locked ? t.common.withPro(label) : label}
    >
      <Glyph name={glyph} size={22} color={theme.ink} />
      <View style={styles.toolLabel}>
        <Text style={[type.small, { color: theme.ink }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {short}
        </Text>
        {locked ? <Glyph name="lock" size={12} color={theme.inkFaint} /> : null}
      </View>
    </Tap>
  );
}

/** A placement on the page. Selected: an ink outline and a round corner handle. VoiceOver can resize or remove it. */
function Placed({ theme, p, scale, selected, library, onAction }: { theme: Theme; p: Placement; scale: number; selected: boolean; library: Signature[]; onAction: (a: 'bigger' | 'smaller' | 'delete') => void }) {
  const sig = library.find((s) => s.id === p.signatureId);
  const mark = p.kind === 'initials' ? sig?.initials : p.kind === 'signature' ? sig?.main : undefined;
  const w = p.width * scale;
  const h = p.height * scale;
  const label = p.kind === 'signature' ? t.sign.placedSignature : p.kind === 'initials' ? t.sign.placedInitials : p.kind === 'date' ? t.sign.placedDate(p.text ?? '') : t.sign.placedText(p.text ?? '');
  return (
    <View
      style={{ position: 'absolute', left: p.x * scale, top: p.y * scale, width: w, height: h }}
      accessible
      accessibilityLabel={label}
      accessibilityHint={t.sign.placedHint}
      accessibilityActions={[{ name: 'bigger', label: t.sign.actBigger }, { name: 'smaller', label: t.sign.actSmaller }, { name: 'delete', label: t.common.remove }]}
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
function Signed({
  theme,
  result,
  first,
  onClose,
  say,
  preview,
}: {
  theme: Theme;
  result: Finished;
  first: boolean;
  onClose: () => void;
  say: (t: string) => void;
  preview: { doc: OpenDoc; page: number; placements: Placement[]; library: Signature[] };
}) {
  const box = displaySize(preview.doc.pages[preview.page]);
  const frame = fitRect(box, { width: 230, height: 300 });
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
      Alert.alert(t.common.sharingDidNotOpen, e?.message ?? t.common.tryAgain);
    }
  };
  const sendMail = async () => {
    try {
      const r = await MailComposer.composeAsync({ subject: result.doc.name.replace(/\.(pdf|jpg)$/i, ''), attachments: [result.uri] });
      if (r.status === 'sent') say(t.signed.sent);
      afterShare();
    } catch (e: any) {
      Alert.alert(t.common.mailDidNotOpen, e?.message ?? t.common.tryAgain);
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <TopBar theme={theme} onBack={onClose} closeGlyph="close" />
      <View style={styles.signed}>
        <View style={[styles.thumb, { width: frame.width, height: frame.height, borderColor: theme.edge }]} accessible accessibilityRole="image" accessibilityLabel={t.signed.thumb(preview.page + 1, result.doc.name)}>
          <PageView doc={preview.doc} page={preview.page} width={frame.width} height={frame.height} />
          {preview.placements.map((p) => (
            <Placed key={p.id} theme={theme} p={p} scale={frame.scale} selected={false} library={preview.library} onAction={() => {}} />
          ))}
        </View>
        <Text style={[type.title, { color: theme.ink, textAlign: 'center' }]} accessibilityRole="header">
          {t.signed.title}
        </Text>
        <Text style={[type.body, { color: theme.inkSoft, textAlign: 'center' }]}>
          {t.signed.body(result.doc.name)}
        </Text>
      </View>
      <View style={styles.signedActions}>
        {mail ? <QuietButton theme={theme} glyph="share" label={t.signed.sendMail} onPress={sendMail} /> : null}
        <QuietButton theme={theme} glyph="file" label={t.signed.saveFiles} onPress={share} hint={t.signed.saveFilesHint} />
        <InkButton theme={theme} glyph="share" label={t.signed.sendBack} onPress={share} hint={t.common.shareApps} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, marginHorizontal: space.l, marginVertical: space.s, overflow: 'hidden' },
  fitBtn: { position: 'absolute', top: space.s, right: space.s, paddingHorizontal: space.m, paddingVertical: space.xs + 2, borderRadius: radius.round, borderWidth: 1 },
  sheet: { borderWidth: 1, borderRadius: 2, overflow: 'hidden' },
  bottom: { borderTopWidth: 1, paddingTop: space.m, paddingHorizontal: space.l, gap: space.m },
  tools: { flexDirection: 'row', gap: space.s },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  pager: { flexDirection: 'row', gap: space.s },
  editPill: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, borderRadius: radius.small, borderWidth: 1 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m },
  pickPaper: { width: 170, height: 56, borderRadius: radius.small, alignItems: 'center', justifyContent: 'center' },
  selFrame: { borderWidth: 1.5, borderRadius: 4, margin: -4 },
  handle: { position: 'absolute', right: -11, bottom: -11, width: 22, height: 22, borderRadius: radius.round, borderWidth: 2 },
  signed: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl, gap: space.m },
  thumb: { borderWidth: 1, borderRadius: 2, overflow: 'hidden', marginBottom: space.l },
  tool: { flex: 1, minHeight: 56, borderRadius: radius.small, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: space.xs },
  toolLabel: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  signedActions: { paddingHorizontal: space.l, paddingBottom: space.l, gap: space.s },
});
