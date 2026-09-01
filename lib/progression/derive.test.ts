import { describe, expect, it } from 'vitest';
import { deriveProgression, remainingParts, sumCosts } from './derive';
import { PROJECT_PHASES } from './phases';
import type { SatSchematic } from '@/lib/data/types';
import type { SaveProgression } from '@/lib/save/types';

function schem(partial: Partial<SatSchematic> & Pick<SatSchematic, 'className' | 'kind'>): SatSchematic {
  return {
    name: partial.className,
    tier: 0,
    time: 0,
    cost: [],
    unlockRecipes: [],
    requiredSchematics: [],
    ...partial,
  };
}

const FIXTURE: SatSchematic[] = [
  schem({ className: 'Schematic_Tutorial1_C', kind: 'milestone', tier: 0, cost: [{ item: 'Desc_IronPlate_C', amount: 10 }] }),
  schem({ className: 'Schematic_1-1_C', kind: 'milestone', tier: 1, cost: [{ item: 'Desc_IronPlate_C', amount: 20 }] }),
  schem({ className: 'Schematic_1-2_C', kind: 'milestone', tier: 1, cost: [{ item: 'Desc_IronRod_C', amount: 30 }] }),
  schem({ className: 'Schematic_2-1_C', kind: 'milestone', tier: 2, cost: [{ item: 'Desc_IronPlate_C', amount: 40 }] }),
  schem({ className: 'Research_Caterium_0_C', kind: 'mam', cost: [{ item: 'Desc_OreGold_C', amount: 50 }] }),
  schem({ className: 'Research_Caterium_1_C', kind: 'mam', cost: [{ item: 'Desc_OreGold_C', amount: 60 }] }),
  schem({ className: 'Research_AOrganisms_2_C', kind: 'mam', cost: [{ item: 'Desc_Mycelia_C', amount: 5 }] }),
  schem({ className: 'Research_AO_Stinger_C', kind: 'mam', cost: [{ item: 'Desc_Mycelia_C', amount: 7 }] }),
  schem({ className: 'Schematic_Alternate_Foo_C', kind: 'alternate' }),
  schem({ className: 'Schematic_Alternate_Bar_C', kind: 'alternate' }),
];

const SAVE: SaveProgression = {
  purchasedSchematics: ['Schematic_Tutorial1_C', 'Schematic_1-1_C', 'Research_Caterium_0_C', 'Schematic_Alternate_Foo_C'],
  currentPhase: 2,
  phasePaidOff: [{ item: 'Desc_SpaceElevatorPart_1_C', amount: 400 }],
  sources: { schematicManager: true, gamePhaseManager: true },
};

describe('sumCosts', () => {
  it('merges duplicate items and sorts by amount descending', () => {
    expect(
      sumCosts(
        [{ item: 'a', amount: 5 }],
        [{ item: 'a', amount: 5 }, { item: 'b', amount: 30 }],
      ),
    ).toEqual([
      { item: 'b', amount: 30 },
      { item: 'a', amount: 10 },
    ]);
  });

  it('drops items that net out to zero', () => {
    expect(sumCosts([{ item: 'a', amount: 0 }])).toEqual([]);
  });
});

describe('deriveProgression', () => {
  const model = deriveProgression(FIXTURE, SAVE);

  it('groups milestones by tier and labels tier 0 as HUB Upgrades', () => {
    expect(model.milestones.map((g) => g.label)).toEqual([
      'HUB Upgrades',
      'Tier 1',
      'Tier 2',
    ]);
  });

  it('marks purchased schematics done', () => {
    const tier1 = model.milestones.find((g) => g.id === 'tier-1')!;
    expect(tier1.done).toBe(1);
    expect(tier1.total).toBe(2);
  });

  it('rolls remaining cost from only the unfinished entries', () => {
    // Tier 1: 1-1 is done, 1-2 (30 Iron Rod) is not.
    const tier1 = model.milestones.find((g) => g.id === 'tier-1')!;
    expect(tier1.remaining).toEqual([{ item: 'Desc_IronRod_C', amount: 30 }]);
  });

  it('merges the four alien-organism research prefixes into one tree', () => {
    const organisms = model.mam.find((g) => g.id === 'organisms')!;
    expect(organisms.total).toBe(2);
    expect(organisms.label).toBe('Alien Organisms');
  });

  it('counts alternates without pulling them into cost roll-ups', () => {
    expect(model.alternates.done).toBe(1);
    expect(model.alternates.total).toBe(2);
    expect(model.alternates.remaining).toEqual([]);
  });

  it('splits phases into done / active / locked around currentPhase', () => {
    expect(model.phases.map((p) => p.state)).toEqual(['done', 'active', 'locked', 'locked', 'locked']);
  });

  it('subtracts parts already delivered to the active phase', () => {
    const active = model.phases.find((p) => p.state === 'active')!;
    const smartPlating = active.remaining.find((r) => r.item === 'Desc_SpaceElevatorPart_1_C');
    // Phase 2 wants 1000 Smart Plating; 400 are already in.
    expect(smartPlating).toEqual({ item: 'Desc_SpaceElevatorPart_1_C', amount: 600 });
  });

  it('leaves a completed phase with nothing remaining', () => {
    expect(model.phases[0].remaining).toEqual([]);
  });

  it('treats an unreadable save as nothing completed', () => {
    const empty = deriveProgression(FIXTURE, undefined);
    expect(empty.totals.milestonesDone).toBe(0);
    expect(empty.totals.alternatesDone).toBe(0);
    // No phase info → nothing can be marked done or active.
    expect(empty.phases.every((p) => p.state === 'locked')).toBe(true);
    expect(empty.currentPhase).toBeUndefined();
  });
});

describe('remainingParts', () => {
  const model = deriveProgression(FIXTURE, SAVE);

  it('defaults to every unfinished milestone', () => {
    // Tier 1 owes 30 Iron Rod, Tier 2 owes 40 Iron Plate. Tier 0 is done.
    expect(remainingParts(model)).toEqual([
      { item: 'Desc_IronPlate_C', amount: 40 },
      { item: 'Desc_IronRod_C', amount: 30 },
    ]);
  });

  it('narrows to a single tier', () => {
    expect(remainingParts(model, { tier: 2 })).toEqual([{ item: 'Desc_IronPlate_C', amount: 40 }]);
  });

  it('folds MAM and phase costs in when asked', () => {
    const all = remainingParts(model, { mam: true, phases: true });
    const gold = all.find((r) => r.item === 'Desc_OreGold_C');
    expect(gold).toEqual({ item: 'Desc_OreGold_C', amount: 60 }); // Caterium_0 is done
    expect(all.some((r) => r.item === 'Desc_SpaceElevatorPart_9_C')).toBe(true); // phase 4/5 parts
  });

  it('never reports a phase part the elevator has already been paid', () => {
    const all = remainingParts(model, { milestones: false, phases: true });
    const plating = all.find((r) => r.item === 'Desc_SpaceElevatorPart_1_C');
    // 1000 for phase 2 minus 400 delivered; phase 1's 50 is already complete.
    expect(plating).toEqual({ item: 'Desc_SpaceElevatorPart_1_C', amount: 600 });
  });
});

describe('PROJECT_PHASES', () => {
  it('covers five phases with non-empty costs', () => {
    expect(PROJECT_PHASES).toHaveLength(5);
    for (const p of PROJECT_PHASES) expect(p.cost.length).toBeGreaterThan(0);
  });
});
