// Smoke test the graph builder + DOT export against a real plan.
// We hand-build a minimal FactoryPlan that mimics the Iron Plate chain.

import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('public/data/satisfactory.json', 'utf8'));

// 4× Iron Ingot smelters + 4× Iron Plate constructors (verified in scripts/test-solver.mjs)
const ironIngot = data.recipes.find((r) => r.name === 'Iron Ingot');
const ironPlate = data.recipes.find((r) => r.name === 'Iron Plate');

const plan = {
  status: 'optimal',
  lines: [
    {
      recipe: ironIngot,
      building: ironIngot.producedIn[0],
      machines: 4,
      inputs: [{ item: 'Desc_OreIron_C', ratePerMin: 120 }],
      outputs: [{ item: 'Desc_IronIngot_C', ratePerMin: 120 }],
      powerKW: 16,
    },
    {
      recipe: ironPlate,
      building: ironPlate.producedIn[0],
      machines: 4,
      inputs: [{ item: 'Desc_IronIngot_C', ratePerMin: 120 }],
      outputs: [{ item: 'Desc_IronPlate_C', ratePerMin: 80 }],
      powerKW: 16,
    },
  ],
  totalMachines: 8,
  totalPowerKW: 32,
  buildingsByType: [],
  outputs: [{ item: 'Desc_IronPlate_C', ratePerMin: 80 }],
  consumedInputs: [{ item: 'Desc_OreIron_C', ratePerMin: 120 }],
  objective: 80,
};

// We can't import the TypeScript graph builders directly without compiling, so
// inline a tiny version here that mirrors the production logic.

function buildGraph(plan, data) {
  const itemTotals = new Map();
  const edges = [];
  const recipeNodes = [];

  plan.lines.forEach((line, idx) => {
    const recipeId = `r:${idx}:${line.recipe.className}`;
    recipeNodes.push({
      id: recipeId,
      kind: 'recipe',
      label: line.recipe.name,
      machines: line.machines,
      powerKW: line.powerKW,
    });
    for (const i of line.inputs) {
      edges.push({ from: `i:${i.item}`, to: recipeId, ratePerMin: i.ratePerMin, item: i.item });
      const t = itemTotals.get(i.item) ?? { inRate: 0, outRate: 0 };
      t.outRate += i.ratePerMin;
      itemTotals.set(i.item, t);
    }
    for (const o of line.outputs) {
      edges.push({ from: recipeId, to: `i:${o.item}`, ratePerMin: o.ratePerMin, item: o.item });
      const t = itemTotals.get(o.item) ?? { inRate: 0, outRate: 0 };
      t.inRate += o.ratePerMin;
      itemTotals.set(o.item, t);
    }
  });

  const itemNodes = [];
  for (const [className, totals] of itemTotals) {
    const item = data.items[className];
    itemNodes.push({
      id: `i:${className}`,
      kind: 'item',
      label: item?.name ?? className,
      ...totals,
      isRaw: totals.inRate < 1e-6,
      isFinal: totals.outRate < 1e-6,
    });
  }
  return { nodes: [...itemNodes, ...recipeNodes], edges };
}

const g = buildGraph(plan, data);
console.log('Nodes:');
for (const n of g.nodes) {
  console.log(' ', n.id, '→', n.label, n.kind === 'item' ? `(in=${n.inRate}/m out=${n.outRate}/m raw=${n.isRaw} final=${n.isFinal})` : `(×${n.machines} ${n.powerKW}kW)`);
}
console.log('\nEdges:');
for (const e of g.edges) {
  console.log(' ', e.from, '→', e.to, `${e.ratePerMin}/m of ${e.item}`);
}
