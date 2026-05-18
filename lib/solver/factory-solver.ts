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
  /** When true (default), raw resources not explicitly supplied by the user are
   * treated as unlimited. Set false to force the user to specify every raw
   * supply (strict mode). */
  autoSupplyRawResources?: boolean;
  /** Power Shard budget for overclocking, in shards. When undefined or 0,
   *  every machine is forced to 100% clock (original behavior). When set, the
   *  LP can put any recipe on a 150%, 200%, or 250% clock tier at a cost of
   *  1 / 2 / 3 shards per machine respectively — the solver allocates shards
   *  where they cut the machine count the most. Power scales as
   *  P(c) = P_base · c^1.32193 per the Update 1.0 formula. */
  shardBudget?: number;
  /** When true, the LP plans power production: each generator + fuel combo
   *  becomes a candidate variable producing a synthetic `__power__` item,
   *  recipes consume it, and the constraint says production ≥ consumption.
   *  Fuel + byproduct flows enter the regular item balance, so the chain
   *  back to raw resources is solved end-to-end. */
  includePowerProduction?: boolean;
}

export interface ClockTierUsage {
  /** Clock fraction, e.g. 1.0 = 100%, 2.5 = 250%. */
  clock: number;
  /** Shards each machine at this clock costs (0 / 1 / 2 / 3). */
  shardsEach: number;
  /** Machines (possibly fractional) running at this clock for this recipe. */
  machines: number;
}

export interface FactoryPlanLine {
  recipe: SatRecipe;
  building: string;
  machines: number;
  outputs: { item: string; ratePerMin: number }[];
  inputs: { item: string; ratePerMin: number }[];
  powerKW: number;
  /** Total Power Shards consumed by this line. */
  shards: number;
  /** Machines per clock tier. Always at least the 100% entry when there's any
   *  output; only contains higher tiers when the solver chose to overclock. */
  clockTiers: ClockTierUsage[];
}

export interface GeneratorLine {
  /** Generator descriptor class (Desc_GeneratorCoal_C, …). */
  generator: string;
  /** Class name of the fuel this batch of machines burns. */
  fuelItem: string;
  /** Fractional machine count running at 100% clock. */
  machines: number;
  /** Fuel consumed across this line, per minute. */
  fuelRatePerMin: number;
  /** Byproduct class produced (e.g. Nuclear Waste) — undefined if none. */
  byproductItem?: string;
  /** Byproduct rate per minute. */
  byproductRatePerMin: number;
  /** Total MW produced by this line at 100% clock. */
  powerKW: number;
}

export interface FactoryPlan {
  status: 'optimal' | 'infeasible' | 'unbounded' | 'error';
  message?: string;
  lines: FactoryPlanLine[];
  /** Generator lines added when `includePowerProduction` was set; empty
   *  otherwise. */
  generatorLines: GeneratorLine[];
  totalMachines: number;
  /** Total power *consumed* by recipe machines. */
  totalPowerKW: number;
  /** Total power *produced* by generators; 0 when power planning is off. */
  totalPowerProducedKW: number;
  /** Total Power Shards consumed across the plan. 0 when OC is disabled. */
  totalShards: number;
  buildingsByType: { building: string; machines: number }[];
  outputs: { item: string; ratePerMin: number }[];
  consumedInputs: { item: string; ratePerMin: number }[];
  objective: number;
}

const EPS = 1e-6;

const UNLIMITED_SUPPLY = 1_000_000;

/** Power-scaling exponent for clock speed. Satisfactory Update 1.0 uses
 *  log₂(2.5) ≈ 1.32193, which means 250 % clock draws ~3.39× base power. */
const POWER_CLOCK_EXP = Math.log2(2.5);

export function powerMultiplier(clock: number): number {
  return Math.pow(clock, POWER_CLOCK_EXP);
}

/** Clock tiers enabled when overclocking is active. (100 % is always present
 *  so the LP can keep machines at base when shards are scarce.) */
