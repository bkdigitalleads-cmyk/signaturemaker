/**
 * Small behavior rules as pure functions checked by `npm test`: when a
 * rating prompt may ask, the local day key, and which screen comes first
 * after onboarding.
 */

/**
 * A rating prompt: never while a document is open for signing, at most one
 * per launch, each trigger once ever. (Engine rule; the engine's "attack
 * open" is this app's "document open".)
 */
export function reviewAllowed(opts: { docOpen: boolean; askedThisLaunch: boolean; triggerUsed: boolean }): boolean {
  return !opts.docOpen && !opts.askedThisLaunch && !opts.triggerUsed;
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
