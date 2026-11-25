@AGENTS.md

# Signature Maker (signaturemaker)

App #14 in Brian's iOS app portfolio (seller bkdigitalleads-cmyk). Expo SDK 57, React Native, TypeScript, @shopify/react-native-skia (the pen engine and every exported image), react-native-pdf (showing pages), pdf-lib (flattening a signed PDF), RevenueCat, expo-notifications (local only, one trial reminder). Engine forked from Migraine Log (migrainelog main at 402980c, Nov 3, 2026), which came from Image to Text, Pumping and Odo 1.0.6. The attack log, calendar, monthly numbers, medication list, doctor report, quick action and expo-sqlite were dropped; the library is JSON files plus PNGs in the document folder. There are no local native modules.

- App Store name: "Electronic Signature Creator" ("Electronic Signature Maker" was taken in App Store Connect). Subtitle "Sign Documents & PDF Maker", so "signature maker" indexes across the name and subtitle and "sign documents" and "sign pdf" stay exact. ASC app id 6830028405 (https://apps.apple.com/app/id6830028405). Home screen name and in-app name: "Signature Maker". Category Productivity, secondary Business. Bundle ID com.bwk.signaturemaker. Expo slug and scheme: signaturemaker. Owner bkdeveloper123. GitHub: bkdigitalleads-cmyk/signaturemaker.
- Set up (Nov 3, 2026): eas.json `ascAppId` 6830028405, app.json `extra.eas.projectId` (project bkdeveloper123/signaturemaker) and app.json `extra.revenueCatApiKeyIos` (the public SDK key, starts with `appl_`, so purchases are on). The app runs with purchases off whenever the key does not start with `appl_`.
- In the store. 1.0.2 (build 5) was approved on Nov 18, 2026. 1.0.3 build 6 (the app in German, French, Spanish and Italian) is on main. 1.0.4 build 7 is a keyword release with no app code changes (seven more English listings, new en-US and es-MX keyword fields); it is PR 7 on branch claude/1.0.4-keywords. NOTES.md has the history; App Store Connect status is tracked by Brian's Cowork session.
- Store listings: store/metadata.md holds every listing's exact name, subtitle, keywords and What's New, ready to paste into App Store Connect. English (U.S.) is the main one. Spanish (Mexico) and, from 1.0.4, ar-SA, ko, pt-BR, ru, vi, zh-Hans and zh-Hant carry extra English words, because the U.S. App Store indexes those locales too. German, French, Spanish (Spain) and Italian are the translated listings. Listing rules (checked by `npm test`):
  - A search phrase only forms inside one listing, so a target phrase sits whole in a name or subtitle.
  - No word repeats inside a listing, and no plural of a word already there.
  - Names and subtitles are at most 30 characters; keywords at most 100 bytes, comma separated, no spaces.
  - No other signing or PDF product's name, and nothing close to one (no "now", so "sign now" never forms; no "fill and sign"; no "pdf filler" in a new listing's name or subtitle).
  - Nothing the app does not do (no scan, scanner, camera, cloud, send, verify, legally binding, certified).
