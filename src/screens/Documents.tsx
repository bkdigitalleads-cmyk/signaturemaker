import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import { useTheme, space, type } from '../theme';
import { useApp } from '../state';
import { OpenDoc, pickFromFiles, pickFromPhotos } from '../documents';
import { removeRecent, RecentDoc } from '../library';
import { signedUri } from '../store';
import { shareUri } from '../exporting';
import Glyph from '../ui/Glyph';
import { Caption, InkButton, Label, Panel, QuietButton, Row, Tap, Title, TopBar } from '../ui/Kit';
import { MODAL_ANIMATION } from '../ui/motion';
import { t } from '../i18n';
import { date, num } from '../format';

/**
 * Sign a document: open a PDF from Files or a photo of a form; anything
 * shared from Mail or Files with "Open in" lands here too. Below, the last
 * 20 signed files with Open and Share. No cloud, no folders, no scanner.
 */
export default function Documents({ onOpen }: { onOpen: (doc: OpenDoc) => void }) {
  const theme = useTheme();
  const { recent, setRecent } = useApp();
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<RecentDoc | null>(null);
  const insets = useSafeAreaInsets();

  const open = async (how: 'files' | 'photos') => {
    if (busy) return;
    setBusy(true);
    try {
      const doc = how === 'files' ? await pickFromFiles() : await pickFromPhotos();
      if (doc) onOpen(doc);
    } catch (e: any) {
      Alert.alert(t.common.fileDidNotOpen, e?.message ?? t.common.tryAnotherCopy);
    } finally {
      setBusy(false);
    }
  };

  const share = (d: RecentDoc) => shareUri(signedUri(d), d.format, d.name).catch((e) => Alert.alert(t.common.sharingDidNotOpen, e?.message ?? ''));
  const forget = (d: RecentDoc) =>
    Alert.alert(t.documents.removeTitle(d.name), t.documents.removeBody, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.remove, style: 'destructive', onPress: () => setRecent(removeRecent(recent, d.id)) },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Title theme={theme}>{t.documents.title}</Title>
      <Text style={[type.body, { color: theme.inkSoft }]}>{t.documents.intro}</Text>
      <View style={styles.open}>
        <QuietButton theme={theme} glyph="documents" label={t.documents.openPdf} onPress={() => open('files')} grow disabled={busy} hint={t.documents.openPdfHint} />
        <QuietButton theme={theme} glyph="photo" label={t.documents.photo} onPress={() => open('photos')} grow disabled={busy} hint={t.documents.photoHint} />
      </View>
      {busy ? <ActivityIndicator color={theme.inkSoft} /> : null}
      <Caption theme={theme}>{t.documents.fromMail}</Caption>

      <View style={{ marginTop: space.l }}>
        <Label theme={theme}>{t.documents.recent}</Label>
        {recent.length === 0 ? (
          <Caption theme={theme} style={{ marginLeft: space.xs }}>
            {t.documents.recentEmpty}
          </Caption>
        ) : (
          <Panel theme={theme}>
            {recent.map((d, i) => (
              <Row
                key={d.id}
                theme={theme}
                first={i === 0}
                glyph={d.format === 'jpg' ? 'photo' : 'documents'}
                label={d.name}
                sub={t.documents.row(date(d.signedAt, { month: 'short', day: 'numeric' }), d.pages, num(d.pages))}
                right={
                  <View style={styles.actions}>
                    <Tap onPress={() => setViewing(d)} style={styles.act} accessibilityRole="button" accessibilityLabel={t.documents.openNamed(d.name)}>
                      <Text style={[type.small, { color: theme.ink, fontWeight: '600' }]}>{t.common.open}</Text>
                    </Tap>
                    <Tap onPress={() => share(d)} style={styles.act} accessibilityRole="button" accessibilityLabel={t.documents.shareNamed(d.name)}>
                      <Glyph name="share" size={20} color={theme.ink} />
                    </Tap>
                    <Tap onPress={() => forget(d)} style={styles.act} accessibilityRole="button" accessibilityLabel={t.documents.removeNamed(d.name)}>
                      <Glyph name="trash" size={18} color={theme.inkFaint} />
                    </Tap>
                  </View>
                }
              />
            ))}
          </Panel>
        )}
      </View>
      <Modal visible={viewing != null} animationType={MODAL_ANIMATION} presentationStyle="fullScreen" onRequestClose={() => setViewing(null)}>
        <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, space.m) }}>
          <TopBar theme={theme} title={viewing?.name} onBack={() => setViewing(null)} closeGlyph="close" />
          {viewing ? (
            <View style={{ flex: 1 }}>
              {viewing.format === 'jpg' ? (
                <Image source={{ uri: signedUri(viewing) }} style={{ flex: 1 }} resizeMode="contain" accessibilityLabel={viewing.name} />
              ) : (
                <Pdf source={{ uri: signedUri(viewing) }} style={{ flex: 1, backgroundColor: theme.bg }} fitPolicy={0} spacing={12} />
              )}
              <View style={{ paddingHorizontal: space.l, paddingTop: space.m }}>
                <InkButton theme={theme} glyph="share" label={t.common.share} onPress={() => share(viewing)} />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, gap: space.m, paddingBottom: space.xxl },
  open: { flexDirection: 'row', gap: space.s, marginTop: space.s },
  actions: { flexDirection: 'row', alignItems: 'center' },
  act: { minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
