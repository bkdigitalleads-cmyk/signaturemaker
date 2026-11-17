import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, radius, space, type, Theme } from '../theme';
import { useApp } from '../state';
import { getOffering } from '../purchases';
import { getTrialEligibleIds, trialLabel } from '../trial';
import { requestReminderPermission } from '../reminder';
import { trialLength } from '../offer';
import type { Need } from '../rules';
import Glyph from '../ui/Glyph';
import { InkButton, Panel, Row, Tap } from '../ui/Kit';
import { DrawShow, ExportShow, SignShow } from '../ui/Showcase';
import { t } from '../i18n';

/**
 * First launch, in this order (App.tsx runs it):
 *   1-3. three value screens, each showing the product itself (drawn by the
 *        app's own renderer): a signature drawing itself in, the same
 *        signature as a transparent PNG and on a letter, and on a lease
 *   4.   "What do you need today?" (only picks the first screen after this)
 *   5.   "Sign here": the real canvas; Continue saves it as the default (Skip is fine)
 *   a.   TrialSteps "Try it free"                      } only when RevenueCat says this
 *   b.   TrialSteps "We'll remind you the day before"  } Apple ID can get the free trial
 *   then the onboarding paywall (close button after 3 seconds).
 * No name or email is asked.
 */
/** What each value screen shows; the words are t.welcome.pages, in the same order. */
const PAGES: ('draw' | 'export' | 'sign')[] = ['draw', 'export', 'sign'];

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
  return { length, then: t.paywall.perWeek(pkg.product.priceString) };
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
  const { width } = useWindowDimensions();
  const next = () => (step < PAGES.length - 1 ? setStep(step + 1) : onDone());
  const show = PAGES[step];
  const words = t.welcome.pages[step];
  const w = width - space.l * 2;
  const visual = show === 'draw' ? <DrawShow theme={theme} width={w} /> : show === 'export' ? <ExportShow theme={theme} width={w} /> : <SignShow theme={theme} width={w} />;
  return <Page key={step} theme={theme} title={words.title} line={words.line} visual={visual} dots={{ count: PAGES.length, active: step }} button={t.common.continue} onPress={next} />;
}

const NEEDS: Need[] = ['document', 'image', 'both'];

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
          {t.welcome.needTitle}
        </Text>
        <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>{t.welcome.needLine}</Text>
        <Panel theme={theme} style={{ marginTop: space.xl }}>
          {NEEDS.map((id, i) => {
            const on = picked === id;
            const n = t.welcome.needs[id];
            return (
              <Tap
                key={id}
                onPress={() => setPicked(id)}
                style={[styles.need, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }, on && { backgroundColor: theme.picked }]}
                pressedStyle={{ backgroundColor: theme.raised }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t.welcome.needA11y(n.label, n.sub)}
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
          label={t.common.continue}
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
    return (
      <Page
        theme={theme}
        title={t.welcome.trialTitle(offer.length)}
        line={t.welcome.trialLine(offer.then)}
        button={t.welcome.tryFree}
        onPress={() => setStep('remind')}
        noPayment
        visual={
          <Panel theme={theme} style={{ alignSelf: 'stretch' }}>
            <Row theme={theme} first glyph="check" label={t.welcome.today} sub={t.welcome.todaySub} />
            <Row theme={theme} glyph="date" label={t.welcome.dayBefore} sub={t.welcome.dayBeforeSub} />
            <Row theme={theme} glyph="star" label={t.welcome.after(offer.length)} sub={t.welcome.afterSub(offer.then)} />
          </Panel>
        }
      />
    );
  }

  return (
    <Page
      theme={theme}
      title={t.welcome.remindTitle}
      line={t.welcome.remindLine}
      button={t.common.continue}
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
  visual,
}: {
  theme: Theme;
  title: string;
  line?: string;
  /** The product, shown above the words. */
  visual?: React.ReactNode;
  dots?: { count: number; active: number };
  button: string;
  onPress: () => void;
  waiting?: boolean;
  noPayment?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, space.l) }]}>
      {visual ? <View style={styles.visual}>{visual}</View> : null}
      <View style={visual ? styles.wordsUnder : styles.words}>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          {title}
        </Text>
        {line ? <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>{line}</Text> : null}
      </View>
      {dots && (
        <View style={styles.dots} accessible accessibilityLabel={t.common.pageOf(dots.active + 1, dots.count)}>
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
            <Text style={[type.strong, { color: theme.ink }]}>{t.paywall.noPayment}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  words: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  visual: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.l, paddingTop: space.xl },
  wordsUnder: { paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.xl },
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
