/**
 * Dates, numbers and money in the device's locale (its language and
 * region, for example de-DE or fr-CH), whatever language the words are in.
 * Pure (no React or native imports), so `npm test` checks it. src/locale.ts
 * sets the tag once at startup; until then it is en-US.
 */

let tag = 'en-US';

/** The BCP 47 tag dates and numbers are formatted with. */
export function formatLocale(): string {
  return tag;
}

export function setFormatLocale(next: string | null | undefined): void {
  if (!next) return;
  try {
    // Throws on a tag Intl does not accept; keep the last good one then.
    new Intl.NumberFormat(next);
    tag = next;
  } catch {
    // keep the current tag
  }
}

/** A whole or decimal number with the locale's grouping ("1.320" in German). */
export function num(n: number, opts?: Intl.NumberFormatOptions): string {
  try {
    return n.toLocaleString(tag, opts);
  } catch {
    return String(n);
  }
}

/** A price from a number, in the store's currency (only for derived prices; StoreKit's own strings are used as they are). */
export function money(n: number, currency = 'USD'): string {
  return num(n, { style: 'currency', currency });
}

/** A date in the locale's own order and month names. */
export function date(ms: number, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(ms).toLocaleDateString(tag, opts);
  } catch {
    return new Date(ms).toDateString();
  }
}
