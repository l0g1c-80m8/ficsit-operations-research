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
  /** When true (default), raw resources not in `supplies` are treated as unlimited. */
  autoSupplyRaw?: boolean;
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
  // Empty by default — raw resources auto-supplied. Users add a row only to cap one.
  supplies: [],
  targets: [{ id: 'tgt-default', item: 'Desc_IronPlate_C', rate: 60 }],
  allowAlternates: false,
  autoSupplyRaw: true,
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
