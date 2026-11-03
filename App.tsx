import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { useTheme, UI_FONT_FILES, type, space } from './src/theme';
import { SCRIPT_FONT_FILES } from './src/fontFiles';
import { AppProvider, useApp } from './src/state';
import type { Signature } from './src/library';
import { OpenDoc, openIncoming } from './src/documents';
import { sweepCache } from './src/store';
import Create from './src/screens/Create';
import Library from './src/screens/Library';
import Export from './src/screens/Export';
import Documents from './src/screens/Documents';
import Sign from './src/screens/Sign';
import TabBar, { Tab, TAB_BAR_HEIGHT } from './src/ui/TabBar';
import { Toast } from './src/ui/Kit';

/** A screen over the tabs. */
type Over = { name: 'initials'; sig: Signature } | { name: 'export'; sig: Signature } | { name: 'sign'; doc: OpenDoc } | null;

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, notice, say } = useApp();
  const [tab, setTab] = useState<Tab>('create');
  const [over, setOver] = useState<Over>(null);
  const overRef = useRef(over);
  overRef.current = over;

  useEffect(() => {
    sweepCache();
  }, []);

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

  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

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
      <View style={{ flex: 1, padding: space.l }}>
        <Text style={[type.title, { color: theme.ink }]}>Settings</Text>
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>{body}</View>
      {over == null ? <TabBar theme={theme} tab={tab} onTab={setTab} /> : null}
      <Toast theme={theme} text={notice} bottom={(over == null ? TAB_BAR_HEIGHT : 0) + insets.bottom} />
    </View>
  );
}

export default function App() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({ ...UI_FONT_FILES, ...SCRIPT_FONT_FILES });
  // The desk's colour while fonts load, so launch never flashes white.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}
