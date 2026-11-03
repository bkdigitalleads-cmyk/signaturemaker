// Unit checks for the pure logic: the pen engine (smoothing, widths, the
// outline, bounds and the export crop), page coordinates (view to display to
// PDF user space on rotated pages, offset crop boxes and different page
// sizes), flattening with pdf-lib on real PDFs, free versus Pro, the library
// and recent lists, fonts and licences, trial and plan rules, the rating
// guard, and the app config. Run with `npm test` (Node 22+ strips the
// TypeScript types itself).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, degrees, decodePDFRawStream, PDFRawStream, PDFArray, PDFName, PDFStream } = require('pdf-lib');

const S = await import('../src/stroke.ts');
const P = await import('../src/placement.ts');
const F = await import('../src/flatten.ts');
const G = await import('../src/gates.ts');
const L = await import('../src/library.ts');
const T = await import('../src/fonts.ts');
const O = await import('../src/offer.ts');
const U = await import('../src/rules.ts');

const ROOT = new URL('..', import.meta.url).pathname;
const close = (a, b, eps = 1e-6, msg) => assert.ok(Math.abs(a - b) <= eps, msg ?? `${a} is not within ${eps} of ${b}`);

/** A stroke along a path, `ms` apart, with optional force. */
const stroke = (pen, xy, ms = 10, force = 0, size = 1) => ({ pen, size, pts: xy.map(([x, y], i) => [x, y, i * ms, force]) });
const line = (x0, y0, x1, y1, n = 20) => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
const wave = (n = 60) => Array.from({ length: n + 1 }, (_, i) => [10 + i * 5, 100 + 30 * Math.sin(i / 5)]);
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

// ---------- the pen engine ----------

test('smoothing: passes through every touch point, resamples evenly, keeps time and force in order', () => {
  const keys = [[0, 0, 0, 0.2], [40, 30, 40, 0.4], [80, 0, 80, 0.6], [120, 30, 120, 0.8]];
  const out = S.smooth(keys, 2);
  for (const k of keys) assert.ok(out.some((p) => Math.hypot(p[0] - k[0], p[1] - k[1]) < 1e-6), `missing ${k}`);
  for (let i = 1; i < out.length; i++) {
    const d = Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
    assert.ok(d <= 2.6, `gap ${d}`);
    assert.ok(out[i][2] >= out[i - 1][2], 'time goes forward');
    assert.ok(out.every((p) => p.every(Number.isFinite)));
  }
  // The curve is smooth between points: the middle of a segment leaves the straight chord.
  const mid = out.find((p) => Math.abs(p[0] - 20) < 1.5);
  assert.ok(Math.abs(mid[1] - 15) > 0.3, 'not a straight line');
});

test('smoothing: no loops on a sharp turn (centripetal), and duplicates and jitter are dropped', () => {
  const zig = S.smooth([[0, 0, 0, 0], [100, 0, 10, 0], [100.5, 0.2, 11, 0], [0, 4, 20, 0]], 2);
  // Never overshoots far past the turn.
  assert.ok(Math.max(...zig.map((p) => p[0])) < 106);
  const d = S.dedupe([[0, 0, 0, 0], [0.1, 0.1, 1, 0], [0.2, 0, 2, 0], [5, 5, 3, 0]]);
  assert.deepEqual(d.map((p) => p[0]), [0, 5]);
  assert.equal(S.smooth([[3, 4, 0, 0]]).length, 1);
});

test('pens: Ballpoint even and thin, Marker even and bold, thicker steps are thicker', () => {
  const pts = wave();
  const bp = S.layout(stroke('ballpoint', pts));
  const mk = S.layout(stroke('marker', pts));
  const mid = (s) => s.r.slice(10, -10);
  assert.ok(Math.max(...mid(bp)) - Math.min(...mid(bp)) < 1e-9, 'ballpoint is even');
  assert.ok(Math.max(...mid(mk)) - Math.min(...mid(mk)) < 1e-9, 'marker is even');
  assert.ok(mean(mid(mk)) > mean(mid(bp)) * 2.5);
  const r = [0, 1, 2].map((size) => mean(mid(S.layout(stroke('ballpoint', pts, 10, 0, size)))));
  assert.ok(r[0] < r[1] && r[1] < r[2]);
});

test('pens: Ink is thicker slow than fast, follows Pencil force, and tapers at the ends', () => {
  const pts = line(0, 0, 300, 0, 60);
  const slow = S.layout(stroke('ink', pts, 40));
  const fast = S.layout(stroke('ink', pts, 2));
  const mid = (s) => mean(s.r.slice(40, -40));
  assert.ok(mid(slow) > mid(fast) * 1.6, `${mid(slow)} vs ${mid(fast)}`);
  assert.ok(S.inkSpeedFactor(0) > S.inkSpeedFactor(1) && S.inkSpeedFactor(1) > S.inkSpeedFactor(5));
  const light = S.layout(stroke('ink', pts, 10, 0.1));
  const hard = S.layout(stroke('ink', pts, 10, 0.9));
  assert.ok(mid(hard) > mid(light) * 1.8);
  assert.ok(slow.r[0] < mid(slow) * 0.8 && slow.r[slow.r.length - 1] < mid(slow) * 0.8, 'tapered ends');
});

