/**
 * Small behavior rules as pure functions checked by `npm test`: when a
 * rating prompt may ask, the local day key, and which screen comes first
 * after onboarding.
 */

/**
 * When the app asks for an App Store rating (SKStoreReviewController, through
 * expo-store-review). Each is a moment the person just got something:
 *   trialStarted  - a free trial started on the onboarding paywall
 *   claimFree     - Claim on the "first export and first signed document are free" sheet
 *   firstExport   - the first signature export
 *   firstDocShare - the first signed document shared or mailed
 *   laterDay      - the first launch on a later calendar day than install
 */
export type ReviewTrigger = 'trialStarted' | 'claimFree' | 'firstExport' | 'firstDocShare' | 'laterDay';

/**
 * A rating prompt: never while a document is open for signing, at most one
 * per launch, each trigger once ever. (Engine rule; the engine's "attack
 * open" is this app's "document open".)
 */
export function reviewAllowed(opts: { docOpen: boolean; askedThisLaunch: boolean; triggerUsed: boolean }): boolean {
  return !opts.docOpen && !opts.askedThisLaunch && !opts.triggerUsed;
}

/** The whole decision for one ask: the guard above, and StoreKit able to show one at all. */
export function shouldAsk(opts: { docOpen: boolean; askedThisLaunch: boolean; triggerUsed: boolean; storeCanAsk: boolean }): boolean {
  return reviewAllowed(opts) && opts.storeCanAsk;
}

/** At launch: remember the install day the first time, ask on the first later day, else nothing. */
export function launchReview(installDay: string | null, today: string): 'record' | 'laterDay' | null {
  if (!installDay) return 'record';
  return installDay !== today ? 'laterDay' : null;
}

/** After a purchase: a trial that just started on the onboarding paywall asks for a rating. */
export function purchaseReview(opts: { onboarding: boolean; isPro: boolean; inTrial: boolean }): ReviewTrigger | null {
  return opts.onboarding && opts.isPro && opts.inTrial ? 'trialStarted' : null;
}

/**
 * When the onboarding paywall closes: with Pro, straight into the app; with
 * the X, the small "Your first export and first signed document are free"
 * sheet first, whose Claim asks for a rating.
 */
export function afterOnboardingPaywall(isPro: boolean): 'app' | 'claim' {
  return isPro ? 'app' : 'claim';
}

/** The local calendar day, "2026-11-03". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "What do you need today?" only picks the first screen after onboarding. */
export type Need = 'document' | 'image' | 'both';

export type FirstTab = 'create' | 'documents';

export function firstTabFor(need: Need | null | undefined): FirstTab {
  return need === 'document' ? 'documents' : 'create';
}
