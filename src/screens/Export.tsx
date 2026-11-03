import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme, fonts, radius, space, type, Theme } from '../theme';
import { useApp } from '../state';
import { afterPaywall, exportDecision, previewShowsMark } from '../gates';
import { aspectOf, inkHex, Mark, Signature } from '../library';
import { pixelSize } from '../stroke';
import { Background, Format, renderArt, Rendered } from '../render';
import { copyImage, exportFileName, saveToPhotos, shareData } from '../exporting';
import { maybeRequestReview } from '../reviews';
import Checker from '../ui/Checker';
import { Caption, InkButton, Label, Pill, QuietButton, TopBar } from '../ui/Kit';
import { savedHaptic } from '../ui/motion';

type Choice = 'transparent' | 'white-png' | 'white-jpg';

const CHOICES: { id: Choice; label: string; background: Background; format: Format }[] = [
  { id: 'transparent', label: 'Transparent PNG', background: 'transparent', format: 'png' },
  { id: 'white-png', label: 'PNG on white', background: 'white', format: 'png' },
  { id: 'white-jpg', label: 'JPG on white', background: 'white', format: 'jpg' },
];

/**
 * Export a saved signature (or its initials): the real file is rendered
 * as you choose, shown on a checkerboard (so a transparent one visibly is)
 * or signed at the foot of a mock letter, then shared, saved to Photos or
 * copied. The first export is free and clean; later free ones open the
 * paywall first and carry the small corner mark if it is closed.
 */
export default function Export({ sig, onBack }: { sig: Signature; onBack: () => void }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { isPro, usage, askPro, countUsage, say } = useApp();
  const [which, setWhich] = useState<'main' | 'initials'>('main');
  const [choice, setChoice] = useState<Choice>('transparent');
  const [scale, setScale] = useState<2 | 3>(3);
  const [view, setView] = useState<'checker' | 'letter'>('checker');
  const [preview, setPreview] = useState<Rendered | null>(null);
  const [busy, setBusy] = useState(false);

  const mark: Mark = which === 'initials' && sig.initials ? sig.initials : sig.main;
  const opt = CHOICES.find((c) => c.id === choice)!;
  const showMark = previewShowsMark(isPro, usage);
  const boxW = width - space.l * 2;

  // The preview is the real file at 2x, so what you see is what you get.
  useEffect(() => {
    let live = true;
    renderArt(mark.art, inkHex(sig.ink), { scale: 2, background: opt.background, format: opt.format, watermark: showMark })
      .then((r) => live && setPreview(r))
      .catch(() => live && setPreview(null));
    return () => {
      live = false;
    };
  }, [mark, sig.ink, opt.background, opt.format, showMark]);

  const px = pixelSize(mark.crop, scale);

  /** Gate, render the file, and hand it to `use`. */
  const run = async (use: (r: Rendered, name: string) => Promise<string | null>) => {
    if (busy) return;
    const first = usage.exports === 0;
    let d = exportDecision(isPro, usage);
    if (d.paywall) d = afterPaywall(d, await askPro('export'));
    setBusy(true);
    try {
      const r = await renderArt(mark.art, inkHex(sig.ink), { scale, background: opt.background, format: opt.format, watermark: d.watermark });
      if (!r) throw new Error('There is nothing to export.');
      const name = exportFileName(`${sig.name}${which === 'initials' ? ' initials' : ''}`, opt.format);
      const done = await use(r, name);
      if (done) {
        countUsage('exports');
        savedHaptic();
        say(done);
        if (first) maybeRequestReview('firstExport');
      }
    } catch (e: any) {
      Alert.alert('That did not work', e?.message ?? 'Try once more.');
    } finally {
      setBusy(false);
    }
  };

  const doneLine = choice === 'transparent' ? 'Saved. It has a transparent background.' : 'Saved.';

  const onShare = () =>
    run(async (r, name) => {
      await shareData(name, r.base64, opt.format);
      return doneLine;
    });
  const onPhotos = () =>
    run(async (r, name) => {
      const ok = await saveToPhotos(name, r.base64);
      if (!ok) {
        Alert.alert('Photos is off for Signature Maker', 'Allow adding photos in Settings, Signature Maker, Photos. The app only adds images; it never reads your library.');
        return null;
      }
      return choice === 'transparent' ? 'Saved to Photos. It has a transparent background.' : 'Saved to Photos.';
    });
  const onCopy = () =>
    run(async (r) => {
      await copyImage(r.base64);
      return 'Copied. Paste it into Mail, Notes or a document.';
    });

  return (
    <View style={{ flex: 1 }}>
      <TopBar theme={theme} title={sig.name} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.pills}>
          <Pill theme={theme} label="Checkerboard" on={view === 'checker'} onPress={() => setView('checker')} />
          <Pill theme={theme} label="On a letter" on={view === 'letter'} onPress={() => setView('letter')} />
          {sig.initials ? (
            <>
              <View style={{ flex: 1 }} />
              <Pill theme={theme} label={which === 'main' ? 'Signature' : 'Initials'} on={false} glyph="initials" onPress={() => setWhich(which === 'main' ? 'initials' : 'main')} />
            </>
          ) : null}
        </View>

        {view === 'checker' ? (
          <Checker a={opt.background === 'white' ? '#FFFFFF' : theme.checkA} b={opt.background === 'white' ? '#FFFFFF' : theme.checkB} style={[styles.stage, { width: boxW, borderColor: theme.edge }]}>
            <Shown preview={preview} boxW={boxW - space.xl * 2} boxH={170} aspect={aspectOf(mark)} label={`${sig.name}, ${opt.label}`} />
          </Checker>
        ) : (
          <Letter theme={theme} preview={preview} width={boxW} aspect={aspectOf(mark)} name={sig.name.split(',')[0]} />
        )}
        <Caption theme={theme}>
          {view === 'checker' && choice === 'transparent' ? 'The gray squares show where it is clear. On a page or in an email, only the ink shows.' : 'This is the file as it will be saved.'}
          {showMark ? ' This export carries a small “Made with Signature Maker” mark. Pro removes it.' : ''}
        </Caption>

        <View>
          <Label theme={theme}>Format</Label>
          <View style={styles.wrap}>
            {CHOICES.map((c) => (
              <Pill key={c.id} theme={theme} label={c.label} on={choice === c.id} onPress={() => setChoice(c.id)} />
            ))}
          </View>
        </View>
        <View>
          <Label theme={theme}>Size</Label>
          <View style={styles.wrap}>
            <Pill theme={theme} label="2x" on={scale === 2} onPress={() => setScale(2)} />
            <Pill theme={theme} label="3x" on={scale === 3} onPress={() => setScale(3)} />
            <Text style={[type.small, styles.px, { color: theme.inkSoft }]}>
              {px.width} × {px.height} px
            </Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.row}>
          <QuietButton theme={theme} glyph="photo" label="Save to Photos" onPress={onPhotos} grow disabled={busy} />
          <QuietButton theme={theme} glyph="copy" label="Copy" onPress={onCopy} grow disabled={busy} />
        </View>
        <InkButton theme={theme} glyph="share" label={`Share ${opt.label}`} onPress={onShare} busy={busy} hint="Mail, Messages, Files and other apps" />
      </View>
    </View>
  );
}

