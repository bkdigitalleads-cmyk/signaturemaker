@AGENTS.md

# Signature Maker (signaturemaker)

App #14 in Brian's iOS app portfolio (seller bkdigitalleads-cmyk). Expo SDK 57, React Native, TypeScript, @shopify/react-native-skia (the pen engine and every exported image), react-native-pdf (showing pages), pdf-lib (flattening a signed PDF), RevenueCat, expo-notifications (local only, one trial reminder). Engine forked from Migraine Log (migrainelog main at 402980c, Nov 3, 2026), which came from Image to Text, Pumping and Odo 1.0.6. The attack log, calendar, monthly numbers, medication list, doctor report, quick action and expo-sqlite were dropped; the library is JSON files plus PNGs in the document folder. There are no local native modules.

- App Store name: "Electronic Signature Maker" (fallbacks if taken: "Electronic Signature Creator", then "Signature Maker & Creator"). Subtitle "Sign Documents & PDF Creator". Home screen name and in-app name: "Signature Maker". Category Productivity, secondary Business. Bundle ID com.bwk.signaturemaker. Expo slug and scheme: signaturemaker. Owner bkdeveloper123. GitHub: bkdigitalleads-cmyk/signaturemaker.
- Not set up yet: app.json `extra.eas.projectId` (TODO_COWORK_EXPO_PROJECT_ID), app.json `extra.revenueCatApiKeyIos` (TODO_COWORK_REVENUECAT_PUBLIC_IOS_KEY), eas.json `ascAppId` (TODO_COWORK_ASC_APP_ID). Cowork fills them before the first build. The app runs with purchases off whenever the key does not start with `appl_`.
- Not in the store yet. Version 1.0.0 build 1 is on branch claude/signature-1.0.0 (PR, not merged).
- What it is: the fastest, best-looking way to make a signature on a phone, export it as a clean transparent PNG, and drop it onto a PDF. No account, no network, nothing leaves the phone.
- Legal line, everywhere it appears (Settings About, the website, the App Review note): "Signature Maker creates a signature image and places it on your document. It does not verify identity or certify signatures." Never add identity verification, audit trails, document delivery, a cloud, an account or anything that claims a legally binding e-signature without Brian asking.
- No brand word anywhere (app, store text, keywords, website): no other signing products or PDF software names.

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

- Type check: `npx tsc --noEmit`. Unit checks (stroke smoothing, pen widths and the outline, auto-crop bounds, view-to-PDF coordinates on rotated pages and different page sizes, pdf-lib flattening, free versus Pro, the library and recent lists, trial and plan rules, the rating guard): `npm test`. Bundle check: `npx expo export --platform ios`. Config: `npx expo config --type introspect`.
- Pure logic lives in src/stroke.ts, src/placement.ts, src/flatten.ts, src/gates.ts, src/library.ts, src/fonts.ts, src/rules.ts and src/offer.ts, with no React or native imports (they import each other with a `.ts` extension so Node runs them directly), so `npm test` checks exactly what the app runs.
- Simulator (needs Xcode): `npx expo start --ios` does not work in Expo Go (Skia, react-native-pdf and RevenueCat need a development build). Purchases do not complete in the simulator.
- Real-device check: TestFlight build from the EAS workflow, on Brian's iPhone. Skia drawing and its feel, Apple Pencil, react-native-pdf page rendering, the "Open in" route from Mail and Files, Photos saving, the clipboard, haptics, Dynamic Type and VoiceOver can only be judged there. NOTES.md has the TestFlight checklist.
