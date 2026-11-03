# Signature Maker design notes (1.0.0, Nov 3, 2026)

## Concept: a clean desk

The person opening this app has a lease, an offer letter or a W-9 in their inbox and five minutes. They want a signature that looks like theirs, not a scribble, and they want it on the page. So the app is a clean desk with one sheet of paper on it. The desk is a warm grey-beige (#EFEBE3), never pure white; the sheet, which is the drawing pad, the type preview and the paper behind every saved signature, is a warmer paper white (#FBF9F4). Text is ink black (#1A1A1E). There is one accent, a deep blue ink (#1D3A8A), and it means one thing: the primary action on the screen (Save signature, Share, Done signing, Continue). Everything else is ink on paper: chosen pills get a darker well and an ink outline, never the blue; the selection frame on a placed signature is ink, not blue.

The canvas is the hero. On Create the first thing you see is the sheet, about a third of the screen tall, with a thin signing line, a small cross where the pen starts and one quiet line under it ("Draw with a finger or Apple Pencil"). Undo, redo, clear and Wide sit under it in small glyphs; the pen row and the inks under that; then one big blue button. Nothing else competes with it.

The dark theme follows the system. The desk turns to a dark warm grey (#1B1A18) and the type to warm white, but the sheet stays paper (#EDE9E0, a little dimmed), because it is the paper the signature is made on and every ink color has to read on it. The blue lifts to #7393E6 with dark text so the main button keeps its contrast. App.tsx paints the desk's colour while fonts load and the splash is the desk colour in both themes, so nothing flashes white.

Motion is quiet: sheets and modals fade; feedback is by touch (a success haptic on Save signature, an export and Done signing, a selection tick on pens, inks, sizes and fonts, a light tap when a placement drops on the page).

## The system

- Type (`type` in `src/theme.ts`), one scale: title 28 (Newsreader Medium, screen titles and onboarding lines), body 17 (system font; buttons in semibold), small 13 (secondary lines, labels, the tab bar). Newsreader (SIL OFL, static Medium and Regular instances at the 24 pt optical size, made with fontTools from google/fonts ofl/newsreader and renamed so they never clash) is a book face: it belongs on a desk and stays quiet next to twelve script signatures. Exceptions, on purpose: the mock letter on the export screen is set in Newsreader Regular 13 (it is a letter), and the paywall's legal lines stay at the engine's 11 and 12.
- Spacing (`space`): 4, 8, 12, 16, 24, 32. Screens sit 16 in from the edge.
- Corners, two: `radius.large` 18 (the canvas, cards, sheets, the main button) and `radius.small` 10 (pills, inputs, quiet buttons, the tool tiles). Circles stay circles. Pages of a document are square-cornered with a 1 px edge, like paper.
- Depth: the desk, the sheet, and the surface tone (#F8F5EF) for cards and grouped rows, each with a 1 px edge at 9% ink. Lists are inset cards with hairlines between rows.
- Sizes: the main button fills the width and is 64 pt; every other target is at least 44 pt (pens 56, tool tiles 56, ink and size dots 44).
- Glyphs (`src/ui/Glyph.tsx`): drawn for this app on a 24 grid with round ends, like a fine pen. Tabs: create (a signature loop on its line), library (two sheets, one signed), documents (a page with a folded corner and a signed line), settings (two sliders). No icon pack, no pen, no quill.
- The pen row (`src/ui/PenRow.tsx`): each pen's glyph is a short squiggle drawn by the pen engine itself (`sampleStroke`), so Ink thickens and thins, Ballpoint is even and thin, Marker is bold and Fountain is thick going down. Locked pens carry a small lock.
- Components (`src/ui/`, all new, nothing reused from Migraine Log's dark room): Tap (the only way something becomes tappable, always with a pressed state), InkButton, QuietButton, GlyphButton, Pill, Panel, Row, Title, Caption, Label, Field, TopBar, Toast, Drawer, Pad, PenRow and PenGlyph, MarkView, Checker, PageView, TabBar, and on the Sign screen Tool and Placed.

## The pen engine (what makes this not a template)

`src/stroke.ts`: the raw touch points go through a centripetal Catmull-Rom spline (it passes through every point and never loops on sharp turns), resampled every 2 points; each sample gets a width by the pen's rule (Ink by speed, or by Apple Pencil pressure when the screen reports it; Fountain by direction; Ballpoint and Marker even), the widths are softened forward and back so edges never get ragged, and the ends taper. The outline is a strip of quads with round caps and joins, all wound one way, so Skia's nonzero fill unions them with no seams. The same outline is drawn on the pad and into the exported PNG, so the file is exactly what you saw.

## Renders

`after/` holds the screens at 393x852 points @3x, reduced to 192 colours. They come from a throwaway web copy of the app (not in the repo) driven by Playwright: the real screens, kit and pen engine on react-native-web, with Skia's canvas swapped for SVG drawing the same outline paths and the exporter swapped for the browser canvas filling the same paths (Path2D) and the same bundled script fonts; react-native-pdf swapped for the sample lease's pages rendered by pdftoppm; an in-memory file store; a stubbed store with $4.99 weekly with 3 days free, $19.99 yearly and $24.99 lifetime; fixed iPhone safe areas and a drawn status bar. Every signature in them was drawn by moving the mouse along a hand-made "Jordan Ellis" (keypoints through the same spline, slower into the turns), and the placement shots are real drags on the page. Haptics, Dynamic Type, VoiceOver and the native PDF view's exact page edges are not visible in them.

- Home (`01-home-empty`, `02-home-mid-signature` with the second stroke under the finger, `03-home-signed`), the pen row with Fountain and with Marker chosen (`04`, `05`), dark (`06-home-dark`).
- Typed (`07-type-fonts`): the name, its preview on paper, the inks and the fonts as rows showing the name; initials (`08-initials`).
- Export (`09-export-checkerboard`, `10-export-letter`, `11-export-marked`, the second free export after closing the paywall).
- Library (`12-library`, `13-library-initials`, `14-library-actions`).
- Documents (`15-documents-empty`, `16-document-pages`, `17-add-signature` with the default first, `18-placement-resize` with the corner handle being pulled, `19-signed`, `20-documents`).
- Paywalls (`21-paywall-onboarding` with Weekly and the trial, `22-paywall-in-app` from the second export with Lifetime first), Settings (`23-settings`), onboarding (`24` to `29`).

## The "does it look AI-built" pass

Migraine Log's polish pass (docs/design/NOTES.md there) named the tells: too many type sizes, ad hoc spacing, flat single-tone screens, clip-art drawings on onboarding and paywalls, every list as a stack of identical cards. This app started from those rules, and the renders were checked against them twice. What was found and changed:

- The pad was a fixed 232 points with empty desk under the pen row; it now takes about a third of the screen (220 to 320 points), so the sheet is the hero on every phone size.
- "Sign here" was the title and a placeholder on the pad at once; the pad now says how to use it ("Draw with a finger or Apple Pencil") and the cross on the line does the rest.
- Toasts sat over the bottom buttons; they now show under the status bar for about 3 seconds.
- The library rows had order numbers (1, 2) on the right, which said nothing; gone. Order is the order you see.
- The sign tools were a horizontal strip of pills cut off at the edge ("Add da"); they are four equal tiles (a glyph over Signature, Initials, Date, Text; VoiceOver reads "Add signature" and so on), and Text becomes Remove while a placement is selected.
- "Signed." was a generic document icon over a title; it now shows the signed page itself, with the signature where it was placed.
- "Save to Photos" truncated next to Copy; Copy no longer stretches.
- The black and navy ink dots disappeared on the dark desk; every ink dot has a faint ring.
- The first icon option read as a letter "h"; the stroke was redrawn as one loop with a long tail.
- The paywall's third row touched the footer at 852 points; the rows are 64 points and the gaps tighter, so all three show with Continue and the legal text.

## Icon

Three options in `icon-options.png`, each big and at 60 px on a light and a dark wallpaper, drawn by `store/icon.js` (`node icon.js options`; `node icon.js` writes `assets/` and the website images). Every stroke is drawn by the app's own pen engine (the Fountain pen), so the icon is the product.

1. flourish (picked): one confident deep-blue stroke, a tall loop that runs out into a long tail, over a faint signing line, on paper. It reads at 60 px on both wallpapers and says "a signature" without a pen.
2. line: the sign-here cross and one black stroke along the line. Clear, but heavier and closer to a generic form icon.
3. card: the flourish in paper white on the deep blue. The strongest at 60 px, but the brief asks for ink on paper, and blue tiles are everywhere in Productivity.

No pen clip art, no nib, no feather quill. The splash shows the stroke alone on the desk colour (a lighter blue in dark mode).

## Checklist

- [x] Concept and tokens in `src/theme.ts`; light by default, dark follows the system, the sheet stays paper; no white flash.
- [x] One type scale (28, 17, 13), one spacing scale, two corners, one accent on the primary action only.
- [x] The canvas is the hero; the pen row shows real strokes; drawn glyphs; own component kit.
- [x] The main button is 64 pt; every target at least 44 pt.
- [x] VoiceOver labels on every control; the pad has a label and a "Type instead" route; placements have Make bigger, Make smaller and Remove actions.
- [x] Dynamic Type: body text scales; titles and buttons cap at 1.3 to 1.5x. Designed for, not yet checked on a device.
- [x] Copy voice grep-checked.
- [x] `after/*.png` for every screen in the brief, re-rendered after the polish pass.
- [x] Icon options drawn; flourish picked and written to `assets/` and the website images.
