import React, { useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useTheme, space, type } from '../theme';
import { useApp } from '../state';
import { restorePurchases } from '../purchases';
import { cancelTrialReminder } from '../reminder';
import { kvSet } from '../store';
import { PRIVACY_URL, SUPPORT_EMAIL, SUPPORT_MAIL_URL, SUPPORT_URL, TERMS_URL } from '../links';
import { Caption, Label, Panel, Row, Title } from '../ui/Kit';
import { t } from '../i18n';
import { num } from '../format';

/** Pro, restore, help and the one-line About. Test tools behind seven taps on the version, in test builds only. */
export default function Settings({ onReplayOnboarding }: { onReplayOnboarding: () => void }) {
  const theme = useTheme();
  const { isPro, setIsPro, askPro, testBuild, actFree, setActFree, resetUsage, library, setLibrary, recent, setRecent, say } = useApp();
  const [restoring, setRestoring] = useState(false);
  const [taps, setTaps] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = `${Constants.expoConfig?.version ?? '1.0.0'} (${Constants.expoConfig?.ios?.buildNumber ?? '1'})`;

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    const res = await restorePurchases();
    setRestoring(false);
    if (res.ok) cancelTrialReminder();
    if (res.ok && res.isPro) {
      setIsPro(true);
      Alert.alert(t.purchase.proBack, t.purchase.proBody);
    } else if (res.ok) Alert.alert(t.purchase.nothing, t.purchase.nothingBody);
    else Alert.alert(t.purchase.restoreFailed, res.error ?? t.common.tryAgain);
  };

  const deleteAll = () =>
    Alert.alert(t.settings.deleteAllTitle, t.settings.deleteAllBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          setLibrary([]);
          setRecent([]);
          say(t.settings.deleted);
        },
      },
    ]);

  const versionTap = () => {
    if (!testBuild) return;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTaps(0), 2000);
    setTaps((t) => t + 1);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Title theme={theme}>{t.settings.title}</Title>

      <View>
        <Label theme={theme}>{t.settings.pro}</Label>
        <Panel theme={theme}>
          {isPro ? (
            <Row theme={theme} first glyph="check" label={t.settings.proOn} sub={t.settings.proSub} />
          ) : (
            <Row theme={theme} first glyph="star" label={t.settings.proName} sub={t.settings.proSub} onPress={() => askPro('pro')} />
          )}
          <Row theme={theme} glyph="undo" label={restoring ? t.purchase.restoring : t.purchase.restore} onPress={restore} right={<View />} />
        </Panel>
      </View>

      <View>
        <Label theme={theme}>{t.settings.help}</Label>
        <Panel theme={theme}>
          <Row theme={theme} first label={t.settings.support} sub={t.settings.supportSub} onPress={() => Linking.openURL(SUPPORT_URL)} />
          <Row
            theme={theme}
            label={t.settings.emailSupport}
            sub={SUPPORT_EMAIL}
            hint={t.settings.emailHint}
            onPress={() => Linking.openURL(SUPPORT_MAIL_URL).catch(() => Alert.alert(t.common.mailDidNotOpen, t.settings.writeTo(SUPPORT_EMAIL)))}
          />
          <Row theme={theme} label={t.paywall.privacy} onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Row theme={theme} label={t.paywall.terms} onPress={() => Linking.openURL(TERMS_URL)} />
        </Panel>
      </View>

      <View>
        <Label theme={theme}>{t.settings.about}</Label>
        <Panel theme={theme} style={styles.about}>
          <Text style={[type.body, { color: theme.ink }]}>{t.settings.legal}</Text>
          <Text style={[type.small, { color: theme.inkSoft }]}>{t.settings.local}</Text>
          <Text style={[type.small, { color: theme.inkFaint }]} onPress={versionTap} accessibilityRole="text">
            {t.settings.version(version)}
          </Text>
        </Panel>
      </View>

      <Panel theme={theme}>
        <Row theme={theme} first label={t.settings.deleteAll} tone="danger" onPress={deleteAll} right={<View />} />
      </Panel>
      {library.length + recent.length > 0 ? <Caption theme={theme}>{t.settings.counts(library.length, recent.length, num(library.length), num(recent.length))}</Caption> : null}

      {testBuild && taps >= 7 ? (
        <View>
          <Label theme={theme}>{t.settings.testing}</Label>
          <Panel theme={theme}>
            <Row theme={theme} first label={t.settings.actFree} right={<Switch value={actFree} onValueChange={(v) => setActFree(v)} />} />
            <Row theme={theme} label={t.settings.resetFree} onPress={() => { resetUsage(); say(t.settings.countersReset); }} right={<View />} />
            <Row
              theme={theme}
              label={t.settings.replay}
              onPress={() => {
                kvSet('flag.onboarded', '0').catch(() => {});
                onReplayOnboarding();
              }}
              right={<View />}
            />
          </Panel>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.l, gap: space.xl, paddingBottom: space.xxl },
  about: { padding: space.l, gap: space.s },
});
