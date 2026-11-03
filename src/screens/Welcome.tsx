import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, radius, space, type, Theme } from '../theme';
import { useApp } from '../state';
import { getOffering } from '../purchases';
import { getTrialEligibleIds, trialLabel } from '../trial';
import { requestReminderPermission } from '../reminder';
import { trialLength } from '../offer';
import type { Need } from '../rules';
import Glyph from '../ui/Glyph';
import { InkButton, Panel, Tap } from '../ui/Kit';

/**
 * First launch, in this order (App.tsx runs it):
 *   1-3. three value screens, written for the outcome
 *   4.   "What do you need today?" (only picks the first screen after this)
 *   a.   TrialSteps "Try it free"                      } only when RevenueCat says this
 *   b.   TrialSteps "We'll remind you the day before"  } Apple ID can get the free trial
 *   then the onboarding paywall (close button after 3 seconds).
 * No name or email is asked. Full-bleed type, no illustrations.
 */
const PAGES = [
  { title: 'Draw a signature that looks like yours.', line: 'Smooth ink that thickens and thins like a real pen, with a finger or Apple Pencil. Or type it in a script you like.' },
  { title: 'Export it as a transparent PNG.', line: 'Only the ink, no background, ready for an email footer, Word, Canva or a form.' },
  { title: 'Sign any PDF on your phone.', line: 'Open it from Mail or Files, place your signature, send it back. Nothing is uploaded.' },
];

interface TrialOffer {
  length: string;
  then: string;
}

let offerPromise: Promise<TrialOffer | null> | null = null;

async function loadTrialOffer(): Promise<TrialOffer | null> {
  const off = await getOffering();
  const pkg = off?.weekly;
  if (!pkg) return null;
  if (!trialLabel(pkg, await getTrialEligibleIds([pkg]))) return null;
  const length = trialLength(pkg.product.introPrice);
  if (!length) return null;
  return { length, then: `${pkg.product.priceString} a week` };
}

/** Starts the eligibility check early; it is ready long before the trial screen. */
function trialOffer(): Promise<TrialOffer | null> {
  if (!offerPromise) offerPromise = loadTrialOffer().catch(() => null);
  return offerPromise;
}

export default function Welcome({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  useEffect(() => {
    trialOffer();
  }, []);
  const next = () => (step < PAGES.length - 1 ? setStep(step + 1) : onDone());
  return <Page theme={theme} title={PAGES[step].title} line={PAGES[step].line} dots={{ count: PAGES.length, active: step }} button="Continue" onPress={next} />;
}

const NEEDS: { id: Need; label: string; sub: string }[] = [
  { id: 'document', label: 'Sign a document', sub: 'A PDF or a photo of a form' },
  { id: 'image', label: 'Make a signature image', sub: 'A transparent PNG for email, Word or Canva' },
  { id: 'both', label: 'Both', sub: 'Start by making the signature' },
];

/** "What do you need today?" Only sets which screen comes first. */
export function NeedStep({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { setPrefs } = useApp();
  const [picked, setPicked] = useState<Need>('document');
  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, space.l) }]}>
      <View style={styles.listPage}>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          What do you need today?
        </Text>
        <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>You can do both any time. This only picks where you start.</Text>
        <Panel theme={theme} style={{ marginTop: space.xl }}>
          {NEEDS.map((n, i) => {
            const on = picked === n.id;
            return (
              <Tap
                key={n.id}
                onPress={() => setPicked(n.id)}
                style={[styles.need, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }, on && { backgroundColor: theme.picked }]}
                pressedStyle={{ backgroundColor: theme.raised }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${n.label}. ${n.sub}`}
              >
                <View style={[styles.radio, { borderColor: on ? theme.ink : theme.inkFaint }]}>{on ? <View style={[styles.radioDot, { backgroundColor: theme.ink }]} /> : null}</View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { color: theme.ink }]}>{n.label}</Text>
                  <Text style={[type.small, { color: theme.inkSoft }]}>{n.sub}</Text>
                </View>
              </Tap>
            );
          })}
        </Panel>
      </View>
      <View style={styles.footer}>
        <InkButton
          theme={theme}
          label="Continue"
          onPress={() => {
            setPrefs({ need: picked });
            onDone();
          }}
        />
      </View>
    </View>
  );
}

/** The trial and reminder screens. Calls onDone right away when no trial is on offer. */
export function TrialSteps({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [offer, setOffer] = useState<TrialOffer | null | undefined>(undefined);
  const [step, setStep] = useState<'trial' | 'remind'>('trial');
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let live = true;
    trialOffer().then((o) => {
      if (!live) return;
      if (o) setOffer(o);
      else onDone();
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!offer) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.inkSoft} />
      </View>
    );
  }

  if (step === 'trial') {
    return <Page theme={theme} title={`Try it free for ${offer.length}.`} line={`Then ${offer.then}. Cancel in Settings any time before it ends.`} button="Try it free" onPress={() => setStep('remind')} noPayment />;
  }

  return (
    <Page
      theme={theme}
      title="We’ll remind you the day before it ends."
      line="One notification, on this phone. Nothing else, ever."
      button="Continue"
      waiting={waiting}
      onPress={async () => {
        setWaiting(true);
        await requestReminderPermission();
        setWaiting(false);
        onDone();
      }}
    />
  );
}

/** One idea per screen: one large line, one line under it, the dots and the button. */
function Page({
  theme,
  title,
  line,
  dots,
  button,
  onPress,
  waiting = false,
  noPayment = false,
}: {
  theme: Theme;
  title: string;
  line?: string;
  dots?: { count: number; active: number };
  button: string;
  onPress: () => void;
  waiting?: boolean;
  noPayment?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, space.l) }]}>
      <View style={styles.words}>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          {title}
        </Text>
        {line ? <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>{line}</Text> : null}
      </View>
      {dots && (
        <View style={styles.dots} accessible accessibilityLabel={`Page ${dots.active + 1} of ${dots.count}`}>
          {Array.from({ length: dots.count }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === dots.active ? theme.ink : theme.rule }, i === dots.active && styles.dotOn]} />
          ))}
        </View>
      )}
      <View style={styles.footer}>
        {waiting ? <ActivityIndicator color={theme.inkSoft} style={styles.waiting} /> : <InkButton theme={theme} label={button} onPress={onPress} />}
        {noPayment && (
          <View style={styles.noPaymentRow}>
            <Glyph name="check" size={18} color={theme.ink} weight={2.2} />
            <Text style={[type.strong, { color: theme.ink }]}>No payment now</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  words: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  listPage: { flex: 1, paddingTop: space.xxl, paddingHorizontal: space.l },
  line: { marginTop: space.m },
  need: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 68, paddingHorizontal: space.l, paddingVertical: space.m },
  radio: { width: 24, height: 24, borderRadius: radius.round, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: radius.round },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.s, marginBottom: space.l },
  dot: { width: space.s, height: space.s, borderRadius: radius.round },
  dotOn: { width: space.xl },
  footer: { paddingHorizontal: space.l, gap: space.m, paddingTop: space.m },
  waiting: { height: 64 },
  noPaymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
});
