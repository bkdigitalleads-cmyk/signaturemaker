/**
 * The pen engine. Pure functions, no React or native imports, checked by
 * `npm test`. A stroke is the raw touch points (x, y, time, force); the
 * engine smooths them with a centripetal Catmull-Rom spline, gives every
 * sample a width by the pen's rule, and turns the result into one filled
 * SVG path (Skia draws it on the canvas and into the exported PNG, so the
 * screen and the file are the same shape).
 *
 * The outline is a strip of quads between neighbouring samples plus round
 * caps and round joins at sharp turns. Every piece is wound the same way,
 * so a nonzero fill unions them with no seams and no holes where a stroke
 * folds back on itself.
 */

export type PenId = 'ink' | 'ballpoint' | 'marker' | 'fountain';
export type SizeStep = 0 | 1 | 2;

/** One touch sample: x, y in canvas points, ms since the stroke began, force 0..1 (0 when the screen does not report it). */
export type RawPoint = [number, number, number, number];

export interface Stroke {
  pen: PenId;
  size: SizeStep;
  pts: RawPoint[];
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PenInfo {
  id: PenId;
  label: string;
  /** One line for VoiceOver and the pen row's long press. */
  hint: string;
}

export const PENS: PenInfo[] = [
  { id: 'ink', label: 'Ink', hint: 'Thicker when you go slowly, thinner when you go fast' },
  { id: 'ballpoint', label: 'Ballpoint', hint: 'An even, thin line' },
  { id: 'marker', label: 'Marker', hint: 'An even, bold line' },
  { id: 'fountain', label: 'Fountain', hint: 'Thick on the way down, thin on the way up' },
];

/** The three thickness steps, as the base width in canvas points. */
export const BASE_WIDTH: Record<SizeStep, number> = { 0: 2.2, 1: 3.2, 2: 4.6 };

/** Distance between smoothed samples, in canvas points. */
export const SAMPLE_SPACING = 2;

const PEN_SCALE: Record<PenId, number> = { ink: 1, ballpoint: 0.62, marker: 1.85, fountain: 1 };

export interface Samples {
  x: number[];
  y: number[];
  /** Radius (half the width) at each sample. */
  r: number[];
}

const hyp = (dx: number, dy: number) => Math.sqrt(dx * dx + dy * dy);

/** Drops points closer than `min` to the one kept before them (the last point is always kept). */
export function dedupe(pts: RawPoint[], min = 0.6): RawPoint[] {
  if (pts.length <= 2) return pts.slice();
  const out: RawPoint[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = out[out.length - 1];
    if (hyp(pts[i][0] - p[0], pts[i][1] - p[1]) >= min) out.push(pts[i]);
  }
  const last = pts[pts.length - 1];
  const p = out[out.length - 1];
  if (out.length > 1 && hyp(last[0] - p[0], last[1] - p[1]) < min) out[out.length - 1] = last;
  else out.push(last);
  return out;
}

/**
 * Centripetal Catmull-Rom through the points, resampled about every
 * `spacing` points. The curve passes through every touch point and never
 * overshoots into loops on sharp turns (the centripetal form). Time and
 * force are interpolated along with the position.
 */
export function smooth(input: RawPoint[], spacing = SAMPLE_SPACING): RawPoint[] {
  const pts = dedupe(input);
  if (pts.length < 2) return pts.slice();
  const out: RawPoint[] = [pts[0]];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const d = hyp(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(1, Math.ceil(d / spacing));
    // Knot spacing by the square root of the distance (alpha 0.5).
    const k = (a: RawPoint, b: RawPoint) => Math.max(Math.sqrt(hyp(b[0] - a[0], b[1] - a[1])), 1e-4);
    const t0 = 0;
    const t1 = t0 + (p0 === p1 ? k(p1, p2) : k(p0, p1));
    const t2 = t1 + k(p1, p2);
    const t3 = t2 + (p3 === p2 ? k(p1, p2) : k(p2, p3));
    const q0 = p0 === p1 ? [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]] : [p0[0], p0[1]];
    const q3 = p3 === p2 ? [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]] : [p3[0], p3[1]];
    for (let s = 1; s <= steps; s++) {
      const u = s / steps;
      const t = t1 + (t2 - t1) * u;
      const lerp = (a: number[], b: number[], ta: number, tb: number) => {
        const w = (t - ta) / (tb - ta);
        return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
      };
      const a1 = lerp(q0, p1, t0, t1);
      const a2 = lerp(p1, p2, t1, t2);
      const a3 = lerp(p2, q3, t2, t3);
      const b1 = lerp(a1, a2, t0, t2);
      const b2 = lerp(a2, a3, t1, t3);
      const c = lerp(b1, b2, t1, t2);
      out.push([c[0], c[1], p1[2] + (p2[2] - p1[2]) * u, p1[3] + (p2[3] - p1[3]) * u]);
    }
  }
  return out;
}

