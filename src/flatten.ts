/**
 * Flattening a signed document with pdf-lib. Pure JavaScript (no React or
 * native imports) so `npm test` runs exactly this on real PDFs.
 *
 * The original file is only read. A new PDF is written with every
 * placement drawn into its page: signatures and initials as embedded PNGs
 * (transparent, so the page shows through), dates and text in Helvetica.
 * Rotated pages and crop boxes that do not start at 0,0 are handled by
 * placement.ts.
 */
import { PDFDocument, PDFFont, StandardFonts, degrees, rgb } from 'pdf-lib';
import { boxToPdf, textToPdf } from './placement.ts';
import type { PageBox } from './placement.ts';

export interface ImageItem {
  kind: 'image';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  png: Uint8Array;
}

export interface TextItem {
  kind: 'text';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  /** 0..1 RGB. */
  color?: [number, number, number];
}

export type FlatItem = ImageItem | TextItem;

export class LockedPdfError extends Error {
  constructor() {
    super('This PDF is locked with a password, so it cannot be signed here.');
  }
}

/** The pages' crop boxes and rotations, for showing them and placing on them. */
export async function readPages(bytes: Uint8Array): Promise<PageBox[]> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  if (doc.isEncrypted) throw new LockedPdfError();
  return doc.getPages().map((p) => {
    const c = p.getCropBox();
    return { x: c.x, y: c.y, width: c.width, height: c.height, rotation: p.getRotation().angle };
  });
}

/** Characters Helvetica cannot draw become "?" instead of failing the whole file. */
export function encodable(font: PDFFont, text: string): string {
  let out = '';
  for (const ch of text) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += '?';
    }
  }
  return out;
}

export const MARK_TEXT = 'Made with Signature Maker';

/**
 * The new PDF's bytes. `watermark` puts the small corner mark on each page
 * that carries a placement (free exports after the first).
 */
export async function flattenPdf(original: Uint8Array, items: FlatItem[], opts: { watermark?: boolean } = {}): Promise<Uint8Array> {
  // pdf-lib may keep a view of the input; copy so the caller's bytes stay untouched.
  const doc = await PDFDocument.load(original.slice(), { ignoreEncryption: true, updateMetadata: false });
  if (doc.isEncrypted) throw new LockedPdfError();
  const pages = doc.getPages();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const used = new Set<number>();
  const pngCache = new Map<Uint8Array, Awaited<ReturnType<typeof doc.embedPng>>>();

  for (const it of items) {
    const page = pages[it.page];
    if (!page) continue;
    used.add(it.page);
    const c = page.getCropBox();
    const box: PageBox = { x: c.x, y: c.y, width: c.width, height: c.height, rotation: page.getRotation().angle };
    if (it.kind === 'image') {
      let img = pngCache.get(it.png);
      if (!img) {
        img = await doc.embedPng(it.png);
        pngCache.set(it.png, img);
      }
      const at = boxToPdf(box, it);
      page.drawImage(img, { x: at.x, y: at.y, width: at.width, height: at.height, rotate: degrees(at.rotate) });
    } else {
      const at = textToPdf(box, it);
      const text = encodable(helv, it.text);
      // Never wider than its box: shrink the size to fit.
      const w = helv.widthOfTextAtSize(text, at.size);
      const size = w > it.width && w > 0 ? (at.size * it.width) / w : at.size;
      const [r, g, b] = it.color ?? [0.08, 0.08, 0.1];
      page.drawText(text, { x: at.x, y: at.y, size, font: helv, color: rgb(r, g, b), rotate: degrees(at.rotate) });
    }
  }

  if (opts.watermark) {
    for (const i of used) {
      const page = pages[i];
      const c = page.getCropBox();
      const box: PageBox = { x: c.x, y: c.y, width: c.width, height: c.height, rotation: page.getRotation().angle };
      const size = 7;
      const w = helv.widthOfTextAtSize(MARK_TEXT, size);
      const shown = box.rotation % 180 === 0 ? { width: box.width, height: box.height } : { width: box.height, height: box.width };
      const at = textToPdf(box, { x: shown.width - w - 14, y: shown.height - 18, width: w, height: size / 0.7 });
      page.drawText(MARK_TEXT, { x: at.x, y: at.y, size, font: helv, color: rgb(0.45, 0.45, 0.48), rotate: degrees(at.rotate) });
    }
  }

  doc.setProducer('Signature Maker');
  doc.setModificationDate(new Date());
  return doc.save();
}

export interface PageImage {
  bytes: Uint8Array;
  format: 'jpg' | 'png';
  /** Pixels. */
  width: number;
  height: number;
}

/**
 * A photo of a document as a one-page PDF, so it goes through the same
 * placement and flattening as any PDF. The page keeps the photo's shape;
 * its longer side is 842 points (the long side of A4), so stamps and text
 * keep sensible sizes.
 */
export async function imageToPdf(img: PageImage): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const k = 842 / Math.max(img.width, img.height);
  const w = img.width * k;
  const h = img.height * k;
  const page = doc.addPage([w, h]);
  const embedded = img.format === 'jpg' ? await doc.embedJpg(img.bytes) : await doc.embedPng(img.bytes);
  page.drawImage(embedded, { x: 0, y: 0, width: w, height: h });
  doc.setProducer('Signature Maker');
  return doc.save();
}

/** "<original> signed.pdf" (or .jpg), never the original's own name; " 2", " 3" when one is taken. */
export function signedName(original: string, taken: string[] = [], ext = 'pdf'): string {
  const base = (original.split('/').pop() ?? 'Document')
    .replace(/\.(pdf|jpe?g|png|heic|heif)$/i, '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .trim() || 'Document';
  const lower = new Set(taken.map((t) => t.toLowerCase()));
  let name = `${base} signed.${ext}`;
  for (let n = 2; lower.has(name.toLowerCase()); n++) name = `${base} signed ${n}.${ext}`;
  return name;
}
