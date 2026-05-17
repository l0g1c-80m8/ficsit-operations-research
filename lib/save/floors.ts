// Floor detection from a parsed save.
//
// Foundations stack along world Z at predictable intervals (one Satisfactory
// foundation is 4 m / 400 units tall). Clustering foundation Z values gives
// us a list of "slabs" that match what a Pioneer sees as floors in-game.

import type { PlacedActor } from './types';

export interface DetectedFloor {
  /** 1-based floor number, lowest Z = F1. */
  idx: number;
  /** Representative Z of the cluster (median). */
  z: number;
  /** Lower clip bound for filtering actors onto this floor. */
  zMin: number;
  /** Upper clip bound for filtering actors onto this floor. */
  zMax: number;
  /** Number of foundation actors contributing to this cluster. */
  count: number;
}

/** Pioneer foundations report their world Z at the bottom of the slab, so an
 *  actor "on" the floor sits at z ∈ [floorZ - 2 m, floorZ + 4 m). */
const FLOOR_LOWER_PAD = 200;
const FLOOR_UPPER_PAD = 400;
/** Foundations whose Z gap is below this join into the same cluster. */
const CLUSTER_GAP = 150;
/** Discard clusters below this size — eliminates stray ramps / one-offs. */
const MIN_FOUNDATIONS_PER_FLOOR = 10;

export function detectFloors(actors: PlacedActor[]): DetectedFloor[] {
  const zs: number[] = [];
  for (const a of actors) if (a.category === 'foundation') zs.push(a.z);
  if (zs.length === 0) return [];
  zs.sort((a, b) => a - b);

  const clusters: number[][] = [];
  let current: number[] = [zs[0]];
  for (let i = 1; i < zs.length; i++) {
    if (zs[i] - current[current.length - 1] <= CLUSTER_GAP) {
      current.push(zs[i]);
    } else {
      clusters.push(current);
      current = [zs[i]];
    }
  }
  clusters.push(current);

  return clusters
    .filter((c) => c.length >= MIN_FOUNDATIONS_PER_FLOOR)
    .map((c) => {
      const median = c[Math.floor(c.length / 2)];
      return {
        idx: 0,
        z: median,
        zMin: median - FLOOR_LOWER_PAD,
        zMax: median + FLOOR_UPPER_PAD,
        count: c.length,
      };
    })
    .sort((a, b) => a.z - b.z)
    .map((f, i) => ({ ...f, idx: i + 1 }));
}

export function actorOnFloor(a: PlacedActor, f: DetectedFloor): boolean {
  return a.z >= f.zMin && a.z <= f.zMax;
}
