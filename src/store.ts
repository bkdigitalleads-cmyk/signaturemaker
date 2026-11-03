/**
 * Everything the app keeps, as plain files in its own document folder on
 * the phone (no database, no account, no sync):
 *   settings.json             small key/values (settings, counters, flags)
 *   signatures/index.json     the library (library.ts), next to one
 *   signatures/<id>.png       transparent PNG per signature and initials
 *   signed/recent.json        the last 20 signed documents
 *   signed/<id>/<name>.pdf    each signed file, under its readable name
 * Working copies of documents being signed live in the cache folder.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { libraryJson, parseLibrary, parseRecent, recentJson, referencedFiles, RecentDoc, Signature } from './library';

function dir(...parts: string[]): Directory {
  const d = new Directory(Paths.document, ...parts);
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

function cacheDir(name: string): Directory {
  const d = new Directory(Paths.cache, name);
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

function readText(f: File): string | null {
  try {
    return f.exists ? f.textSync() : null;
  } catch {
    return null;
  }
}

/** Writes through a temporary file and a move, so a crash never leaves half a JSON file. */
function writeText(f: File, text: string): void {
  const tmp = new File(f.parentDirectory, `${f.name}.tmp`);
  if (tmp.exists) tmp.delete();
  tmp.create();
  tmp.write(text);
  if (f.exists) f.delete();
  tmp.moveSync(f);
}

// ---------- key/value ----------

let kvCache: Record<string, string> | null = null;
const kvFile = () => new File(dir(), 'settings.json');

function kvLoad(): Record<string, string> {
  if (kvCache) return kvCache;
  try {
    const raw = JSON.parse(readText(kvFile()) ?? '{}');
    kvCache = raw && typeof raw === 'object' ? raw : {};
  } catch {
    kvCache = {};
  }
  return kvCache!;
}

export async function kvGet(key: string): Promise<string | null> {
  return kvLoad()[key] ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const all = { ...kvLoad(), [key]: value };
  kvCache = all;
  writeText(kvFile(), JSON.stringify(all));
}

export async function kvAll(prefix: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(kvLoad())) if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  return out;
}

/** Start over (Settings): every setting, counter and flag goes; the library and documents stay unless asked. */
export async function kvClear(): Promise<void> {
  kvCache = {};
  writeText(kvFile(), '{}');
}

// ---------- library ----------

const libDir = () => dir('signatures');

export function loadLibrary(): Signature[] {
  return parseLibrary(readText(new File(libDir(), 'index.json')));
}

/** Saves the index, then deletes PNGs nothing points to any more. */
export function saveLibrary(list: Signature[]): void {
  writeText(new File(libDir(), 'index.json'), libraryJson(list));
  const keep = referencedFiles(list);
  try {
    for (const item of libDir().list()) {
      if (item instanceof File && item.name.endsWith('.png') && !keep.has(item.name)) item.delete();
    }
  } catch {
    // a leftover file is harmless
  }
}

export function writeLibraryPng(name: string, base64: string): string {
  const f = new File(libDir(), name);
  if (f.exists) f.delete();
  f.create();
  f.write(base64, { encoding: 'base64' });
  return f.uri;
}

export function libraryPngUri(name: string): string {
  return new File(libDir(), name).uri;
}

export function libraryPngBytes(name: string): Uint8Array {
  return new File(libDir(), name).bytesSync();
}

// ---------- signed documents ----------

const signedDir = () => dir('signed');

export function loadRecent(): RecentDoc[] {
  return parseRecent(readText(new File(signedDir(), 'recent.json'))).filter((d) => new File(signedDir(), d.id, d.file).exists);
}

export function saveRecent(list: RecentDoc[], dropped: RecentDoc[] = []): void {
  writeText(new File(signedDir(), 'recent.json'), recentJson(list));
  for (const d of dropped) {
    try {
      const folder = new Directory(signedDir(), d.id);
      if (folder.exists) folder.delete();
    } catch {
      // harmless
    }
  }
}

/** Writes a signed file under its readable name in its own folder (two "Lease signed.pdf" never clash). */
export function writeSigned(id: string, name: string, data: Uint8Array | string): string {
  const folder = dir('signed', id);
  const f = new File(folder, name);
  if (f.exists) f.delete();
  f.create();
  if (typeof data === 'string') f.write(data, { encoding: 'base64' });
  else f.write(data);
  return f.uri;
}

export function signedUri(d: RecentDoc): string {
  return new File(signedDir(), d.id, d.file).uri;
}

export function signedNames(list: RecentDoc[]): string[] {
  return list.map((d) => d.file);
}

// ---------- working copies ----------

/**
 * Copies an incoming document (Files, Photos, or "Open in" from Mail) into
 * the cache before anything reads it. The original is never written to.
 */
export function workingCopy(uri: string, name: string): File {
  const d = cacheDir('working');
  const safe = name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Document';
  const dest = new File(d, `${Date.now().toString(36)}-${safe}`);
  new File(uri).copySync(dest);
  return dest;
}

/** A file for the share sheet in the cache, under a readable name. */
export function shareFile(name: string, data: Uint8Array | string): string {
  const d = new Directory(cacheDir('share'), Date.now().toString(36));
  d.create({ intermediates: true, idempotent: true });
  const f = new File(d, name);
  f.create();
  if (typeof data === 'string') f.write(data, { encoding: 'base64' });
  else f.write(data);
  return f.uri;
}

export function readBytes(uri: string): Uint8Array {
  return new File(uri).bytesSync();
}

/** Clears yesterday's working and share copies at launch. */
export function sweepCache(): void {
  for (const name of ['working', 'share']) {
    try {
      const d = new Directory(Paths.cache, name);
      if (d.exists) d.delete();
    } catch {
      // harmless
    }
  }
}
