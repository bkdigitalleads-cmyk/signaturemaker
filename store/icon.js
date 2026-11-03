const sharp = require('sharp');
const opentype = require('opentype.js');
const path = require('path');

// Signature Maker icon, in the app's "clean desk" palette: warm paper, ink,
// one deep blue. Every stroke is drawn by the app's own pen engine
// (../src/stroke.ts), so the icon is the product, not clip art. Three
// options for docs/design/icon-options.png (`node icon.js options`); the
// chosen one is written to ../assets and the website (`node icon.js`).
//   flourish - one confident blue stroke with a tall loop and a long tail,
//              over a faint signing line. A signature, made here.
//   line     - the sign-here cross and one black stroke swept along the line
//   card     - the same flourish in paper white on the deep blue ink
// No pen, no nib, no feather quill.
// Chosen: card (see docs/design/NOTES.md).
const CHOSEN = 'card';

const ROOT = path.join(__dirname, '..');
const NEWS = opentype.loadSync(ROOT + '/assets/fonts/Newsreader-Medium.ttf');
const PAPER = '#F6F2EA';
const PAPER_TOP = '#FBF8F2';
const INK = '#17171B';
const BLUE = '#1D3A8A';
const LINE = '#CFC6B7';

let E; // the pen engine, loaded in main()

/** A stroke from keypoints in a 200-unit box, drawn by the engine, scaled to the 1024 tile. */
function engineStroke(keys, pen, k, color, scale = 5.12, dx = 0, dy = 0) {
  // Keypoints are smoothed into a hand's path first, with slower time into the turns.
  const hand = E.smooth(keys.map((p) => [p[0], p[1], 0, 0]), 1.2);
  let t = 0;
  const pts = hand.map((p, i) => {
    if (i > 0) {
      const d = Math.hypot(p[0] - hand[i - 1][0], p[1] - hand[i - 1][1]);
      t += d / 0.9 + 2;
    }
    return [p[0], p[1], t, 0];
  });
  const d = E.strokePath({ pen, size: 2, pts, k });
  return `<g transform="translate(${dx} ${dy}) scale(${scale})"><path d="${d}" fill="${color}"/></g>`;
}

const paper = `
  <defs><linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PAPER_TOP}"/><stop offset="1" stop-color="${PAPER}"/></linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#paper)"/>`;

const FLOURISH = [[22, 126], [44, 116], [72, 88], [98, 54], [110, 32], [106, 22], [94, 26], [86, 50], [84, 90], [90, 124], [100, 142], [116, 146], [142, 140], [168, 130], [186, 122]];

const art = {
  flourish: () => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">${paper}
    <path d="M150 780 L874 780" stroke="${LINE}" stroke-width="10" stroke-linecap="round"/>
    ${engineStroke(FLOURISH, 'fountain', 2.3, BLUE, 5.12, 0, 34)}
  </svg>`,
  line: () => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">${paper}
    <path d="M190 660 L270 740 M270 660 L190 740" stroke="${INK}" stroke-width="22" stroke-linecap="round"/>
    <path d="M170 790 L860 790" stroke="${LINE}" stroke-width="12" stroke-linecap="round"/>
    ${engineStroke([[64, 132], [80, 110], [100, 98], [112, 112], [118, 132], [128, 124], [150, 104], [176, 90]], 'ink', 2.8, INK, 5.12, 0, 0)}
  </svg>`,
  card: () => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="${BLUE}"/>
    <path d="M150 780 L874 780" stroke="#3F5BA6" stroke-width="10" stroke-linecap="round"/>
    ${engineStroke(FLOURISH, 'fountain', 2.3, PAPER, 5.12, 0, 34)}
  </svg>`,
};

const LABELS = { flourish: '1  flourish', line: '2  line', card: '3  card (shipped)' };

function textPath(font, text, size, x, y) {
  return font.getPath(text, x, y, size).toPathData(2);
}

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

/** The tile with the iOS corner mask, for showing on a wallpaper. */
async function rounded(svg, size) {
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.2237}" fill="#fff"/></svg>`);
  return sharp(await png(svg, size)).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

async function options() {
  const W = 1500;
  const H = 820;
  const comps = [];
  const names = Object.keys(art);
  for (let i = 0; i < names.length; i++) {
    const x = 60 + i * 480;
    comps.push({ input: await rounded(art[names[i]](), 400), left: x, top: 60 });
    // At 60 px on a light and a dark wallpaper, the size on a home screen.
    comps.push({ input: await rounded(art[names[i]](), 60), left: x + 90, top: 560 });
    comps.push({ input: await rounded(art[names[i]](), 60), left: x + 250, top: 560 });
  }
  const labels = names.map((n, i) => `<path d="${textPath(NEWS, LABELS[n], 30, 60 + i * 480, 515)}" fill="${INK}"/>`).join('');
  const bg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="#E9E4DA"/>
    ${names.map((_, i) => `<rect x="${60 + i * 480 + 60}" y="530" width="120" height="120" rx="20" fill="#D9D2C4"/><rect x="${60 + i * 480 + 220}" y="530" width="120" height="120" rx="20" fill="#232220"/>`).join('')}
    ${labels}
    <path d="${textPath(NEWS, '60 px, light and dark wallpaper', 22, 60, 720)}" fill="#6B665D"/>
  </svg>`;
  await sharp(Buffer.from(bg)).composite(comps).png().toFile(ROOT + '/docs/design/icon-options.png');
  console.log('wrote docs/design/icon-options.png');
}

async function write() {
  const svg = art[CHOSEN]();
  await sharp(await png(svg, 1024)).flatten({ background: BLUE }).png().toFile(ROOT + '/assets/icon.png');
  // Splash and the adaptive foreground: the stroke alone, on clear.
  // Splash: the blue tile itself, with its corners, centred on the desk colour (light and dark).
  const tile = await rounded(svg, 512);
  await sharp(tile).png().toFile(ROOT + '/assets/splash-icon.png');
  await sharp(tile).png().toFile(ROOT + '/assets/splash-icon-dark.png');
  // Android adaptive foreground: the cream stroke alone; app.json sets the blue as its background.
  const strokeOnly = (color) => `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">${engineStroke(FLOURISH, 'fountain', 2.3, color, 5.12, 0, 34)}</svg>`;
  await sharp(Buffer.from(strokeOnly(PAPER))).resize(1024, 1024).png().toFile(ROOT + '/assets/android-icon-foreground.png');
  await sharp(await png(svg, 48)).png().toFile(ROOT + '/assets/favicon.png');
  await sharp(await png(svg, 512)).png().toFile(ROOT + '/docs/icon-512.png');
  await sharp(await png(svg, 180)).png().toFile(ROOT + '/docs/apple-touch-icon.png');
  // Open Graph image: the icon, the name and the subtitle on paper.
  const og = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="${PAPER}"/>
    <path d="${textPath(NEWS, 'Signature Maker', 76, 470, 290)}" fill="${INK}"/>
    <path d="${textPath(NEWS, 'Draw a signature, export a transparent PNG,', 34, 472, 360)}" fill="#57554F"/>
    <path d="${textPath(NEWS, 'and sign PDFs on iPhone.', 34, 472, 406)}" fill="#57554F"/>
  </svg>`;
  await sharp(Buffer.from(og)).composite([{ input: await rounded(svg, 330), left: 90, top: 150 }]).png().toFile(ROOT + '/docs/og-image.png');
  console.log('wrote assets/ and docs/ images');
}

(async () => {
  E = await import(ROOT + '/src/stroke.ts');
  if (process.argv[2] === 'options') await options();
  else await write();
})();
