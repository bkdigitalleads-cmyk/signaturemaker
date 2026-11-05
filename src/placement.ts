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

/** A new stamp's width as a share of the page's width, before the person has picked a size of their own. */
export const STAMP_WIDTH: Record<PlacementKind, number> = { signature: 0.26, initials: 0.1, date: 0.16, text: 0.24 };

/** The width the person last settled on for each kind, as a share of the page's width (stored in prefs). */
export type LastWidths = Partial<Record<PlacementKind, number>>;

const KINDS: PlacementKind[] = ['signature', 'initials', 'date', 'text'];
const okShare = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0.02 && v <= 1;

/**
 * A new stamp's size. With a remembered width it is that share of the page
 * wide; otherwise the default share, never taller than a tenth of the page
 * (signatures) or a twenty-fifth (the rest). `aspect` is width over height.
 */
export function stampSize(page: { width: number; height: number }, aspect: number, kind: PlacementKind, lastWidth?: number): { width: number; height: number } {
  const a = aspect > 0 ? aspect : 3;
  if (okShare(lastWidth)) return { width: page.width * lastWidth, height: (page.width * lastWidth) / a };
  let width = page.width * STAMP_WIDTH[kind];
  let height = width / a;
  const maxH = page.height * (kind === 'signature' ? 0.1 : 0.04);
  if (height > maxH) {
    height = maxH;
    width = height * a;
  }
  return { width, height };
}

/**
 * A new stamp's box on the whole page: the default size, centered across,
 * in the lower third where signature lines usually are.
 */
export function defaultBox(page: { width: number; height: number }, aspect: number, kind: PlacementKind, lastWidth?: number): { x: number; y: number; width: number; height: number } {
  const { width, height } = stampSize(page, aspect, kind, lastWidth);
  return { x: (page.width - width) / 2, y: page.height * 0.68, width, height };
}

/**
 * The part of the page that is on screen, in display points: the area
 * (area points, the frame inside it) cut to the frame, then to the page.
 * The whole page when nothing of it is on screen.
 */
