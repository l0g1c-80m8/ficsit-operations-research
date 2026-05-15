// Reads /tmp/sat-data.json (community Satisfactory game data dump) and writes
// a pruned, app-shaped JSON to public/data/satisfactory.json.
//
// Drop unused fields, keep only items referenced by machine recipes / raw resources,
// keep only the 9 production buildings, all 4 generators, all 5 miners.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const src = JSON.parse(fs.readFileSync('/tmp/sat-data.json', 'utf8'));

const machineRecipes = Object.values(src.recipes).filter(
  (r) => r.inMachine && r.producedIn && r.producedIn.length > 0
);

const usedItems = new Set();
for (const r of machineRecipes) {
  for (const i of r.ingredients) usedItems.add(i.item);
  for (const p of r.products) usedItems.add(p.item);
}
for (const k of Object.keys(src.resources)) usedItems.add(k);
for (const g of Object.values(src.generators)) {
  for (const f of g.fuel ?? []) usedItems.add(f);
}

const items = {};
for (const [k, v] of Object.entries(src.items)) {
  if (!usedItems.has(k)) continue;
  items[k] = {
    className: v.className,
    slug: v.slug,
    name: v.name,
    description: v.description,
    sinkPoints: v.sinkPoints,
    stackSize: v.stackSize,
    energyValue: v.energyValue,
    liquid: !!v.liquid,
    fluidColor: v.fluidColor,
  };
}

const usedBuildings = new Set();
for (const r of machineRecipes) for (const p of r.producedIn) usedBuildings.add(p);
for (const m of Object.values(src.miners)) usedBuildings.add(m.className);
for (const g of Object.values(src.generators)) usedBuildings.add(g.className);

const buildings = {};
for (const [k, v] of Object.entries(src.buildings)) {
  if (!usedBuildings.has(k)) continue;
  buildings[k] = {
    className: v.className,
    slug: v.slug,
    name: v.name,
    description: v.description,
    metadata: v.metadata,
  };
}

const recipes = machineRecipes.map((r) => ({
  className: r.className,
  slug: r.slug,
  name: r.name,
  alternate: !!r.alternate,
  time: r.time,
  ingredients: r.ingredients,
  products: r.products,
  producedIn: r.producedIn,
}));

const resources = {};
for (const [k, v] of Object.entries(src.resources)) {
  resources[k] = v;
}

const generators = Object.values(src.generators);
const miners = Object.values(src.miners);

const out = { items, buildings, recipes, resources, generators, miners };

const outPath = path.join(root, 'public', 'data', 'satisfactory.json');
fs.writeFileSync(outPath, JSON.stringify(out));
const bytes = fs.statSync(outPath).size;
console.log(`Wrote ${outPath}`);
console.log(`  items=${Object.keys(items).length} buildings=${Object.keys(buildings).length} recipes=${recipes.length} resources=${Object.keys(resources).length} generators=${generators.length} miners=${miners.length}`);
console.log(`  size=${(bytes / 1024).toFixed(1)} KB`);
