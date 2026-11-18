/**
 * Plan and trial rules as pure functions (no native imports), checked by `npm test`.
 * The store objects come from RevenueCat; these only look at plain fields,
 * so prices and trial lengths always come from StoreKit.
 *
 * Engine copy (Migraine Log, Image to Text, Pumping, Odo 1.0.6) with one
 * addition: the lifetime package ($rc_lifetime, a one-time non-consumable),
 * so the paywall has three rows. trialLength, trialLabelFrom,
 * trialReminderAt and yearlySavingPct are unchanged. The words come from
 * the dictionary (src/strings), so they follow the device's language.
 */
import { t } from './i18n.ts';

export interface IntroLike {
  price: number;
  periodNumberOfUnits: number;
  /** 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' */
  periodUnit: string;
}

const UNITS = ['day', 'week', 'month', 'year'] as const;

/** "3 days" for a free trial (in the app's language), or null when the intro offer is not free. */
export function trialLength(intro: IntroLike | null | undefined): string | null {
  if (!intro || intro.price !== 0 || !(intro.periodNumberOfUnits > 0)) return null;
  const unit = UNITS.find((u) => u === intro.periodUnit.toLowerCase()) ?? 'day';
  return t.offer.period(intro.periodNumberOfUnits, unit);
}

/** "3 days free", only when the trial exists and this Apple ID can still get it. */
export function trialLabelFrom(intro: IntroLike | null | undefined, eligible: boolean): string | null {
  const len = eligible ? trialLength(intro) : null;
  return len ? t.offer.free(len) : null;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * When the "trial ends tomorrow" reminder fires: a day before the trial
 * ends. Sandbox trials last minutes, so when that is under an hour away
 * (or the end is unknown), 2 days from now instead; the foreground check
 * cancels it once the trial is over.
 */
export function trialReminderAt(expiresMs: number | null, now: number): number {
  const at = expiresMs != null ? expiresMs - DAY : now + 2 * DAY;
  return at < now + HOUR ? now + 2 * DAY : at;
}

export type PlanType = 'WEEKLY' | 'ANNUAL' | 'LIFETIME';

/** RevenueCat's packageType for the three packages; anything else is not shown. */
export function planTypeOf(packageType: string): PlanType | null {
  return packageType === 'WEEKLY' || packageType === 'ANNUAL' || packageType === 'LIFETIME' ? packageType : null;
}

/**
 * The plans shown, in order. Onboarding: weekly first (it carries the free
 * trial), then yearly, then lifetime. In the app: lifetime first ("Lifetime,
 * pay once"), then yearly, then weekly. Someone who arrives with one urgent
 * lease and comes back for a second is buying a tool, and utilities sell
 * one-time prices; lifetime costs about two years of yearly.
 */
export function planOrder(onboarding: boolean): PlanType[] {
  return onboarding ? ['WEEKLY', 'ANNUAL', 'LIFETIME'] : ['LIFETIME', 'ANNUAL', 'WEEKLY'];
}

/** The preselected plan among those the store returned. */
export function preselect(available: string[], onboarding: boolean): PlanType | null {
  for (const t of planOrder(onboarding)) if (available.includes(t)) return t;
  return null;
}

/** The row title for a plan. */
export function planTitle(t: PlanType): string {
  return t === 'WEEKLY' ? words().weekly : t === 'ANNUAL' ? words().yearly : words().lifetime;
}

/** Whole percent saved by paying yearly instead of 52 weeks, or null when it is not a saving. */
export function yearlySavingPct(weeklyPrice: number, yearlyPrice: number): number | null {
  if (!(weeklyPrice > 0) || !(yearlyPrice > 0)) return null;
  const pct = Math.floor((1 - yearlyPrice / (weeklyPrice * 52)) * 100);
  return pct > 0 ? pct : null;
}

// The paywall's words (the plan titles), read at call time so they follow the language.
const words = () => t.paywall;

/**
 * The always-visible 3.1.2(c) disclosure, from the prices StoreKit returned
 * (its own price strings, in the store's currency and format).
 * `trialLength` is "3 days" (trialLength above) or null when no trial applies.
 */
export function disclosureText(p: { weekly?: string | null; yearly?: string | null; lifetime?: string | null; trialLength?: string | null }): string {
  const o = t.offer;
  const parts: string[] = [];
  if (p.yearly) parts.push(o.yearly(p.yearly));
  if (p.weekly) parts.push(o.weekly(p.weekly, p.trialLength ?? null));
  if (p.lifetime) parts.push(o.lifetime(p.lifetime));
  const head = parts.length > 0 ? parts.join(' ') : o.noPrices;
  return `${head} ${o.billing}`;
}
