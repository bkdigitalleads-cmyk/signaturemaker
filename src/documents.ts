/**
 * Opening a document to sign and writing the signed copy.
 *
 * In: a PDF or an image from Files (expo-document-picker), a photo from
 * Photos (expo-image-picker; no library access is asked, iOS's picker hands
 * over only the photo chosen), or a file another app sends with "Open in"
 * (Mail, Files; iOS copies it into the app's Inbox and opens the app with
 * its file URL). Each is copied to the cache first; the original is never
 * written to. A photo is made upright and becomes a one-page PDF, so
 * placing and flattening are the same for both.
 *
 * Out: "<original> signed.pdf" (or .jpg for a photo, if chosen) in the
 * app's signed folder, listed on the Documents tab.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { flattenPdf, FlatItem, imageToPdf, readPages, signedName } from './flatten';
import type { PageBox, Placement } from './placement';
import { normalizePhoto, composePhoto, PhotoStamp } from './render';
import { libraryPngBytes, readBytes, signedNames, workingCopy, writeSigned } from './store';
import { newId, RecentDoc, Signature } from './library';

export interface OpenDoc {
  id: string;
  /** The original file name, for "<name> signed.pdf". */
  name: string;
  kind: 'pdf' | 'photo';
  /** The working copy in the cache (a PDF, or the upright photo). */
  uri: string;
  pdf: Uint8Array;
  pages: PageBox[];
  /** For a photo: the upright JPEG and its pixel size. */
  photo?: { base64: string; width: number; height: number };
}

const isImageName = (n: string) => /\.(jpe?g|png|heic|heif)$/i.test(n);

function b64ToBytes(b64: string): Uint8Array {
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) s += String.fromCharCode(...bytes.subarray(i, i + step));
  return globalThis.btoa(s);
}

async function fromPdf(uri: string, name: string): Promise<OpenDoc> {
  const copy = workingCopy(uri, name);
  const pdf = readBytes(copy.uri);
  const pages = await readPages(pdf);
  if (pages.length === 0) throw new Error('This PDF has no pages.');
  return { id: newId(Date.now()), name, kind: 'pdf', uri: copy.uri, pdf, pages };
}

async function fromImage(uri: string, name: string): Promise<OpenDoc> {
  const copy = workingCopy(uri, name);
  const photo = await normalizePhoto(copy.uri);
  if (!photo) throw new Error('This image could not be read.');
  const pdf = await imageToPdf({ bytes: b64ToBytes(photo.base64), format: 'jpg', width: photo.width, height: photo.height });
  const pages = await readPages(pdf);
  return { id: newId(Date.now()), name, kind: 'photo', uri: copy.uri, pdf, pages, photo };
}

/** Files: a PDF or an image. Null when the person cancels. */
export async function pickFromFiles(): Promise<OpenDoc | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const name = a.name || 'Document.pdf';
  return a.mimeType?.startsWith('image/') || isImageName(name) ? fromImage(a.uri, name) : fromPdf(a.uri, name);
}

/** Photos: one picture of a form. Null when the person cancels. */
export async function pickFromPhotos(): Promise<OpenDoc | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: false, exif: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return fromImage(a.uri, a.fileName || 'Photo.jpg');
}

/** A file URL handed over by "Open in" (Mail, Files); null for anything else. */
export async function openIncoming(url: string): Promise<OpenDoc | null> {
  if (!/^file:\/\//i.test(url)) return null;
  const name = decodeURIComponent(url.split('/').pop() || 'Document.pdf');
  if (/\.pdf$/i.test(name)) return fromPdf(url, name);
  if (isImageName(name)) return fromImage(url, name);
  return null;
}

/** The PNG bytes behind a placement's signature or initials. */
function markBytes(p: Placement, library: Signature[]): Uint8Array | null {
  const sig = library.find((s) => s.id === p.signatureId);
  const mark = p.kind === 'initials' ? sig?.initials : sig?.main;
  return mark ? libraryPngBytes(mark.png) : null;
}

export interface Finished {
  doc: RecentDoc;
  uri: string;
}

/** Flattens the placements into a new file and records it in the recent list. */
export async function finishDocument(
  doc: OpenDoc,
  placements: Placement[],
  library: Signature[],
  recent: RecentDoc[],
  opts: { watermark: boolean; format: 'pdf' | 'jpg' }
): Promise<Finished> {
  const id = newId(Date.now());
  const name = signedName(doc.name, signedNames(recent), opts.format);
  let uri: string;
  if (opts.format === 'jpg' && doc.photo) {
    // Display points on the one page to the photo's pixels.
    const page = doc.pages[0];
    const k = doc.photo.width / page.width;
    const stamps: PhotoStamp[] = [];
    for (const p of placements) {
      if (p.kind === 'signature' || p.kind === 'initials') {
        const bytes = markBytes(p, library);
        if (bytes) stamps.push({ png: bytesToB64(bytes), x: p.x, y: p.y, width: p.width, height: p.height });
      } else if (p.text) stamps.push({ text: p.text, x: p.x, y: p.y, width: p.width, height: p.height });
    }
    const jpg = await composePhoto(doc.photo.base64, doc.photo.width, doc.photo.height, k, stamps, opts.watermark);
    if (!jpg) throw new Error('The image could not be written.');
    uri = writeSigned(id, name, jpg);
  } else {
    const items: FlatItem[] = [];
    for (const p of placements) {
      if (p.kind === 'signature' || p.kind === 'initials') {
        const png = markBytes(p, library);
        if (png) items.push({ kind: 'image', page: p.page, x: p.x, y: p.y, width: p.width, height: p.height, png });
      } else if (p.text?.trim()) {
        items.push({ kind: 'text', page: p.page, x: p.x, y: p.y, width: p.width, height: p.height, text: p.text.trim() });
      }
    }
    const out = await flattenPdf(doc.pdf, items, { watermark: opts.watermark });
    uri = writeSigned(id, name, out);
  }
  return { uri, doc: { id, name, file: name, pages: doc.pages.length, signedAt: Date.now(), format: opts.format } };
}