test('pens: Fountain is thick on down-strokes and thin on up-strokes', () => {
  const down = S.layout(stroke('fountain', line(0, 0, 10, 200, 40)));
  const up = S.layout(stroke('fountain', line(0, 200, 10, 0, 40)));
  const mid = (s) => mean(s.r.slice(20, -20));
  assert.ok(mid(down) > mid(up) * 2.5, `${mid(down)} vs ${mid(up)}`);
  assert.ok(S.fountainFactor(1) > S.fountainFactor(0) && S.fountainFactor(0) > S.fountainFactor(-1));
});

test('outline: every piece is wound the same way (nonzero fill unions them), with caps; a tap is a dot', () => {
  const d = S.strokePath(stroke('ink', wave()));
  assert.ok(d.startsWith('M') && !/NaN|Infinity/.test(d));
  // Every quad has positive signed area in screen coordinates, the same winding the round caps use.
  const quads = [...d.matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)Z/g)];
  assert.ok(quads.length > 50);
  for (const q of quads) {
    const n = q.slice(1).map(Number);
    assert.ok(S.signedArea2([n[0], n[2], n[4], n[6]], [n[1], n[3], n[5], n[7]]) >= -1e-6);
  }
  assert.ok((d.match(/A/g) ?? []).length >= 4, 'round caps');
  const dot = S.strokePath(stroke('ink', [[10, 10]]));
  assert.match(dot, /^M[\d.]+ 10A/);
  // A sharp hairpin still gives only positive pieces.
  const hair = S.strokePath(stroke('marker', [[0, 0], [100, 0], [0, 2]]));
  for (const q of hair.matchAll(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)Z/g)) {
    const n = q.slice(1).map(Number);
    assert.ok(S.signedArea2([n[0], n[2], n[4], n[6]], [n[1], n[3], n[5], n[7]]) >= -1e-6);
  }
});

test('auto-crop: bounds include the line width; the crop adds a small even margin and snaps to whole points', () => {
  const st = stroke('marker', line(50, 80, 250, 80));
  const b = S.strokesBounds([st]);
  const r = S.layout(st).r[10];
  close(b.x, 50 - r, 1e-6);
  close(b.width, 200 + 2 * r, 1e-6);
  close(b.height, 2 * r, 1e-6);
  const c = S.cropRect(b);
  const m = Math.min(16, Math.max(4, b.width * 0.04)); // 8.x for this one
  assert.ok(c.x <= b.x - m && c.x > b.x - m - 1);
  assert.ok(c.x + c.width >= b.x + b.width + m && c.x + c.width < b.x + b.width + m + 1);
  for (const v of [c.x, c.y, c.width, c.height]) assert.equal(v, Math.round(v));
  // Small marks get at least 4 points, big ones at most 16.
  const tiny = S.cropRect({ x: 10, y: 10, width: 20, height: 5 });
  assert.equal(tiny.x, 6);
  const huge = S.cropRect({ x: 0, y: 0, width: 2000, height: 100 });
  assert.equal(huge.x, -16);
  assert.deepEqual(S.pixelSize({ x: 0, y: 0, width: 120, height: 40 }, 3), { width: 360, height: 120 });
  assert.deepEqual(S.pixelSize({ x: 0, y: 0, width: 120, height: 40 }, 2), { width: 240, height: 80 });
  assert.equal(S.strokesBounds([]), null);
  assert.equal(S.hasInk([]), false);
  // Several strokes: the union.
  const u = S.strokesBounds([st, stroke('marker', line(100, 20, 100, 40))]);
  assert.ok(u.y < 20 && u.y + u.height > 80);
});

test('wide mode: fitting strokes into a smaller pad keeps their shape and line weight; ones that fit are untouched', () => {
  // A calm hand (about 0.2 points per ms), so no width sits at the engine's thinnest floor.
  const st = [stroke('ink', line(0, 100, 700, 100, 200), 20)];
  const fit = S.fitStrokes(st, 361, 232);
  const b = S.strokesBounds(fit);
  assert.ok(b.x >= 0 && b.x + b.width <= 361 && b.y >= 0 && b.y + b.height <= 232);
  const k = fit[0].k;
  assert.ok(k < 1);
  const midMean = (s) => mean(s.r.slice(Math.floor(s.r.length / 3), Math.floor((2 * s.r.length) / 3)));
  close(midMean(S.layout(fit[0])) / midMean(S.layout(st[0])), k, k * 0.01);
  const inside = [stroke('ink', line(20, 20, 100, 40))];
  assert.equal(S.fitStrokes(inside, 361, 232), inside);
  const back = S.scaleStrokes(S.scaleStrokes(inside, 2.5), 1 / 2.5);
  close(back[0].pts[5][0], inside[0].pts[5][0], 1e-9);
  close(back[0].k, 1, 1e-12);
  const c = S.compactStroke({ pen: 'ink', size: 1, pts: [[1.234, 5.678, 12.6, 0.456]] });
  assert.deepEqual(c.pts[0], [1.2, 5.7, 13, 0.46]);
});

