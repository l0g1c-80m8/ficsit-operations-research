// Space Elevator / Project Assembly phases.
//
// MANUALLY MAINTAINED. Greeny's community dump (the source for
// public/data/satisfactory.json) has no schematics for the Project Assembly
// phases — its `schematics` table covers Milestones, MAM research, and Hard
// Drive alternates only. So the five phases live here, keyed by the same
// `Desc_SpaceElevatorPart_*_C` classes the dataset uses for the parts, which
// means ItemIcon / data.items lookups work exactly as they do elsewhere.
//
// Quantities verified against the official wiki (satisfactory.wiki.gg/wiki/Space_Elevator)
// for game version 1.0. If Coffee Stain re-balances a phase, edit this file —
// nothing upstream will correct it.

import type { RecipeIO } from '@/lib/data/types';

export interface ProjectPhase {
  /** 1-based phase number, matching the in-game "Phase N" labelling. */
  phase: number;
  name: string;
  cost: RecipeIO[];
}

export const PROJECT_PHASES: ProjectPhase[] = [
  {
    phase: 1,
    name: 'Distribution Platform',
    cost: [{ item: 'Desc_SpaceElevatorPart_1_C', amount: 50 }],
  },
  {
    phase: 2,
    name: 'Construction Dock',
    cost: [
      { item: 'Desc_SpaceElevatorPart_1_C', amount: 1000 },
      { item: 'Desc_SpaceElevatorPart_2_C', amount: 1000 },
      { item: 'Desc_SpaceElevatorPart_3_C', amount: 100 },
    ],
  },
  {
    phase: 3,
    name: 'Main Body',
    cost: [
      { item: 'Desc_SpaceElevatorPart_2_C', amount: 2500 },
      { item: 'Desc_SpaceElevatorPart_4_C', amount: 500 },
      { item: 'Desc_SpaceElevatorPart_5_C', amount: 100 },
    ],
  },
  {
    phase: 4,
    name: 'Propulsion',
    cost: [
      { item: 'Desc_SpaceElevatorPart_7_C', amount: 500 },
      { item: 'Desc_SpaceElevatorPart_6_C', amount: 500 },
      { item: 'Desc_SpaceElevatorPart_8_C', amount: 250 },
      { item: 'Desc_SpaceElevatorPart_9_C', amount: 100 },
    ],
  },
  {
    phase: 5,
    name: 'Assembly',
    cost: [
      { item: 'Desc_SpaceElevatorPart_9_C', amount: 1000 },
      { item: 'Desc_SpaceElevatorPart_10_C', amount: 1000 },
      { item: 'Desc_SpaceElevatorPart_12_C', amount: 256 },
      { item: 'Desc_SpaceElevatorPart_11_C', amount: 200 },
    ],
  },
];

/** Total parts across every phase — used for the "whole game remaining" tile. */
export function phaseTotals(phases: ProjectPhase[] = PROJECT_PHASES): RecipeIO[] {
  const totals = new Map<string, number>();
  for (const p of phases) {
    for (const c of p.cost) totals.set(c.item, (totals.get(c.item) ?? 0) + c.amount);
  }
  return [...totals.entries()].map(([item, amount]) => ({ item, amount }));
}
