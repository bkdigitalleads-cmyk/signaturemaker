# Signature Maker, App Store metadata (1.0.4)

Everything here is pasted into App Store Connect by Brian and Cowork. No em dashes anywhere, no brand words (no other signing products or PDF software), no "Unlock", "Premium", "Seamless", "Effortless", "Welcome", "Let's", "Professional-grade" or exclamation marks.

App record: bundle id com.bwk.signaturemaker, SKU signaturemaker, ASC app id 6830028405 (https://apps.apple.com/app/id6830028405, eas.json `ascAppId`). Expo project bkdeveloper123/signaturemaker (projectId 588561f4-8e20-4bdd-9dfc-742100ee3ce7, app.json `extra.eas.projectId`), RevenueCat public iOS key in app.json `extra.revenueCatApiKeyIos` (set; the app runs with purchases off whenever it does not start with `appl_`).

## Name (28/30)
Electronic Signature Creator

"Electronic Signature Maker" was taken in App Store Connect, so the record was created with the first fallback. It carries "electronic signature" and "signature creator" as exact phrases. Home screen name and in-app name (app.json `name`): Signature Maker.

## Subtitle (26/30)
Sign Documents & PDF Maker

"Signature maker" still indexes across the name and the subtitle (Apple combines their words), and "sign documents" and "sign pdf" stay exact phrases.

## Keywords, English (U.S.) (98/100)
esign,e,fill,form,filler,signer,editor,generator,now,draw,initials,contract,autograph,png,doc,word

New in 1.0.2, as briefed by Brian (Nov 17). Rule: no word from the name or subtitle (electronic, signature, creator, sign, documents, pdf, maker), no repeats. Apple combines words across the name, subtitle and keywords, so "e signature", "signature maker", "sign pdf", "fill form", "form filler", "pdf editor", "signature generator", "sign now", "draw signature" and "sign doc" are covered without repeating a word. Counted with node: 98 characters, 16 words.

1.0.0 and 1.0.1 used: esign,esignature,draw,handwritten,autograph,initials,fill,forms,contract,png,transparent,generator,e (100). "handwritten" moved to the Spanish (Mexico) keywords below.

Research behind them (Nov 2, ASOMobile Apple search popularity, iTunes top 10, AppMagic revenue): "signature maker" 40, "sign documents" 38, "electronic signature" 34, "signature creator" 32, "sign pdf" 27. Eight of the top ten on "signature maker" have under 100 ratings; a 90-day-old app with 0 ratings is first on "electronic signature" and "signature creator"; apps under 5,000 downloads show $5K to $10K revenue bands.

## Spanish (Mexico) locale (new in 1.0.2)
Apple also indexes the Spanish (Mexico) locale's name, subtitle and keywords for searches on the U.S. App Store, so this locale carries a second set of English words. "Electronic Signature Creator" is taken in that storefront, so the locale has its own name. These are the values in App Store Connect (Nov 17); the description, promotional text, What's New and screenshots are copied from English (U.S.).

Name (30/30): Signature Maker: Sign PDF Docs

Subtitle (30/30): eSign, Fill Forms & PDF Filler

Keywords (97/100):
editor,signer,document,electronic,creator,generator,form,e,now,contract,handwritten,stamp,digital

Same rule as English: no word from this locale's name or subtitle, no repeats within the locale. Counted with node: 97 characters, 13 words. "editor" stays on purpose: adding text, dates and signatures to a PDF is the kind of editing these searches mean. The app has no camera, so there is no "scan".

## Seven more English listings (new in 1.0.4)
The U.S. App Store also indexes these locales' name, subtitle and keywords, so each carries its own set of English words, as Spanish (Mexico) already does. Brian's brief (Nov 25). English (U.S.), Spanish (Mexico), French, Italian, German and Spanish (Spain) stay exactly as they are.

Add each locale in App Store Connect and paste its three fields. The description, promotional text, support URL, marketing URL and privacy policy URL are copied from English (U.S.). What's New is "Small fixes and improvements." (see What's New (1.0.4) below).

