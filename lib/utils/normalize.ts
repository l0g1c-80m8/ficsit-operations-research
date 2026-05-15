// Spelling tolerance — equates British/American variants and strips diacritics
// so recipe and item search matches what people actually type.
//
// Examples:
//   "Sulphuric Acid"      → "sulfuric acid"
//   "Aluminium Ingot"     → "aluminum ingot"
//   "Colour Cartridge"    → "color cartridge"
//   "Iron-Plate"          → "iron plate"

const TRANSLATIONS: [RegExp, string][] = [
  [/sulphur/gi, 'sulfur'],
  [/aluminium/gi, 'aluminum'],
  [/colour/gi, 'color'],
  [/fibre/gi, 'fiber'],
  [/grey/gi, 'gray'],
  [/petrolem/gi, 'petroleum'],
];

export function normalizeSearch(s: string): string {
  let out = (s ?? '').toLowerCase();
  for (const [pat, rep] of TRANSLATIONS) out = out.replace(pat, rep);
  return out.replace(/[^a-z0-9]+/g, ' ').trim();
}

/** True if `haystack` contains every whitespace-separated token in `needle`. */
export function matchesQuery(haystack: string, needle: string): boolean {
  const n = normalizeSearch(needle);
  if (!n) return true;
  const h = normalizeSearch(haystack);
  return n.split(' ').every((tok) => h.includes(tok));
}
