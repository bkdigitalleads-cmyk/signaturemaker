/**
 * The component kit ("a clean desk"). Everything tappable goes through
 * Tap, so it shows a pressed state; targets are at least 44 points. One
 * accent, on InkButton only. Two corners: radius.large for the canvas,
 * Panels, Drawers and InkButton; radius.small for Pills, inputs and
 * QuietButton. One type scale: 28 (Title), 17 (body), 13 (Caption).
 */
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAIN_BUTTON, Theme, radius, space, type } from '../theme';
import Glyph, { GlyphName } from './Glyph';
import { MODAL_ANIMATION } from './motion';

export function Tap({
  style,
  pressedStyle,
  children,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; pressedStyle?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <Pressable {...rest} style={({ pressed }) => [style, pressed && (pressedStyle ?? { opacity: 0.55 })]}>
      {children}
    </Pressable>
  );
}

/** The primary action: deep blue ink, full width, at least 64 points tall. One per screen. */
export function InkButton({
  theme,
  label,
  onPress,
  disabled = false,
  busy = false,
  hint,
  glyph,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  hint?: string;
  glyph?: GlyphName;
}) {
  const off = disabled || busy;
  return (
    <Tap
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: off, busy }}
      style={[styles.ink, { backgroundColor: theme.accent, opacity: disabled ? 0.38 : 1 }]}
      pressedStyle={{ opacity: 0.82 }}
    >
      {busy ? (
        <ActivityIndicator color={theme.onAccent} />
      ) : (
        <View style={styles.row}>
          {glyph ? <Glyph name={glyph} size={22} color={theme.onAccent} weight={2} /> : null}
          <Text style={[type.strong, { color: theme.onAccent }]} maxFontSizeMultiplier={1.4} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Tap>
  );
}

/** A plain button: ink on the surface tone with the 1 px edge. */
export function QuietButton({
  theme,
  label,
  onPress,
  glyph,
  disabled = false,
  tone = 'ink',
  grow = false,
  hint,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  glyph?: GlyphName;
  disabled?: boolean;
  tone?: 'ink' | 'danger';
  grow?: boolean;
  hint?: string;
}) {
  const color = tone === 'danger' ? theme.danger : theme.ink;
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      style={[styles.quiet, grow && { flex: 1 }, { backgroundColor: theme.surface, borderColor: theme.edge, opacity: disabled ? 0.4 : 1 }]}
      pressedStyle={{ backgroundColor: theme.raised }}
    >
      {glyph ? <Glyph name={glyph} size={20} color={color} /> : null}
      <Text style={[type.body, { color, fontWeight: '500' }]} maxFontSizeMultiplier={1.5} numberOfLines={1}>
        {label}
      </Text>
    </Tap>
  );
}

/** A round glyph-only button. Always has a label for VoiceOver. */
export function GlyphButton({
  theme,
  glyph,
  label,
  onPress,
  disabled = false,
  color,
  size = 44,
  filled = false,
}: {
  theme: Theme;
  glyph: GlyphName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  size?: number;
  filled?: boolean;
}) {
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      style={[styles.glyphBtn, { width: size, height: size, opacity: disabled ? 0.3 : 1 }, filled && { backgroundColor: theme.surface, borderColor: theme.edge, borderWidth: 1 }]}
      pressedStyle={{ backgroundColor: theme.raised }}
    >
      <Glyph name={glyph} size={Math.round(size * 0.52)} color={color ?? theme.ink} />
    </Tap>
  );
}

