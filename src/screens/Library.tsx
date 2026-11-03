import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme, radius, space, type } from '../theme';
import { useApp } from '../state';
import { canMakeInitials } from '../gates';
import { moveSignature, removeSignature, renameSignature, setDefault, Signature } from '../library';
import MarkView from '../ui/MarkView';
import Glyph from '../ui/Glyph';
import { Caption, Drawer, Panel, QuietButton, Row, Tap, Title } from '../ui/Kit';

/**
 * Saved signatures and their initials: named, in the order the person
 * puts them, one of them the default (it is preselected when signing a
 * document). Never locked.
 */
export default function Library({ onCreate, onExport, onInitials }: { onCreate: () => void; onExport: (sig: Signature) => void; onInitials: (sig: Signature) => void }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { library, setLibrary, isPro, askPro } = useApp();
  const [open, setOpen] = useState<Signature | null>(null);
  const cardW = width - space.l * 2;

  const rename = (sig: Signature) => {
    Alert.prompt('Rename', undefined, (name) => name && setLibrary(renameSignature(library, sig.id, name)), 'plain-text', sig.name);
  };
  const remove = (sig: Signature) => {
    Alert.alert(`Delete “${sig.name}”?`, 'Its initials go with it. Documents you already signed are not changed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setLibrary(removeSignature(library, sig.id)) },
    ]);
  };
  const initials = async (sig: Signature) => {
    if (canMakeInitials(isPro) || (await askPro('initials'))) onInitials(sig);
  };

  const act = (fn: (s: Signature) => void) => () => {
    const s = open;
    setOpen(null);
    if (s) setTimeout(() => fn(s), 400);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title theme={theme}>Library</Title>
        {library.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[type.body, { color: theme.inkSoft }]}>Saved signatures and initials live here, on this iPhone. The default one is ready when you sign a document.</Text>
            <QuietButton theme={theme} glyph="create" label="Make a signature" onPress={onCreate} />
          </View>
        ) : (
          library.map((sig, i) => (
            <Tap key={sig.id} onPress={() => setOpen(sig)} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.edge }]} pressedStyle={{ backgroundColor: theme.raised }} accessibilityRole="button" accessibilityLabel={`${sig.name}${sig.isDefault ? ', default' : ''}${sig.initials ? ', with initials' : ''}`} accessibilityHint="Opens export, initials, rename, order and delete">
              <View style={[styles.paper, { backgroundColor: theme.paper }]}>
                <MarkView mark={sig.main} height={64} maxWidth={cardW - space.l * 2 - (sig.initials ? 72 : 0)} />
                {sig.initials ? (
                  <View style={[styles.initials, { borderLeftColor: theme.rule }]}>
                    <MarkView mark={sig.initials} height={40} maxWidth={56} />
                  </View>
                ) : null}
              </View>
              <View style={styles.meta}>
                <Text style={[type.body, { color: theme.ink, flex: 1 }]} numberOfLines={1}>
                  {sig.name}
                </Text>
                {sig.isDefault ? (
                  <View style={[styles.tag, { borderColor: theme.edge, backgroundColor: theme.raised }]}>
                    <Text style={[type.small, { color: theme.ink }]}>Default</Text>
                  </View>
                ) : null}
                <Text style={[type.small, { color: theme.inkFaint }]}>{i + 1}</Text>
              </View>
            </Tap>
          ))
        )}
        {library.length > 0 ? <Caption theme={theme}>Tap one to export it, add initials, rename it, move it or delete it.</Caption> : null}
      </ScrollView>

      <Drawer theme={theme} visible={open != null} onClose={() => setOpen(null)} title={open?.name}>
        {open ? (
          <Panel theme={theme} style={{ marginBottom: space.l }}>
            <Row theme={theme} first glyph="share" label="Export" sub="Transparent PNG, on white, Photos, copy" onPress={act(onExport)} />
            <Row theme={theme} glyph="initials" label={open.initials ? 'Redo initials' : 'Make initials'} sub={canMakeInitials(isPro) ? undefined : 'Pro'} onPress={act(initials)} />
            {!open.isDefault ? <Row theme={theme} glyph="star" label="Use as default" onPress={act((s) => setLibrary(setDefault(library, s.id)))} /> : null}
            <Row theme={theme} glyph="pencil" label="Rename" onPress={act(rename)} />
            {library[0]?.id !== open.id ? <Row theme={theme} glyph="up" label="Move up" onPress={act((s) => setLibrary(moveSignature(library, s.id, -1)))} /> : null}
            {library[library.length - 1]?.id !== open.id ? <Row theme={theme} glyph="down" label="Move down" onPress={act((s) => setLibrary(moveSignature(library, s.id, 1)))} /> : null}
            <Row theme={theme} glyph="trash" label="Delete" tone="danger" onPress={act(remove)} right={<View />} />
          </Panel>
        ) : null}
      </Drawer>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, gap: space.m, paddingBottom: space.xxl },
  empty: { gap: space.l, marginTop: space.s },
  card: { borderRadius: radius.large, borderWidth: 1, overflow: 'hidden' },
  paper: { height: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.l },
  initials: { marginLeft: space.l, paddingLeft: space.l, borderLeftWidth: StyleSheet.hairlineWidth, height: 56, justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.l, paddingVertical: space.m },
  tag: { borderRadius: radius.small, borderWidth: 1, paddingHorizontal: space.s, paddingVertical: 2 },
});
