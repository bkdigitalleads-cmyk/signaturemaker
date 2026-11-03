/**
 * The signature library and the recent documents list, as plain data with
 * pure operations (checked by `npm test`). store.ts reads and writes them
 * as small JSON files next to the PNGs in the app's document folder.
 * Nothing syncs and nothing leaves the phone.
 */
import type { Stroke, Rect } from './stroke.ts';

export type InkId = 'black' | 'navy' | 'blue' | 'red';

export const INKS: { id: InkId; label: string; hex: string }[] = [
  { id: 'black', label: 'Black', hex: '#17171B' },
  { id: 'navy', label: 'Navy', hex: '#1E2A4F' },
  { id: 'blue', label: 'Blue', hex: '#1F4FB4' },
  { id: 'red', label: 'Red', hex: '#B02A22' },
];

export function inkHex(id: InkId | string | undefined): string {
  return (INKS.find((i) => i.id === id) ?? INKS[0]).hex;
}

/** A drawn mark: the strokes in canvas points, as touched. */
export interface DrawnArt {
  kind: 'drawn';
  strokes: Stroke[];
}

/** A typed mark: the words and the font. */
export interface TypedArt {
  kind: 'typed';
  text: string;
  fontId: string;
}

export type Art = DrawnArt | TypedArt;

/** A rendered mark: how it was made, plus its transparent PNG (3x, cropped to the ink) and its shape. */
export interface Mark {
  art: Art;
  /** File name of the transparent PNG in the library folder. */
  png: string;
  /** The crop in points (width over height is the aspect). */
  crop: Rect;
}

export interface Signature {
  id: string;
  /** "Brian, blue ink". */
  name: string;
  ink: InkId;
  main: Mark;
  initials?: Mark;
  isDefault: boolean;
  createdAt: number;
}

export function aspectOf(m: Mark): number {
  return m.crop.height > 0 ? m.crop.width / m.crop.height : 3;
}

/** A name for a new signature: "Signature, blue ink", or the typed words. */
export function suggestName(art: Art, ink: InkId, existing: Signature[]): string {
  const inkWord = `${(INKS.find((i) => i.id === ink) ?? INKS[0]).label.toLowerCase()} ink`;
  const head = art.kind === 'typed' && art.text.trim() ? art.text.trim().split(/\s+/)[0] : 'Signature';
  let name = `${head}, ${inkWord}`;
  const names = new Set(existing.map((s) => s.name));
  for (let n = 2; names.has(name); n++) name = `${head} ${n}, ${inkWord}`;
  return name;
}

/** Adds a signature at the top. The first one ever becomes the default. */
export function addSignature(list: Signature[], sig: Signature): Signature[] {
  const isDefault = list.length === 0 || sig.isDefault;
  const rest = isDefault ? list.map((s) => ({ ...s, isDefault: false })) : list;
  return [{ ...sig, isDefault }, ...rest];
}

/** Removes one. When it was the default, the next one takes over. */
export function removeSignature(list: Signature[], id: string): Signature[] {
  const gone = list.find((s) => s.id === id);
  const next = list.filter((s) => s.id !== id);
  if (gone?.isDefault && next.length > 0 && !next.some((s) => s.isDefault)) next[0] = { ...next[0], isDefault: true };
  return next;
}

export function setDefault(list: Signature[], id: string): Signature[] {
  if (!list.some((s) => s.id === id)) return list;
  return list.map((s) => ({ ...s, isDefault: s.id === id }));
}