// ---------- page coordinates ----------

const PAGES = [
  { name: 'Letter', x: 0, y: 0, width: 612, height: 792, rotation: 0 },
  { name: 'A4 at 90', x: 0, y: 0, width: 595.28, height: 841.89, rotation: 90 },
  { name: 'Letter at 180', x: 0, y: 0, width: 612, height: 792, rotation: 180 },
  { name: 'A4 landscape at 270', x: 0, y: 0, width: 841.89, height: 595.28, rotation: 270 },
  { name: 'Legal, crop box offset', x: 36, y: 18, width: 540, height: 972, rotation: 0 },
  { name: 'offset crop at 90', x: 20, y: 30, width: 500, height: 700, rotation: -270 },
  { name: 'offset crop at 270', x: 20, y: 30, width: 500, height: 700, rotation: 630 },
];

test('rotation: normalised to 0, 90, 180, 270 (negatives and over 360 too); the shown size swaps at 90 and 270', () => {
  assert.deepEqual([0, 90, 180, 270, 360, -90, 450, 630, -270, 89].map(P.normRotation), [0, 90, 180, 270, 0, 270, 90, 270, 90, 90]);
  assert.deepEqual(P.displaySize(PAGES[0]), { width: 612, height: 792 });
  assert.deepEqual(P.displaySize(PAGES[1]), { width: 841.89, height: 595.28 });
  assert.deepEqual(P.displaySize(PAGES[3]), { width: 595.28, height: 841.89 });
});

test('view to PDF: the shown top-left corner and every corner land where a viewer shows them, on every page', () => {
  for (const p of PAGES) {
    const s = P.displaySize(p);
    // Display corners to user space, and back.
    for (const [dx, dy] of [[0, 0], [s.width, 0], [0, s.height], [s.width, s.height], [123.4, 56.7]]) {
      const u = P.displayToPdf(p, dx, dy);
      assert.ok(u.x >= p.x - 1e-9 && u.x <= p.x + p.width + 1e-9 && u.y >= p.y - 1e-9 && u.y <= p.y + p.height + 1e-9, `${p.name} outside`);
      const back = P.pdfToDisplay(p, u.x, u.y);
      close(back.x, dx, 1e-9, `${p.name} x`);
      close(back.y, dy, 1e-9, `${p.name} y`);
    }
  }
  // Concrete: what is shown at the top left is the user-space corner that the rotation brings up there.
  assert.deepEqual(P.displayToPdf(PAGES[0], 0, 0), { x: 0, y: 792 });
  assert.deepEqual(P.displayToPdf({ ...PAGES[1], width: 600, height: 800 }, 0, 0), { x: 0, y: 0 });
  assert.deepEqual(P.displayToPdf(PAGES[2], 0, 0), { x: 612, y: 0 });
  assert.deepEqual(P.displayToPdf({ x: 0, y: 0, width: 800, height: 600, rotation: 270 }, 0, 0), { x: 800, y: 600 });
  assert.deepEqual(P.displayToPdf(PAGES[4], 0, 0), { x: 36, y: 990 });
});

test('view to page: fitting a page into the screen, and touches back to page points', () => {
  const f = P.fitRect({ width: 612, height: 792 }, { width: 361, height: 520 });
  close(f.scale, 361 / 612);
  close(f.width, 361);
  close(f.y, (520 - 792 * f.scale) / 2);
  const wide = P.fitRect({ width: 842, height: 595 }, { width: 361, height: 520 });
  close(wide.width, 361);
  assert.ok(wide.height < 520);
  const pt = P.viewToDisplay(f, f.x + 180.5, f.y + 260);
  close(pt.x, 180.5 / f.scale);
  assert.deepEqual(P.fitRect({ width: 0, height: 10 }, { width: 10, height: 10 }).width, 0);
});

test('boxes: kept on the page with their shape; pinch scales about the center; the handle resizes from the top left', () => {
  const page = { width: 612, height: 792 };
  const c = P.clampBox({ x: 600, y: -20, width: 200, height: 50 }, page);
  assert.deepEqual([c.x, c.y, c.width, c.height], [412, 0, 200, 50]);
  const big = P.clampBox({ x: 0, y: 0, width: 1224, height: 306 }, page);
  close(big.width, 612);
  close(big.height, 153);
  const tiny = P.clampBox({ x: 10, y: 10, width: 4, height: 1 }, page);
  assert.equal(tiny.height, 8);
  assert.equal(tiny.width, 32);
  const s = P.scaleBox({ x: 100, y: 100, width: 100, height: 40 }, 2);
  assert.deepEqual([s.x, s.y, s.width, s.height], [50, 80, 200, 80]);
  const r = P.resizeBox({ x: 10, y: 10, width: 100, height: 50 }, 20, 2);
  assert.deepEqual([r.x, r.y, r.width, r.height], [10, 10, 120, 60]);
  for (const kind of ['signature', 'initials', 'date', 'text']) {
    const b = P.defaultBox(page, 3, kind);
    assert.ok(b.x >= 0 && b.x + b.width <= page.width && b.y + b.height <= page.height, kind);
  }
});

