/**
 * Getting files out: the share sheet (Mail, Messages, Files, AirDrop),
 * Photos (add-only; asked the first time someone taps Save to Photos), and
 * the clipboard. Files are made on the phone and go only where the person
 * sends them.
 */
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library/legacy';
import { shareFile } from './store';

export type Kind = 'png' | 'jpg' | 'pdf';

const MIME: Record<Kind, { mimeType: string; UTI: string }> = {
  png: { mimeType: 'image/png', UTI: 'public.png' },
  jpg: { mimeType: 'image/jpeg', UTI: 'public.jpeg' },
  pdf: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
};

/** Opens the share sheet for a file already on disk. Resolves when the sheet closes. */
export async function shareUri(uri: string, kind: Kind, title: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone.');
  await Sharing.shareAsync(uri, { ...MIME[kind], dialogTitle: title });
}

/** Writes data under a readable name and opens the share sheet for it. */
export async function shareData(name: string, data: Uint8Array | string, kind: Kind): Promise<string> {
  const uri = shareFile(name, data);
  await shareUri(uri, kind, name);
  return uri;
}

/** Saves an image to Photos. Asks for add-only access the first time; false when it was refused. */
export async function saveToPhotos(name: string, base64: string): Promise<boolean> {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return false;
  const uri = shareFile(name, base64);
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}

/** Puts a PNG on the clipboard (paste into Mail, Notes, Pages). */
export async function copyImage(base64: string): Promise<void> {
  await Clipboard.setImageAsync(base64);
}

/** "Signature 2026-11-03.png". */
export function exportFileName(base: string, ext: string, ms = Date.now()): string {
  const d = new Date(ms);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const clean = base.replace(/[\\/:*?"<>|,]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Signature';
  return `${clean} ${day}.${ext}`;
}