/** Moves one up (-1) or down (+1); the ends stay put. */
export function moveSignature(list: Signature[], id: string, dir: -1 | 1): Signature[] {
  const i = list.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function renameSignature(list: Signature[], id: string, name: string): Signature[] {
  const clean = name.trim().slice(0, 60);
  if (!clean) return list;
  return list.map((s) => (s.id === id ? { ...s, name: clean } : s));
}

export function updateSignature(list: Signature[], id: string, patch: Partial<Signature>): Signature[] {
  return list.map((s) => (s.id === id ? { ...s, ...patch, id } : s));
}

/** The default, else the first. */
export function defaultSignature(list: Signature[]): Signature | null {
  return list.find((s) => s.isDefault) ?? list[0] ?? null;
}

const isRect = (r: any): r is Rect => r && [r.x, r.y, r.width, r.height].every((v) => typeof v === 'number' && Number.isFinite(v));

function parseArt(a: any): Art | null {
  if (a?.kind === 'drawn' && Array.isArray(a.strokes)) return { kind: 'drawn', strokes: a.strokes.filter((s: any) => s && Array.isArray(s.pts)) };
  if (a?.kind === 'typed' && typeof a.text === 'string' && typeof a.fontId === 'string') return { kind: 'typed', text: a.text, fontId: a.fontId };
  return null;
}

function parseMark(m: any): Mark | null {
  const art = parseArt(m?.art);
  if (!art || typeof m.png !== 'string' || !isRect(m.crop)) return null;
  return { art, png: m.png, crop: m.crop };
}

/** The library from its JSON, skipping anything unreadable; exactly one default when there is any. */
export function parseLibrary(json: string | null): Signature[] {
  if (!json) return [];
  let raw: any;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  const items: any[] = Array.isArray(raw?.signatures) ? raw.signatures : [];
  const out: Signature[] = [];
  for (const s of items) {
    const main = parseMark(s?.main);
    if (!main || typeof s.id !== 'string') continue;
    out.push({
      id: s.id,
      name: typeof s.name === 'string' && s.name.trim() ? s.name : 'Signature',
      ink: INKS.some((i) => i.id === s.ink) ? s.ink : 'black',
      main,
      initials: parseMark(s.initials) ?? undefined,
      isDefault: s.isDefault === true,
      createdAt: typeof s.createdAt === 'number' ? s.createdAt : 0,
    });
  }
  let seen = false;
  for (let i = 0; i < out.length; i++) {
    if (out[i].isDefault && !seen) seen = true;
    else out[i] = { ...out[i], isDefault: false };
  }
  if (!seen && out.length > 0) out[0] = { ...out[0], isDefault: true };
  return out;
}

export function libraryJson(list: Signature[]): string {
  return JSON.stringify({ version: 1, signatures: list });
}

/** Every PNG the library still points to, so store.ts can delete the rest. */
export function referencedFiles(list: Signature[]): Set<string> {
  const s = new Set<string>();
  for (const sig of list) {
    s.add(sig.main.png);
    if (sig.initials) s.add(sig.initials.png);
  }
  return s;
}

// ---------- recent documents ----------

export interface RecentDoc {
  id: string;
  /** "Lease signed.pdf". */
  name: string;
  /** File name in the signed folder. */
  file: string;
  pages: number;
  signedAt: number;
  format: 'pdf' | 'jpg';
}

export const RECENT_MAX = 20;

/** Adds the newest at the top and keeps 20. Returns the ones that fell off, so their files can go. */
export function addRecent(list: RecentDoc[], doc: RecentDoc, max = RECENT_MAX): { list: RecentDoc[]; dropped: RecentDoc[] } {
  const all = [doc, ...list.filter((d) => d.id !== doc.id)];
  return { list: all.slice(0, max), dropped: all.slice(max) };
}

export function removeRecent(list: RecentDoc[], id: string): RecentDoc[] {
  return list.filter((d) => d.id !== id);
}

export function parseRecent(json: string | null): RecentDoc[] {
  if (!json) return [];
  try {
    const raw = JSON.parse(json);
    const items: any[] = Array.isArray(raw?.documents) ? raw.documents : [];
    return items
      .filter((d) => d && typeof d.id === 'string' && typeof d.file === 'string' && typeof d.name === 'string')
      .map((d) => ({ id: d.id, name: d.name, file: d.file, pages: Number(d.pages) || 1, signedAt: Number(d.signedAt) || 0, format: (d.format === 'jpg' ? 'jpg' : 'pdf') as RecentDoc['format'] }))
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

export function recentJson(list: RecentDoc[]): string {
  return JSON.stringify({ version: 1, documents: list });
}

/** A short id that sorts by time. */
export function newId(now: number, rand: () => number = Math.random): string {
  return `${now.toString(36)}${Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0')}`;
}