/** A forward and a backward exponential pass, so widths change smoothly with no lag. */
function soften(v: number[], a: number): number[] {
  const f = v.slice();
  for (let i = 1; i < f.length; i++) f[i] = f[i - 1] + (f[i] - f[i - 1]) * a;
  for (let i = f.length - 2; i >= 0; i--) f[i] = f[i + 1] + (f[i] - f[i + 1]) * a;
  return f;
}

/** Width multiplier from speed (points per ms) for the Ink pen: slow is full, fast thins out. */
export function inkSpeedFactor(speed: number): number {
  return 0.42 + 1.08 * Math.exp(-Math.max(0, speed) / 0.85);
}

/** Width multiplier from direction for the Fountain pen: `ty` is the tangent's downward part, -1 (straight up) to 1 (straight down). */
export function fountainFactor(ty: number): number {
  const down = (Math.max(-1, Math.min(1, ty)) + 1) / 2;
  return 0.38 + 1.3 * Math.pow(down, 1.6);
}

/** The smoothed samples of a stroke with a radius each, by the pen's rule. */
export function layout(stroke: Stroke): Samples {
  const pts = smooth(stroke.pts);
  const base = BASE_WIDTH[stroke.size] * PEN_SCALE[stroke.pen];
  const n = pts.length;
  const x = pts.map((p) => p[0]);
  const y = pts.map((p) => p[1]);
  if (n === 0) return { x, y, r: [] };
  let w: number[];
  if (stroke.pen === 'ballpoint' || stroke.pen === 'marker') {
    w = pts.map(() => base);
  } else if (stroke.pen === 'ink') {
    const speed: number[] = [0];
    for (let i = 1; i < n; i++) {
      const dt = Math.max(1, pts[i][2] - pts[i - 1][2]);
      speed.push(hyp(x[i] - x[i - 1], y[i] - y[i - 1]) / dt);
    }
    speed[0] = speed[1] ?? 0;
    const s = soften(speed, 0.18);
    const hasForce = pts.some((p) => p[3] > 0);
    w = pts.map((p, i) => {
      const bySpeed = inkSpeedFactor(s[i]);
      // Apple Pencil (and 3D Touch) report force: it leads, speed adds a little life.
      return base * (hasForce ? 0.3 * bySpeed + 0.7 * (0.3 + 1.3 * Math.min(1, p[3])) : bySpeed);
    });
  } else {
    w = pts.map((_, i) => {
      const a = Math.max(0, i - 2);
      const b = Math.min(n - 1, i + 2);
      const dx = x[b] - x[a];
      const dy = y[b] - y[a];
      const len = hyp(dx, dy);
      return base * fountainFactor(len > 0 ? dy / len : 0);
    });
  }
  w = soften(w, 0.3);
  // Pressure-like ends: the line starts and lifts off a little thinner.
  const taper = stroke.pen === 'marker' ? 0 : stroke.pen === 'ballpoint' ? 3 : 7;
  const r = w.map((wi, i) => {
    let k = 1;
    if (taper > 0 && n > taper * 2) {
      const e = Math.min(i, n - 1 - i);
      if (e < taper) k = 0.55 + 0.45 * (e / taper);
    }
    return Math.max(0.45, (wi * k) / 2);
  });
  return { x, y, r };
}

