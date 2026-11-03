import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useTheme, UI_FONT_FILES, lightTheme, type, space } from './src/theme';
import { SCRIPT_FONT_FILES } from './src/fontFiles';
import { AppProvider, useApp } from './src/state';
import TabBar, { Tab, TAB_BAR_HEIGHT } from './src/ui/TabBar';
import { Toast } from './src/ui/Kit';

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, notice } = useApp();
  const [tab, setTab] = useState<Tab>('create');
  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, padding: space.l }}>
        <Text style={[type.title, { color: theme.ink }]}>Sign here</Text>
      </View>
      <TabBar theme={theme} tab={tab} onTab={setTab} />
      <Toast theme={theme} text={notice} bottom={TAB_BAR_HEIGHT + insets.bottom} />
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ ...UI_FONT_FILES, ...SCRIPT_FONT_FILES });
  // The desk's colour while fonts load, so launch never flashes white.
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: lightTheme.bg }} />;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}
