/**
 * Reads the person's languages once, at startup, and sets the app's words
 * and number and date formats from them (src/i18n.ts). index.ts loads this
 * before the app's screens, so every label is in the right language from
 * the first frame. With the languages declared in app.json (the
 * expo-localization plugin's supportedLocales), iOS also offers a language
 * for this app alone in Settings, Signature Maker, Language; that choice
 * comes first in this list.
 */
import { getLocales } from 'expo-localization';
import { setLocale } from './i18n';

try {
  setLocale(getLocales().map((l) => l.languageTag));
} catch {
  // English, the default, stays.
}
