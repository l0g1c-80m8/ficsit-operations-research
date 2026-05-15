// Linear-programming solver for Satisfactory factory plans.
//
// Decision variables:
//   x_<recipeIdx>  ≥ 0   number of machines at 100% clock for that recipe
//   supply_<item>  ∈ [0, cap]  raw input drawn from the user's allowance
//   produced_<item> ≥ 0   target output amount sunk to the user
//
// Per item flow balance (equality):
//   Σ_r (out_rate(r,i) − in_rate(r,i)) · x_r  + supply_i − produced_i  =  0
//
// produced_i is only "free" (≥ 0) for items the user listed as targets,
// otherwise it is pinned to 0 (so excess intermediates can't be sunk arbitrarily).
//
// Objective:
//   max  Σ_targets weight_i · produced_i
//
// Result also exposes machine count, building breakdown, and total power.

import solver from 'javascript-lp-solver';
import type { SatData, SatRecipe } from '../data/types';
import { ratePerMin } from '../utils';

export interface SupplyInput {
  /** item class name */
  item: string;
  /** items per minute available */
  ratePerMin: number;
}

export interface TargetOutput {
  /** item class name */
  item: string;
  /** weight for the objective (default 1) */
  weight?: number;
  /** items per minute target (used to set a min constraint instead of weight) */
  minRatePerMin?: number;
}

export interface SolverOptions {
  /** subset of recipe classNames to allow. If empty/undefined, all recipes allowed. */
  allowedRecipes?: Set<string>;
  /** whether alternate recipes are permitted */
  includeAlternates?: boolean;
}

export interface FactoryPlanLine {
  recipe: SatRecipe;
  building: string;
  machines: number;
  outputs: { item: string; ratePerMin: number }[];
  inputs: { item: string; ratePerMin: number }[];
  powerKW: number;
}

export interface FactoryPlan {
  status: 'optimal' | 'infeasible' | 'unbounded' | 'error';
  message?: string;
  lines: FactoryPlanLine[];
  totalMachines: number;
  totalPowerKW: number;
  buildingsByType: { building: string; machines: number }[];
  outputs: { item: string; ratePerMin: number }[];
  consumedInputs: { item: string; ratePerMin: number }[];
  objective: number;
}

const EPS = 1e-6;