const f2 = (v: number) => Math.round(v * 100) / 100;

/** A circle as two arcs, wound like the quads (positive area in screen coordinates). */
function circle(cx: number, cy: number, r: number): string {
  return `M${f2(cx + r)} ${f2(cy)}A${f2(r)} ${f2(r)} 0 1 1 ${f2(cx - r)} ${f2(cy)}A${f2(r)} ${f2(r)} 0 1 1 ${f2(cx + r)} ${f2(cy)}Z`;
}

/** Twice the signed area of a polygon (positive: the winding every piece uses). */
export function signedArea2(xs: number[], ys: number[]): number {
  let a = 0;
  for (let i = 0; i < xs.length; i++) {
    const j = (i + 1) % xs.length;
    a += xs[i] * ys[j] - xs[j] * ys[i];
  }
  return a;
}

function quad(xs: number[], ys: number[]): string {
  if (signedArea2(xs, ys) < 0) {
    xs.reverse();
    ys.reverse();
  }
  return `M${f2(xs[0])} ${f2(ys[0])}L${f2(xs[1])} ${f2(ys[1])}L${f2(xs[2])} ${f2(ys[2])}L${f2(xs[3])} ${f2(ys[3])}Z`;
}

/** The filled outline of laid-out samples, as SVG path data. */
export function outline(s: Samples): string {
  const n = s.x.length;
  if (n === 0) return '';
  if (n === 1) return circle(s.x[0], s.y[0], s.r[0]);
  // A normal at every sample, from its neighbours.
  const nx: number[] = [];
  const ny: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    let dx = s.x[b] - s.x[a];
    let dy = s.y[b] - s.y[a];
    const len = hyp(dx, dy) || 1;
    dx /= len;
    dy /= len;
    nx.push(-dy);
    ny.push(dx);
  }
  let d = circle(s.x[0], s.y[0], s.r[0]) + circle(s.x[n - 1], s.y[n - 1], s.r[n - 1]);
  for (let i = 0; i < n - 1; i++) {
    const j = i + 1;
    const sx = s.x[j] - s.x[i];
    const sy = s.y[j] - s.y[i];
    const sl = hyp(sx, sy);
    if (sl < 1e-6) continue;
    const dot = nx[i] * nx[j] + ny[i] * ny[j];
    if (dot > 0.5) {
      // Gentle: one strip with shared edges.
      d += quad(
        [s.x[i] + nx[i] * s.r[i], s.x[j] + nx[j] * s.r[j], s.x[j] - nx[j] * s.r[j], s.x[i] - nx[i] * s.r[i]],
        [s.y[i] + ny[i] * s.r[i], s.y[j] + ny[j] * s.r[j], s.y[j] - ny[j] * s.r[j], s.y[i] - ny[i] * s.r[i]]
      );
    } else {
      // A sharp turn: the segment's own normal (never a bow tie) and round joins.
      const mx = -sy / sl;
      const my = sx / sl;
      d += quad(
        [s.x[i] + mx * s.r[i], s.x[j] + mx * s.r[j], s.x[j] - mx * s.r[j], s.x[i] - mx * s.r[i]],
        [s.y[i] + my * s.r[i], s.y[j] + my * s.r[j], s.y[j] - my * s.r[j], s.y[i] - my * s.r[i]]
      );
      d += circle(s.x[i], s.y[i], s.r[i]) + circle(s.x[j], s.y[j], s.r[j]);
    }
    // Round joins where the direction turns by more than about 25 degrees.
    if (j < n - 1) {
      const ax = s.x[j] - s.x[i];
      const ay = s.y[j] - s.y[i];
      const bx = s.x[j + 1] - s.x[j];
      const by = s.y[j + 1] - s.y[j];
      const la = hyp(ax, ay);
      const lb = hyp(bx, by);
      if (la > 0 && lb > 0 && (ax * bx + ay * by) / (la * lb) < 0.9) d += circle(s.x[j], s.y[j], s.r[j]);
    }
  }
  return d;
}

