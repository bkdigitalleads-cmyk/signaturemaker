import { useColorScheme } from 'react-native';

/**
 * "A clean desk." Light by default: a warm desk tone around a sheet of
 * paper-white (never pure white), ink-black text, and one accent, a deep
 * blue ink, used only for the primary action on a screen (Save signature,
 * Done signing, Continue). Everything else is ink on paper. The dark
 * theme follows the system; the drawing canvas stays paper in both, since
 * it is the paper the signature is made on.
 */
export interface Theme {
  /** The desk: the screen background. */
  bg: string;
  /** The sheet: the canvas and page backgrounds. Paper in both themes. */
  paper: string;
  /** Cards, grouped rows and sheets. */
  surface: string;
  /** One step up: wells, unselected pills, pressed rows. */
  raised: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  /** Hairlines between rows. */
  rule: string;
  /** The 1 px edge around cards and the sheet. */
  edge: string;
  /** The canvas's signing line. */
  baseline: string;
  /** Ink-on-paper text (on the canvas and pages, whatever the theme). */
  paperInk: string;
  paperInkSoft: string;
  /** The primary action. Nothing else uses it. */
  accent: string;
  onAccent: string;
  /** A selected pill: a darker well with an ink outline, not the accent. */
  picked: string;
  pickedEdge: string;
  danger: string;
  /** The checkerboard behind a transparent export. */
  checkA: string;
  checkB: string;
  scrim: string;
  isDark: boolean;
}

export const lightTheme: Theme = {
  bg: '#EFEBE3',
  paper: '#FBF9F4',
  surface: '#F8F5EF',
  raised: '#E6E1D8',
  ink: '#1A1A1E',
  inkSoft: '#57554F',
  inkFaint: '#8C877E',
  rule: '#DDD7CC',
  edge: 'rgba(26, 26, 30, 0.09)',
  baseline: '#C7BFB1',
  paperInk: '#1A1A1E',
  paperInkSoft: '#8C877E',
  accent: '#1D3A8A',
  onAccent: '#FBF9F4',
  picked: '#E0DAD0',
  pickedEdge: '#1A1A1E',
  danger: '#A3312A',
  checkA: '#FFFFFF',
  checkB: '#E4E1DB',
  scrim: 'rgba(26, 24, 20, 0.36)',
  isDark: false,
};

export const darkTheme: Theme = {
  bg: '#1B1A18',
  paper: '#EDE9E0',
  surface: '#24231F',
  raised: '#2E2C28',
  ink: '#ECE8E0',
  inkSoft: '#ABA69C',
  inkFaint: '#7F7A71',
  rule: '#35332E',
  edge: 'rgba(255, 255, 255, 0.07)',
  baseline: '#BDB5A6',
  paperInk: '#1A1A1E',
  paperInkSoft: '#8C877E',
  accent: '#7393E6',
  onAccent: '#10162A',
  picked: '#3A3833',
  pickedEdge: '#ECE8E0',
  danger: '#E08B80',
  checkA: '#F2F0EC',
  checkB: '#D6D2CB',
  scrim: 'rgba(0, 0, 0, 0.5)',
  isDark: true,
};

/** Follows the system: light unless the phone is in dark mode. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

/**
 * Two corners, on purpose:
 *  - large: the canvas, pages' frames, cards, sheets and the main button
 *  - small: pills, inputs and plain buttons
 * (round is only for circles: glyph buttons, radio dots, color dots.)
 */
export const radius = { large: 18, small: 10, round: 999 };

/** The spacing scale. Every margin, padding and gap is one of these. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

/**
 * Newsreader (SIL OFL, assets/fonts/OFL-Newsreader.txt), a static
 * Medium instance at the 24 pt optical size, for the screen titles only:
 * a book face for a desk, quiet next to the script signatures. Everything
 * else is the system font, which reads best small and follows Dynamic Type.
 */
export const fonts = {
  display: 'SM-Newsreader-Medium',
  serif: 'SM-Newsreader-Regular',
};

/**
 * One type scale, three sizes:
 *  - title 28: screen titles and onboarding lines (Newsreader)
 *  - body 17: buttons, rows, body text (system; buttons semibold)
 *  - small 13: secondary lines, labels, the tab bar
 */
export const type = {
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  body: { fontSize: 17, lineHeight: 23 },
  strong: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  small: { fontSize: 13, lineHeight: 18 },
};

export const tabular = { fontVariant: ['tabular-nums' as const] };

/** The Save signature button and the other main buttons are at least this tall. */
export const MAIN_BUTTON = 64;

/** UI font files for useFonts in App.tsx (the script fonts are in fontFiles.ts). */
export const UI_FONT_FILES = {
  [fonts.display]: require('../assets/fonts/Newsreader-Medium.ttf'),
  [fonts.serif]: require('../assets/fonts/Newsreader-Regular.ttf'),
};
