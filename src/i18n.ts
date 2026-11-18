/**
 * The app's words in the person's language: English (the default and the
 * fallback), German, French, Spanish and Italian. Pure (no React or native
 * imports), so `npm test` checks it; src/locale.ts reads the device's
 * languages with expo-localization and calls setLocale once at startup,
 * before any screen loads. iOS restarts an app when its language changes,
 * so the choice holds for the whole launch.
 *
 * Use: `import { t } from './i18n'` then `t.settings.title`. `t` is one
 * object whose sections are swapped in place, so it is always current.
 */
import { en, type Strings } from './strings/en.ts';
import { de } from './strings/de.ts';
import { fr } from './strings/fr.ts';
import { es } from './strings/es.ts';
import { it } from './strings/it.ts';
import { setFormatLocale } from './format.ts';

export const LANGUAGES = ['en', 'de', 'fr', 'es', 'it'] as const;
export type Lang = (typeof LANGUAGES)[number];

export const DICTIONARIES: Record<Lang, Strings> = { en, de, fr, es, it };

export const t: Strings = { ...en };

let current: Lang = 'en';

/** The language the words are in now. */
export function language(): Lang {
  return current;
}

/**
 * The first of the person's languages that the app has, in their order
 * (as iOS picks an app's language); English when none is. Tags like
 * "de-AT", "fr_CA" or "es-419" match by their language part.
 */
export function pickLanguage(tags: readonly (string | null | undefined)[]): Lang {
  for (const tag of tags) {
    const code = (tag ?? '').toLowerCase().split(/[-_]/)[0];
    if ((LANGUAGES as readonly string[]).includes(code)) return code as Lang;
  }
  return 'en';
}

/**
 * Sets the words from the person's preferred languages (most preferred
 * first) and dates and numbers from the first one's full tag (its region
 * too, so a German phone in Switzerland gets Swiss number formats).
 */
export function setLocale(tags: readonly (string | null | undefined)[]): Lang {
  const lang = pickLanguage(tags);
  Object.assign(t, DICTIONARIES[lang]);
  current = lang;
  setFormatLocale(tags.find((x) => !!x) ?? 'en-US');
  return lang;
}
