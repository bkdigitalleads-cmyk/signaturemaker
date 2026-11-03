import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The app's own glyphs, drawn on a 24 grid with round ends, like a fine
 * pen on paper. No icon pack. The tab glyphs: create (a signature loop on
 * its line), library (two sheets, one signed), documents (a page with a
 * folded corner and a signing line), settings (two sliders).
 */
export type GlyphName =
  | 'create'
  | 'library'
  | 'documents'
  | 'settings'
  | 'close'
  | 'back'
  | 'check'
  | 'plus'
  | 'share'
  | 'trash'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'wide'
  | 'type'
  | 'lock'
  | 'up'
  | 'down'
  | 'copy'
  | 'photo'
  | 'file'
  | 'date'
  | 'text'
  | 'initials'
  | 'pencil'
  | 'chevron'
  | 'star';

const D: Record<GlyphName, string> = {
  create: 'M3.5 15.5c2.2-.4 3.4-6.8 5.6-6.8 1.6 0 .2 6.9 2.2 6.9 1.6 0 2.4-4.3 3.9-4.3 1.2 0 .8 3.2 2.1 3.2 1 0 1.8-1.1 3.2-1.6M3.5 19.5h17',
  library: 'M6.5 7.5V5.6c0-.6.5-1.1 1.1-1.1h10.8c.6 0 1.1.5 1.1 1.1v9.8c0 .6-.5 1.1-1.1 1.1H17M4.5 9.6c0-.6.5-1.1 1.1-1.1h9.8c.6 0 1.1.5 1.1 1.1v9.8c0 .6-.5 1.1-1.1 1.1H5.6c-.6 0-1.1-.5-1.1-1.1V9.6zM7 16.2c1-.2 1.5-2.8 2.5-2.8.8 0 .3 2.6 1.3 2.6.7 0 1-1.2 1.8-1.4',
  documents: 'M13.5 3.5H7.1c-.9 0-1.6.7-1.6 1.6v13.8c0 .9.7 1.6 1.6 1.6h9.8c.9 0 1.6-.7 1.6-1.6V8.5l-5-5zM13.5 3.5v3.4c0 .9.7 1.6 1.6 1.6h3.4M8.5 17h7M9 14.6c.8-.2 1.2-2.2 2-2.2.6 0 .3 2 1 2 .5 0 .8-.9 1.4-1.1',
  settings: 'M4 8h9M17 8h3M4 16h3M11 16h9M15 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM9 18.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  back: 'M14.5 5.5L8 12l6.5 6.5',
  check: 'M5 12.5l4.2 4.2L19 7',
  plus: 'M12 5.5v13M5.5 12h13',
  share: 'M12 14.5V4M8 7.5L12 3.8l4 3.7M7.5 10.5H6.6c-.9 0-1.6.7-1.6 1.6v6.8c0 .9.7 1.6 1.6 1.6h10.8c.9 0 1.6-.7 1.6-1.6v-6.8c0-.9-.7-1.6-1.6-1.6h-.9',
  trash: 'M5 7h14M10 7V5.4c0-.5.4-.9.9-.9h2.2c.5 0 .9.4.9.9V7M7 7l.8 11.4c.1.9.8 1.6 1.7 1.6h5c.9 0 1.6-.7 1.7-1.6L17 7',
  undo: 'M8.5 6L5 9.5 8.5 13M5.5 9.5h8.3c2.8 0 5 2.2 5 5s-2.2 5-5 5H10',
  redo: 'M15.5 6L19 9.5 15.5 13M18.5 9.5h-8.3c-2.8 0-5 2.2-5 5s2.2 5 5 5H14',
  clear: 'M4 19.5h16M6.5 14.5c2-1 3.3-5.7 5.4-5.7 1.5 0 .6 4.6 2.3 4.6 1.2 0 2-2.5 3.3-3.1M5 5l14 14',
  wide: 'M3.5 12h17M7 8.5L3.5 12 7 15.5M17 8.5l3.5 3.5-3.5 3.5',
  type: 'M5 6.5V5h14v1.5M12 5v14M9.5 19h5',
  lock: 'M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5M6.6 10.5h10.8c.6 0 1.1.5 1.1 1.1v7.3c0 .6-.5 1.1-1.1 1.1H6.6c-.6 0-1.1-.5-1.1-1.1v-7.3c0-.6.5-1.1 1.1-1.1z',
  up: 'M6.5 14.5L12 9l5.5 5.5',
  down: 'M6.5 9.5L12 15l5.5-5.5',
  copy: 'M9 8.5V6.1c0-.9.7-1.6 1.6-1.6h7.3c.9 0 1.6.7 1.6 1.6v7.3c0 .9-.7 1.6-1.6 1.6H15.5M6.1 9h7.3c.9 0 1.6.7 1.6 1.6v7.3c0 .9-.7 1.6-1.6 1.6H6.1c-.9 0-1.6-.7-1.6-1.6v-7.3C4.5 9.7 5.2 9 6.1 9z',
  photo: 'M5.6 5h12.8c.9 0 1.6.7 1.6 1.6v10.8c0 .9-.7 1.6-1.6 1.6H5.6c-.9 0-1.6-.7-1.6-1.6V6.6C4 5.7 4.7 5 5.6 5zM4.5 16l4.3-4.3 3.4 3.4 2.3-2.3 5 5M15 9.5h.01',
  file: 'M12 4v10.5M8 10.5l4 4 4-4M5 16.5v1.9c0 .9.7 1.6 1.6 1.6h10.8c.9 0 1.6-.7 1.6-1.6v-1.9',
  date: 'M6.1 6h11.8c.9 0 1.6.7 1.6 1.6v10.8c0 .9-.7 1.6-1.6 1.6H6.1c-.9 0-1.6-.7-1.6-1.6V7.6c0-.9.7-1.6 1.6-1.6zM4.5 10.5h15M8.5 4v3.5M15.5 4v3.5',
  text: 'M5 8V6h14v2M12 6v12M9.5 18h5',
  initials: 'M4.5 17l2.8-9 2.8 9M5.5 14h3.6M13 8v9h2.3c1.5 0 2.6-1 2.6-2.4s-1.1-2.4-2.6-2.4H13M13 12.2h2c1.2 0 2.1-.8 2.1-2.1S16.2 8 15 8h-2',
  pencil: 'M14.5 6.5l3 3M5 19l1-4L15.8 5.2c.6-.6 1.5-.6 2.1 0l.9.9c.6.6.6 1.5 0 2.1L9 18l-4 1z',
  chevron: 'M9.5 6.5L15 12l-5.5 5.5',
  star: 'M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 4.5z',
};

export default function Glyph({ name, size = 24, color, weight = 1.7, fill }: { name: GlyphName; size?: number; color: string; weight?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path d={D[name]} stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" fill={fill ?? 'none'} />
      {name === 'photo' ? <Circle cx={15} cy={9.5} r={1.3} fill={color} /> : null}
    </Svg>
  );
}
