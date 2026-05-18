// Save → verify-factory flow assertions. The verify pass is closed-form
// arithmetic over the recipe-utilization map; these tests pin down the
// classification logic (output / input / intermediate / surplus / deficit).

import { describe, expect, it, beforeAll } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyFactory } from './verify';
import type { SatData } from '../data/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../public/data/satisfactory.json');
let data: SatData;
beforeAll(() => {
  data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as SatData;
});

const recipeClassByName = (name: string) =>
  data.recipes.find((r) => r.name === name)?.className ?? '';

describe('verifyFactory', () => {
  it('classifies a simple Iron Plate factory: ore = input, plate = output, ingot = balanced intermediate', () => {
    const usage = new Map<string, number>([
      [recipeClassByName('Iron Plate'), 3], // 3 Constructors → 60 plate/min, consume 90 ingot/min
      [recipeClassByName('Iron Ingot'), 3], // 3 Smelters → 90 ingot/min, consume 90 ore/min
    ]);
    const report = verifyFactory(data, usage);
    expect(report.lines).toHaveLength(2);
    expect(report.totalMachines).toBe(6);

    // Iron Plate: produced 60/m, no consumer in this factory → output.
    const plate = report.outputs.find((f) => f.item === 'Desc_IronPlate_C');
    expect(plate?.produced).toBeCloseTo(60, 5);
    expect(plate?.consumed ?? 0).toBeCloseTo(0, 5);

    // Iron Ore: only consumed (no Smelter produces ore) → input.
    const ore = report.inputs.find((f) => f.item === 'Desc_OreIron_C');
    expect(ore?.consumed).toBeCloseTo(90, 5);
    expect(ore?.produced ?? 0).toBeCloseTo(0, 5);

    // Iron Ingot: produced AND consumed at matching rates → balanced intermediate.
    const ingot = report.intermediates.find((f) => f.item === 'Desc_IronIngot_C');
    expect(ingot?.produced).toBeCloseTo(90, 5);
    expect(ingot?.consumed).toBeCloseTo(90, 5);
    expect(Math.abs(ingot?.net ?? Infinity)).toBeLessThan(1e-6);
  });

  it('flags a deficit when downstream demand exceeds upstream supply', () => {
    // Twice as many Constructors as Smelters: ingot demand > supply.
    const usage = new Map<string, number>([
      [recipeClassByName('Iron Plate'), 6],
      [recipeClassByName('Iron Ingot'), 3],
    ]);
    const report = verifyFactory(data, usage);
    const ingot = report.intermediates.find((f) => f.item === 'Desc_IronIngot_C');
    expect(ingot).toBeDefined();
    expect(ingot!.consumed).toBeGreaterThan(ingot!.produced);
    expect(ingot!.net).toBeLessThan(0);
  });

  it('flags a surplus when upstream produces more than is consumed', () => {
    // Twice as many Smelters as Constructors: ingot supply > demand.
    const usage = new Map<string, number>([
      [recipeClassByName('Iron Plate'), 3],
      [recipeClassByName('Iron Ingot'), 6],
    ]);
    const report = verifyFactory(data, usage);
    const ingot = report.intermediates.find((f) => f.item === 'Desc_IronIngot_C');
    expect(ingot).toBeDefined();
    expect(ingot!.produced).toBeGreaterThan(ingot!.consumed);
    expect(ingot!.net).toBeGreaterThan(0);
  });

  it('lists unknown recipe classes instead of throwing', () => {
    const usage = new Map<string, number>([
      [recipeClassByName('Iron Plate'), 1],
      ['Recipe_DoesNotExist_C', 5],
    ]);
    const report = verifyFactory(data, usage);
    expect(report.unknownRecipes).toContain('Recipe_DoesNotExist_C');
    expect(report.lines).toHaveLength(1);
    expect(report.totalMachines).toBe(1);
  });
});
