// Belt & pipe tier helpers. These don't change the LP — they're presentation
// math: given an item flow (rate/min) and whether the item is a liquid,
// return the lowest Mk tier that can carry it on a single line, and the
// number of parallel lines needed if it exceeds the highest tier.

import type { SatData } from '../data/types';

/** Item throughput at 100 % clock per belt mark, in items / min.
 *  Source: Satisfactory wiki, Update 1.0 values. */
export const BELT_TIERS = [60, 120, 270, 480, 780, 1200] as const;
/** Liquid throughput per pipe mark, in m³/min. */
export const PIPE_TIERS = [300, 600] as const;

export interface TierRequirement {
  /** Mark tier (1-indexed) that fits the flow on a single line, capped at the
   *  max tier of the relevant family (belts/pipes). */
  mark: number;
  /** When > 1, the chosen mark is the max and we need this many parallel
   *  lines to actually move the flow. */
  parallel: number;
  /** Item throughput rate per single max-tier line. */
  perLine: number;
  /** 'belt' for solids, 'pipe' for liquids. */
  kind: 'belt' | 'pipe';
}

/** Pick the cheapest mark + parallel count for a single item flow.
 *  Returns null for rate ≤ 0 (nothing to carry). */
export function requiredTier(item: string, ratePerMin: number, data: SatData): TierRequirement | null {
  if (ratePerMin <= 1e-6) return null;
  const it = data.items[item];
  const liquid = !!it?.liquid;
  const tiers = liquid ? PIPE_TIERS : BELT_TIERS;
  const kind: 'belt' | 'pipe' = liquid ? 'pipe' : 'belt';
  for (let i = 0; i < tiers.length; i++) {
    if (ratePerMin <= tiers[i] + 1e-6) {
      return { mark: i + 1, parallel: 1, perLine: tiers[i], kind };
    }
  }
  const max = tiers[tiers.length - 1];
  return {
    mark: tiers.length,
    parallel: Math.ceil(ratePerMin / max),
    perLine: max,
    kind,
  };
}

/** Concise label like "Mk3" or "2× Mk6". */
export function tierLabel(t: TierRequirement): string {
  return t.parallel === 1 ? `Mk${t.mark}` : `${t.parallel}× Mk${t.mark}`;
}
