import type { FactoryPlan } from '@/lib/solver/factory-solver';

export interface CalcRow {
  /** stable id for React keys — survives reordering and deletion. */
  id?: string;
  item: string;
  rate: number;
}

export interface CalcInputs {
  supplies: CalcRow[];
  targets: CalcRow[];
  allowAlternates: boolean;
  /** Manual override for auto-supply behavior. When undefined, the effective
   *  setting is derived from `supplies.length`:
   *    - no supplies listed → auto-supply ON (every raw unlimited)
   *    - any supplies listed → auto-supply OFF (only listed raws available)
   *  This stops the Converter recipe from routing around explicit supply caps
   *  by transmuting auto-supplied raws. Setting this to `true`/`false`
   *  overrides the derived default (for advanced "partial caps + autofill"). */
  autoSupplyRaw?: boolean;
}

/** Effective auto-supply for the current inputs. Pure function of the two
 *  visible inputs (supplies + the override); used by both the solver call
 *  site and the UI to display the right state. */
export function effectiveAutoSupply(inputs: CalcInputs): boolean {
  if (typeof inputs.autoSupplyRaw === 'boolean') return inputs.autoSupplyRaw;
  return inputs.supplies.filter((s) => s.item && s.rate > 0).length === 0;
}

/** Compact summary of a plan stored alongside its inputs so the history list
 * can render without re-running the solver. */
export interface CalcPlanSummary {
  status: FactoryPlan['status'];
  totalMachines: number;
  totalPowerKW: number;
  recipeLines: number;
  outputs: { item: string; ratePerMin: number }[];
  buildings: { building: string; machines: number }[];
}

export interface CalcSaveEntry {
  id: string;
  name: string;
  savedAt: number;
  inputs: CalcInputs;
  summary: CalcPlanSummary | null;
}

export const CALC_CURRENT_KEY = 'ficsit.calculator.current.v1';
export const CALC_HISTORY_KEY = 'ficsit.calculator.history.v1';

export const DEFAULT_INPUTS: CalcInputs = {
  // Empty by default — `effectiveAutoSupply` derives auto-supply ON. The user
  // adding even one supply row flips the default to strict (no override).
  supplies: [],
  targets: [{ id: 'tgt-default', item: 'Desc_IronPlate_C', rate: 60 }],
  allowAlternates: false,
};

export function summarizePlan(plan: FactoryPlan): CalcPlanSummary {
  return {
    status: plan.status,
    totalMachines: plan.totalMachines,
    totalPowerKW: plan.totalPowerKW,
    recipeLines: plan.lines.length,
    outputs: plan.outputs.map((o) => ({ item: o.item, ratePerMin: o.ratePerMin })),
    buildings: plan.buildingsByType.map((b) => ({ building: b.building, machines: b.machines })),
  };
}
