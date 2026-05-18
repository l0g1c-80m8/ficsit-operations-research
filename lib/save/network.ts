// Topology inference for save-viewer "network" categories.
//
// The save format doesn't expose conveyor-to-conveyor / pipe-to-pipe links
// in a form we currently read, so the topograph approximates the network by
// drawing edges between same-category actors that sit within a max world
// distance of each other. A 1-NN spanning forest gives a clean skeleton; an
// extra branch hop (k=2) catches splits at splitters / junctions. Edges
// longer than `maxDist` are filtered so disconnected runs don't bridge.

import type { PlacedActor } from './types';

export interface ProxEdge {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** Spatial-hashed k-NN edge builder. Each actor gets up to `k` edges to its
 *  nearest same-list neighbours within `maxDist`. Each edge is emitted at
 *  most once (keyed by sorted index pair). O(n · k) average for typical
 *  saves, vs O(n²) without the hash — important when a save has 10 k+ belt
 *  poles in a single category. */
export function buildProximityEdges(actors: PlacedActor[], maxDist: number, k = 2): ProxEdge[] {
  if (actors.length < 2 || maxDist <= 0) return [];
  const cellSize = maxDist;
  const cells = new Map<string, number[]>();
  const keyOf = (x: number, y: number) => `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;
  for (let i = 0; i < actors.length; i++) {
    const key = keyOf(actors[i].x, actors[i].y);
    const arr = cells.get(key);
    if (arr) arr.push(i);
    else cells.set(key, [i]);
  }
  const seen = new Set<string>();
  const edges: ProxEdge[] = [];
  const maxDistSq = maxDist * maxDist;
  for (let i = 0; i < actors.length; i++) {
    const a = actors[i];
    const cx = Math.floor(a.x / cellSize);
    const cy = Math.floor(a.y / cellSize);
    const cands: { j: number; d: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const list = cells.get(`${cx + dx},${cy + dy}`);
        if (!list) continue;
        for (const j of list) {
          if (j === i) continue;
          const b = actors[j];
          const d = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
          if (d > maxDistSq) continue;
          cands.push({ j, d });
        }
      }
    }
    if (cands.length === 0) continue;
    cands.sort((p, q) => p.d - q.d);
    const take = Math.min(k, cands.length);
    for (let n = 0; n < take; n++) {
      const j = cands[n].j;
      const lo = i < j ? i : j;
      const hi = i < j ? j : i;
      const key = `${lo}-${hi}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const b = actors[j];
      edges.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y });
    }
  }
  return edges;
}