/** One stroke as SVG path data, ready for Skia (Path.MakeFromSVGString) or an SVG <path>. */
export function strokePath(stroke: Stroke): string {
  return outline(layout(stroke));
}

/** The ink's bounds over all strokes (every sample with its radius), or null when there is no ink. */
export function strokesBounds(strokes: Stroke[]): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const st of strokes) {
    const s = layout(st);
    for (let i = 0; i < s.x.length; i++) {
      minX = Math.min(minX, s.x[i] - s.r[i]);
      minY = Math.min(minY, s.y[i] - s.r[i]);
      maxX = Math.max(maxX, s.x[i] + s.r[i]);
      maxY = Math.max(maxY, s.y[i] + s.r[i]);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Union of rectangles (null ones skipped). */
export function unionRect(rects: (Rect | null | undefined)[]): Rect | null {
  const rs = rects.filter((r): r is Rect => r != null);
  if (rs.length === 0) return null;
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  const right = Math.max(...rs.map((r) => r.x + r.width));
  const bottom = Math.max(...rs.map((r) => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * The export crop: the ink's bounds plus a small even margin (4% of the
 * longer side, at least 4 and at most 16 points), snapped outward to whole
 * points so the PNG has no half-pixel edge.
 */
export function cropRect(bounds: Rect, margin?: number): Rect {
  const m = margin ?? Math.min(16, Math.max(4, Math.max(bounds.width, bounds.height) * 0.04));
  const x = Math.floor(bounds.x - m);
  const y = Math.floor(bounds.y - m);
  const right = Math.ceil(bounds.x + bounds.width + m);
  const bottom = Math.ceil(bounds.y + bounds.height + m);
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
}

/** Pixel size of an export at 2x or 3x. */
export function pixelSize(crop: Rect, scale: number): { width: number; height: number } {
  return { width: Math.round(crop.width * scale), height: Math.round(crop.height * scale) };
}

/** True when there is anything worth saving: at least one stroke with some length or a dot. */
export function hasInk(strokes: Stroke[]): boolean {
  return strokes.some((s) => s.pts.length > 0);
}

/** Moves and scales strokes (for wide mode and for drawing a saved signature into a new box). */
export function transformStrokes(strokes: Stroke[], dx: number, dy: number, k = 1): Stroke[] {
  return strokes.map((s) => ({ ...s, pts: s.pts.map((p) => [(p[0] + dx) * k, (p[1] + dy) * k, p[2], p[3]] as RawPoint) }));
}

/** Rounds stored points so the library JSON stays small (0.1 point, whole ms, force to 0.01). */
export function compactStroke(s: Stroke): Stroke {
  return {
    pen: s.pen,
    size: s.size,
    pts: s.pts.map((p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.round(p[2]), Math.round(p[3] * 100) / 100] as RawPoint),
  };
}

/**
 * A short sample squiggle drawn with a pen, for the pen row's glyphs (the
 * row shows what each pen really does, not an icon) and the app icon.
 * The timing slows into the loops, the way a hand does.
 */
export function sampleStroke(pen: PenId, size: SizeStep = 1, w = 44, h = 22): Stroke {
  const pts: RawPoint[] = [];
  let t = 0;
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = 2 + u * (w - 4);
    const y = h / 2 - Math.sin(u * Math.PI * 2.2) * (h * 0.32) + (u - 0.5) * h * 0.1;
    t += 6 + 10 * Math.abs(Math.cos(u * Math.PI * 2.2));
    pts.push([x, y, t, 0]);
  }
  return { pen, size, pts };
}