test('hit testing: the handle of the selected one resizes, the topmost one under the finger moves, empty paper grabs nothing', () => {
  const ps = [
    { id: 'a', page: 0, kind: 'signature', x: 100, y: 100, width: 200, height: 60 },
    { id: 'b', page: 0, kind: 'date', x: 150, y: 120, width: 100, height: 20 },
    { id: 'c', page: 1, kind: 'signature', x: 100, y: 100, width: 200, height: 60 },
  ];
  const o = { handle: 10, slop: 4 };
  assert.deepEqual(P.hitTest(ps, 0, 160, 125, o), { id: 'b', mode: 'move' });
  assert.deepEqual(P.hitTest(ps, 0, 110, 110, o), { id: 'a', mode: 'move' });
  assert.deepEqual(P.hitTest(ps, 0, 305, 165, { ...o, selectedId: 'a' }), { id: 'a', mode: 'resize' });
  assert.equal(P.hitTest(ps, 0, 500, 500, o), null);
  assert.deepEqual(P.hitTest(ps, 1, 110, 110, o), { id: 'c', mode: 'move' });
  assert.deepEqual(P.toFront(ps, 'a').map((p) => p.id), ['b', 'c', 'a']);
});

// ---------- flattening with pdf-lib ----------

// A 4 by 2 PNG with an alpha channel.
const PNG = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEklEQVR42mP8z8DwnwEJMOLjAwCYWQX/XNj9kAAAAABJRU5ErkJggg==', 'base64'));

async function samplePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const p of PAGES) {
    const page = doc.addPage([p.x + p.width + 40, p.y + p.height + 40]);
    page.setCropBox(p.x, p.y, p.width, p.height);
    page.setRotation(degrees(p.rotation));
    page.drawText(p.name, { x: p.x + 20, y: p.y + 20, size: 12, font });
  }
  return doc.save();
}

/** The content-stream operators of a page, decoded. */
function contentOf(page) {
  const c = page.node.Contents();
  const streams = c instanceof PDFArray ? c.asArray().map((r) => page.doc.context.lookup(r)) : [c];
  return streams
    .map((s) => (s instanceof PDFRawStream ? Buffer.from(decodePDFRawStream(s).decode()).toString('latin1') : Buffer.from(s.getContents()).toString('latin1')))
    .join('\n');
}

/** Where each drawn image lands, as a box in display points: the unit square through the image's cm matrix, then to display. */
function imageBoxes(page, box) {
  const ops = contentOf(page);
  const out = [];
  // pdf-lib writes translate, rotate and scale as separate cm operators; multiply them in order.
  for (const block of ops.split(/\bq\b/).slice(1)) {
    const m = block.match(/\/(\S+) Do/);
    if (!m || !/Image/.test(m[1])) continue;
    let M = [1, 0, 0, 1, 0, 0];
    for (const cm of block.matchAll(/([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) cm/g)) {
      const [a, b, c, d, e, f] = cm.slice(1).map(Number);
      M = [a * M[0] + b * M[2], a * M[1] + b * M[3], c * M[0] + d * M[2], c * M[1] + d * M[3], e * M[0] + f * M[2] + M[4], e * M[1] + f * M[3] + M[5]];
    }
    const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => P.pdfToDisplay(box, M[0] * u + M[2] * v + M[4], M[1] * u + M[3] * v + M[5]));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    // Upright as shown: image x runs left to right and image y runs up on screen.
    out.push({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), right: pts[1].x > pts[0].x, up: pts[2].y < pts[0].y });
  }
  return out;
}

