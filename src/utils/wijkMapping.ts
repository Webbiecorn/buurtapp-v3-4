/**
 * Wijk (neighborhood) mapping utilities for Lelystad postcodes
 * Consolidated from multiple duplicate implementations
 */

interface WijkRange {
  name: string;
  min: string;
  max: string;
}

/**
 * Postcode ranges for each neighborhood in Lelystad
 * Order matters - first match wins
 */
const WIJK_RANGES: WijkRange[] = [
  { name: 'Boswijk', min: '8212DA', max: '8225VL' },
  { name: 'Atolwijk', min: '8226AA', max: '8232ET' },
  { name: 'Atolwijk', min: '8212AA', max: '8212CZ' },
  { name: 'Zuiderzeewijk', min: '8211BA', max: '8224MJ' },
  { name: 'Waterwijk-Landerijen', min: '8219AA', max: '8226TW' },
  { name: 'Bolder', min: '8231CA', max: '8243DG' },
  { name: 'Kustwijk', min: '8231AA', max: '8243NG' },
  { name: 'Havendiep', min: '8232JA', max: '8245GN' },
  { name: 'Lelystad-Haven', min: '8243PA', max: '8245AB' },
  { name: 'Stadshart', min: '8224BX', max: '8232ZZ' },
  { name: 'Warande', min: '8233HB', max: '8245MA' },
  { name: 'Buitengebied', min: '8211AA', max: '8245AA' },
];

/**
 * List of all available neighborhood names
 */
export const WIJK_NAMES = [
  'Atolwijk',
  'Boswijk',
  'Bolder',
  'Buitengebied',
  'Havendiep',
  'Kustwijk',
  'Lelystad-Haven',
  'Stadshart',
  'Warande',
  'Waterwijk-Landerijen',
  'Zuiderzeewijk',
] as const;

export type WijkName = typeof WIJK_NAMES[number] | 'Onbekend';

/**
 * Get the neighborhood name for a given postcode
 * @param postcode - Dutch postcode (e.g., "8212 DA" or "8212DA")
 * @returns The neighborhood name or 'Onbekend' if not found
 */
export function getWijkFromPostcode(postcode: string): WijkName {
  if (!postcode) return 'Onbekend';

  // Normalize postcode: remove spaces, uppercase
  const pc = postcode.replace(/\s/g, '').toUpperCase();

  for (const wijk of WIJK_RANGES) {
    if (pc >= wijk.min && pc <= wijk.max) {
      return wijk.name as WijkName;
    }
  }

  return 'Onbekend';
}

/**
 * Check if a postcode is valid for Lelystad
 * @param postcode - Dutch postcode
 * @returns true if postcode maps to a known neighborhood
 */
export function isLelystadPostcode(postcode: string): boolean {
  return getWijkFromPostcode(postcode) !== 'Onbekend';
}
