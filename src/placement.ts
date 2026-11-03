/**
 * Where things go on a page. Pure functions, checked by `npm test`.
 *
 * Three spaces:
 *  - view: points on the phone's screen, inside the page's frame
 *  - display: the page as it is shown (rotation applied), in PDF points,
 *    origin at the top left, y down. Placements are stored here.
 *  - PDF user space: the page's own coordinates before /Rotate, origin
 *    at the bottom left of the crop box, y up. pdf-lib draws here.
 */

export interface PageBox {
  /** The crop box in PDF user space (what viewers show). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** The page's /Rotate, clockwise degrees. */
  rotation: number;
}

export type Rotation = 0 | 90 | 180 | 270;

export type PlacementKind = 'signature' | 'initials' | 'date' | 'text';

export interface Placement {
  id: string;
  /** 0-based page index. */
  page: number;
  kind: PlacementKind;
  /** Top left and size in display points. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** For signature and initials: the library signature's id. */
  signatureId?: string;
  /** For date and text. */
  text?: string;
}

/** /Rotate as one of the four right angles (negative and over-360 values allowed by the spec). */
export function normRotation(r: number): Rotation {
  const q = ((Math.round((r || 0) / 90) % 4) + 4) % 4;
  return (q * 90) as Rotation;
}

/** The page's size as shown, in PDF points. */
export function displaySize(p: PageBox): { width: number; height: number } {
  const r = normRotation(p.rotation);
  return r === 90 || r === 270 ? { width: p.height, height: p.width } : { width: p.width, height: p.height };
}

/** A display point (top-left origin, y down) to PDF user space. */
export function displayToPdf(p: PageBox, dx: number, dy: number): { x: number; y: number } {
  const r = normRotation(p.rotation);
  if (r === 0) return { x: p.x + dx, y: p.y + p.height - dy };
  if (r === 90) return { x: p.x + dy, y: p.y + dx };
  if (r === 180) return { x: p.x + p.width - dx, y: p.y + dy };
  return { x: p.x + p.width - dy, y: p.y + p.height - dx };
}

/** The inverse: PDF user space to a display point. */
export function pdfToDisplay(p: PageBox, x: number, y: number): { x: number; y: number } {
  const r = normRotation(p.rotation);
  const ux = x - p.x;
  const uy = y - p.y;
  if (r === 0) return { x: ux, y: p.height - uy };
  if (r === 90) return { x: uy, y: ux };
  if (r === 180) return { x: p.width - ux, y: uy };
  return { x: p.height - uy, y: p.width - ux };
}

/**
 * How pdf-lib should draw a placed box so it looks upright on the shown
 * page: the anchor (the box's bottom left as shown) in user space, the
 * size, and the counter-clockwise rotation pdf-lib applies around that
 * anchor (which undoes the page's clockwise /Rotate).
 */
export function boxToPdf(p: PageBox, box: { x: number; y: number; width: number; height: number }): { x: number; y: number; width: number; height: number; rotate: Rotation } {
  const a = displayToPdf(p, box.x, box.y + box.height);
  return { x: a.x, y: a.y, width: box.width, height: box.height, rotate: normRotation(p.rotation) };
}

/** Text boxes: the font size is this share of the box height, and the baseline sits this far down it. */
export const TEXT_SIZE_RATIO = 0.7;
export const BASELINE_RATIO = 0.74;

/** Where pdf-lib draws a text placement: the baseline's start in user space, the size and the rotation. */
export function textToPdf(p: PageBox, box: { x: number; y: number; width: number; height: number }): { x: number; y: number; size: number; rotate: Rotation } {
  const a = displayToPdf(p, box.x, box.y + box.height * BASELINE_RATIO);
  return { x: a.x, y: a.y, size: box.height * TEXT_SIZE_RATIO, rotate: normRotation(p.rotation) };
}

/** The largest rectangle with the content's aspect that fits in the box, centered. `scale` is view points per content point. */
export function fitRect(content: { width: number; height: number }, box: { width: number; height: number }): { x: number; y: number; width: number; height: number; scale: number } {
  if (!(content.width > 0) || !(content.height > 0) || !(box.width > 0) || !(box.height > 0)) return { x: 0, y: 0, width: 0, height: 0, scale: 1 };
  const scale = Math.min(box.width / content.width, box.height / content.height);
  const width = content.width * scale;
  const height = content.height * scale;
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height, scale };
}

