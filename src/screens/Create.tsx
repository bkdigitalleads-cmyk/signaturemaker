import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, radius, space, type, Theme } from '../theme';
import { useApp } from '../state';
import { canUseFont, canUsePen } from '../gates';
import { SCRIPT_FONTS, fontById, initialsOf } from '../fonts';
import { Art, inkHex, INKS, InkId, Signature } from '../library';
import { fitStrokes, hasInk, scaleStrokes, Stroke } from '../stroke';
import { saveInitials, saveNewSignature } from '../signatures';
import Pad from '../ui/Pad';
import PenRow from '../ui/PenRow';
import Glyph from '../ui/Glyph';
import { Field, GlyphButton, InkButton, Pill, Tap, Title, TopBar } from '../ui/Kit';
import { MODAL_ANIMATION, savedHaptic, tick } from '../ui/motion';

/**
 * The hero. Draw on a sheet of paper (four pens, four inks, three
 * thicknesses, undo, redo, clear, wide mode), or type a name and pick a
 * script font. One big button: Save signature. Also used to make the
 * initials of a saved signature (`initialsFor`).
 */
export default function Create({
  initialsFor,
  onSaved,
  onClose,
  startTyped = false,
}: {
  /** Make the initials of this saved signature instead of a new signature. */
  initialsFor?: Signature;
  onSaved: (sig: Signature) => void;
  onClose?: () => void;
  startTyped?: boolean;
}) {
  const theme = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const { prefs, setPrefs, isPro, askPro, library, setLibrary } = useApp();
  const initials = initialsFor != null;
  const [mode, setMode] = useState<'draw' | 'type'>(startTyped ? 'type' : 'draw');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undone, setUndone] = useState<Stroke[]>([]);
  const [wide, setWide] = useState(false);
  const [typed, setTyped] = useState(() =>
    initials ? initialsOf(initialsFor.main.art.kind === 'typed' ? initialsFor.main.art.text : prefs.typedName) : prefs.typedName
  );
  const [saving, setSaving] = useState(false);
  const ink: InkId = initials ? initialsFor.ink : prefs.ink;

  const padW = winW - space.l * 2;
  // The pad takes the room the screen has: about a third of its height, 220 to 320 points.
  const padH = initials ? 180 : Math.round(Math.min(320, Math.max(220, winH * 0.34)));

  const choosePen = async (p: typeof prefs.pen) => {
    if (canUsePen(p, isPro) || (await askPro('pen'))) setPrefs({ pen: p });
  };
  const chooseFont = async (id: string) => {
    tick();
    if (canUseFont(id, isPro) || (await askPro('font'))) setPrefs({ fontId: id });
  };

  const addStroke = (s: Stroke) => {
    setStrokes((all) => [...all, s]);
    setUndone([]);
  };
  const undo = () => {
    if (strokes.length === 0) return;
    setUndone((u) => [strokes[strokes.length - 1], ...u]);
    setStrokes(strokes.slice(0, -1));
  };
  const redo = () => {
    if (undone.length === 0) return;
    setStrokes([...strokes, undone[0]]);
    setUndone(undone.slice(1));
  };
  const clear = () => {
    if (strokes.length === 0) return;
    setUndone([]);
    setStrokes([]);
  };

  const art: Art | null =
    mode === 'draw' ? (hasInk(strokes) ? { kind: 'drawn', strokes } : null) : typed.trim() ? { kind: 'typed', text: typed.trim(), fontId: prefs.fontId } : null;

  const save = async () => {
    if (!art || saving) return;
    setSaving(true);
    try {
      if (art.kind === 'typed' && !initials) setPrefs({ typedName: art.text });
      if (initials) {
        const next = await saveInitials(library, initialsFor.id, art);
        setLibrary(next);
        savedHaptic();
        onSaved(next.find((s) => s.id === initialsFor.id)!);
      } else {
        const { list, sig } = await saveNewSignature(library, art, ink);
        setLibrary(list);
        savedHaptic();
        setStrokes([]);
        setUndone([]);
        onSaved(sig);
      }
    } catch (e: any) {
      Alert.alert('That did not save', e?.message ?? 'Try once more.');
    } finally {
      setSaving(false);
    }
  };

  const title = initials ? 'Your initials' : 'Sign here';

  return (
    <View style={{ flex: 1 }}>
      {onClose ? <TopBar theme={theme} onBack={onClose} closeGlyph="close" title={initials ? initialsFor.name : undefined} /> : null}
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: onClose ? space.s : space.l }]} keyboardShouldPersistTaps="handled" scrollEnabled={mode === 'type'}>
        <View style={styles.head}>
          <Title theme={theme}>{title}</Title>
          <View style={styles.modes}>
            <Pill theme={theme} label="Draw" on={mode === 'draw'} onPress={() => setMode('draw')} />
            <Pill theme={theme} label="Type instead" on={mode === 'type'} onPress={() => setMode('type')} />
          </View>
        </View>

        {mode === 'draw' ? (
          <>
            <Pad theme={theme} width={padW} height={padH} strokes={strokes} onStroke={addStroke} pen={prefs.pen} size={prefs.size} inkHex={inkHex(ink)} placeholder={initials ? 'Draw your initials' : undefined} />
            <View style={styles.tools}>
              <GlyphButton theme={theme} glyph="undo" label="Undo" onPress={undo} disabled={strokes.length === 0} />
              <GlyphButton theme={theme} glyph="redo" label="Redo" onPress={redo} disabled={undone.length === 0} />
              <GlyphButton theme={theme} glyph="clear" label="Clear" onPress={clear} disabled={strokes.length === 0} />
              <View style={{ flex: 1 }} />
              <Tap onPress={() => setWide(true)} style={styles.wideBtn} accessibilityRole="button" accessibilityLabel="Wide mode" accessibilityHint="Turns the pad sideways so a long signature fits">
                <Glyph name="wide" size={20} color={theme.ink} />
                <Text style={[type.small, { color: theme.ink }]}>Wide</Text>
              </Tap>
            </View>
            <PenRow
              theme={theme}
              pen={prefs.pen}
              ink={ink}
              size={prefs.size}
              onPen={choosePen}
              onInk={(i) => (initials ? null : setPrefs({ ink: i }))}
              onSize={(s) => setPrefs({ size: s })}
              locked={(p) => !canUsePen(p, isPro)}
            />
          </>
        ) : (
          <TypePanel theme={theme} text={typed} onText={setTyped} fontId={prefs.fontId} onFont={chooseFont} ink={ink} onInk={(i) => (initials ? null : setPrefs({ ink: i }))} isPro={isPro} width={padW} initials={initials} />
        )}
      </ScrollView>
      <View style={styles.footer}>
        <InkButton theme={theme} label={initials ? 'Save initials' : 'Save signature'} onPress={save} disabled={!art} busy={saving} hint={art ? undefined : mode === 'draw' ? 'Draw on the pad first' : 'Type a name first'} />
      </View>
      <WidePad
        theme={theme}
        visible={wide}
        strokes={strokes}
        normal={{ width: padW, height: padH }}
        pen={prefs.pen}
        size={prefs.size}
        ink={inkHex(ink)}
        onDone={(s) => {
          setStrokes(s);
          setUndone([]);
          setWide(false);
        }}
      />
    </View>
  );
}

