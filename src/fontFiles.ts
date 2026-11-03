/**
 * The script font files, by family name, for expo-font (live previews in
 * the font picker) and Skia (the exported PNG). Kept apart from fonts.ts
 * so the pure checks never touch require().
 */
import { SCRIPT_FONTS } from './fonts';

const FILES: Record<string, number> = {
  'DancingScript-Medium.ttf': require('../assets/fonts/script/DancingScript-Medium.ttf'),
  'GreatVibes-Regular.ttf': require('../assets/fonts/script/GreatVibes-Regular.ttf'),
  'Allura-Regular.ttf': require('../assets/fonts/script/Allura-Regular.ttf'),
  'Sacramento-Regular.ttf': require('../assets/fonts/script/Sacramento-Regular.ttf'),
  'HerrVonMuellerhoff-Regular.ttf': require('../assets/fonts/script/HerrVonMuellerhoff-Regular.ttf'),
  'MrsSaintDelafield-Regular.ttf': require('../assets/fonts/script/MrsSaintDelafield-Regular.ttf'),
  'AlexBrush-Regular.ttf': require('../assets/fonts/script/AlexBrush-Regular.ttf'),
  'MrDafoe-Regular.ttf': require('../assets/fonts/script/MrDafoe-Regular.ttf'),
  'Parisienne-Regular.ttf': require('../assets/fonts/script/Parisienne-Regular.ttf'),
  'LaBelleAurore-Regular.ttf': require('../assets/fonts/script/LaBelleAurore-Regular.ttf'),
  'KaushanScript-Regular.ttf': require('../assets/fonts/script/KaushanScript-Regular.ttf'),
  'Pacifico-Regular.ttf': require('../assets/fonts/script/Pacifico-Regular.ttf'),
};

export function fontModule(file: string): number {
  return FILES[file];
}

export const SCRIPT_FONT_FILES: Record<string, number> = Object.fromEntries(SCRIPT_FONTS.map((f) => [f.family, FILES[f.file]]));
