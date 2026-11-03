import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useTheme, UI_FONT_FILES, type, space } from './src/theme';
import { SCRIPT_FONT_FILES } from './src/fontFiles';
import { AppProvider, useApp } from './src/state';
import type { Signature } from './src/library';
import Create from './src/screens/Create';
import Library from './src/screens/Library';
import TabBar, { Tab, TAB_BAR_HEIGHT } from './src/ui/TabBar';
import { Toast } from './src/ui/Kit';

/** A screen over the tabs. */
type Over = { name: 'initials'; sig: Signature } | null;

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, notice, say } = useApp();
  const [tab, setTab] = useState<Tab>('create');
  const [over, setOver] = useState<Over>(null);
  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  let body: React.ReactNode;
  if (over?.name === 'initials')
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
        onSaved={() => {
          say('Saved to your library.');
          setTab('library');
        }}
      />
    );
  else if (tab === 'library') body = <Library onCreate={() => setTab('create')} onExport={() => {}} onInitials={(sig) => setOver({ name: 'initials', sig })} />;
  else
    body = (
      <View style={{ flex: 1, padding: space.l }}>
        <Text style={[type.title, { color: theme.ink }]}>{tab === 'documents' ? 'Documents' : 'Settings'}</Text>
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