- What it is: the fastest, best-looking way to make a signature on a phone, export it as a clean transparent PNG, and drop it onto a PDF. No account, no network, nothing leaves the phone.
- Legal line, everywhere it appears (Settings About, the website, the App Review note): "Signature Maker creates a signature image and places it on your document. It does not verify identity or certify signatures." Never add identity verification, audit trails, document delivery, a cloud, an account or anything that claims a legally binding e-signature without Brian asking.
- No brand word anywhere (app, store text, keywords, website): no other signing products or PDF software names.
- Languages (since 1.0.3): the app's own text is in English (the default and the fallback), German, French, Spanish and Italian.
  - Every word the app shows or reads out is in src/strings/en.ts, and de.ts, fr.ts, es.ts and it.ts have exactly its shape. A new string goes into all five; tsc fails on a missing one.
  - Screens read words through `t` from src/i18n.ts, never as literals. A test fails on an English literal in an alert, toast, label or hint.
  - Dates and numbers go through src/format.ts in the phone's locale. Prices stay StoreKit's own `priceString`.
  - src/locale.ts reads expo-localization once, before App loads (index.ts).
  - app.json declares the languages (the expo-localization plugin's `supportedLocales.ios`, which writes CFBundleLocalizations) and translates the Photos prompt through `locales` (assets/locales/<lang>.json).
  - German uses du, French vous, Spanish and Italian tu/tú.
  - Kept in English on purpose: the "Made with Signature Maker" mark, the "signed" in a signed copy's file name, the support email subject and "Signature Maker".
  - The subscription disclosure must mean the same in every language.

## How shipping works (read before every push)

- A push to `main` that touches app.json, eas.json, package*.json, App.tsx, index.ts, src/, assets/ or modules/ starts an EAS workflow (.eas/workflows/deploy.yml) once the Expo project is connected. It builds iOS in the cloud and uploads the build to App Store Connect / TestFlight. Every such push costs a paid build credit. (modules/ stays in the filter from the engine; this app has none.)
- Never merge to `main` without Brian. Work on a branch and open a PR.
- Pushes that only change Markdown files (CLAUDE.md, NOTES.md, README.md, store/metadata.md), store/ or docs/ do not build.
- Version numbers are local (`appVersionSource: local`, no auto-increment). Before any push that builds: raise `ios.buildNumber` in app.json by 1, and raise `version` when it will become a new App Store release. A build number that was already used makes the upload fail.
- Before every commit: run `npx tsc --noEmit` and `npm test`, and fix every error.
- Batch the changes for one app into one push. Ask Brian before any push that builds, and say what is in it.
- Submitting for App Review, release dates, prices, the subtitle, keywords, the age rating and screenshots all happen in App Store Connect. Brian and his Cowork session handle that side. Do not try to do it from here.

## Rules

- Brian handles every credential and sign-in. Never type, paste, print or store passwords, tokens or API keys. If git push asks for credentials, stop and tell Brian.
- No spending (paid services, extra builds beyond what Brian approved) without Brian saying go.
- Never change the RevenueCat entitlement id `pro`, the offering `default`, the product ids (signature_pro_weekly, signature_pro_yearly, signature_pro_lifetime), the packages ($rc_weekly, $rc_annual, $rc_lifetime) or the logic in src/purchases.ts (a copy of the engine's) without Brian asking. Paying users must never lose Pro.
- Free forever (src/gates.ts holds the rules, with checks): making and saving any number of signatures, the whole library, and the export preview. The first signature export and the first signed document are free and clean. Later free exports and documents open the paywall first, and closing it still makes the file, with the small "Made with Signature Maker" corner mark. Never lock the library.
- Never overwrite the original document. A signed copy is always a new file, "<original> signed.pdf" (src/flatten.ts `signedName`).
- The stored formats must stay readable after launch: signatures/index.json (src/library.ts `parseLibrary`) and signed/recent.json (`parseRecent`) only ever gain optional fields; old files must still parse. Drawn signatures keep their raw points, so a later pen engine can redraw them.
- Do not change the app name, subtitle, keywords or the rating-prompt triggers (first export, first signed document shared, later-day launch; never while a document is open) without asking.
- Keep changes small. Fix what the task needs and tidy only the files you already touch. List anything else you notice in NOTES.md under "Noticed, not changed" instead of fixing it. No broad refactors, dependency upgrades or Expo SDK upgrades unless Brian asks.
- Copy voice: plain, short, confident. No "Unlock", "Premium", "Seamless", "Effortless", "Welcome", "Let's", "Professional-grade", exclamation marks or em dashes in any user-facing text (app, notifications, store text, website), and none in text Brian sends to other people.
- Design, "a clean desk" (docs/design/NOTES.md): light by default, the dark theme follows the system; the canvas stays paper in both. One accent, the deep blue ink, only on the primary action (InkButton). The canvas is the hero. Use the theme's tokens, never ad hoc values: one type scale (`type.title` 28 Newsreader, `type.body`/`type.strong` 17, `type.small` 13), the spacing scale (`space`: 4, 8, 12, 16, 24, 32), two corners (`radius.large` 18 for the canvas, cards, sheets and InkButton; `radius.small` 10 for pills, inputs and quiet buttons). The main button is at least 64 pt. Glyphs are drawn in src/ui/Glyph.tsx; the pen row shows real strokes from the pen engine. No icon pack.
- Fonts: only SIL OFL fonts, each with its licence in assets/fonts/licences (the UI's Newsreader in assets/fonts). Check a new font's METADATA.pb says OFL before adding it (Satisfy, Homemade Apple and Yellowtail are Apache, so they are not used).
- plugins/withoutPushEntitlement.js stays last in app.json plugins. After touching plugins, check `npx expo config --type introspect` still shows `ios.entitlements` as `{}`, no camera, microphone, location or full photo-library usage strings (only NSPhotoLibraryAddUsageDescription), CFBundleDocumentTypes for PDF and images, and LSSupportsOpeningDocumentsInPlace false (iOS copies an "Open in" file into the app, so the original is never touched).
- Nothing leaves the device. Never add analytics, a server, sync or a network call.

## Logging (so Brian's Cowork session can follow along)

- With every commit, add an entry at the top of NOTES.md in the same commit: date, version/build, what changed and why, and how it was checked.

## Testing

- Type check: `npx tsc --noEmit`. Unit checks (stroke smoothing, pen widths and the outline, auto-crop bounds, view-to-PDF coordinates on rotated pages and different page sizes, pdf-lib flattening, free versus Pro, the library and recent lists, trial and plan rules, the rating guard, the five languages and the disclosure in each, the store listings in store/metadata.md): `npm test`. Bundle check: `npx expo export --platform ios`. Config: `npx expo config --type introspect`.
- Pure logic lives in src/stroke.ts, src/placement.ts, src/flatten.ts, src/gates.ts, src/library.ts, src/fonts.ts, src/rules.ts, src/offer.ts, src/i18n.ts, src/format.ts and src/strings/*.ts, with no React or native imports (they import each other with a `.ts` extension so Node runs them directly), so `npm test` checks exactly what the app runs.
- Simulator (needs Xcode): `npx expo start --ios` does not work in Expo Go (Skia, react-native-pdf and RevenueCat need a development build). Purchases do not complete in the simulator.
- Real-device check: TestFlight build from the EAS workflow, on Brian's iPhone. Skia drawing and its feel, Apple Pencil, react-native-pdf page rendering, the "Open in" route from Mail and Files, Photos saving, the clipboard, haptics, Dynamic Type and VoiceOver can only be judged there. NOTES.md has the TestFlight checklist.