test('flatten: page count unchanged, the PNG embedded on the right pages, upright where it was placed, the original untouched', async () => {
  const original = await samplePdf();
  const before = createHash('sha256').update(original).digest('hex');
  const pages = await F.readPages(original);
  assert.equal(pages.length, PAGES.length);
  for (let i = 0; i < PAGES.length; i++) {
    for (const k of ['x', 'y', 'width', 'height']) close(pages[i][k], PAGES[i][k], 0.01, `${PAGES[i].name} ${k}`);
    assert.equal(P.normRotation(pages[i].rotation), P.normRotation(PAGES[i].rotation));
  }
  const items = pages.flatMap((p, i) => {
    const s = P.displaySize(p);
    return [
      { kind: 'image', page: i, x: s.width - 230, y: s.height - 110, width: 200, height: 80, png: PNG },
      { kind: 'text', page: i, x: 40, y: 40, width: 260, height: 20, text: 'Nov 3, 2026' },
    ];
  });
  const out = await F.flattenPdf(original, items, { watermark: false });
  assert.equal(createHash('sha256').update(original).digest('hex'), before, 'the input bytes were not changed');
  const doc = await PDFDocument.load(out);
  assert.equal(doc.getPageCount(), PAGES.length);
  doc.getPages().forEach((page, i) => {
    const xo = page.node.Resources().lookup(PDFName.of('XObject'));
    assert.ok(xo && xo.keys().length >= 1, `image on page ${i}`);
    const shown = imageBoxes(page, pages[i]);
    assert.equal(shown.length, 1, PAGES[i].name);
    const want = items[i * 2];
    for (const k of ['x', 'y', 'width', 'height']) close(shown[0][k], want[k], 0.01, `${PAGES[i].name} ${k}: ${shown[0][k]} vs ${want[k]}`);
    assert.ok(shown[0].right && shown[0].up, `${PAGES[i].name} upright`);
    assert.match(contentOf(page), /Tj|TJ/, 'text drawn');
  });
});

test('flatten: only pages with placements change; the corner mark only when asked; text never wider than its box', async () => {
  const original = await samplePdf();
  const items = [{ kind: 'image', page: 2, x: 10, y: 10, width: 50, height: 20, png: PNG }];
  const plain = await PDFDocument.load(await F.flattenPdf(original, items, { watermark: false }));
  const marked = await PDFDocument.load(await F.flattenPdf(original, items, { watermark: true }));
  const hex = Buffer.from(F.MARK_TEXT, 'latin1').toString('hex').toUpperCase();
  assert.ok(!contentOf(plain.getPage(2)).toUpperCase().includes(hex));
  assert.ok(contentOf(marked.getPage(2)).toUpperCase().includes(hex), 'mark on the signed page');
  assert.ok(!contentOf(marked.getPage(0)).toUpperCase().includes(hex), 'not on pages without placements');
  assert.ok(!/ Do\b/.test(contentOf(plain.getPage(0))), 'nothing drawn on a page without placements');
  const helv = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  assert.equal(F.encodable(helv, 'José ✓ 日本'), 'José ? ??');
  const tight = await PDFDocument.load(await F.flattenPdf(original, [{ kind: 'text', page: 0, x: 10, y: 10, width: 30, height: 20, text: 'A very long line of text' }]));
  // The last font size set on the page is the stamp's (the sample's own label comes first).
  const size = Number(contentOf(tight.getPage(0)).match(/([\d.]+) Tf/g).pop().split(' ')[0]);
  assert.ok(size < 14 * 0.7, `shrunk to ${size}`);
});

test('photos: a photo becomes a one-page PDF in its own shape, long side 842 points', async () => {
  const pdf = await F.imageToPdf({ bytes: PNG, format: 'png', width: 4, height: 2 });
  const pages = await F.readPages(pdf);
  assert.equal(pages.length, 1);
  close(pages[0].width, 842, 0.01);
  close(pages[0].height, 421, 0.01);
});

test('file names: "<original> signed.pdf", never the original name, numbered when taken', () => {
  assert.equal(F.signedName('Lease.pdf'), 'Lease signed.pdf');
  assert.equal(F.signedName('Offer letter.PDF', ['offer letter signed.pdf']), 'Offer letter signed 2.pdf');
  assert.equal(F.signedName('W-9.pdf', ['W-9 signed.pdf', 'W-9 signed 2.pdf']), 'W-9 signed 3.pdf');
  assert.equal(F.signedName('IMG_2041.HEIC', [], 'jpg'), 'IMG_2041 signed.jpg');
  assert.equal(F.signedName('file:///x/Inbox/Permission slip.pdf'), 'Permission slip signed.pdf');
  assert.equal(F.signedName('a/b:c?.pdf'), 'b c signed.pdf');
  assert.equal(F.signedName('.pdf'), 'Document signed.pdf');
  assert.notEqual(F.signedName('Lease.pdf'), 'Lease.pdf');
});

// ---------- free and Pro ----------

test('gates: the first export and the first document are free and clean; after that the paywall first, and the mark if it is closed', () => {
  const none = { exports: 0, documents: 0 };
  const used = { exports: 1, documents: 1 };
  assert.deepEqual(G.exportDecision(false, none), { paywall: false, watermark: false });
  assert.deepEqual(G.documentDecision(false, none), { paywall: false, watermark: false });
  assert.deepEqual(G.exportDecision(false, used), { paywall: true, watermark: true });
  assert.deepEqual(G.documentDecision(false, { exports: 0, documents: 3 }), { paywall: true, watermark: true });
  // Exports and documents are counted apart.
  assert.deepEqual(G.documentDecision(false, { exports: 5, documents: 0 }), { paywall: false, watermark: false });
  assert.deepEqual(G.exportDecision(true, { exports: 99, documents: 99 }), { paywall: false, watermark: false });
  assert.deepEqual(G.afterPaywall({ paywall: true, watermark: true }, true), { paywall: false, watermark: false });
  assert.deepEqual(G.afterPaywall({ paywall: true, watermark: true }, false), { paywall: false, watermark: true });
  assert.equal(G.previewShowsMark(false, none), false);
  assert.equal(G.previewShowsMark(false, used), true);
  assert.equal(G.previewShowsMark(true, used), false);
});