const OC_TIERS: { clock: number; shardsEach: number }[] = [
  { clock: 1.0, shardsEach: 0 },
  { clock: 1.5, shardsEach: 1 },
  { clock: 2.0, shardsEach: 2 },
  { clock: 2.5, shardsEach: 3 },
];

export function solveFactory(
  data: SatData,
  supplies: SupplyInput[],
  targets: TargetOutput[],
  options: SolverOptions = {},
): FactoryPlan {
  const {
    allowedRecipes,
    includeAlternates = true,
    autoSupplyRawResources = true,
    shardBudget,
    includePowerProduction = false,
  } = options;
  const ocEnabled = (shardBudget ?? 0) > 0;
  const tiers = ocEnabled ? OC_TIERS : [OC_TIERS[0]];
  /** Synthetic balance key for power MW. Recipes consume from it; generators
   *  produce to it. Never collides with any class name because no real item
   *  starts with `__`. */
  const POWER_KEY = 'bal___power__';

  const candidateRecipes = data.recipes.filter((r) => {
    if (!includeAlternates && r.alternate) return false;
    if (allowedRecipes && allowedRecipes.size && !allowedRecipes.has(r.className)) return false;
    return true;
  });

  const supplyByItem = new Map<string, number>();
  for (const s of supplies) {
    supplyByItem.set(s.item, (supplyByItem.get(s.item) ?? 0) + s.ratePerMin);
  }

  // Auto-supply: any raw resource the user didn't constrain is treated as unlimited.
  if (autoSupplyRawResources) {
    for (const raw of Object.keys(data.resources)) {
      if (!supplyByItem.has(raw)) supplyByItem.set(raw, UNLIMITED_SUPPLY);
    }
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
  // When power planning is on, also constrain the fuel and byproduct items
  // each generator touches plus the synthetic __power__ balance row.
  if (includePowerProduction) {
    items.add('__power__');
    for (const g of data.generators) {
      for (const f of g.fuels ?? []) {
        items.add(f.item);
        if (f.byproduct) items.add(f.byproduct);
      }
    }
  }

  const variables: Record<string, Record<string, number>> = {};
  const constraints: Record<string, { equal?: number; min?: number; max?: number }> = {};

  // One inequality per item:
  //   net production - target sink ≥ -supply_cap
  // i.e., consumption (after sinking targets) cannot exceed available production
  // plus available raw supply. Surplus production is implicitly absorbed (the
  // AWESOME Sink), so we never force byproducts to perfectly clear.
  for (const item of items) {
    const cap = supplyByItem.get(item) ?? 0;
    constraints[`bal_${item}`] = { min: -cap };
  }

  // Decide objective:
  //  - If any target has a positive minRatePerMin, treat that as a hard floor and
  //    MINIMIZE the total machines so we get the smallest factory that meets the
  //    target. (Users who specify "60 Iron Plate/min" want 60, not 1.5M.)
  //  - Otherwise MAXIMIZE weighted target production (no rate given → how much
  //    can I make?).
  const hasFixedTarget = targets.some((t) => (t.minRatePerMin ?? 0) > 0);

  // Recipe variables — one per (recipe × clock tier). For each tier we scale
  // the per-machine throughput by the clock fraction. Each machine still
  // contributes 1 to the machine-count objective (one physical apparatus),
  // and `shardsEach` to the optional shard-budget constraint.
  candidateRecipes.forEach((r, idx) => {
    const time = r.time;
    const basePowerKW = recipePowerKW(r, data);
    tiers.forEach((tier, tIdx) => {
      const v: Record<string, number> = {};
      for (const p of r.products) {
        v[`bal_${p.item}`] = (v[`bal_${p.item}`] ?? 0) + ratePerMin(p.amount, time) * tier.clock;
      }
      for (const i of r.ingredients) {
        v[`bal_${i.item}`] = (v[`bal_${i.item}`] ?? 0) - ratePerMin(i.amount, time) * tier.clock;
      }
      v.obj = hasFixedTarget ? 1 : 0;
      if (ocEnabled && tier.shardsEach > 0) v.shard_budget = tier.shardsEach;
      if (includePowerProduction) {
        v[POWER_KEY] = -basePowerKW * powerMultiplier(tier.clock);
      }
      variables[`x_${idx}_${tIdx}`] = v;
    });
  });

  if (ocEnabled) constraints.shard_budget = { max: shardBudget ?? 0 };

  // Generator variables — one per (generator × fuel). Each machine at 100%
  // clock contributes +powerProduction MW to the power balance and -fuelRate
  // to the fuel item, with any byproduct flowing into its own balance row.
  // (We deliberately don't overclock generators — keeps the LP linear and is
  // close to standard play, since OCing generators is unusual.)
  if (includePowerProduction) {
    data.generators.forEach((g, gIdx) => {
      (g.fuels ?? []).forEach((fuel, fIdx) => {
        const fuelItem = data.items[fuel.item];
        const energy = fuelItem?.energyValue ?? 0;
        if (energy <= 0) return; // skip fuels missing energy data
        const fuelPerMin = (60 / energy) * g.powerProduction;
        // Generators don't contribute to the machine-count objective.
        // Reason: with a continuous LP, fractional machines make
        // high-MW generators (Nuclear @ 2500 MW) trivially optimal for any
        // demand even though you can't build 0.01 of a nuclear plant.
        // Excluding them from `obj` flips the optimization to "minimize the
        // downstream fuel chain" — Coal wins for small loads because Coal is
        // an auto-supplied raw with zero recipe chain.
        const v: Record<string, number> = {
          [POWER_KEY]: g.powerProduction,
          [`bal_${fuel.item}`]: -fuelPerMin,
          obj: 0,
        };
        const byAmt = fuel.byproductAmount ?? 0;
        if (fuel.byproduct && byAmt > 0) {
          v[`bal_${fuel.byproduct}`] = fuelPerMin * byAmt;
        }
        variables[`g_${gIdx}_${fIdx}`] = v;
      });
    });
  }

  // Production (sink) variables: only for targets, removes from the item balance.
  for (const t of targets) {
    const key = `produced_${t.item}`;
    variables[key] = {
      [`bal_${t.item}`]: -1,
      obj: hasFixedTarget ? 0 : (t.weight ?? 1),
    };
    if (t.minRatePerMin && t.minRatePerMin > 0) {
      constraints[`min_${t.item}`] = { min: t.minRatePerMin };
      variables[key][`min_${t.item}`] = 1;
    }
  }

  const model = {
    optimize: 'obj',
    opType: hasFixedTarget ? ('min' as const) : ('max' as const),
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
  let totalShards = 0;

  candidateRecipes.forEach((r, idx) => {
    // Collapse a recipe's tier variables into a per-line summary. Throughput
    // is the sum of (clock × machines × base_rate); power uses the clock^1.32
    // multiplier per tier so OC's true power cost is captured.
    const clockTiers: ClockTierUsage[] = [];
    let machines = 0;
    let throughputUnits = 0; // Σ clock × machines  — used to scale base rates.
    let powerKW = 0;
    let shards = 0;
    tiers.forEach((tier, tIdx) => {
      const x = result[`x_${idx}_${tIdx}`] ?? 0;
      if (x < EPS) return;
      machines += x;
      throughputUnits += x * tier.clock;
      powerKW += x * recipePowerKW(r, data) * powerMultiplier(tier.clock);
      shards += x * tier.shardsEach;
      clockTiers.push({ clock: tier.clock, shardsEach: tier.shardsEach, machines: x });
    });
    if (machines < EPS) return;
    const building = r.producedIn[0];
    lines.push({
      recipe: r,
      building,
      machines,
      outputs: r.products.map((p) => ({ item: p.item, ratePerMin: ratePerMin(p.amount, r.time) * throughputUnits })),
      inputs: r.ingredients.map((i) => ({ item: i.item, ratePerMin: ratePerMin(i.amount, r.time) * throughputUnits })),
      powerKW,
      shards,
      clockTiers,
    });
    buildingsByType.set(building, (buildingsByType.get(building) ?? 0) + machines);
    totalMachines += machines;
    totalPowerKW += powerKW;
    totalShards += shards;
  });

  // Pull out the generator decisions and mirror them into the manifest so the
  // UI's Building Manifest tab automatically picks them up.
  const generatorLines: GeneratorLine[] = [];
  let totalPowerProducedKW = 0;
  if (includePowerProduction) {
    data.generators.forEach((g, gIdx) => {
      (g.fuels ?? []).forEach((fuel, fIdx) => {
        const machines = result[`g_${gIdx}_${fIdx}`] ?? 0;
        if (machines < EPS) return;
        const energy = data.items[fuel.item]?.energyValue ?? 0;
        const fuelRatePerMin = energy > 0 ? (60 / energy) * g.powerProduction * machines : 0;
        const byproductRatePerMin =
          fuel.byproduct && (fuel.byproductAmount ?? 0) > 0
            ? fuelRatePerMin * (fuel.byproductAmount ?? 0)
            : 0;
        const powerKW = g.powerProduction * machines;
        generatorLines.push({
          generator: g.className,
          fuelItem: fuel.item,
          machines,
          fuelRatePerMin,
          byproductItem: fuel.byproduct ?? undefined,
          byproductRatePerMin,
          powerKW,
        });
        buildingsByType.set(g.className, (buildingsByType.get(g.className) ?? 0) + machines);
        totalMachines += machines;
        totalPowerProducedKW += powerKW;
      });
    });
  }

  const outputs = targets.map((t) => ({
    item: t.item,
    ratePerMin: result[`produced_${t.item}`] ?? 0,
  }));

  // Tally net consumption per raw resource (or per item the user explicitly
  // supplied). Net = recipe inputs minus recipe byproducts of the same item.
  // When power planning is on, fuels burned by generators count as inputs too,
  // so they show up in the Raws tally (and their parents — coal mining, water
  // — flow back through the LP naturally).
  const consumptionByItem = new Map<string, number>();
  const itemsToReport = new Set<string>(supplies.map((s) => s.item));
  if (autoSupplyRawResources) {
    for (const raw of Object.keys(data.resources)) itemsToReport.add(raw);
  }
  for (const item of itemsToReport) {
    let net = 0;
    for (const line of lines) {
      for (const i of line.inputs) if (i.item === item) net += i.ratePerMin;
      for (const o of line.outputs) if (o.item === item) net -= o.ratePerMin;
    }
    for (const gl of generatorLines) {
      if (gl.fuelItem === item) net += gl.fuelRatePerMin;
      if (gl.byproductItem === item) net -= gl.byproductRatePerMin;
    }
    consumptionByItem.set(item, Math.max(0, net));
  }
  const consumedInputs = [...consumptionByItem.entries()]
    // Show every item the user explicitly supplied (even if 0) plus any auto-supplied raw actually consumed.
    .filter(([item, rate]) => rate > EPS || supplies.some((s) => s.item === item))
    .map(([item, rate]) => ({ item, ratePerMin: rate }))
    .sort((a, b) => b.ratePerMin - a.ratePerMin);

  return {
    status: 'optimal',
    lines,
    generatorLines,
    totalMachines,
    totalPowerKW,
    totalPowerProducedKW,
    totalShards,
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
    generatorLines: [],
    totalMachines: 0,
    totalPowerKW: 0,
    totalPowerProducedKW: 0,
    totalShards: 0,
    buildingsByType: [],
    outputs: [],
    consumedInputs: [],
    objective: 0,
  };
}
