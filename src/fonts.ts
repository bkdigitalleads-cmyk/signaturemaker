/**
 * The twelve script fonts for typed signatures. Every one is SIL Open Font
 * License 1.1, bundled from google/fonts (ofl/), with its licence in
 * assets/fonts/licences. Pure data (the files are required in
 * fontFiles.ts), so gates.ts and the checks can read it.
 *
 * `scale` evens out the very different design sizes of script faces, so
 * a name looks about as big in each. `free`: the four that come free.
 */
export interface ScriptFont {
  id: string;
  name: string;
  /** The family name registered with expo-font and used by Skia. */
  family: string;
  file: string;
  free: boolean;
  scale: number;
}

export const SCRIPT_FONTS: ScriptFont[] = [
  { id: 'dancing', name: 'Dancing Script', family: 'SM-DancingScript', file: 'DancingScript-Medium.ttf', free: true, scale: 1 },
  { id: 'greatvibes', name: 'Great Vibes', family: 'SM-GreatVibes', file: 'GreatVibes-Regular.ttf', free: true, scale: 1.12 },
  { id: 'allura', name: 'Allura', family: 'SM-Allura', file: 'Allura-Regular.ttf', free: true, scale: 1.15 },
  { id: 'sacramento', name: 'Sacramento', family: 'SM-Sacramento', file: 'Sacramento-Regular.ttf', free: true, scale: 1.2 },
  { id: 'herr', name: 'Herr Von Muellerhoff', family: 'SM-HerrVonMuellerhoff', file: 'HerrVonMuellerhoff-Regular.ttf', free: false, scale: 1.25 },
  { id: 'delafield', name: 'Mrs Saint Delafield', family: 'SM-MrsSaintDelafield', file: 'MrsSaintDelafield-Regular.ttf', free: false, scale: 1.2 },
  { id: 'alexbrush', name: 'Alex Brush', family: 'SM-AlexBrush', file: 'AlexBrush-Regular.ttf', free: false, scale: 1.08 },
  { id: 'mrdafoe', name: 'Mr Dafoe', family: 'SM-MrDafoe', file: 'MrDafoe-Regular.ttf', free: false, scale: 1.05 },
  { id: 'parisienne', name: 'Parisienne', family: 'SM-Parisienne', file: 'Parisienne-Regular.ttf', free: false, scale: 1 },
  { id: 'aurore', name: 'La Belle Aurore', family: 'SM-LaBelleAurore', file: 'LaBelleAurore-Regular.ttf', free: false, scale: 0.95 },
  { id: 'kaushan', name: 'Kaushan Script', family: 'SM-KaushanScript', file: 'KaushanScript-Regular.ttf', free: false, scale: 0.88 },
  { id: 'pacifico', name: 'Pacifico', family: 'SM-Pacifico', file: 'Pacifico-Regular.ttf', free: false, scale: 0.8 },
];

export const DEFAULT_FONT = 'dancing';

export function fontById(id: string | undefined): ScriptFont {
  return SCRIPT_FONTS.find((f) => f.id === id) ?? SCRIPT_FONTS[0];
}

/** Initials from a typed name: "Brian W. Kershner" -> "BWK", at most three letters. */
export function initialsOf(name: string): string {
  return name
    .split(/[\s.\-]+/)
    .filter((w) => w.length > 0)
    .map((w) => [...w][0].toUpperCase())
    .slice(0, 3)
    .join('');
}
