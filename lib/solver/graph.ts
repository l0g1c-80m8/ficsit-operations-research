// Builds a bipartite production graph from a solved FactoryPlan.
//
//   Item nodes  →  Recipe nodes  →  Item nodes
//
// An item node with no incoming edge is a "raw source"; one with no outgoing
// edge is a "final product / sink". Edges carry the items-per-minute rate.

import type { FactoryPlan, FactoryPlanLine } from './factory-solver';
import type { SatData } from '../data/types';

export type GraphNodeKind = 'recipe' | 'item';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** className for icon lookup */
  iconClass: string;
  iconKind: 'item' | 'building';
  // Recipe-only metadata
  machines?: number;
  powerKW?: number;
  building?: string;
  isAlternate?: boolean;
  isVariablePower?: boolean;
  minPower?: number;
  maxPower?: number;
  // Item-only metadata
  totalInRate?: number;
  totalOutRate?: number;
  isRaw?: boolean;
  isFinal?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** items per minute on this edge */
  ratePerMin: number;
  /** className of the item flowing on the edge */
  item: string;
}

export interface ProductionGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildProductionGraph(plan: FactoryPlan, data: SatData): ProductionGraph {
  if (plan.status !== 'optimal' || plan.lines.length === 0) {
    return { nodes: [], edges: [] };
  }

  const itemTotals = new Map<string, { inRate: number; outRate: number }>();
  const edges: GraphEdge[] = [];
  const recipeNodes: GraphNode[] = [];

  plan.lines.forEach((line, idx) => {
    const recipeId = `r:${idx}:${line.recipe.className}`;
    recipeNodes.push(buildRecipeNode(recipeId, line));

    for (const i of line.inputs) {
      edges.push({ from: itemNodeId(i.item), to: recipeId, ratePerMin: i.ratePerMin, item: i.item });
      const t = itemTotals.get(i.item) ?? { inRate: 0, outRate: 0 };
      t.outRate += i.ratePerMin; // outflow from the item node (into the recipe)
      itemTotals.set(i.item, t);
    }
    for (const o of line.outputs) {
      edges.push({ from: recipeId, to: itemNodeId(o.item), ratePerMin: o.ratePerMin, item: o.item });
      const t = itemTotals.get(o.item) ?? { inRate: 0, outRate: 0 };
      t.inRate += o.ratePerMin; // inflow into the item node (from the recipe)
      itemTotals.set(o.item, t);
    }
  });

  const itemNodes: GraphNode[] = [];
  for (const [className, totals] of itemTotals) {
    const item = data.items[className];
    const isRaw = totals.inRate < EPS && totals.outRate > EPS;
    const isFinal = totals.outRate < EPS && totals.inRate > EPS;
    itemNodes.push({
      id: itemNodeId(className),
      kind: 'item',
      label: item?.name ?? className,
      iconClass: className,
      iconKind: 'item',
      totalInRate: totals.inRate,
      totalOutRate: totals.outRate,
      isRaw,
      isFinal,
    });
  }

  return { nodes: [...itemNodes, ...recipeNodes], edges };
}

const EPS = 1e-6;
const itemNodeId = (className: string) => `i:${className}`;

function buildRecipeNode(id: string, line: FactoryPlanLine): GraphNode {
  return {
    id,
    kind: 'recipe',
    label: line.recipe.name,
    iconClass: line.building,
    iconKind: 'building',
    machines: line.machines,
    powerKW: line.powerKW,
    building: line.building,
    isAlternate: line.recipe.alternate,
    isVariablePower: line.recipe.isVariablePower,
    minPower: line.recipe.minPower,
    maxPower: line.recipe.maxPower,
  };
}
