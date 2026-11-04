/**
 * Rendering a signature to a file with Skia, off screen. The same filled
 * outlines the canvas draws (stroke.ts) go onto a CPU surface with an
 * alpha channel, cropped to the ink with a small margin, at 2x or 3x; the
 * PNG comes from the surface's makeImageSnapshot, so a transparent export
 * really is transparent. Typed signatures become outlines through
 * Skia.Path.MakeFromText with the bundled script font, so they go through
 * exactly the same path.
 */
import { Image as RNImage } from 'react-native';
import { ImageFormat, matchFont, Skia, SkPath, SkTypeface } from '@shopify/react-native-skia';
import { cropRect, pixelSize, Rect, strokePath, strokesBounds } from './stroke';
import { fontById } from './fonts';
import { fontModule } from './fontFiles';
import type { Art } from './library';
import { MARK_TEXT } from './flatten';

/** Typed signatures are laid out at this size (points) before cropping. */
export const TYPED_SIZE = 96;

const typefaces = new Map<string, SkTypeface>();

async function typeface(fontId: string): Promise<SkTypeface> {
  const f = fontById(fontId);
  const hit = typefaces.get(f.id);
  if (hit) return hit;
  const uri = RNImage.resolveAssetSource(fontModule(f.file)).uri;
  const data = await Skia.Data.fromURI(uri);
  const tf = Skia.Typeface.MakeFreeTypeFaceFromData(data);
  if (!tf) throw new Error(`Could not load ${f.name}`);
  typefaces.set(f.id, tf);
  return tf;
}

/** A mark's outline as one Skia path, and the ink's bounds in points. */
export async function artPath(art: Art): Promise<{ path: SkPath; bounds: Rect } | null> {
  if (art.kind === 'drawn') {
    const bounds = strokesBounds(art.strokes);
    if (!bounds) return null;
    // Skia 2.14 paths are immutable; strokes are joined through a builder.
    const builder = Skia.PathBuilder.Make();
    for (const s of art.strokes) {
      const p = Skia.Path.MakeFromSVGString(strokePath(s));
      if (p) builder.addPath(p);
    }
    return { path: builder.detach(), bounds };
  }
  const text = art.text.trim();
  if (!text) return null;
  const f = fontById(art.fontId);
  const font = Skia.Font(await typeface(f.id), TYPED_SIZE * f.scale);
  const path = Skia.Path.MakeFromText(text, 0, 0, font);
  if (!path) return null;
  const b = path.computeTightBounds();
  if (!(b.width > 0)) return null;
  return { path, bounds: { x: b.x, y: b.y, width: b.width, height: b.height } };
}

export type Background = 'transparent' | 'white';
export type Format = 'png' | 'jpg';

export interface Rendered {
  base64: string;
  width: number;
  height: number;
  crop: Rect;
}

/** Height of the strip under the ink that holds the corner mark, in points. */
const MARK_STRIP = 14;

/**
 * The mark as a PNG or JPG. `scale` 2 or 3. White backgrounds are paper
 * white (#FFFFFF in the file, so it matches the page it lands on).
 */
export async function renderArt(
  art: Art,
  inkHex: string,
  opts: { scale: number; background: Background; format: Format; watermark: boolean }
): Promise<Rendered | null> {
  const got = await artPath(art);
  if (!got) return null;
  const crop = cropRect(got.bounds);
  const outCrop = opts.watermark ? { ...crop, height: crop.height + MARK_STRIP } : crop;
  const size = pixelSize(outCrop, opts.scale);
  const surface = Skia.Surface.Make(size.width, size.height);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.clear(opts.background === 'white' || opts.format === 'jpg' ? Skia.Color('#FFFFFF') : Skia.Color('transparent'));
  canvas.save();
  canvas.scale(opts.scale, opts.scale);
  canvas.translate(-crop.x, -crop.y);
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(inkHex));
  canvas.drawPath(got.path, paint);
  canvas.restore();
  if (opts.watermark) {
    const font = matchFont({ fontFamily: 'Helvetica', fontSize: 8 * opts.scale });
    const mark = Skia.Paint();
    mark.setAntiAlias(true);
    mark.setColor(Skia.Color('rgba(90, 88, 84, 0.85)'));
    const w = font.measureText(MARK_TEXT).width;
    canvas.drawText(MARK_TEXT, size.width - w - 4 * opts.scale, size.height - 4 * opts.scale, mark, font);
  }
  surface.flush();
  const image = surface.makeImageSnapshot();
  const base64 = image.encodeToBase64(opts.format === 'jpg' ? ImageFormat.JPEG : ImageFormat.PNG, opts.format === 'jpg' ? 92 : 100);
  return { base64, width: size.width, height: size.height, crop: outCrop };
}

/** The library's own copy: a transparent 3x PNG with no mark. */
export function renderLibraryPng(art: Art, inkHex: string): Promise<Rendered | null> {
  return renderArt(art, inkHex, { scale: 3, background: 'transparent', format: 'png', watermark: false });
}

/**
 * A photo of a document, upright and re-encoded as JPEG through Skia (which
 * applies the photo's orientation), with its pixel size. Large photos are
 * brought down to 2400 px on the long side.
 */
export async function normalizePhoto(uri: string): Promise<{ base64: string; width: number; height: number } | null> {
  const data = await Skia.Data.fromURI(uri);
  const img = Skia.Image.MakeImageFromEncoded(data);
  if (!img) return null;
  const k = Math.min(1, 2400 / Math.max(img.width(), img.height()));
  const w = Math.round(img.width() * k);
  const h = Math.round(img.height() * k);
  const surface = Skia.Surface.Make(w, h);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('#FFFFFF'));
  canvas.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(0, 0, w, h), Skia.Paint());
  surface.flush();
  return { base64: surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 90), width: w, height: h };
}

export interface PhotoStamp {
  /** Transparent PNG, base64. */
  png?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A signed photo as a JPG: the photo with each placement drawn on it
 * (positions in the photo's display points, `k` pixels per point).
 */
export async function composePhoto(photoBase64: string, w: number, h: number, k: number, stamps: PhotoStamp[], watermark: boolean): Promise<string | null> {
  const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(photoBase64));
  if (!img) return null;
  const surface = Skia.Surface.Make(w, h);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(0, 0, w, h), Skia.Paint());
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  for (const s of stamps) {
    if (s.png) {
      const si = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(s.png));
      if (si) canvas.drawImageRect(si, Skia.XYWHRect(0, 0, si.width(), si.height()), Skia.XYWHRect(s.x * k, s.y * k, s.width * k, s.height * k), paint);
    } else if (s.text) {
      const font = matchFont({ fontFamily: 'Helvetica', fontSize: s.height * 0.7 * k });
      const tp = Skia.Paint();
      tp.setAntiAlias(true);
      tp.setColor(Skia.Color('#141418'));
      canvas.drawText(s.text, s.x * k, (s.y + s.height * 0.74) * k, tp, font);
    }
  }
  if (watermark) {
    const font = matchFont({ fontFamily: 'Helvetica', fontSize: 7 * k });
    const mp = Skia.Paint();
    mp.setColor(Skia.Color('rgba(90, 88, 84, 0.9)'));
    const tw = font.measureText(MARK_TEXT).width;
    canvas.drawText(MARK_TEXT, w - tw - 14 * k, h - 12 * k, mp, font);
  }
  surface.flush();
  return surface.makeImageSnapshot().encodeToBase64(ImageFormat.JPEG, 92);
}
