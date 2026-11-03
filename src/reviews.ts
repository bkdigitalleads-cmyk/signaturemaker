import * as StoreReview from 'expo-store-review';
import { kvGet, kvSet } from './store';
import { dayKey, launchReview, ReviewTrigger, shouldAsk } from './rules';

export type { ReviewTrigger } from './rules';

/**
 * App Store rating asks, at moments the person just got something (the
 * triggers are listed in rules.ts). Each fires at most once ever, at most
 * one prompt per launch, never while a document is open, and StoreKit
 * still decides whether the prompt is shown (it caps it at 3 a year). The
 * decisions are pure functions in rules.ts, checked by `npm test`.
 * Same engine as Migraine Log, Image to Text, Pumping and Odo 1.0.6.
 */
const triggerKey = (t: ReviewTrigger) => `review.${t}`;
const INSTALL_DAY_KEY = 'review.installDay';

let launchState: 'idle' | 'checking' | 'asked' = 'idle';
let launchChecked = false;
let docOpen: () => boolean = () => false;

/** state.tsx tells this module whether a document is open for signing. */
export function setReviewGuard(isOpen: () => boolean): void {
  docOpen = isOpen;
}

export async function maybeRequestReview(trigger: ReviewTrigger): Promise<void> {
  if (launchState !== 'idle' || docOpen()) return;
  launchState = 'checking';
  try {
    const used = (await kvGet(triggerKey(trigger))) != null;
    const storeCanAsk = await StoreReview.hasAction();
    if (!shouldAsk({ docOpen: docOpen(), askedThisLaunch: false, triggerUsed: used, storeCanAsk })) return;
    await kvSet(triggerKey(trigger), '1');
    launchState = 'asked';
    setTimeout(() => {
      // One last look: a document opened in the meantime wins.
      if (!docOpen()) StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing get in the way
  } finally {
    if (launchState === 'checking') launchState = 'idle';
  }
}

/** Once per cold launch: records the install day, and asks on the first later day. */
export async function maybeRequestReviewOnLaunch(): Promise<void> {
  if (launchChecked) return;
  launchChecked = true;
  try {
    const today = dayKey(Date.now());
    const what = launchReview(await kvGet(INSTALL_DAY_KEY), today);
    if (what === 'record') await kvSet(INSTALL_DAY_KEY, today);
    else if (what === 'laterDay') await maybeRequestReview('laterDay');
  } catch {
    // never let review plumbing get in the way
  }
}
