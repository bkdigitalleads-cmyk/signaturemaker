const sharp = require('sharp');
const opentype = require('opentype.js');
const fs = require('fs');
const path = require('path');

// App Store screenshots, built from the app's real screens (docs/design/after,
// or a folder of the same names at full colour: `node screenshots.js <dir>`).
// Each is the warm paper of the app's desk, a short caption at the top in the
// app's own serif (Newsreader Medium, drawn as outlines so it looks the same
// anywhere), and under it either the whole screen with its own rounded
// corners, or close-ups cut from a screen (`cards`): the signed page large
// enough that the signature and the date read at search-result size, with the
// page's tool row under it, or the About card. No device frames, no
// gradients, no emoji. Captions carry the search terms in order of
// importance. Writes store/screenshots/6.9/ (1320x2868) and 6.5/ (1242x2688).

const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'docs/design/after');
const NEWS = opentype.loadSync(path.join(ROOT, 'assets/fonts/Newsreader-Medium.ttf'));
const DESK = '#EFEBE3';
const INK = '#1A1A1E';
const EDGE = 'rgba(26,26,30,0.10)';

const SHOTS = [
  { file: '04-pen-row-fountain', caption: 'Signature Maker' },
  { cards: ['37-close-sign', '38-close-sign-tools'], caption: 'Sign Documents & PDFs' },
  { file: '09-export-checkerboard', caption: 'Transparent PNG Signature' },
  { file: '07-type-fonts', caption: 'Type It in 12 Script Styles' },
  { cards: ['39-close-stamps', '40-close-stamps-tools'], caption: 'Initials, Date and Text' },
  { cards: ['41-close-about'], caption: 'Private. Works Offline.' },
];

const SIZES = [
  { name: '6.9', width: 1320, height: 2868 },
  { name: '6.5', width: 1242, height: 2688 },
];

/** The caption as one or two centred lines, as large as fits (a long one breaks at a word). */
function captionSvg(text, width, top, maxSize) {
  const maxW = width * 0.86;
  const widthAt = (t, size) => NEWS.getAdvanceWidth(t, size);
  let lines = [text];
  let size = maxSize;
  while (size > maxSize * 0.72 && widthAt(text, size) > maxW) size -= 2;
  if (widthAt(text, size) > maxW) {
    // Two lines, split at the space closest to the middle.
    const words = text.split(' ');
    let best = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const d = Math.abs(widthAt(words.slice(0, i).join(' '), maxSize) - widthAt(words.slice(i).join(' '), maxSize));
      if (d < bestDiff) {
        bestDiff = d;
        best = i;
      }
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    size = maxSize;
    while (lines.some((l) => widthAt(l, size) > maxW)) size -= 2;
  }
  const lineH = size * 1.12;
  const paths = lines
    .map((l, i) => {
      const x = (width - widthAt(l, size)) / 2;
      return `<path d="${NEWS.getPath(l, x, top + size + i * lineH, size).toPathData(2)}" fill="${INK}"/>`;
    })
    .join('');
  return { paths, bottom: top + size + (lines.length - 1) * lineH + size * 0.3 };
}

/** Close-ups stacked under the caption: as wide as the frame allows, centred in the space left. */
async function cardsShot(shot, size, k, cap) {
  const gap = Math.round(56 * k);
  const top0 = Math.round(Math.max(cap.bottom + 70 * k, 470 * k));
  const availH = size.height - top0 - Math.round(90 * k);
  const metas = await Promise.all(shot.cards.map((c) => sharp(path.join(SRC, `${c}.png`)).metadata()));
  let w = Math.round(1180 * k);
  const heightAt = (wd) => metas.reduce((t, m) => t + Math.round((m.height / m.width) * wd), 0) + gap * (metas.length - 1);
  if (heightAt(w) > availH) w = Math.floor(w * (availH / heightAt(w)));
  let y = top0 + Math.round((availH - heightAt(w)) / 2);
  const left = Math.round((size.width - w) / 2);
  const r = Math.round(40 * k);
  const comps = [];
  let edges = '';
  for (let i = 0; i < shot.cards.length; i++) {
    const h = Math.round((metas[i].height / metas[i].width) * w);
    const img = await sharp(path.join(SRC, `${shot.cards[i]}.png`)).resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
    const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
    comps.push({ input: await sharp(img).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer(), left, top: y });
    edges += `<rect x="${left - 1.5}" y="${y - 1.5}" width="${w + 3}" height="${h + 3}" rx="${r + 1.5}" fill="${EDGE}"/>`;
    y += h + gap;
  }
  const bg = `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size.width}" height="${size.height}" fill="${DESK}"/>
    ${cap.paths}
    ${edges}
  </svg>`;
  return sharp(Buffer.from(bg)).composite(comps).flatten({ background: DESK }).png({ compressionLevel: 9 }).toBuffer();
}

async function one(shot, size) {
  const k = size.width / 1320;
  const cap = captionSvg(shot.caption, size.width, Math.round(150 * k), Math.round(118 * k));
  if (shot.cards) return cardsShot(shot, size, k, cap);
  // The screen fills the rest: centred, its top under the caption, its foot just inside the edge.
  const top = Math.round(Math.max(cap.bottom + 70 * k, 470 * k));
  const screenH = size.height - top - Math.round(70 * k);
  const screenW = Math.round(screenH * (393 / 852));
  const left = Math.round((size.width - screenW) / 2);
  const r = Math.round(screenW * (55 / 393));
  const src = path.join(SRC, `${shot.file}.png`);
  const screen = await sharp(src).resize(screenW, screenH, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
  const mask = Buffer.from(`<svg width="${screenW}" height="${screenH}"><rect width="${screenW}" height="${screenH}" rx="${r}" fill="#fff"/></svg>`);
  const rounded = await sharp(screen).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  const bg = `<svg width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size.width}" height="${size.height}" fill="${DESK}"/>
    ${cap.paths}
    <rect x="${left - 1.5}" y="${top - 1.5}" width="${screenW + 3}" height="${screenH + 3}" rx="${r + 1.5}" fill="${EDGE}"/>
  </svg>`;
  return sharp(Buffer.from(bg)).composite([{ input: rounded, left, top }]).flatten({ background: DESK }).png({ compressionLevel: 9 }).toBuffer();
}

(async () => {
  for (const size of SIZES) {
    const dir = path.join(__dirname, 'screenshots', size.name);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < SHOTS.length; i++) {
      const out = path.join(dir, `${i + 1}-${SHOTS[i].caption.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}.png`);
      fs.writeFileSync(out, await one(SHOTS[i], size));
      console.log(path.relative(ROOT, out));
    }
  }
})();