| Locale | Name | Subtitle | Keywords | Lengths |
|---|---|---|---|---|
| ar-SA | PDF Signer & Form Filler | Document Sign, eSign Contracts | signature,e,electronic,app,maker,creator,generator,fill,lease,agreement,invoice,initials,draw,png | 24 / 30 / 97 |
| ko | eSign: Sign Documents & PDF | Electronic Signature App | signer,e,maker,creator,generator,filler,form,fill,contract,lease,agreement,invoice,initials,draw,png | 27 / 24 / 100 |
| pt-BR | PDF Filler: Fill Out Forms | E Signature, Document Signer | esign,sign,electronic,app,maker,creator,generator,contract,lease,agreement,invoice,initials,draw,png | 26 / 28 / 100 |
| ru | Signature Generator & Creator | Draw, Save & Sign PDF Docs | esign,signer,e,electronic,document,app,maker,filler,form,fill,contract,lease,agreement,invoice,png | 29 / 26 / 98 |
| vi | E Sign App: Forms & Contracts | PDF Signer & Signature Maker | esign,electronic,document,creator,generator,filler,fill,lease,agreement,invoice,initials,draw,png | 29 / 28 / 97 |
| zh-Hans | Document Signer: Sign PDF | E Signature for Contracts | esign,electronic,app,maker,creator,generator,filler,form,fill,lease,agreement,invoice,initials,draw | 25 / 25 / 99 |
| zh-Hant | Signature App: PDF Sign | eSign Contracts, Leases, Forms | signer,e,electronic,document,maker,creator,generator,filler,fill,agreement,invoice,initials,draw,png | 23 / 30 / 100 |

Lengths are name / subtitle characters and keyword bytes, counted with node (all ASCII, so bytes equal characters). `npm test` checks the table.

Rules for these seven (Brian, Nov 25), checked by `npm test`:
- A search phrase only forms inside one listing, so each target phrase sits whole in a name or subtitle, never split by a comma, colon or "&".
- Inside one listing no word repeats across the name, subtitle and keywords, and no plural or singular of a word already there ("Contracts" in a subtitle keeps "contract" out of its keywords).
- Names and subtitles at most 30 characters; keywords at most 100 bytes, comma separated, no spaces.
- No other signing or PDF product's name, nothing close to one ("now" is not used, so "sign now" never forms; no "fill and sign"), and nothing the app does not do (no scan, scanner, camera, cloud, send, verify, legally binding, certified).
- Keywords are, in order: the words that complete a target phrase with the listing's own name or subtitle (for example "signature" where the name has "maker" or "generator" free), then app words (contract, lease, agreement, invoice, initials, draw, png), as many as fit.

Changes from the draft names and subtitles:
- vi: the draft name "Sign App: E Sign Documents" used "Sign" twice. "E Sign App" now carries both "e sign" and "sign app" in three words.
- zh-Hant: the draft subtitle "Sign Lease, Contract & Invoice" repeated the name's "Sign", and "Sign Any PDF" split "sign pdf". The name is now "Signature App: PDF Sign" (signature app, pdf sign), and the subtitle "eSign Contracts, Leases, Forms".
- pt-BR: the draft name "PDF Filler: Fill Forms & Sign" read close to "Fill & Sign", a product name. It is now "PDF Filler: Fill Out Forms". The draft subtitle "Document Signing, E Signature" became "E Signature, Document Signer", so "document signer" forms as a whole phrase.
- ar-SA, ko, ru and zh-Hans are as drafted.

Where each target phrase sits whole (daily U.S. searches from the brief; "en-US" and "es-MX" are the existing listings):

| Phrase | Searches | Name | Subtitle |
|---|---|---|---|
| esign | 2423 | ko | ar-SA, zh-Hant, es-MX |
| sign documents | 1237 | ko | en-US |
| signature maker | 1221 | es-MX | vi |
| pdf filler | 1152 | pt-BR | es-MX |
| signature | 998 | en-US, ru, zh-Hant, es-MX | ko, pt-BR, vi, zh-Hans |
| e sign | 923 | vi | |
| form filler | 738 | ar-SA | |
| document sign | 699 | | ar-SA |
| electronic signature | 660 | en-US | ko |
| document signer | 629 | zh-Hans | pt-BR |
| sign app | 545 | vi | |
| signature creator | 537 | en-US | |
| pdf signer | 520 | ar-SA | vi |
| sign pdf | 371 | zh-Hans, es-MX | ru |
| signature generator | 276 | ru | |
| pdf sign | 159 | zh-Hant | |
| e signature | 141 | | pt-BR, zh-Hans |
| signature app | 118 | zh-Hant | ko |

## Promotional text (148/170)
Sign the PDF in your inbox from your iPhone. Draw or type your signature once, save it as a transparent PNG, and use it on any document. No account.

## Description
Sign a PDF on your iPhone in under a minute.

