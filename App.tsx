import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { useTheme, UI_FONT_FILES, space, type } from './src/theme';
import { SCRIPT_FONT_FILES } from './src/fontFiles';
import { AppProvider, useApp, ONBOARDED_KEY } from './src/state';
import type { Signature } from './src/library';
import { OpenDoc, openIncoming } from './src/documents';
import { kvGet, kvSet, sweepCache } from './src/store';
import { afterOnboardingPaywall, firstTabFor } from './src/rules';
import { maybeRequestReview, maybeRequestReviewOnLaunch } from './src/reviews';
import { PRIVACY_URL } from './src/links';
import Create from './src/screens/Create';
import Library from './src/screens/Library';
import Export from './src/screens/Export';
import Documents from './src/screens/Documents';
import Sign from './src/screens/Sign';
import Settings from './src/screens/Settings';
import PaywallModal from './src/screens/Paywall';
import Welcome, { NeedStep, TrialSteps } from './src/screens/Welcome';
import TabBar, { Tab } from './src/ui/TabBar';
import { Drawer, InkButton, Toast } from './src/ui/Kit';

/** A screen over the tabs. */
type Over = { name: 'initials'; sig: Signature } | { name: 'export'; sig: Signature } | { name: 'sign'; doc: OpenDoc } | null;

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, notice, say, isPro, library, askPro, prefs } = useApp();
  const [tab, setTab] = useState<Tab>('create');
  const [over, setOver] = useState<Over>(null);
  const overRef = useRef(over);
  overRef.current = over;
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  // New installs: three value screens, what you need today, the trial and reminder screens, then the paywall.
  const [step, setStep] = useState<'intro' | 'need' | 'sign' | 'trial' | 'paywall'>('intro');
  // After the onboarding paywall is closed with the X: the small "first export and first document are free" sheet.
  const [claim, setClaim] = useState(false);
  const paywallOpened = useRef(false);
  const launchAsked = useRef(false);

  useEffect(() => {
    sweepCache();
  }, []);

  useEffect(() => {
    if (!ready || onboarded !== null) return;
    (async () => {
      if ((await kvGet(ONBOARDED_KEY)) === '1') return setOnboarded(true);
      // Anyone who already saved a signature, or is Pro, has used the app: no onboarding.
      if (isPro || library.length > 0) {
        kvSet(ONBOARDED_KEY, '1').catch(() => {});
        return setOnboarded(true);
      }
      setOnboarded(false);
    })().catch(() => setOnboarded(true)); // fail open: never trap anyone
  }, [ready, onboarded, isPro, library.length]);

  // Once per launch, after onboarding: the "later calendar day" rating trigger (never while a document is open).
  useEffect(() => {
    if (onboarded && !launchAsked.current && overRef.current?.name !== 'sign') {
      launchAsked.current = true;
      maybeRequestReviewOnLaunch();
    }
  }, [onboarded]);

  const openOnboardingPaywall = () => {
    if (paywallOpened.current) return;
    paywallOpened.current = true;
    setStep('paywall');
    // When the onboarding paywall closes (purchase or the close button), onboarding is done.
    askPro('pro').then((pro) => {
      // After the paywall's fade, so iOS is not asked to present one sheet while another is leaving.
      if (afterOnboardingPaywall(pro) === 'claim') setTimeout(() => setClaim(true), 450);
      kvSet(ONBOARDED_KEY, '1').catch(() => {});
      setTab(firstTabFor(prefs.need));
      setOnboarded(true);
    });
  };

  // "Open in" from Mail or Files: iOS copies the file into the app and opens it with the file URL.
  useEffect(() => {
    if (!ready) return;
    const handle = async (url: string | null) => {
      if (!url || !/^file:/i.test(url)) return;
      try {
        const doc = await openIncoming(url);
        if (!doc) return;
        const go = () => {
          setTab('documents');
          setOver({ name: 'sign', doc });
        };
        if (overRef.current?.name === 'sign') {
          Alert.alert(`Open “${doc.name}”?`, 'What you placed on the document that is open now is not saved.', [
            { text: 'Keep this one', style: 'cancel' },
            { text: 'Open', onPress: go },
          ]);
        } else go();
      } catch (e: any) {
        Alert.alert('That file did not open', e?.message ?? 'Try another copy of it.');
      }
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [ready]);

  if (!ready || onboarded === null) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        {step === 'intro' && <Welcome onDone={() => setStep('need')} />}
        {step === 'need' && <NeedStep onDone={() => setStep('sign')} />}
        {step === 'sign' && <Create onboarding onSaved={() => setStep('trial')} onSkip={() => setStep('trial')} />}
        {(step === 'trial' || step === 'paywall') && <TrialSteps onDone={openOnboardingPaywall} />}
        <PaywallModal privacyUrl={PRIVACY_URL} onboarding />
      </View>
    );
  }

  let body: React.ReactNode;
  if (over?.name === 'sign') body = <Sign key={over.doc.id} doc={over.doc} onClose={() => setOver(null)} />;
  else if (over?.name === 'export') body = <Export sig={over.sig} onBack={() => setOver(null)} />;
  else if (over?.name === 'initials')
    body = (
      <Create
        initialsFor={over.sig}
        onClose={() => setOver(null)}
        onSaved={() => {
          setOver(null);
          say('Initials saved with the signature.');
        }}
      />
    );
  else if (tab === 'create')
    body = (
      <Create
        onSaved={(sig) => {
          say('Saved to your library.');
          setTab('library');
          setOver({ name: 'export', sig });
        }}
      />
    );
  else if (tab === 'library') body = <Library onCreate={() => setTab('create')} onExport={(sig) => setOver({ name: 'export', sig })} onInitials={(sig) => setOver({ name: 'initials', sig })} />;
  else if (tab === 'documents') body = <Documents onOpen={(doc) => setOver({ name: 'sign', doc })} />;
  else
    body = (
      <Settings
        onReplayOnboarding={() => {
          paywallOpened.current = false;
          setStep('intro');
          setOnboarded(false);
        }}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>{body}</View>
      {over == null ? <TabBar theme={theme} tab={tab} onTab={setTab} /> : null}
      <Toast theme={theme} text={notice} top={insets.top} />
      <PaywallModal privacyUrl={PRIVACY_URL} />
      <Drawer theme={theme} visible={claim} onClose={() => setClaim(false)}>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          Your first export and first signed document are free.
        </Text>
        <Text style={[type.body, { color: theme.inkSoft, marginTop: space.s, marginBottom: space.xl }]}>Neither carries a mark. Making and saving signatures stays free.</Text>
        <InkButton
          theme={theme}
          label="Claim"
          onPress={() => {
            setClaim(false);
            maybeRequestReview('claimFree');
          }}
        />
      </Drawer>
    </View>
  );
}

/** A failure while a screen renders: shown instead of a frozen desk. Nothing is lost on disk. */
class Guard extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#F4F1EA', padding: space.l, paddingTop: 80 }}>
        <Text style={[type.title, { color: '#1A1917' }]}>Something went wrong on this screen.</Text>
        <Text style={[type.body, { color: '#1A1917', marginTop: space.s }]}>Close the app and open it again. Your signatures and documents are saved.</Text>
        <Text style={{ fontSize: 12, color: '#8A867F', marginTop: space.l }}>{error.message}</Text>
      </View>
    );
  }
}

export default function App() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({ ...UI_FONT_FILES, ...SCRIPT_FONT_FILES });
  // If the fonts are still not in after a few seconds, open anyway with the system font.
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), 6000);
    return () => clearTimeout(t);
  }, []);
  // The desk's colour while fonts load, so launch never flashes white.
  if (!fontsLoaded && !fontError && !gaveUp) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <Guard>
      <SafeAreaProvider>
        <AppProvider>
          <Shell />
        </AppProvider>
      </SafeAreaProvider>
    </Guard>
  );
}
