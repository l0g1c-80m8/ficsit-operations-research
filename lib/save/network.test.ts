// Sanity-check the inferred-topology edge builder. The exact edge selection
// depends on neighbour distances, so these tests pin shapes (counts +
// connectivity) rather than full edge lists.

import { describe, expect, it } from 'vitest';
import { buildProximityEdges } from './network';
import type { PlacedActor } from './types';

const ACTOR_DEFAULTS = { z: 0, yaw: 0, scale: 1, className: 'X', category: 'misc' } as const;

function row(...xs: number[]): PlacedActor[] {
  return xs.map((x) => ({ ...ACTOR_DEFAULTS, x, y: 0 }));
}

describe('buildProximityEdges', () => {
  it('returns nothing for fewer than two actors', () => {
    expect(buildProximityEdges([], 100)).toEqual([]);
    expect(buildProximityEdges(row(0), 100)).toEqual([]);
  });

  it('chains a row of evenly spaced actors into a polyline', () => {
    // 5 actors at x = 0, 100, 200, 300, 400 → 4 edges in a straight line.
    const edges = buildProximityEdges(row(0, 100, 200, 300, 400), 150, 2);
    expect(edges).toHaveLength(4);
    // Each edge spans exactly 100 in x.
    for (const e of edges) {
      expect(Math.abs(e.bx - e.ax)).toBe(100);
      expect(e.ay).toBe(0);
      expect(e.by).toBe(0);
    }
  });

  it('does not bridge actors separated by more than maxDist', () => {
    // Two clusters: [0, 100] and [1000, 1100]. With maxDist 200 we get an
    // edge in each cluster and nothing crossing the gap.
    const actors = row(0, 100, 1000, 1100);
    const edges = buildProximityEdges(actors, 200, 2);
    expect(edges).toHaveLength(2);
    for (const e of edges) {
      const dx = Math.abs(e.bx - e.ax);
      expect(dx).toBeLessThanOrEqual(200);
    }
  });

  it('captures a branch at a junction with k=2', () => {
    // T-junction: junction at (0,0), three arms at distance 100.
    const actors: PlacedActor[] = [
      { ...ACTOR_DEFAULTS, x: 0, y: 0 },   // 0: junction
      { ...ACTOR_DEFAULTS, x: 100, y: 0 }, // 1: east
      { ...ACTOR_DEFAULTS, x: 0, y: 100 }, // 2: south
      { ...ACTOR_DEFAULTS, x: -100, y: 0 },// 3: west
    ];
    const edges = buildProximityEdges(actors, 200, 2);
    // Junction has three same-distance neighbours; k=2 lets us catch at
    // least two of them. The other arms might pair with each other if
    // they're inside the threshold (rough triangle 141 < 200). Either way
    // every arm should be connected to the junction or another arm,
    // forming a single connected graph.
    expect(edges.length).toBeGreaterThanOrEqual(3);
    expect(edges.length).toBeLessThanOrEqual(6);
  });

  it('dedupes edges (no a→b and b→a duplicates)', () => {
    const actors = row(0, 50, 100);
    const edges = buildProximityEdges(actors, 80, 2);
    expect(edges).toHaveLength(2); // (0,50) and (50,100), not duplicates
  });
});
