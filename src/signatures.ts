/**
 * Saving to the library: the mark is rendered once to a transparent 3x PNG
 * (render.ts) and written next to the index, with the drawn points or the
 * typed words kept so it can be redrawn at any size later.
 */
import { renderLibraryPng } from './render';
import { writeLibraryPng } from './store';
import { addSignature, Art, inkHex, InkId, Mark, newId, Signature, suggestName, updateSignature } from './library';
import { compactStroke } from './stroke';

function compactArt(art: Art): Art {
  return art.kind === 'drawn' ? { kind: 'drawn', strokes: art.strokes.map(compactStroke) } : { kind: 'typed', text: art.text.trim(), fontId: art.fontId };
}

async function makeMark(art: Art, ink: InkId, fileId: string): Promise<Mark> {
  const clean = compactArt(art);
  const r = await renderLibraryPng(clean, inkHex(ink));
  if (!r) throw new Error('There is no ink to save yet.');
  const png = `${fileId}.png`;
  writeLibraryPng(png, r.base64);
  return { art: clean, png, crop: r.crop };
}

/** A new signature at the top of the library (the first one is the default). */
export async function saveNewSignature(list: Signature[], art: Art, ink: InkId, now = Date.now()): Promise<{ list: Signature[]; sig: Signature }> {
  const id = newId(now);
  const main = await makeMark(art, ink, id);
  const sig: Signature = { id, name: suggestName(art, ink, list), ink, main, isDefault: false, createdAt: now };
  const next = addSignature(list, sig);
  return { list: next, sig: next[0] };
}

/** The initials version of a saved signature, in the same ink. */
export async function saveInitials(list: Signature[], sigId: string, art: Art, now = Date.now()): Promise<Signature[]> {
  const sig = list.find((s) => s.id === sigId);
  if (!sig) return list;
  const initials = await makeMark(art, sig.ink, `${sigId}-i-${now.toString(36)}`);
  return updateSignature(list, sigId, { initials });
}