Draw your signature with a finger or Apple Pencil, or type it in a script font. Put it on a lease, an offer letter or a form from Mail or Files, and send the signed copy back. Save it as a transparent PNG for an email footer, Word or Canva. Everything stays on your phone.

DRAW OR TYPE YOUR SIGNATURE
• Draw on a sheet of paper with a signing line, with a finger or Apple Pencil
• Four pens: Ink gets thicker when you slow down or press harder, Ballpoint is even and thin, Marker is bold, Fountain is thick on the way down and thin on the way up
• Black, navy, blue or red ink, three thicknesses, undo, redo and clear
• Wide mode turns the paper sideways for a long name
• Or type your name and pick one of twelve script fonts, each shown with your name
• Initials, drawn or typed, kept with the signature

EXPORT A TRANSPARENT PNG
• Cropped to the ink with a small margin, at 2x or 3x
• Shown on a checkerboard, so you can see the background is clear, and at the foot of a letter
• For an email footer, Word, Pages, Canva or a form
• Also PNG or JPG on white, Save to Photos, Copy, or the share sheet

SIGN A PDF AND SEND IT BACK
• In Mail or Files, tap Share and choose Signature Maker, or open a PDF or a photo of a form in the app
• Your default signature goes on the page; drag it onto the line and pinch to size it
• Add initials, today's date and a line of text on any page
• Done signing saves a new copy named after the original with "signed" added; the original stays as it was
• Send it back with Mail or the share sheet; the last 20 signed files stay in Documents

PRIVATE
• Your signatures and documents stay on your iPhone
• No account, no sign-in, no cloud, no ads, no tracking
• Works in airplane mode

WHAT IT IS
Signature Maker creates a signature image and places it on your document. It does not verify identity or certify signatures, and it is not an identity-verified electronic signature service.

SIGNATURE MAKER PRO
Free: drawing, typing and saving as many signatures as you like, your library, and the export preview. Your first export and your first signed document are free too. Pro adds exports and signed documents with no corner mark, all four pens and all twelve fonts, initials, and the date and text stamps. Weekly (with a free trial for new subscribers), yearly, or lifetime with one payment.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://bkdigitalleads-cmyk.github.io/signaturemaker/privacy.html

## What's New (1.0.4)
Small fixes and improvements.

The same line goes in every listing: English (U.S.), Spanish (Mexico), French, Italian, German, Spanish (Spain) and the seven new ones (ar-SA, ko, pt-BR, ru, vi, zh-Hans, zh-Hant).

## What's New (1.0.3)
The app's own text is now in five languages. Each locale in App Store Connect gets its line; the German, French, Spanish and Italian locales need adding there if they are not set up yet (the rest of their listing can stay English for now). Spanish (Mexico) uses the Spanish line.

- English (U.S.): Signature Maker is now available in German, French, Spanish and Italian.
- German: Signature Maker gibt es jetzt auch auf Deutsch, Französisch, Spanisch und Italienisch.
- French: Signature Maker est désormais disponible en allemand, français, espagnol et italien.
- Spanish (Spain and Mexico): Signature Maker ya está disponible en alemán, francés, español e italiano.
- Italian: Signature Maker è ora disponibile in tedesco, francese, spagnolo e italiano.

## What's New (1.0.2)
Small fixes and improvements.

## What's New (1.0.1)
Pinch to zoom in on a page while signing, so a small signature line is easy to hit. Drag the paper to look around, double tap to zoom in or back out, and use the new smaller and bigger buttons to size a signature. Clearer wording on the export and trial screens.

## What's New (1.0.0)
First version. Draw or type your signature, save it as a transparent PNG, and sign PDFs from Mail or Files on your iPhone.

## Category
Primary: Productivity. Secondary: Business.

## Age rating
4+. Every content question is None: no user-generated content shared with others, no web browsing, no medical information, no gambling, no contests.

## App Privacy (nutrition label)
Purchases (Purchase History), used for App Functionality, not linked to the user's identity, not used for tracking. This is the label in App Store Connect (Nov 16), because RevenueCat keeps the purchase history, under an anonymous app user id, to confirm Pro. Nothing else is collected: signatures and documents stay in the app's storage on the device and are never uploaded, and there is no account and no analytics.

Permissions: only NSPhotoLibraryAddUsageDescription (add-only, asked the first time someone taps Save to Photos). Photos of documents are chosen with the system photo picker, which needs no access. No camera, microphone or location. One local notification, the trial reminder, asked on the onboarding reminder screen.

