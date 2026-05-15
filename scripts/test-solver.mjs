// Smoke test the LP solver on a known textbook plan: 60 Iron Plate/min from raw ore.
// Iron Plate: 30/m in a Constructor from Iron Ingot (60/m input).
// Iron Ingot: 30/m from 30/m Iron Ore in a Smelter.
// → 60 Iron Plate/m should need 120 Iron Ore/m, 2 Constructors, 4 Smelters (60 Plate uses 2x).
// Actually: Iron Plate recipe = 20/m output per Constructor (2 plates / 6s). Let's just run and check.

import fs from 'node:fs';
import solver from 'javascript-lp-solver';

const data = JSON.parse(fs.readFileSync(new URL('../public/data/satisfactory.json', import.meta.url), 'utf8'));

const items = data.items;
const recipes = data.recipes;

function ratePerMin(amount, time) {
  return (amount * 60) / time;
}

function build(targetItem, supplyItem, supplyCap, allowAlternates = false) {
  const candidate = recipes.filter((r) => allowAlternates || !r.alternate);
  const variables = {};
  const constraints = {};
  const seenItems = new Set();
  for (const r of candidate) {
    for (const i of r.ingredients) seenItems.add(i.item);
    for (const p of r.products) seenItems.add(p.item);
  }
  seenItems.add(supplyItem);
  seenItems.add(targetItem);
  for (const it of seenItems) constraints[`bal_${it}`] = { equal: 0 };
  candidate.forEach((r, idx) => {
    const v = {};
    for (const p of r.products) v[`bal_${p.item}`] = (v[`bal_${p.item}`] || 0) + ratePerMin(p.amount, r.time);
    for (const i of r.ingredients) v[`bal_${i.item}`] = (v[`bal_${i.item}`] || 0) - ratePerMin(i.amount, r.time);
    v.obj = 0;
    variables[`x_${idx}`] = v;
  });
  variables.supply = { [`bal_${supplyItem}`]: 1, cap: 1 };
  constraints.cap = { max: supplyCap };
  variables.produced = { [`bal_${targetItem}`]: -1, obj: 1 };

  const model = { optimize: 'obj', opType: 'max', constraints, variables };
  const result = solver.Solve(model);

  console.log('Target:', items[targetItem]?.name, '   Supply:', items[supplyItem]?.name, '@', supplyCap, '/m');
  console.log('  Produced:', result.produced?.toFixed(2), '/m');
  console.log('  Recipes used:');
  candidate.forEach((r, idx) => {
    const x = result[`x_${idx}`];
    if (x && x > 1e-6) console.log(`    ${x.toFixed(2)}x  ${r.name}`);
  });
}

build('Desc_IronPlate_C', 'Desc_OreIron_C', 120, false);
build('Desc_RotorEM_C', 'Desc_OreIron_C', 240, false);
build('Desc_ComputerSuper_C', 'Desc_OreIron_C', 240, true); // alternates allowed
