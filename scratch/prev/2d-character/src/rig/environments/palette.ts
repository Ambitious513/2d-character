/**
 * Environment palettes. One entry per lighting pass; every scene reads from
 * here so `timeOfDay` re-lights the whole world consistently.
 */

import type { TimeOfDay } from '../types';

export const PALETTES = {
  day: { skyTop: '#BFE3E8', skyBottom: '#F3EFD8', sun: '#F6C65B', far: '#A8C4B4', mid: '#7FA391', shopA: '#E9E2CE', shopB: '#DCE7DD', shopC: '#E7D3B8', window: '#6E93A0', leaf: '#6F9B6A', leafDark: '#4E7A55', sidewalk: '#D8D2C2', road: '#8C9B90', line: '#F1E8C9', ink: '#3E5A50' },
  golden: { skyTop: '#E8A9A0', skyBottom: '#F6D78B', sun: '#F28C4B', far: '#C3A3A0', mid: '#9C8A83', shopA: '#F0D9B8', shopB: '#E5CDBD', shopC: '#DDB894', window: '#B77F6E', leaf: '#8E8F5E', leafDark: '#667451', sidewalk: '#DEC2A6', road: '#9C887E', line: '#F6DFA8', ink: '#6B5147' },
  night: { skyTop: '#233B59', skyBottom: '#6A7FA0', sun: '#F1E8C9', far: '#3E5A70', mid: '#34505E', shopA: '#5E6E78', shopB: '#4E6672', shopC: '#6A6F78', window: '#F4D35E', leaf: '#3E665A', leafDark: '#2C4E47', sidewalk: '#7C858C', road: '#3E4C55', line: '#D9CFA8', ink: '#223840' },
} as const;

export type Palette = { [K in keyof (typeof PALETTES)['day']]: string };


/** Palette lookup that never throws, even for an unknown id. */
export function paletteFor(timeOfDay: TimeOfDay = 'day'): Palette {
  return PALETTES[timeOfDay] ?? PALETTES.day;
}