export function visiblePart(frame: { x: number; y: number; width: number; height: number; scale: number }, area: { width: number; height: number }, page: { width: number; height: number }): { x: number; y: number; width: number; height: number } {
  const a = viewToDisplay(frame, Math.max(0, frame.x), Math.max(0, frame.y));
  const b = viewToDisplay(frame, Math.min(area.width, frame.x + frame.width), Math.min(area.height, frame.y + frame.height));
  const x0 = Math.max(0, a.x);
  const y0 = Math.max(0, a.y);
  const x1 = Math.min(page.width, b.x);
  const y1 = Math.min(page.height, b.y);
  if (!(x1 > x0) || !(y1 > y0)) return { x: 0, y: 0, width: page.width, height: page.height };
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * A new stamp's box where the person is looking: centered on the visible
 * part of the page (from visiblePart), kept on the page. With the whole page
 * on screen it is defaultBox's spot, in the lower third.
 */
export function placeInView(page: { width: number; height: number }, visible: { x: number; y: number; width: number; height: number }, aspect: number, kind: PlacementKind, lastWidth?: number): { x: number; y: number; width: number; height: number } {
  const whole = visible.x <= 0.5 && visible.y <= 0.5 && visible.width >= page.width - 1 && visible.height >= page.height - 1;
  if (whole) return clampBox(defaultBox(page, aspect, kind, lastWidth), page);
  const { width, height } = stampSize(page, aspect, kind, lastWidth);
  return clampBox({ x: visible.x + (visible.width - width) / 2, y: visible.y + (visible.height - height) / 2, width, height }, page);
}

/** A new box that would sit on others lands a little lower for each one it overlaps, so it never hides one. */
export function nudge<T extends { x: number; y: number; width: number; height: number }>(b: T, others: { x: number; y: number; width: number; height: number }[], page: { width: number; height: number }): T {
  const over = others.filter((o) => o.x < b.x + b.width && b.x < o.x + o.width && o.y < b.y + b.height && b.y < o.y + o.height).length;
  return clampBox({ ...b, y: b.y + over * Math.min(24, page.height * 0.03) }, page);
}

/** After a resize: the new width becomes the start size for the next stamp of that kind. */
export function rememberWidth(widths: LastWidths, kind: PlacementKind, width: number, pageWidth: number): LastWidths {
  const share = pageWidth > 0 ? width / pageWidth : NaN;
  return okShare(share) ? { ...widths, [kind]: share } : widths;
}

/** Remembered widths from stored prefs: only the four kinds, only sensible shares; anything else is dropped. */
export function cleanWidths(raw: unknown): LastWidths {
  const out: LastWidths = {};
  if (raw && typeof raw === 'object') for (const k of KINDS) if (okShare((raw as Record<string, unknown>)[k])) out[k] = (raw as Record<string, number>)[k];
  return out;
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
    // Near the corner, and either outside the box or in its last third, so a small
    // placement (initials, a date) can still be grabbed by its middle and moved.
    const nearCorner = Math.abs(x - hx) <= opts.handle && Math.abs(y - hy) <= opts.handle;
    const inside = x >= sel.x && x <= hx && y >= sel.y && y <= hy;
    const cornerThird = x >= sel.x + sel.width * (2 / 3) && y >= sel.y + sel.height * (2 / 3);
    if (nearCorner && (!inside || cornerThird)) return { id: sel.id, mode: 'resize' };
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

// ---------- zoom ----------

export const MAX_ZOOM = 4;
/**
 * The page is drawn once at this zoom and only ever scaled down to the
 * zoom on screen, so it is sharp at every zoom and a zoom never makes the
 * PDF view lay out again (page and placements move as one). Never below MAX_ZOOM.
 */
export const RENDER_ZOOM = 4;
/** A double tap on the paper goes between the whole page and this. */
export const TAP_ZOOM = 2.5;

export interface Fit {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface Zoomed extends Fit {
  zoom: number;
}

/**
 * The page's frame at a zoom, inside the area it is shown in. A page no
 * wider than the area stays centred; a bigger one can be pulled around,
 * but never leaves a gap it could fill. `origin` is where the frame's
 * top left corner is asked to be (area points); it is clamped.
 */
export function zoomedFrame(fit: Fit, area: { width: number; height: number }, zoom: number, origin: { x: number; y: number }): Zoomed {
  const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
  const width = fit.width * z;
  const height = fit.height * z;
  return { x: onAxis(origin.x, width, area.width), y: onAxis(origin.y, height, area.height), width, height, scale: fit.scale * z, zoom: z };
}

/** Along one side: centred when it fits in the room, otherwise as asked but leaving no gap at either end. */
function onAxis(want: number, size: number, room: number): number {
  return size <= room + 0.5 ? (room - size) / 2 : Math.min(0, Math.max(room - size, want));
}

/**
 * While two fingers are down the frame is drawn with the transform
 * translate(tx, ty) then scale(k), which React Native applies about the
 * frame's centre. This returns tx and ty moved so the scaled page sits in
 * the area the way zoomedFrame keeps a settled one: centred when it is
 * smaller than the area, never leaving a gap when it is bigger. `k` is
 * kept between 1 and MAX_ZOOM of the page.
 */
export function clampLive(frame: Zoomed, fit: Fit, area: { width: number; height: number }, k: number, tx: number, ty: number): { tx: number; ty: number } {
  const z = Math.min(MAX_ZOOM, Math.max(1, frame.zoom * k));
  const kk = z / frame.zoom;
  // Where the scaled frame's top left corner lands, and back.
  const left = frame.x + tx + (frame.width * (1 - kk)) / 2;
  const top = frame.y + ty + (frame.height * (1 - kk)) / 2;
  const x = onAxis(left, fit.width * z, area.width);
  const y = onAxis(top, fit.height * z, area.height);
  return { tx: tx + (x - left), ty: ty + (y - top) };
}

/** The settled frame a live transform shows: what the pinch commits when the fingers lift, so nothing jumps. */
export function liveToFrame(frame: Zoomed, fit: Fit, area: { width: number; height: number }, k: number, tx: number, ty: number): Zoomed {
  const z = Math.min(MAX_ZOOM, Math.max(1, frame.zoom * k));
  const kk = z / frame.zoom;
  return zoomedFrame(fit, area, z, { x: frame.x + tx + (frame.width * (1 - kk)) / 2, y: frame.y + ty + (frame.height * (1 - kk)) / 2 });
}

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Where the small minus, plus and trash pill goes for a selected box
 * (both in area points): just above it, or just below when there is no
 * room above or it would sit under `avoid` (the Whole page pill); kept
 * inside the area. Null when the box is off screen.
 */
export function pillSpot(box: Rect, area: { width: number; height: number }, pill: { width: number; height: number }, avoid: Rect | null, gap = 8): { x: number; y: number } | null {
  if (box.x + box.width < 0 || box.x > area.width || box.y + box.height < 0 || box.y > area.height) return null;
  const x = Math.min(Math.max(gap, box.x + box.width / 2 - pill.width / 2), Math.max(gap, area.width - pill.width - gap));
  const hits = (y: number) => avoid != null && x < avoid.x + avoid.width && avoid.x < x + pill.width && y < avoid.y + avoid.height && avoid.y < y + pill.height;
  // Above the selection outline; below it, past the corner handle (which hangs 11 under the box).
  const above = box.y - gap - pill.height;
  const below = box.y + box.height + 11 + gap;
  let y = above >= gap && !hits(above) ? above : below;
  y = Math.min(Math.max(gap, y), Math.max(gap, area.height - pill.height - gap));
  if (hits(y)) y = Math.max(gap, Math.min(area.height - pill.height - gap, avoid!.y + avoid!.height + gap));
  return { x, y };
}

/**
 * Zoom so that the page point under `focal` (area points) stays under the
 * finger. Returns the new frame (clamped like zoomedFrame).
 */
export function zoomAround(frame: Zoomed, fit: Fit, area: { width: number; height: number }, zoom: number, focal: { x: number; y: number }): Zoomed {
  const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
  const page = viewToDisplay(frame, focal.x, focal.y);
  const scale = fit.scale * z;
  return zoomedFrame(fit, area, z, { x: focal.x - page.x * scale, y: focal.y - page.y * scale });
}
