// Save → Calculator verify pass.
//
// Given a save's recipe utilization (recipe class → machine count), compute
// the implied per-item flow at 100 % clock and label every item as either an
// **input** (net consumed, no upstream producer in this factory), an
// **output** (net produced, no downstream consumer), or an **intermediate**
// (both produced and consumed; the surplus or deficit shows whether the
// factory is balanced). This is closed-form arithmetic — no LP needed —
// because each recipe line's rate is determined by its machine count.
//
// Clock speed: we assume 100 % per machine. Future iteration can read
// `mCurrentPotential` from each actor for true clock per machine.

import type { SatData, SatRecipe } from '../data/types';
import { ratePerMin } from '../utils';
import { recipePowerKW } from '../solver/factory-solver';

export interface VerifyLine {
  recipe: SatRecipe;
  machines: number;
  /** MW consumed by this line at 100 % clock. */
  powerKW: number;
}

export interface VerifyFlow {
  item: string;
  produced: number;
  consumed: number;
  /** produced − consumed; positive = surplus, negative = deficit. */
  net: number;
}

export interface VerifyReport {
  /** Items the factory generates as final products (only produced). */
  outputs: VerifyFlow[];
  /** Items the factory needs from outside (only consumed). */
  inputs: VerifyFlow[];
  /** Items both produced *and* consumed internally; `net` tells you if the
   *  factory is short on a step. */
  intermediates: VerifyFlow[];
  /** Total machines across recognized recipe lines. */
  totalMachines: number;
  /** Power draw at 100 % clock for the recognized lines. */
  totalPowerKW: number;
  /** Recipe lines that were recognized in the save. */
  lines: VerifyLine[];
  /** Recipe classes seen on save actors that aren't in the dataset. */
  unknownRecipes: string[];
}

export function verifyFactory(
  data: SatData,
  /** Recipe class → machine count (from `SaveStats` recipe utilization). */
  usage: Map<string, number>,
): VerifyReport {
  const produced = new Map<string, number>();
  const consumed = new Map<string, number>();
  const lines: VerifyLine[] = [];
  const unknownRecipes: string[] = [];
  let totalMachines = 0;
  let totalPowerKW = 0;
  const EPS = 1e-9;

  for (const [recipeClass, machines] of usage) {
    if (machines <= EPS) continue;
    const recipe = data.recipes.find((r) => r.className === recipeClass);
    if (!recipe) {
      unknownRecipes.push(recipeClass);
      continue;
    }
    for (const p of recipe.products) {
      const rate = ratePerMin(p.amount, recipe.time) * machines;
      produced.set(p.item, (produced.get(p.item) ?? 0) + rate);
    }
    for (const i of recipe.ingredients) {
      const rate = ratePerMin(i.amount, recipe.time) * machines;
      consumed.set(i.item, (consumed.get(i.item) ?? 0) + rate);
    }
    const powerKW = recipePowerKW(recipe, data) * machines;
    totalMachines += machines;
    totalPowerKW += powerKW;
    lines.push({ recipe, machines, powerKW });
  }

  const allItems = new Set<string>([...produced.keys(), ...consumed.keys()]);
  const outputs: VerifyFlow[] = [];
  const inputs: VerifyFlow[] = [];
  const intermediates: VerifyFlow[] = [];
  for (const item of allItems) {
    const p = produced.get(item) ?? 0;
    const c = consumed.get(item) ?? 0;
    const flow: VerifyFlow = { item, produced: p, consumed: c, net: p - c };
    if (p > EPS && c <= EPS) outputs.push(flow);
    else if (p <= EPS && c > EPS) inputs.push(flow);
    else intermediates.push(flow);
  }
  // Largest first within each bucket.
  outputs.sort((a, b) => b.net - a.net);
  inputs.sort((a, b) => a.net - b.net); // most-deficit first (largest |net|)
  intermediates.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

  return {
    outputs,
    inputs,
    intermediates,
    totalMachines,
    totalPowerKW,
    lines,
    unknownRecipes,
  };
}
