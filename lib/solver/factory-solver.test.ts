// LP solver assertions. Each test loads the committed pruned dataset and
// checks one semantic guarantee — kept short and orthogonal so any regression
// in `factory-solver.ts` points at exactly one thing.

import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { solveFactory, powerMultiplier, type FactoryPlan } from './factory-solver';
import type { SatData } from '../data/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../public/data/satisfactory.json');

let data: SatData;
beforeAll(() => {
  data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as SatData;
});

const PLATE = 'Desc_IronPlate_C';
const ORE = 'Desc_OreIron_C';
const COAL = 'Desc_Coal_C';
const COPPER_ORE = 'Desc_OreCopper_C';

function plan(...args: Parameters<typeof solveFactory> extends [SatData, ...infer R] ? R : never): FactoryPlan {
  return solveFactory(data, ...args);
}

function machinesFor(p: FactoryPlan, recipeName: string): number {
  return p.lines.find((l) => l.recipe.name === recipeName)?.machines ?? 0;
}

describe('solveFactory — baseline', () => {
  // Alts off across baseline assertions: the standard Iron Plate / Iron Ingot
  // chain is what the deterministic counts (3 + 3 = 6 machines) refer to.
  // With alts on, the LP picks "Coated Iron Plate" + similar which are
  // smaller but irrelevant to the semantics we're locking in here.
  const std = { includeAlternates: false } as const;

  it('produces an optimal plan for fixed-rate Iron Plate with auto-supplied raws', () => {
    const p = plan([], [{ item: PLATE, minRatePerMin: 60 }], std);
    expect(p.status).toBe('optimal');
    expect(p.outputs[0].ratePerMin).toBeCloseTo(60, 5);
    // 60 plates needs 3 Constructors + 3 Smelters → 6 machines.
    expect(p.totalMachines).toBeCloseTo(6, 5);
    expect(machinesFor(p, 'Iron Plate')).toBeCloseTo(3, 5);
    expect(machinesFor(p, 'Iron Ingot')).toBeCloseTo(3, 5);
  });

  it('uses the smallest factory in min-machines mode even when capacity is abundant', () => {
    const p = plan(
      [{ item: ORE, ratePerMin: 600 }],
      [{ item: PLATE, minRatePerMin: 60 }],
      std,
    );
    expect(p.status).toBe('optimal');
    // Should still pick 6 machines — extra ore cap doesn't widen the factory.
    expect(p.totalMachines).toBeCloseTo(6, 5);
  });
});

describe('solveFactory — auto-supply contracts', () => {
  it('with autoSupply on, only listed caps apply; everything else is free', () => {
    const p = plan(
      [{ item: ORE, ratePerMin: 30 }], // tight cap
      [{ item: PLATE }],
      { autoSupplyRawResources: true },
    );
    expect(p.status).toBe('optimal');
    // 30 ore/min sustains 20 Iron Plate at the standard ratio.
    const ironOreRow = p.consumedInputs.find((c) => c.item === ORE)!;
    expect(ironOreRow.ratePerMin).toBeCloseTo(30, 5);
  });

  it('with autoSupply off, only listed raws are usable', () => {
    // Strict mode + only coal supply → can\'t make plate (needs iron ore).
    const p = plan(
      [{ item: COAL, ratePerMin: 120 }],
      [{ item: PLATE, minRatePerMin: 60 }],
      { autoSupplyRawResources: false },
    );
    expect(p.status).toBe('infeasible');
  });
});

describe('solveFactory — overclocking', () => {
  // Alternates off: standard Iron Plate / Iron Ingot chain → 12 machines at
  // 100% for 120/m. Without this lock-down, the LP picks alt recipes (Coated
  // Iron Plate via Plastic etc.) which are smaller but irrelevant to the
  // semantics under test.
  const std = { includeAlternates: false } as const;

  it('keeps machines at 100% when no shard budget is set', () => {
    const p = plan([], [{ item: PLATE, minRatePerMin: 120 }], std);
    expect(p.totalShards).toBe(0);
    for (const l of p.lines) {
      expect(l.clockTiers.every((t) => t.clock === 1)).toBe(true);
    }
    expect(p.totalMachines).toBeCloseTo(12, 5);
  });

  it('runs every machine at 250% when shard budget covers it', () => {
    // 12 base machines × 3 shards = 36 shards at full 250% clock. Budget 100
    // is more than enough.
    const p = plan([], [{ item: PLATE, minRatePerMin: 120 }], { ...std, shardBudget: 100 });
    expect(p.status).toBe('optimal');
    expect(p.totalMachines).toBeCloseTo(4.8, 3); // 12 / 2.5
    expect(p.totalShards).toBeCloseTo(14.4, 3); // 4.8 machines × 3 shards each
    // Power: 4.8 machines × 4 MW/machine × 2.5^1.32 ≈ 65 MW (vs 48 MW baseline).
    const expectedPower = 4.8 * 4 * powerMultiplier(2.5);
    expect(p.totalPowerKW).toBeCloseTo(expectedPower, 1);
  });

  it('respects a tight shard budget by mixing tiers', () => {
    // Baseline 12 machines, 6 shards → solver picks some OC mix.
    const p = plan([], [{ item: PLATE, minRatePerMin: 120 }], { ...std, shardBudget: 6 });
    expect(p.status).toBe('optimal');
    expect(p.totalShards).toBeLessThanOrEqual(6 + 1e-6);
    // OC helps but doesn't fully fund 250%, so total is strictly between 4.8 and 12.
    expect(p.totalMachines).toBeGreaterThan(4.8 - 1e-6);
    expect(p.totalMachines).toBeLessThan(12);
  });
});