/** A point in the page's on-screen frame (view points) to display points. */
export function viewToDisplay(frame: { x: number; y: number; scale: number }, vx: number, vy: number): { x: number; y: number } {
  return { x: (vx - frame.x) / frame.scale, y: (vy - frame.y) / frame.scale };
}

/** Keeps a box on the page: no smaller than `min` high, no larger than the page, and fully inside it. */
export function clampBox<T extends { x: number; y: number; width: number; height: number }>(b: T, page: { width: number; height: number }, min = 8): T {
  const aspect = b.width > 0 && b.height > 0 ? b.width / b.height : 1;
  let height = Math.max(min, b.height);
  let width = height * aspect;
  if (width > page.width) {
    width = page.width;
    height = width / aspect;
  }
  if (height > page.height) {
    height = page.height;
    width = height * aspect;
  }
  const x = Math.min(Math.max(0, b.x), page.width - width);
  const y = Math.min(Math.max(0, b.y), page.height - height);
  return { ...b, x, y, width, height };
}

/**
 * A new signature's box on a page: about a third of the page wide (never
 * taller than a tenth of it), centered across, in the lower third where
 * signature lines usually are. `aspect` is width over height.
 */
export function defaultBox(page: { width: number; height: number }, aspect: number, kind: PlacementKind): { x: number; y: number; width: number; height: number } {
  const a = aspect > 0 ? aspect : 3;
  let width = page.width * (kind === 'signature' ? 0.34 : kind === 'initials' ? 0.12 : kind === 'date' ? 0.2 : 0.3);
  let height = width / a;
  const maxH = page.height * (kind === 'signature' ? 0.1 : 0.04);
  if (height > maxH) {
    height = maxH;
    width = height * a;
  }
  return { x: (page.width - width) / 2, y: page.height * 0.68, width, height };
}

/** Pinch: scales a box about its center by `k`, keeping the aspect. */
export function scaleBox<T extends { x: number; y: number; width: number; height: number }>(b: T, k: number): T {
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const width = b.width * k;
  const height = b.height * k;
  return { ...b, x: cx - width / 2, y: cy - height / 2, width, height };
}

/** Today, short ("Nov 3, 2026"), for the date stamp. */
export function shortDate(ms: number, locale?: string): string {
  return new Date(ms).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export type Grab = { id: string; mode: 'move' | 'resize' };

/**
 * What a touch at a display point grabs: the bottom-right handle of the
 * selected placement resizes it; otherwise the topmost placement under the
 * touch (with a little slop for small ones) moves. Null on empty paper.
 */
export function hitTest(placements: Placement[], page: number, x: number, y: number, opts: { selectedId?: string | null; handle: number; slop: number }): Grab | null {
  const on = placements.filter((p) => p.page === page);
  const sel = on.find((p) => p.id === opts.selectedId);
  if (sel) {
    const hx = sel.x + sel.width;
    const hy = sel.y + sel.height;
    if (Math.abs(x - hx) <= opts.handle && Math.abs(y - hy) <= opts.handle) return { id: sel.id, mode: 'resize' };
  }
  for (let i = on.length - 1; i >= 0; i--) {
    const p = on[i];
    if (x >= p.x - opts.slop && x <= p.x + p.width + opts.slop && y >= p.y - opts.slop && y <= p.y + p.height + opts.slop) return { id: p.id, mode: 'move' };
  }
  return null;
}

/** Resize from the bottom-right handle: the top left stays, the aspect is kept, `dx`/`dy` in display points. */
export function resizeBox<T extends { x: number; y: number; width: number; height: number }>(b: T, dx: number, dy: number): T {
  const aspect = b.width > 0 && b.height > 0 ? b.width / b.height : 1;
  // Follow whichever way the finger went further, in width terms.
  const dw = Math.abs(dx) >= Math.abs(dy * aspect) ? dx : dy * aspect;
  const width = Math.max(4, b.width + dw);
  return { ...b, width, height: width / aspect };
}

/** Moves a placement to the front (drawn last, grabbed first). */
export function toFront(placements: Placement[], id: string): Placement[] {
  const p = placements.find((x) => x.id === id);
  return p ? [...placements.filter((x) => x.id !== id), p] : placements;
}
