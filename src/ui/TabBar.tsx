import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, space, type } from '../theme';
import Glyph, { GlyphName } from './Glyph';
import { Tap } from './Kit';
import { t } from '../i18n';

export type Tab = 'create' | 'library' | 'documents' | 'settings';

const TABS: { id: Tab; glyph: GlyphName }[] = [
  { id: 'create', glyph: 'create' },
  { id: 'library', glyph: 'library' },
  { id: 'documents', glyph: 'documents' },
  { id: 'settings', glyph: 'settings' },
];

/** The four places, along the bottom. The current one is in full ink, the rest faint. */
export default function TabBar({ theme, tab, onTab }: { theme: Theme; tab: Tab; onTab: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: theme.bg, borderTopColor: theme.edge, paddingBottom: Math.max(insets.bottom - space.s, space.s) }]} accessibilityRole="tablist">
      {TABS.map((tb) => {
        const on = tb.id === tab;
        const label = t.tabs[tb.id];
        const color = on ? theme.ink : theme.inkFaint;
        return (
          <Tap
            key={tb.id}
            onPress={() => onTab(tb.id)}
            style={styles.tab}
            pressedStyle={{ opacity: 0.6 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
          >
            <Glyph name={tb.glyph} size={26} color={color} weight={on ? 1.9 : 1.6} />
            <Text style={[type.small, styles.label, { color, fontWeight: on ? '600' : '400' }]} numberOfLines={1} maxFontSizeMultiplier={1.3} adjustsFontSizeToFit minimumFontScale={0.75}>
              {label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

/** The bar's height above the home indicator, for placing toasts over it. */
export const TAB_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: space.s },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, gap: space.xs },
  label: { alignSelf: 'stretch', textAlign: 'center' },
});