export function solveFactory(
  data: SatData,
  supplies: SupplyInput[],
  targets: TargetOutput[],
  options: SolverOptions = {},
): FactoryPlan {
  const { allowedRecipes, includeAlternates = true } = options;

  const candidateRecipes = data.recipes.filter((r) => {
    if (!includeAlternates && r.alternate) return false;
    if (allowedRecipes && allowedRecipes.size && !allowedRecipes.has(r.className)) return false;
    return true;
  });

  const supplyByItem = new Map<string, number>();
  for (const s of supplies) {
    supplyByItem.set(s.item, (supplyByItem.get(s.item) ?? 0) + s.ratePerMin);
  }
  const targetSet = new Map<string, TargetOutput>();
  for (const t of targets) targetSet.set(t.item, t);

  // Collect every item that appears in any candidate recipe so we can constrain it.
  const items = new Set<string>();
  for (const r of candidateRecipes) {
    for (const i of r.ingredients) items.add(i.item);
    for (const p of r.products) items.add(p.item);
  }
  for (const k of supplyByItem.keys()) items.add(k);
  for (const k of targetSet.keys()) items.add(k);

  const variables: Record<string, Record<string, number>> = {};
  const constraints: Record<string, { equal?: number; min?: number; max?: number }> = {};

  // One equality constraint per item: balance = 0.
  for (const item of items) {
    constraints[`bal_${item}`] = { equal: 0 };
  }

  // Recipe variables: net contribution to each item, plus power/machine accounting.
  candidateRecipes.forEach((r, idx) => {
    const v: Record<string, number> = {};
    const time = r.time;
    for (const p of r.products) {
      v[`bal_${p.item}`] = (v[`bal_${p.item}`] ?? 0) + ratePerMin(p.amount, time);
    }
    for (const i of r.ingredients) {
      v[`bal_${i.item}`] = (v[`bal_${i.item}`] ?? 0) - ratePerMin(i.amount, time);
    }
    const building = r.producedIn[0];
    const power = recipePowerKW(r, data);
    v.power = power;
    v.machines = 1;
    v[`bld_${building}`] = 1;
    v.obj = 0; // recipes don't directly contribute to objective
    variables[`x_${idx}`] = v;
  });

  // Supply variables: positive net contribution to their item, capped.
  for (const [item, cap] of supplyByItem) {
    const key = `supply_${item}`;
    variables[key] = {
      [`bal_${item}`]: 1,
      [`cap_${item}`]: 1,
    };
    constraints[`cap_${item}`] = { max: cap };
  }

  // Production (sink) variables: only for targets, removes from the item balance.
  for (const t of targets) {
    const key = `produced_${t.item}`;
    variables[key] = {
      [`bal_${t.item}`]: -1,
      obj: t.weight ?? 1,
    };
    if (t.minRatePerMin && t.minRatePerMin > 0) {
      constraints[`min_${t.item}`] = { min: t.minRatePerMin };
      variables[key][`min_${t.item}`] = 1;
    }
  }

  // Bookkeeping variables: power and machines totals (so the result picks them up).
  // We treat them as free non-negative variables tied to recipe contributions:
  //   Σ recipe.power · x_r − total_power = 0
  variables.total_power = { power: -1 };
  variables.total_machines = { machines: -1 };
  constraints.power = { equal: 0 };
  constraints.machines = { equal: 0 };

  // Building totals
  const buildingNames = new Set<string>();
  for (const r of candidateRecipes) if (r.producedIn[0]) buildingNames.add(r.producedIn[0]);
  for (const b of buildingNames) {
    variables[`total_bld_${b}`] = { [`bld_${b}`]: -1 };
    constraints[`bld_${b}`] = { equal: 0 };
  }

  const model = {
    optimize: 'obj',
    opType: 'max' as const,
    constraints,
    variables,
  };

  let result: Record<string, number> & { feasible?: boolean; result?: number; bounded?: boolean };
  try {
    result = solver.Solve(model) as typeof result;
  } catch (e) {
    return emptyPlan('error', (e as Error).message);
  }

  if (!result.feasible) return emptyPlan('infeasible', 'No combination of recipes satisfies the supply/target constraints.');
  if (result.bounded === false) return emptyPlan('unbounded');

  const lines: FactoryPlanLine[] = [];
  const buildingsByType = new Map<string, number>();
  let totalMachines = 0;
  let totalPowerKW = 0;

  candidateRecipes.forEach((r, idx) => {
    const x = result[`x_${idx}`] ?? 0;
    if (x < EPS) return;
    const building = r.producedIn[0];
    const power = recipePowerKW(r, data) * x;
    lines.push({
      recipe: r,
      building,
      machines: x,
      outputs: r.products.map((p) => ({ item: p.item, ratePerMin: ratePerMin(p.amount, r.time) * x })),
      inputs: r.ingredients.map((i) => ({ item: i.item, ratePerMin: ratePerMin(i.amount, r.time) * x })),
      powerKW: power,
    });
    buildingsByType.set(building, (buildingsByType.get(building) ?? 0) + x);
    totalMachines += x;
    totalPowerKW += power;
  });

  const outputs = targets.map((t) => ({
    item: t.item,
    ratePerMin: result[`produced_${t.item}`] ?? 0,
  }));
  const consumedInputs = supplies.map((s) => ({
    item: s.item,
    ratePerMin: result[`supply_${s.item}`] ?? 0,
  }));

  return {
    status: 'optimal',
    lines,
    totalMachines,
    totalPowerKW,
    buildingsByType: [...buildingsByType.entries()].map(([building, machines]) => ({ building, machines })),
    outputs,
    consumedInputs,
    objective: result.result ?? 0,
  };
}

/** MW drawn by one machine running this recipe at 100% clock. For recipes
 * with variable power (Converter / Quantum Encoder / Particle Accelerator), we
 * use the time-average (min+max)/2, which is what the in-game load oscillates
 * around. */
export function recipePowerKW(r: { isVariablePower?: boolean; minPower?: number; maxPower?: number; producedIn: string[] }, data: SatData): number {
  if (r.isVariablePower && r.minPower != null && r.maxPower != null) {
    return (r.minPower + r.maxPower) / 2;
  }
  const building = r.producedIn[0];
  return data.buildings[building]?.metadata?.powerConsumption ?? 0;
}

function emptyPlan(status: FactoryPlan['status'], message?: string): FactoryPlan {
  return {
    status,
    message,
    lines: [],
    totalMachines: 0,
    totalPowerKW: 0,
    buildingsByType: [],
    outputs: [],
    consumedInputs: [],
    objective: 0,
  };
}
