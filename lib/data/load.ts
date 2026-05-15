import type { SatData } from './types';

let cache: Promise<SatData> | null = null;

/** Loads the bundled Satisfactory data from /data/satisfactory.json (client-side). */
export function loadGameData(): Promise<SatData> {
  if (cache) return cache;
  cache = fetch('/data/satisfactory.json', { cache: 'force-cache' }).then((r) => {
    if (!r.ok) throw new Error(`Failed to load game data: ${r.status}`);
    return r.json() as Promise<SatData>;
  });
  return cache;
}

export function clearDataCache() {
  cache = null;
}
