import { registerRootComponent } from 'expo';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

/**
 * The app's code is loaded inside a try so that a failure while it loads
 * (a native module that did not install, a bad import) is shown on screen
 * instead of leaving the phone on the launch screen with nothing to read.
 * In a release build React Native only logs such a failure, so without
 * this the symptom is an app that never leaves its icon.
 */
function StartupFailure({ error }: { error: unknown }) {
  const e = error as { message?: string; stack?: string } | undefined;
  const message = e?.message ?? String(error);
  const stack = (e?.stack ?? '').split('\n').slice(0, 12).join('\n');
  return React.createElement(
    ScrollView,
    { style: { flex: 1, backgroundColor: '#F4F1EA' }, contentContainerStyle: { padding: 24, paddingTop: 80 } },
    React.createElement(Text, { style: { fontSize: 20, fontWeight: '600', color: '#1A1917', marginBottom: 12 } }, 'Signature Maker could not start.'),
    React.createElement(Text, { style: { fontSize: 15, color: '#1A1917', marginBottom: 16 } }, 'Please delete the app and install it again. If it keeps happening, send this screen to support.'),
    React.createElement(Text, { style: { fontSize: 13, color: '#5B5851', fontFamily: 'Menlo' } }, message),
    React.createElement(Text, { style: { fontSize: 11, color: '#8A867F', fontFamily: 'Menlo', marginTop: 12 } }, stack),
    React.createElement(View, { style: { height: 48 } })
  );
}

let App: React.ComponentType;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  App = require('./App').default;
} catch (error) {
  App = () => React.createElement(StartupFailure, { error });
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