describe('solveFactory — power production', () => {
  it('off by default: no generator lines, no power balance enforced', () => {
    const p = plan([], [{ item: PLATE, minRatePerMin: 60 }]);
    expect(p.generatorLines).toEqual([]);
    expect(p.totalPowerProducedKW).toBe(0);
  });

  it('balances draw with produced power when includePowerProduction is set', () => {
    const p = plan([], [{ item: PLATE, minRatePerMin: 60 }], { includePowerProduction: true });
    expect(p.status).toBe('optimal');
    // Production ≥ consumption (constraint), and the LP minimizes, so they
    // should match within floating-point tolerance.
    expect(p.totalPowerProducedKW).toBeGreaterThanOrEqual(p.totalPowerKW - 1e-6);
    expect(p.totalPowerProducedKW).toBeCloseTo(p.totalPowerKW, 3);
    // For a 24 MW load, the cheapest fuel-chain is Coal-Powered Generator.
    expect(p.generatorLines.some((g) => g.generator === 'Desc_GeneratorCoal_C')).toBe(true);
  });

  it('folds fuel consumption into the raw inputs tally', () => {
    const p = plan([], [{ item: PLATE, minRatePerMin: 60 }], { includePowerProduction: true });
    const coal = p.consumedInputs.find((c) => c.item === COAL);
    expect(coal).toBeDefined();
    expect(coal!.ratePerMin).toBeGreaterThan(0);
  });
});

describe('solveFactory — sink-point objective', () => {
  // Auto-supply OFF: with the default UNLIMITED_SUPPLY=1e6 covering every raw
  // not in the user's list, sink-mode LP gets numerically unstable (it can
  // produce billions of tickets from gigatons of auto-supplied raws). Strict
  // mode keeps every input bounded, which is the realistic use case for
  // "what's the most ticket-dense thing I can make from these raws?".
  // Also pin alts off — the alt-recipe graph admits a degenerate chain that
  // makes strict-mode LPs unbounded; the standard recipe set is what we want
  // to assert against.
  const strict = { autoSupplyRawResources: false, includeAlternates: false } as const;

  it('picks the most ticket-dense product mix from constrained raws', () => {
    const pOut = plan(
      [{ item: ORE, ratePerMin: 120 }, { item: COPPER_ORE, ratePerMin: 120 }],
      [{ item: PLATE }],
      { ...strict, objective: 'output' },
    );
    const pSink = plan(
      [{ item: ORE, ratePerMin: 120 }, { item: COPPER_ORE, ratePerMin: 120 }],
      [{ item: PLATE }],
      { ...strict, objective: 'sink_points' },
    );
    expect(pSink.status).toBe('optimal');
    // Output mode: only makes Iron Plate (the listed target).
    expect(pOut.outputs[0].item).toBe(PLATE);
    expect(pOut.outputs[0].ratePerMin).toBeGreaterThan(0);
    // Sink mode: total sink-point value strictly higher than output mode.
    const sinkValue = (p: FactoryPlan) =>
      p.outputs.reduce((acc, o) => {
        const it = data.items[o.item];
        const pts = it?.liquid ? 0 : it?.sinkPoints ?? 0;
        return acc + pts * o.ratePerMin;
      }, 0);
    expect(sinkValue(pSink)).toBeGreaterThan(sinkValue(pOut));
  });

  it('does not select liquids or gases as sink outputs', () => {
    const p = plan(
      [{ item: ORE, ratePerMin: 120 }, { item: COPPER_ORE, ratePerMin: 120 }],
      [],
      { ...strict, objective: 'sink_points' },
    );
    expect(p.status).toBe('optimal');
    for (const o of p.outputs) {
      const it = data.items[o.item];
      expect(it?.liquid).toBeFalsy();
    }
  });
});