/** Typing: the name, its live preview on paper, the inks, and the twelve fonts showing that name. */
function TypePanel({
  theme,
  text,
  onText,
  fontId,
  onFont,
  ink,
  onInk,
  isPro,
  width,
  initials,
}: {
  theme: Theme;
  text: string;
  onText: (t: string) => void;
  fontId: string;
  onFont: (id: string) => void;
  ink: InkId;
  onInk: (i: InkId) => void;
  isPro: boolean;
  width: number;
  initials: boolean;
}) {
  const f = fontById(fontId);
  const shown = text.trim() || (initials ? 'BWK' : 'Your name');
  return (
    <View style={{ gap: space.l }}>
      <Field theme={theme} value={text} onChangeText={onText} placeholder={initials ? 'Your initials' : 'Your name'} autoCapitalize="words" autoCorrect={false} returnKeyType="done" maxLength={60} accessibilityLabel={initials ? 'Your initials' : 'Your name'} />
      <View style={[styles.preview, { width, backgroundColor: theme.paper, borderColor: theme.edge }]} accessible accessibilityLabel={`${shown} in ${f.name}`}>
        <Text style={{ fontFamily: f.family, fontSize: 46 * f.scale, color: inkHex(ink), opacity: text.trim() ? 1 : 0.35 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4} allowFontScaling={false}>
          {shown}
        </Text>
        <View style={[styles.previewLine, { backgroundColor: theme.baseline }]} />
      </View>
      {/* Initials take their signature's ink, so the inks show only for a new signature. */}
      {initials ? null : (
      <View style={styles.inkRow} accessibilityRole="radiogroup" accessibilityLabel="Ink color">
        {INKS.map((i) => (
          <Tap
            key={i.id}
            onPress={() => onInk(i.id)}
            style={[styles.dotWrap, { borderColor: i.id === ink ? theme.ink : 'transparent' }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: i.id === ink }}
            accessibilityLabel={`${i.label} ink`}
          >
            <View style={[styles.dot, { backgroundColor: i.hex }]} />
          </Tap>
        ))}
      </View>
      )}
      <View style={[styles.fonts, { backgroundColor: theme.surface, borderColor: theme.edge }]} accessibilityRole="radiogroup" accessibilityLabel="Font">
        {SCRIPT_FONTS.map((font, i) => {
          const on = font.id === fontId;
          const locked = !canUseFont(font.id, isPro);
          return (
            <Tap
              key={font.id}
              onPress={() => onFont(font.id)}
              style={[styles.fontRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }, on && { backgroundColor: theme.picked }]}
              pressedStyle={{ backgroundColor: theme.raised }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${font.name}${locked ? ', Pro' : ''}`}
            >
              <Text style={{ flex: 1, fontFamily: font.family, fontSize: 30 * font.scale, color: theme.ink }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} allowFontScaling={false}>
                {shown}
              </Text>
              <View style={styles.fontMeta}>
                <Text style={[type.small, { color: theme.inkSoft }]} numberOfLines={1}>
                  {font.name}
                </Text>
                {locked ? <Glyph name="lock" size={14} color={theme.inkFaint} /> : on ? <Glyph name="check" size={16} color={theme.ink} weight={2} /> : null}
              </View>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Wide mode: the pad turned sideways across the whole screen, so a long
 * signature fits. Turn the phone to draw; Done brings the strokes back,
 * scaled to fit the normal pad if they need to be.
 */
function WidePad({
  theme,
  visible,
  strokes,
  normal,
  pen,
  size,
  ink,
  onDone,
}: {
  theme: Theme;
  visible: boolean;
  strokes: Stroke[];
  normal: { width: number; height: number };
  pen: Stroke['pen'];
  size: Stroke['size'];
  ink: string;
  onDone: (s: Stroke[]) => void;
}) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // The rotated frame is H wide and W tall; its left edge is the phone's top.
  const frameW = H;
  const frameH = W;
  const padW = frameW - insets.top - insets.bottom - space.l * 2;
  const padH = frameH - 52 - space.l * 2;
  const k = Math.min(padW / normal.width, padH / normal.height);
  const [local, setLocal] = useState<Stroke[]>([]);
  const [opened, setOpened] = useState(false);
  if (visible && !opened) {
    setOpened(true);
    setLocal(scaleStrokes(strokes, k));
  }
  if (!visible && opened) setOpened(false);
  const done = () => onDone(fitStrokes(scaleStrokes(local, 1 / k), normal.width, normal.height));
  const placeholder = useMemo(() => 'Turn the phone and sign along the line', []);
  return (
    <Modal visible={visible} animationType={MODAL_ANIMATION} presentationStyle="fullScreen" onRequestClose={done} supportedOrientations={['portrait']}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View
          style={{
            position: 'absolute',
            width: frameW,
            height: frameH,
            left: (W - frameW) / 2,
            top: (H - frameH) / 2,
            transform: [{ rotate: '90deg' }],
            paddingLeft: insets.top + space.l,
            paddingRight: insets.bottom + space.l,
            paddingVertical: space.l,
          }}
        >
          <View style={styles.wideBar}>
            <GlyphButton theme={theme} glyph="undo" label="Undo" onPress={() => setLocal(local.slice(0, -1))} disabled={local.length === 0} />
            <GlyphButton theme={theme} glyph="clear" label="Clear" onPress={() => setLocal([])} disabled={local.length === 0} />
            <View style={{ flex: 1 }} />
            <Tap onPress={done} style={[styles.wideDone, { backgroundColor: theme.accent }]} accessibilityRole="button" accessibilityLabel="Done">
              <Text style={[type.strong, { color: theme.onAccent }]}>Done</Text>
            </Tap>
          </View>
          <Pad theme={theme} width={padW} height={padH} strokes={local} onStroke={(s) => setLocal((l) => [...l, s])} pen={pen} size={size} inkHex={ink} placeholder={placeholder} baseline={0.68} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.l, paddingBottom: space.xl, gap: space.l },
  head: { gap: space.m },
  modes: { flexDirection: 'row', gap: space.s },
  tools: { flexDirection: 'row', alignItems: 'center', marginTop: -space.s },
  wideBtn: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, paddingHorizontal: space.s },
  footer: { paddingHorizontal: space.l, paddingBottom: space.m, paddingTop: space.s },
  preview: { height: 132, borderRadius: radius.large, borderWidth: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  previewLine: { position: 'absolute', left: space.xl, right: space.xl, bottom: 34, height: 1 },
  inkRow: { flexDirection: 'row', gap: space.xs },
  dotWrap: { width: 44, height: 44, borderRadius: radius.round, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 24, height: 24, borderRadius: radius.round, borderWidth: 1, borderColor: 'rgba(128, 124, 116, 0.35)' },
  fonts: { borderRadius: radius.large, borderWidth: 1, overflow: 'hidden' },
  fontRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: space.l, gap: space.m },
  fontMeta: { flexDirection: 'row', alignItems: 'center', gap: space.xs, maxWidth: 130 },
  wideBar: { flexDirection: 'row', alignItems: 'center', height: 52 },
  wideDone: { minHeight: 44, paddingHorizontal: space.xl, borderRadius: radius.small, alignItems: 'center', justifyContent: 'center' },
});
