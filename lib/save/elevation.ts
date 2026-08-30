// Elevation binning from a parsed save.
//
// Rather than free-form clustering of foundation Z values (which produced
// unevenly spaced, unstable "floor" lists that jumped around between saves),
// we slice the world into fixed-height elevation bands and bucket every
// foundation into one. Each occupied band becomes a selectable elevation level
// in the topograph. Fixed bins keep the levels evenly spaced and stable across
// re-uploads of the same base.

import type { PlacedActor } from './types';

export interface ElevationLevel {
  /** 1-based level number, lowest = L1. */
  idx: number;
  /** Representative Z of the band (its centre), in world units. */
  z: number;
  /** Lower clip bound (inclusive) for filtering actors onto this level. */
  zMin: number;
  /** Upper clip bound (exclusive) for filtering actors onto this level. */
  zMax: number;
  /** Number of foundation actors that fall in this band. */
  count: number;
}

/** Height of one elevation band, in world units (1 unit = 1 cm). 800 = 8 m —
 *  two stacked 4 m Satisfactory foundations, the low end of the 8–10 m a
 *  Pioneer reads as one storey. Bump this to widen the bands. */
export const LEVEL_HEIGHT = 800;

/** Bands with fewer foundations than this are dropped, so stray ramps and
 *  one-off platforms don't spawn a level of their own. */
const MIN_FOUNDATIONS_PER_LEVEL = 10;

export function detectLevels(actors: PlacedActor[]): ElevationLevel[] {
  let zLo = Infinity;
  let zHi = -Infinity;
  for (const a of actors) {
    if (a.category !== 'foundation') continue;
    if (a.z < zLo) zLo = a.z;
    if (a.z > zHi) zHi = a.z;
  }
  if (!Number.isFinite(zLo)) return [];

  // Anchor the bin grid to a global multiple of LEVEL_HEIGHT so the same base
  // always lands in the same bands regardless of its vertical extent.
  const base = Math.floor(zLo / LEVEL_HEIGHT) * LEVEL_HEIGHT;
  const binCount = Math.floor((zHi - base) / LEVEL_HEIGHT) + 1;
  const counts = new Array<number>(binCount).fill(0);
  for (const a of actors) {
    if (a.category !== 'foundation') continue;
    counts[Math.floor((a.z - base) / LEVEL_HEIGHT)]++;
  }

  const levels: ElevationLevel[] = [];
  for (let b = 0; b < binCount; b++) {
    if (counts[b] < MIN_FOUNDATIONS_PER_LEVEL) continue;
    const zMin = base + b * LEVEL_HEIGHT;
    levels.push({
      idx: 0,
      z: zMin + LEVEL_HEIGHT / 2,
      zMin,
      zMax: zMin + LEVEL_HEIGHT,
      count: counts[b],
    });
  }
  return levels.map((lvl, i) => ({ ...lvl, idx: i + 1 }));
}

export function actorOnLevel(a: PlacedActor, lvl: ElevationLevel): boolean {
  return a.z >= lvl.zMin && a.z < lvl.zMax;
}
