/**
 * What is free and what is Pro, as pure functions checked by `npm test`.
 *
 * Free forever: drawing, typing and saving any number of signatures, the
 * whole library, and the export preview on the checkerboard. The first
 * export of a signature (any format) and the first signed document are
 * free and clean, so someone with one urgent lease gets it done.
 *
 * After that, a free export or signed document opens the paywall first;
 * closing it still gives the file, with a small "Made with Signature
 * Maker" corner mark. Pro: unlimited clean exports and documents, all four
 * pens and all twelve fonts (free: Ink and Ballpoint, four fonts),
 * initials, and the date and text stamps. The library is never locked.
 */
import type { PenId } from './stroke.ts';
import { SCRIPT_FONTS } from './fonts.ts';

export const FREE_PENS: PenId[] = ['ink', 'ballpoint'];

export function canUsePen(pen: PenId, isPro: boolean): boolean {
  return isPro || FREE_PENS.includes(pen);
}

export function canUseFont(fontId: string, isPro: boolean): boolean {
  const f = SCRIPT_FONTS.find((x) => x.id === fontId);
  return f != null && (isPro || f.free);
}

/** How many of each the person has made, counted when the file is written. */
export interface Usage {
  exports: number;
  documents: number;
}

export interface Decision {
  /** Show the in-app paywall before going on. */
  paywall: boolean;
  /** The file carries the corner mark. */
  watermark: boolean;
}

function decide(isPro: boolean, done: number): Decision {
  if (isPro || done < 1) return { paywall: false, watermark: false };
  return { paywall: true, watermark: true };
}

/** A signature export (transparent PNG, PNG or JPG on white, clipboard, Photos, share). */
export function exportDecision(isPro: boolean, usage: Usage): Decision {
  return decide(isPro, usage.exports);
}

/** A signed document (PDF or JPG). */
export function documentDecision(isPro: boolean, usage: Usage): Decision {
  return decide(isPro, usage.documents);
}

/**
 * After the paywall: buying turns the mark off; closing it keeps the mark.
 * Either way the file is made, so nobody is left stuck mid-task.
 */
export function afterPaywall(d: Decision, isProNow: boolean): Decision {
  return isProNow ? { paywall: false, watermark: false } : { paywall: false, watermark: d.watermark };
}

export type Stamp = 'signature' | 'initials' | 'date' | 'text';

/** Placing a signature is always free; initials, date and text are Pro. */
export function canUseStamp(stamp: Stamp, isPro: boolean): boolean {
  return stamp === 'signature' || isPro;
}

/** Making the initials version of a saved signature. */
export function canMakeInitials(isPro: boolean): boolean {
  return isPro;
}

/** The library (saving, naming, reordering, deleting, the default) never waits on Pro. */
export function canUseLibrary(_isPro: boolean): true {
  return true;
}

/** The checkerboard and mock-letter preview never carry the mark unless the file will. */
export function previewShowsMark(isPro: boolean, usage: Usage): boolean {
  return exportDecision(isPro, usage).watermark;
}

/** Why the in-app paywall opened. */
export type PaywallReason = 'export' | 'document' | 'pen' | 'font' | 'initials' | 'stamp' | 'pro';
