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

## Promotional text (154/170)
Draw or type a signature that looks like yours, save it as a transparent PNG, and sign a PDF from Mail in under a minute. No account. Nothing is uploaded.

## Description
Make a signature that looks like yours in under a minute, save it as a clean transparent PNG, and sign the PDF in your inbox without leaving your phone. Signature Maker works offline, needs no account, and nothing leaves your iPhone.

DRAW OR TYPE A SIGNATURE THAT LOOKS LIKE YOURS
• Smooth ink with a finger or Apple Pencil, on a wide sheet of paper with a signing line
• Four pens: Ink thickens and thins with your speed or pressure, Ballpoint is even and thin, Marker is bold, Fountain is thick on the way down and thin on the way up
• Black, navy, blue or red ink, three thicknesses, undo, redo and clear
• Wide mode turns the paper sideways so a long name fits
• Or type your name and pick from twelve script fonts, shown as live previews of your name
• Initials too, drawn or typed, kept with the signature

EXPORT A TRANSPARENT PNG
• Cropped to your ink with a small margin, at 2x or 3x
• Shown on a checkerboard so you can see it really is transparent, and at the foot of a letter so you see it in context
• Ready for an email footer, Word, Pages, Canva or a form
• PNG or JPG on white, Save to Photos, Copy, or the share sheet

SIGN ANY PDF AND SEND IT BACK
• In Mail or Files, tap Share and choose Signature Maker, or open a PDF or a photo of a form inside the app
• Your default signature goes on the page; drag it onto the line and pinch to size it
• Add initials, today's date and a line of text, on any page
• Done signing saves a new copy named after the original with "signed" added; the original is never changed
• Send it back with Mail or the share sheet; the last 20 signed files stay in Documents

PRIVATE BY DESIGN
• Your signatures and documents stay on your iPhone
• No account, no sign-in, no cloud, no ads, no tracking
• Works in airplane mode

WHAT IT IS
Signature Maker creates a signature image and places it on your document. It does not verify identity or certify signatures, and it is not an identity-verified electronic signature service.

SIGNATURE MAKER PRO
Free, always: drawing, typing and saving any number of signatures, your library, and the export preview. Your first export and your first signed document are free too. Pro adds unlimited exports and signed documents with no corner mark, all four pens and all twelve fonts, initials, and the date and text stamps. Choose weekly (with a free trial for new subscribers), yearly, or lifetime with one payment.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://bkdigitalleads-cmyk.github.io/signaturemaker/privacy.html

## What's New (1.0.0)
First version. Draw or type your signature, save it as a transparent PNG, and sign PDFs from Mail or Files, all on your iPhone.

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

Pro adds unlimited unmarked exports and signed documents, the Marker and Fountain pens, eight more script fonts, initials, and the date and text stamps. Products: weekly with a 3-day free trial, yearly, and a one-time lifetime purchase. Restore purchases is on both paywalls and in Settings.

On first launch: three short intro screens, a question about what the user needs today (it only picks the first tab), and, if the Apple ID can still get the free trial, two screens about the trial and its reminder (the reminder screen may ask for notification permission, used only for one local reminder the day before a trial ends). Then the paywall opens. The close button (X, top right) appears after 3 seconds; tap it to use the app for free.

To test signing with any PDF: open the Files app (or Mail) on the test device, tap any PDF, tap Share and choose Signature Maker; or in the app, open Documents and tap Open a PDF. Tap Signature (if no signature is saved yet the app asks you to draw one first), drag it onto the page, pinch or pull its corner to resize, then tap Done signing. The signed copy appears in Documents with Open and Share. To test a signature image: on Create, draw with a finger, tap Save signature, and on the export screen tap Share Transparent PNG.

## Screenshot plan (iPhone 6.9" and 6.5", 6 shots; Brian captures from a TestFlight build)
1. Draw a signature on the canvas: Create with a signature in blue ink on the paper, the pen row visible: "Draw a signature that looks like yours"
2. Transparent PNG on a checkerboard: the export screen with Transparent PNG chosen: "A transparent PNG, ready for email, Word and Canva"
3. 12 script fonts: Type instead with a name and the font rows: "Or type it in 12 script fonts"
4. Place a signature on a PDF: a lease page with the signature on the tenant line and its corner handle: "Sign any PDF on your phone"
5. The signed PDF ready to send: "Signed." with the page and Send it back: "Signed and ready to send back"
6. Private and offline: the Library or Documents with airplane mode in the status bar: "No account. Nothing leaves your phone"

Renders of every screen are in docs/design/after for reference; the store shots come from a real device.
