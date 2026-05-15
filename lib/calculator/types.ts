import type { FactoryPlan } from '@/lib/solver/factory-solver';

export interface CalcRow {
  item: string;
  rate: number;
}

export interface CalcInputs {
  supplies: CalcRow[];
  targets: CalcRow[];
  allowAlternates: boolean;
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
  supplies: [
    { item: 'Desc_OreIron_C', rate: 480 },
    { item: 'Desc_OreCopper_C', rate: 240 },
    { item: 'Desc_Stone_C', rate: 240 },
    { item: 'Desc_Coal_C', rate: 240 },
    { item: 'Desc_LiquidOil_C', rate: 240 },
    { item: 'Desc_Water_C', rate: 1200 },
  ],
  targets: [{ item: 'Desc_IronPlate_C', rate: 0 }],
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
