# Signature Maker, App Store metadata (1.0.0)

Everything here is pasted into App Store Connect by Brian and Cowork. No em dashes anywhere, no brand words (no other signing products or PDF software), no "Unlock", "Premium", "Seamless", "Effortless", "Welcome", "Let's", "Professional-grade" or exclamation marks.

App record: bundle id com.bwk.signaturemaker, SKU signaturemaker, ASC app id 6830028405 (https://apps.apple.com/app/id6830028405, eas.json `ascAppId`). Expo project bkdeveloper123/signaturemaker (projectId 588561f4-8e20-4bdd-9dfc-742100ee3ce7, app.json `extra.eas.projectId`), RevenueCat public iOS key in app.json `extra.revenueCatApiKeyIos` (set; the app runs with purchases off whenever it does not start with `appl_`).

## Name (28/30)
Electronic Signature Creator

"Electronic Signature Maker" was taken in App Store Connect, so the record was created with the first fallback. It carries "electronic signature" and "signature creator" as exact phrases. Home screen name and in-app name (app.json `name`): Signature Maker.

## Subtitle (26/30)
Sign Documents & PDF Maker

"Signature maker" still indexes across the name and the subtitle (Apple combines their words), and "sign documents" and "sign pdf" stay exact phrases.

## Keywords (100/100)
esign,esignature,draw,handwritten,autograph,initials,fill,forms,contract,png,transparent,generator,e

Rule: no word from the name or subtitle (electronic, signature, creator, sign, documents, pdf, maker), no brand names. Apple combines words across the name, subtitle and keywords, so "signature maker", "sign pdf", "draw signature", "transparent signature png", "signature generator", "fill forms" and "e signature" are covered without repeating a word. The last keyword, "e", is as briefed (it pairs with "signature" for "e signature"). Counted with node: 100 characters exactly.

Research behind them (Nov 2, ASOMobile Apple search popularity, iTunes top 10, AppMagic revenue): "signature maker" 40, "sign documents" 38, "electronic signature" 34, "signature creator" 32, "sign pdf" 27. Eight of the top ten on "signature maker" have under 100 ratings; a 90-day-old app with 0 ratings is first on "electronic signature" and "signature creator"; apps under 5,000 downloads show $5K to $10K revenue bands.

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

## What's New (1.0.0)
First version. Draw or type your signature, save it as a transparent PNG, and sign PDFs from Mail or Files on your iPhone.

## Category
Primary: Productivity. Secondary: Business.

## Age rating
4+. Every content question is None: no user-generated content shared with others, no web browsing, no medical information, no gambling, no contests.

## App Privacy (nutrition label)
Data Not Collected. Signatures and documents stay in the app's storage on the device and are never uploaded; there is no account and no analytics. RevenueCat validates purchases with an anonymous app user id and purchase history; answer the purchase questions the same way as for Migraine Log, Image to Text, Pumping and Odo.

Permissions: only NSPhotoLibraryAddUsageDescription (add-only, asked the first time someone taps Save to Photos). Photos of documents are chosen with the system photo picker, which needs no access. No camera, microphone or location. One local notification, the trial reminder, asked on the onboarding reminder screen.

## Pricing and RevenueCat
- Subscription group "Signature Maker Pro".
- `signature_pro_weekly`: auto-renewing weekly, $4.99/week, 3-day free trial (introductory offer). RevenueCat package `$rc_weekly`. Listed first and preselected on the onboarding paywall.
- `signature_pro_yearly`: auto-renewing yearly, $19.99/year, no trial. RevenueCat package `$rc_annual`.
- `signature_pro_lifetime`: non-consumable, $39.99 one time. RevenueCat package `$rc_lifetime`. Listed first and preselected on the in-app paywall as "Lifetime, pay once".
- RevenueCat: entitlement `pro` (attach all three products), offering `default` with the three packages.
- Prices and trial text in the app always come from StoreKit.

## App Review note (paste into ASC, Notes)
Signature Maker makes signature images and places them on documents the user already has. It does not provide a legally binding e-signature service, identity verification, audit trails or document delivery; the About section in Settings says so in one line ("Signature Maker creates a signature image and places it on your document. It does not verify identity or certify signatures."). There is no account or sign-in and no network feature; nothing the user makes or opens is uploaded.

Free: drawing, typing and saving any number of signatures, the library, and the export preview. The first signature export (any format) and the first signed document are free and unmarked. After that, an export or a signed document opens the in-app paywall first; closing it still saves the file, with a small "Made with Signature Maker" mark in the corner, so the user is never stuck.

Pro adds exports and signed documents with no mark, the Marker and Fountain pens, eight more script fonts, initials, and the date and text stamps. Products: weekly with a 3-day free trial, yearly, and a one-time lifetime purchase. Restore purchases is on both paywalls and in Settings.

On first launch: three short screens that show the app (a signature being drawn, the same signature as a transparent image, and on a lease), a question about what the user needs today (it only picks the first tab), then "Sign here" with the drawing pad, where the user can draw or type a signature or tap "Skip for now". If the Apple ID can still get the free trial, two screens explain the trial and its reminder (the reminder screen may ask for notification permission, used only for one local reminder the day before a trial ends). Then the paywall opens. The close button (X, top right) appears after 3 seconds; tapping it shows a small sheet saying the first export and the first signed document are free, with a Claim button that closes it. The app then opens. The native rating prompt (StoreKit) may appear after Claim or after a trial starts; it is never shown more than once per launch.

To test signing with any PDF: open the Files app (or Mail) on the test device, tap any PDF, tap Share and choose Signature Maker; or in the app, open Documents and tap Open a PDF. Tap Signature (the signature from onboarding is already there; if it was skipped, the app asks you to draw one first), drag it onto the page, pinch or pull its corner to resize, then tap Done signing. The signed copy appears in Documents with Open and Share. To test a signature image: on Create, draw with a finger, tap Save signature, and on the export screen tap Share Transparent PNG.

## Screenshots (store/screenshots/, made by store/screenshots.js from the renders)
6.9 inch at 1320x2868 and 6.5 inch at 1242x2688, six each, in this order. The caption at the top of each carries the search terms in order of importance, in Newsreader on the warm paper background, with the screen under it; no device frames, no gradients, no emoji.
1. "Signature Maker": a drawn signature on the canvas
2. "Sign Documents & PDFs": the signature placed on a lease
3. "Transparent PNG Signature": the export on the checkerboard
4. "Type It in 12 Script Styles": the font list
5. "Initials, Date and Text": the stamps on a page
6. "Private. Works Offline.": the About line in Settings

docs/design/after has every screen for reference.
