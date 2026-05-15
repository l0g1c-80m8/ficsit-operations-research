import type { SatData } from './types';

let cache: Promise<SatData> | null = null;

/** Loads the bundled Satisfactory data from /data/satisfactory.json.
 *
 * Fetches /data/version.json first (tiny side-car) to obtain the current
 * buildId, then requests the big payload with ?v=<buildId>. That makes the
 * data file cacheable forever yet still picks up new prunes immediately,
 * with no manual reload required.
 */
export function loadGameData(): Promise<SatData> {
  if (cache) return cache;
  cache = (async () => {
    let buildId = 'unknown';
    try {
      const v = await fetch('/data/version.json', { cache: 'no-store' });
      if (v.ok) {
        const j = (await v.json()) as { buildId?: string };
        if (j.buildId) buildId = j.buildId;
      }
    } catch {
      /* fall through — we'll just fetch with a static URL */
    }
    const url = `/data/satisfactory.json?v=${encodeURIComponent(buildId)}`;
    const r = await fetch(url, { cache: 'force-cache' });
    if (!r.ok) throw new Error(`Failed to load game data: ${r.status}`);
    const data = (await r.json()) as SatData & { buildId?: string };
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.info(
        `[FICSIT] dataset loaded: ${data.recipes.length} recipes · ${Object.keys(data.items).length} items · ${Object.keys(data.buildings).length} buildings · build=${data.buildId ?? 'n/a'}`,
      );
    }
    return data;
  })();
  return cache;
}

export function clearDataCache() {
  cache = null;
}