test('gates: Ink and Ballpoint and four fonts are free; Marker, Fountain, eight fonts, initials and stamps are Pro; the library never is', () => {
  assert.deepEqual(['ink', 'ballpoint', 'marker', 'fountain'].map((p) => G.canUsePen(p, false)), [true, true, false, false]);
  assert.ok(['ink', 'ballpoint', 'marker', 'fountain'].every((p) => G.canUsePen(p, true)));
  const freeFonts = T.SCRIPT_FONTS.filter((f) => G.canUseFont(f.id, false));
  assert.equal(freeFonts.length, 4);
  assert.ok(G.canUseFont(T.DEFAULT_FONT, false), 'the default font is free');
  assert.ok(T.SCRIPT_FONTS.every((f) => G.canUseFont(f.id, true)));
  assert.equal(G.canUseFont('nope', true), false);
  assert.equal(G.canUseStamp('signature', false), true);
  assert.deepEqual(['initials', 'date', 'text'].map((s) => G.canUseStamp(s, false)), [false, false, false]);
  assert.ok(['initials', 'date', 'text'].every((s) => G.canUseStamp(s, true)));
  assert.equal(G.canMakeInitials(false), false);
  assert.equal(G.canUseLibrary(false), true);
});

// ---------- library and recent documents ----------

const mark = (png) => ({ art: { kind: 'typed', text: 'Jordan Ellis', fontId: 'dancing' }, png, crop: { x: 0, y: 0, width: 300, height: 100 } });
const sig = (id, o = {}) => ({ id, name: id, ink: 'black', main: mark(`${id}.png`), isDefault: false, createdAt: 1, ...o });

test('library: the first is the default; deleting the default passes it on; reorder, rename, default', () => {
  let list = L.addSignature([], sig('a'));
  assert.equal(list[0].isDefault, true);
  list = L.addSignature(list, sig('b'));
  assert.deepEqual(list.map((s) => [s.id, s.isDefault]), [['b', false], ['a', true]]);
  list = L.setDefault(list, 'b');
  assert.equal(L.defaultSignature(list).id, 'b');
  list = L.removeSignature(list, 'b');
  assert.equal(L.defaultSignature(list).id, 'a');
  list = L.addSignature(list, sig('c'));
  assert.deepEqual(L.moveSignature(list, 'a', -1).map((s) => s.id), ['a', 'c']);
  assert.equal(L.moveSignature(list, 'c', -1), list, 'the top stays put');
  assert.equal(L.renameSignature(list, 'c', '  Brian, blue ink  ')[0].name, 'Brian, blue ink');
  assert.equal(L.renameSignature(list, 'c', '   '), list);
  assert.equal(L.defaultSignature([]), null);
  assert.equal(L.suggestName({ kind: 'drawn', strokes: [] }, 'blue', []), 'Signature, blue ink');
  assert.equal(L.suggestName({ kind: 'typed', text: 'Jordan Ellis', fontId: 'x' }, 'navy', [sig('x', { name: 'Jordan, navy ink' })]), 'Jordan 2, navy ink');
  close(L.aspectOf(mark('m.png')), 3);
});

test('library file: round-trips, skips what it cannot read, exactly one default, and lists the PNGs to keep', () => {
  const list = [sig('a', { isDefault: true, initials: mark('a-i.png') }), sig('b')];
  const back = L.parseLibrary(L.libraryJson(list));
  assert.deepEqual(back, list);
  assert.deepEqual(L.parseLibrary('not json'), []);
  assert.deepEqual(L.parseLibrary(null), []);
  const messy = JSON.stringify({ signatures: [{ id: 'x' }, { ...sig('y'), ink: 'purple', isDefault: true }, { ...sig('z'), isDefault: true, futureField: 1 }] });
  const p = L.parseLibrary(messy);
  assert.deepEqual(p.map((s) => [s.id, s.ink, s.isDefault]), [['y', 'black', true], ['z', 'black', false]]);
  const none = L.parseLibrary(JSON.stringify({ signatures: [sig('q')] }));
  assert.equal(none[0].isDefault, true);
  assert.deepEqual([...L.referencedFiles(list)].sort(), ['a-i.png', 'a.png', 'b.png']);
  const drawn = { ...sig('d'), main: { ...mark('d.png'), art: { kind: 'drawn', strokes: [{ pen: 'ink', size: 1, pts: [[1, 2, 0, 0]] }] } } };
  assert.equal(L.parseLibrary(L.libraryJson([drawn]))[0].main.art.strokes[0].pts[0][0], 1);
});