/** A choice in a row (export formats, sizes, the type-or-draw switch). Picked: a darker well and an ink edge. */
export function Pill({
  theme,
  label,
  on,
  onPress,
  locked = false,
  glyph,
}: {
  theme: Theme;
  label: string;
  on: boolean;
  onPress: () => void;
  locked?: boolean;
  glyph?: GlyphName;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}, Pro` : label}
      accessibilityState={{ selected: on }}
      style={[styles.pill, { backgroundColor: on ? theme.picked : theme.surface, borderColor: on ? theme.pickedEdge : theme.edge }]}
      pressedStyle={{ backgroundColor: theme.raised }}
    >
      {glyph ? <Glyph name={glyph} size={18} color={theme.ink} /> : null}
      <Text style={[type.small, { color: theme.ink, fontWeight: on ? '600' : '400' }]} maxFontSizeMultiplier={1.4} numberOfLines={1}>
        {label}
      </Text>
      {locked ? <Glyph name="lock" size={14} color={theme.inkFaint} /> : null}
    </Tap>
  );
}

/** A surface card with the 1 px edge. */
export function Panel({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.edge }, style]}>{children}</View>;
}

/** A row inside a Panel. */
export function Row({
  theme,
  label,
  sub,
  onPress,
  glyph,
  right,
  first = false,
  tone = 'ink',
  hint,
}: {
  theme: Theme;
  label: string;
  sub?: string;
  onPress?: () => void;
  glyph?: GlyphName;
  right?: React.ReactNode;
  first?: boolean;
  tone?: 'ink' | 'danger';
  hint?: string;
}) {
  const body = (
    <>
      {glyph ? <Glyph name={glyph} size={22} color={tone === 'danger' ? theme.danger : theme.ink} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { color: tone === 'danger' ? theme.danger : theme.ink }]}>{label}</Text>
        {sub ? <Text style={[type.small, { color: theme.inkSoft }]}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Glyph name="chevron" size={18} color={theme.inkFaint} /> : null)}
    </>
  );
  const st = [styles.rowItem, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }];
  if (!onPress) return <View style={st} accessible accessibilityLabel={sub ? `${label}. ${sub}` : label}>{body}</View>;
  return (
    <Tap onPress={onPress} style={st} pressedStyle={{ backgroundColor: theme.raised }} accessibilityRole="button" accessibilityLabel={sub ? `${label}. ${sub}` : label} accessibilityHint={hint}>
      {body}
    </Tap>
  );
}

export function Title({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: any }) {
  return (
    <Text style={[type.title, { color: theme.ink }, style]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
      {children}
    </Text>
  );
}

export function Caption({ theme, children, style }: { theme: Theme; children: React.ReactNode; style?: any }) {
  return <Text style={[type.small, { color: theme.inkSoft }, style]}>{children}</Text>;
}

/** A label over a group of controls. */
export function Label({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <Text style={[type.small, styles.label, { color: theme.inkSoft }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** A text field on the surface tone. */
export function Field({ theme, style, ...rest }: TextInputProps & { theme: Theme }) {
  return (
    <TextInput
      placeholderTextColor={theme.inkFaint}
      selectionColor={theme.accent}
      {...rest}
      style={[type.body, styles.field, { color: theme.ink, backgroundColor: theme.surface, borderColor: theme.edge }, style]}
    />
  );
}

/** The top bar of a screen over the tabs: back or close on the left, a title, an optional action. */
export function TopBar({ theme, title, onBack, closeGlyph = 'back', right }: { theme: Theme; title?: string; onBack?: () => void; closeGlyph?: GlyphName; right?: React.ReactNode }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topSide}>{onBack ? <GlyphButton theme={theme} glyph={closeGlyph} label={closeGlyph === 'close' ? 'Close' : 'Back'} onPress={onBack} /> : null}</View>
      {title ? (
        <Text style={[type.strong, styles.topTitle, { color: theme.ink }]} numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={[styles.topSide, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/** A short line at the bottom for a few seconds ("Saved. It has a transparent background."). */
export function Toast({ theme, text, bottom }: { theme: Theme; text: string | null; bottom: number }) {
  const fade = useRef(new Animated.Value(0)).current;
  const last = useRef(text);
  if (text) last.current = text;
  useEffect(() => {
    Animated.timing(fade, { toValue: text ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [text, fade]);
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { bottom: bottom + space.m, opacity: fade, backgroundColor: theme.ink }]} accessibilityLiveRegion="polite">
      <Text style={[type.small, { color: theme.bg, textAlign: 'center' }]}>{last.current}</Text>
    </Animated.View>
  );
}

/** A sheet from the bottom over a dimmed desk. Fades in. */
export function Drawer({ theme, visible, onClose, children, title }: { theme: Theme; visible: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType={MODAL_ANIMATION} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={[styles.drawer, { backgroundColor: theme.bg, borderColor: theme.edge, paddingBottom: Math.max(insets.bottom, space.l) }]}>
          <View style={styles.drawerHead}>
            <Text style={[type.strong, { color: theme.ink, flex: 1 }]} accessibilityRole="header">
              {title ?? ''}
            </Text>
            <GlyphButton theme={theme} glyph="close" label="Close" onPress={onClose} />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ink: { minHeight: MAIN_BUTTON, borderRadius: radius.large, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  quiet: { minHeight: 48, borderRadius: radius.small, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s, paddingHorizontal: space.l },
  glyphBtn: { borderRadius: radius.round, alignItems: 'center', justifyContent: 'center' },
  pill: { minHeight: 40, borderRadius: radius.small, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.m },
  panel: { borderRadius: radius.large, borderWidth: 1, overflow: 'hidden' },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 52, paddingHorizontal: space.l, paddingVertical: space.m },
  label: { marginBottom: space.s, marginLeft: space.xs },
  field: { minHeight: 48, borderRadius: radius.small, borderWidth: 1, paddingHorizontal: space.m },
  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: space.s },
  topSide: { minWidth: 88 },
  topTitle: { flex: 1, textAlign: 'center' },
  toast: { position: 'absolute', left: space.xl, right: space.xl, borderRadius: radius.small, paddingVertical: space.m, paddingHorizontal: space.l },
  drawer: { borderTopLeftRadius: radius.large, borderTopRightRadius: radius.large, borderWidth: 1, paddingHorizontal: space.l, paddingTop: space.s, maxHeight: '88%' },
  drawerHead: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
});