## Pricing and RevenueCat
- Subscription group "Signature Maker Pro".
- `signature_pro_weekly`: auto-renewing weekly, $4.99/week, 3-day free trial (introductory offer). RevenueCat package `$rc_weekly`. Listed first and preselected on the onboarding paywall.
- `signature_pro_yearly`: auto-renewing yearly, $19.99/year, no trial. RevenueCat package `$rc_annual`.
- `signature_pro_lifetime`: non-consumable, $39.99 one time. RevenueCat package `$rc_lifetime`. Listed first and preselected on the in-app paywall as "Lifetime, pay once".
- RevenueCat: entitlement `pro` (attach all three products), offering `default` with the three packages.
- Prices and trial text in the app always come from StoreKit.

## App Review contact and support
- Support URL: https://bkdigitalleads-cmyk.github.io/signaturemaker/support.html (has the contact address).
- Contact email for App Review and on the support page: bkdigitalleads@gmail.com. Settings in the app has "Email support", which opens Mail with the subject "Signature Maker support".
- Marketing URL: https://bkdigitalleads-cmyk.github.io/signaturemaker/
- Privacy Policy URL: https://bkdigitalleads-cmyk.github.io/signaturemaker/privacy.html

## App Review note (paste into ASC, Notes)
Signature Maker makes signature images and places them on documents the user already has. It does not provide a legally binding e-signature service, identity verification, audit trails or document delivery; the About section in Settings says so in one line ("Signature Maker creates a signature image and places it on your document. It does not verify identity or certify signatures."). There is no account or sign-in and no network feature; nothing the user makes or opens is uploaded.

Free: drawing, typing and saving any number of signatures, the library, and the export preview. The first signature export (any format) and the first signed document are free and unmarked. After that, an export or a signed document opens the in-app paywall first; closing it still saves the file, with a small "Made with Signature Maker" mark in the corner, so the user is never stuck.

Pro adds exports and signed documents with no mark, the Marker and Fountain pens, eight more script fonts, initials, and the date and text stamps. Products: weekly with a 3-day free trial, yearly, and a one-time lifetime purchase. Restore purchases is on both paywalls and in Settings.

On first launch: three short screens that show the app (a signature being drawn, the same signature as a transparent image, and on a lease), a question about what the user needs today (it only picks the first tab), then "Sign here" with the drawing pad, where the user can draw or type a signature or tap "Skip for now". If the Apple ID can still get the free trial, two screens explain the trial and its reminder (the reminder screen may ask for notification permission, used only for one local reminder the day before a trial ends). Then the paywall opens. The close button (X, top right) appears after 3 seconds; tapping it shows a small sheet saying the first export and the first signed document are free, with a Claim button that closes it. The app then opens. The native rating prompt (StoreKit) may appear after Claim or after a trial starts; it is never shown more than once per launch.

To test signing with any PDF: open the Files app (or Mail) on the test device, tap any PDF, tap Share and choose Signature Maker; or in the app, open Documents and tap Open a PDF. Tap Signature (the signature from onboarding is already there; if it was skipped, the app asks you to draw one first), drag it onto the page, pinch or pull its corner to resize, then tap Done signing. The signed copy appears in Documents with Open and Share. To test a signature image: on Create, draw with a finger, tap Save signature, and on the export screen tap Share Transparent PNG.

## Screenshots (store/screenshots/, made by store/screenshots.js from the renders)
6.9 inch at 1320x2868 and 6.5 inch at 1242x2688, six each, in this order. The caption at the top of each carries the search terms in order of importance, in Newsreader on the warm paper background; no device frames, no gradients, no emoji. Shots 2, 5 and 6 are close-ups cut from the screen, so the signature, the date and the stamps read at search-result size.
1. "Signature Maker": a drawn signature in blue ink on the canvas, the pen row under it (whole screen)
2. "Sign Documents & PDFs": page 2 of a lease, the signature on the tenant line with the date beside it, and the Signature, Initials, Date and Text tools with Done signing under the page (close-up)
3. "Transparent PNG Signature": "Jordan, black ink" on the checkerboard (whole screen)
4. "Type It in 12 Script Styles": the font list showing the name (whole screen)
5. "Initials, Date and Text": page 1's fields, initials on the Tenant initials line, the date beside them and the pet's name typed in, with the tools under it (close-up)
6. "Private. Works Offline.": Settings from Help to the whole About card with the legal line and "No account" (close-up; the delete button is out of frame)

docs/design/after has every screen for reference.
