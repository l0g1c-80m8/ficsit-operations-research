export type ClassName = string;

export interface SatItem {
  className: ClassName;
  slug: string;
  name: string;
  description: string;
  sinkPoints: number;
  stackSize: number;
  energyValue: number;
  liquid: boolean;
  fluidColor: { r: number; g: number; b: number; a: number };
}

export interface RecipeIO {
  item: ClassName;
  amount: number;
}

export interface SatRecipe {
  className: ClassName;
  slug: string;
  name: string;
  alternate: boolean;
  /** seconds per cycle */
  time: number;
  ingredients: RecipeIO[];
  products: RecipeIO[];
  /** building class names that can run this recipe */
  producedIn: ClassName[];
  /** true for Converter / Quantum Encoder / Particle Accelerator recipes whose
   * power draw varies sinusoidally between minPower and maxPower. */
  isVariablePower?: boolean;
  /** in MW; only meaningful when isVariablePower */
  minPower?: number;
  /** in MW; only meaningful when isVariablePower */
  maxPower?: number;
}

export interface SatBuilding {
  className: ClassName;
  slug: string;
  name: string;
  description: string;
  metadata: {
    powerConsumption?: number;
    powerConsumptionExponent?: number;
    manufacturingSpeed?: number;
    [k: string]: unknown;
  };
}

export interface SatResource {
  /** class name of the raw item */
  item: ClassName;
  /** form, ping color, etc. (unused fields tolerated) */
  [k: string]: unknown;
}

export interface SatGenerator {
  className: ClassName;
  fuel: ClassName[];
  powerProduction: number;
  powerProductionExponent: number;
  waterToPowerRatio?: number;
}

export interface SatMiner {
  className: ClassName;
  allowedResources: ClassName[];
  allowLiquids: boolean;
  allowSolids: boolean;
  itemsPerCycle: number;
  extractCycleTime: number;
}

export interface SatData {
  items: Record<ClassName, SatItem>;
  buildings: Record<ClassName, SatBuilding>;
  recipes: SatRecipe[];
  resources: Record<ClassName, SatResource>;
  generators: SatGenerator[];
  miners: SatMiner[];
}