function Shown({ preview, boxW, boxH, aspect, label }: { preview: Rendered | null; boxW: number; boxH: number; aspect: number; label: string }) {
  const a = preview ? preview.width / preview.height : aspect;
  let w = boxW;
  let h = w / a;
  if (h > boxH) {
    h = boxH;
    w = h * a;
  }
  return (
    <View style={{ width: w, height: h }} accessible accessibilityRole="image" accessibilityLabel={label}>
      {preview ? <Image source={{ uri: `data:image/${preview.base64.startsWith('/9j') ? 'jpeg' : 'png'};base64,${preview.base64}` }} style={{ width: w, height: h }} resizeMode="contain" /> : null}
    </View>
  );
}

/** A mock letter, so the signature is seen at the size and place it will live. */
function Letter({ theme, preview, width, aspect, name }: { theme: Theme; preview: Rendered | null; width: number; aspect: number; name: string }) {
  const text = { fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, color: theme.paperInk };
  return (
    <View style={[styles.letter, { width, backgroundColor: theme.paper, borderColor: theme.edge }]} accessible accessibilityLabel="The signature at the foot of a sample letter">
      <Text style={text}>Dear Ms. Alvarez,</Text>
      <Text style={[text, { marginTop: space.s }]}>Thank you for the offer. I have read the terms and I am glad to accept. The signed copy is attached.</Text>
      <Text style={[text, { marginTop: space.m }]}>Sincerely,</Text>
      <View style={{ height: 64, justifyContent: 'center' }}>
        <Shown preview={preview} boxW={width * 0.5} boxH={58} aspect={aspect} label="" />
      </View>
      <Text style={text}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.l, paddingBottom: space.xl, gap: space.l },
  pills: { flexDirection: 'row', gap: space.s, alignItems: 'center' },
  stage: { height: 210, borderRadius: radius.large, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  letter: { borderRadius: radius.large, borderWidth: 1, padding: space.xl, minHeight: 210 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, alignItems: 'center' },
  px: { marginLeft: space.s },
  footer: { paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: space.m, gap: space.s },
  row: { flexDirection: 'row', gap: space.s },
});