test('recent documents: newest first, 20 kept, the ones that fall off are returned so their files go', () => {
  const doc = (i) => ({ id: `d${i}`, name: `Doc ${i} signed.pdf`, file: `Doc ${i} signed.pdf`, pages: 2, signedAt: i, format: 'pdf' });
  let list = [];
  let dropped = [];
  for (let i = 1; i <= 23; i++) ({ list, dropped } = L.addRecent(list, doc(i)));
  assert.equal(list.length, 20);
  assert.equal(list[0].id, 'd23');
  assert.deepEqual(dropped.map((d) => d.id), ['d3']);
  assert.deepEqual(L.parseRecent(L.recentJson(list)), list);
  assert.deepEqual(L.parseRecent('{"documents":[{"id":1}]}'), []);
  assert.equal(L.removeRecent(list, 'd23').length, 19);
  assert.notEqual(L.newId(1, () => 0.1), L.newId(1, () => 0.9));
});

// ---------- fonts ----------

test('fonts: twelve script fonts, each bundled with its SIL OFL licence, none of the Apache ones', () => {
  assert.equal(T.SCRIPT_FONTS.length, 12);
  assert.equal(new Set(T.SCRIPT_FONTS.map((f) => f.family)).size, 12);
  for (const f of T.SCRIPT_FONTS) assert.ok(existsSync(`${ROOT}assets/fonts/script/${f.file}`), f.file);
  const licences = readdirSync(`${ROOT}assets/fonts/licences`);
  assert.equal(licences.length, 12);
  for (const l of licences) assert.match(readFileSync(`${ROOT}assets/fonts/licences/${l}`, 'utf8'), /SIL Open Font License, Version 1\.1/);
  assert.match(readFileSync(`${ROOT}assets/fonts/OFL-Newsreader.txt`, 'utf8'), /SIL Open Font License/);
  assert.ok(!T.SCRIPT_FONTS.some((f) => /satisfy|homemade|yellowtail/i.test(f.name)));
  const files = readFileSync(`${ROOT}src/fontFiles.ts`, 'utf8');
  for (const f of T.SCRIPT_FONTS) assert.ok(files.includes(`'${f.file}': require('../assets/fonts/script/${f.file}')`), f.file);
  assert.equal(T.initialsOf('Brian W. Kershner'), 'BWK');
  assert.equal(T.initialsOf('  jordan   ellis '), 'JE');
  assert.equal(T.initialsOf('Anne-Marie de la Cruz'), 'AMD');
  assert.equal(T.fontById('missing').id, 'dancing');
});

// ---------- trial, plans and the rating guard ----------

