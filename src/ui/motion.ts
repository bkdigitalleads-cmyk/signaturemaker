import * as Haptics from 'expo-haptics';

/**
 * Quiet motion: sheets and modals fade (no slides or bounces), and
 * feedback comes by touch.
 */
export const MODAL_ANIMATION = 'fade' as const;

/** Save signature, Done signing: a soft confirmation. */
export const savedHaptic = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
/** Picking a pen, a color, a size, a font. */
export const tick = () => Haptics.selectionAsync().catch(() => {});
/** Dropping a placement on a page. */
export const placeHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