test('trial: "3 days free" only for a free intro offer this Apple ID can still get', () => {
  const intro = { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' };
  assert.equal(O.trialLength(intro), '3 days');
  assert.equal(O.trialLength({ ...intro, periodNumberOfUnits: 1, periodUnit: 'WEEK' }), '1 week');
  assert.equal(O.trialLength({ ...intro, price: 0.99 }), null);
  assert.equal(O.trialLength(null), null);
  assert.equal(O.trialLabelFrom(intro, true), '3 days free');
  assert.equal(O.trialLabelFrom(intro, false), null);
});

test('trial reminder: a day before the trial ends; sandbox-short or unknown ends fall back to 2 days out', () => {
  const H = 3_600_000;
  const now = Date.UTC(2026, 10, 3, 12);
  assert.equal(O.trialReminderAt(now + 72 * H, now), now + 48 * H);
  assert.equal(O.trialReminderAt(now + 5 * 60_000, now), now + 48 * H);
  assert.equal(O.trialReminderAt(null, now), now + 48 * H);
});

test('plans: three rows; weekly first and preselected on onboarding, lifetime in the app; disclosure has every price', () => {
  assert.deepEqual(O.planOrder(true), ['WEEKLY', 'ANNUAL', 'LIFETIME']);
  assert.deepEqual(O.planOrder(false), ['LIFETIME', 'ANNUAL', 'WEEKLY']);
  assert.equal(O.preselect(['ANNUAL', 'WEEKLY', 'LIFETIME'], true), 'WEEKLY');
  assert.equal(O.preselect(['ANNUAL', 'WEEKLY', 'LIFETIME'], false), 'LIFETIME');
  assert.equal(O.preselect(['ANNUAL', 'WEEKLY'], false), 'ANNUAL');
  assert.equal(O.preselect([], true), null);
  assert.equal(O.planTypeOf('LIFETIME'), 'LIFETIME');
  assert.equal(O.planTypeOf('MONTHLY'), null);
  assert.equal(O.planTitle('LIFETIME'), 'Lifetime, pay once');
  const d = O.disclosureText({ weekly: '$4.99', yearly: '$19.99', lifetime: '$39.99', trial: '3 days free' });
  assert.match(d, /Weekly \$4\.99\/week .*3 days free/);
  assert.match(d, /Yearly \$19\.99\/year/);
  assert.match(d, /Lifetime \$39\.99 is a one-time purchase/);
  assert.match(O.disclosureText({}), /lifetime/);
  assert.equal(O.yearlySavingPct(4.99, 19.99), 92);
  assert.equal(O.yearlySavingPct(1, 100), null);
});

test('rating prompt: never while a document is open, once per launch, each trigger once; onboarding only picks the first tab', () => {
  assert.equal(U.reviewAllowed({ docOpen: false, askedThisLaunch: false, triggerUsed: false }), true);
  assert.equal(U.reviewAllowed({ docOpen: true, askedThisLaunch: false, triggerUsed: false }), false);
  assert.equal(U.reviewAllowed({ docOpen: false, askedThisLaunch: true, triggerUsed: false }), false);
  assert.equal(U.reviewAllowed({ docOpen: false, askedThisLaunch: false, triggerUsed: true }), false);
  assert.equal(U.firstTabFor('document'), 'documents');
  assert.equal(U.firstTabFor('image'), 'create');
  assert.equal(U.firstTabFor('both'), 'create');
  assert.equal(U.firstTabFor(null), 'create');
  assert.match(U.dayKey(Date.now()), /^\d{4}-\d{2}-\d{2}$/);
});

// ---------- config and copy ----------

test('app.json: identity, placeholders, document types for Open in, add-only Photos, push entitlement plugin last', () => {
  const app = JSON.parse(readFileSync(`${ROOT}app.json`, 'utf8')).expo;
  assert.equal(app.name, 'Signature Maker');
  assert.equal(app.slug, 'signaturemaker');
  assert.equal(app.ios.bundleIdentifier, 'com.bwk.signaturemaker');
  assert.equal(app.version, '1.0.0');
  assert.equal(app.owner, 'bkdeveloper123');
  assert.equal(app.plugins[app.plugins.length - 1], './plugins/withoutPushEntitlement');
  const types = app.ios.infoPlist.CFBundleDocumentTypes.flatMap((t) => t.LSItemContentTypes);
  assert.ok(types.includes('com.adobe.pdf') && types.includes('public.jpeg') && types.includes('public.png'));
  assert.equal(app.ios.infoPlist.LSSupportsOpeningDocumentsInPlace, false);
  const picker = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-image-picker')[1];
  assert.deepEqual([picker.photosPermission, picker.cameraPermission, picker.microphonePermission], [false, false, false]);
  const media = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-media-library')[1];
  assert.equal(media.photosPermission, false);
  assert.equal(typeof media.savePhotosPermission, 'string');
  assert.ok(!JSON.stringify(app.ios.infoPlist).match(/Camera|Microphone|Location/));
  const eas = JSON.parse(readFileSync(`${ROOT}eas.json`, 'utf8'));
  assert.equal(eas.cli.appVersionSource, 'local');
  assert.equal(app.extra.eas.projectId, '588561f4-8e20-4bdd-9dfc-742100ee3ce7');
  // The public RevenueCat SDK key (purchases run only when it starts with appl_).
  assert.match(app.extra.revenueCatApiKeyIos, /^appl_/);
  assert.equal(eas.submit.production.ios.ascAppId, '6830028405');
});

function walk(dir, ext) {
  return readdirSync(dir).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(p).isDirectory() ? walk(p, ext) : ext.some((e) => p.endsWith(e)) ? [p] : [];
  });
}

test('copy: no em dashes, banned words or brand names in the app, the website or the store text', () => {
  const files = [...walk(`${ROOT}src`, ['.ts', '.tsx']), `${ROOT}App.tsx`, ...walk(`${ROOT}docs`, ['.html']), `${ROOT}store/metadata.md`];
  for (const f of files) {
    let s = readFileSync(f, 'utf8');
    if (f.endsWith('metadata.md')) s = s.split('\n').slice(3).join('\n'); // the line that names the rule
    // In code, only what people read: string literals and JSX text (not names like Welcome.tsx).
    if (/\.(ts|tsx)$/.test(f)) s = (s.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`|>[^<>{}]+</g) ?? []).filter((t) => !/^'\.\.?\//.test(t) && !/^'(react|expo|@)/.test(t)).join('\n');
    assert.ok(!s.includes('—'), `em dash in ${f}`);
    for (const w of [/\bunlock/i, /\bpremium\b/i, /\bseamless/i, /\beffortless/i, /\bwelcome\b/i, /\blet's\b/i, /professional-grade/i, /docusign/i, /\badobe\b(?!\.pdf)/i, /acrobat/i]) {
      const hit = s.replace(/com\.adobe\.pdf/g, '').match(w);
      assert.equal(hit, null, `${w} in ${f}`);
    }
  }
  // User-facing strings in screens: no exclamation marks inside quotes.
  for (const f of walk(`${ROOT}src/screens`, ['.tsx'])) {
    const strings = readFileSync(f, 'utf8').match(/'[^'\n]*'|"[^"\n]*"|`[^`\n]*`|>[^<>{}\n]+</g) ?? [];
    for (const t of strings) assert.ok(!/[A-Za-z]!(\s|$|['"`<])/.test(t), `exclamation in ${f}: ${t}`);
  }
});
