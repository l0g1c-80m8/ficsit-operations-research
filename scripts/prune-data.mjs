// Reads /tmp/sat-data.json (community Satisfactory game data dump) and writes
// a pruned, app-shaped JSON to public/data/satisfactory.json.
//
// Drop unused fields, keep only items referenced by machine recipes / raw resources,
// keep only the buildings that recipes produce in (Converter, Quantum Encoder, etc.
// for 1.0), all generators, all miners.
//
// Source: prefers data1.0.json content but accepts data.json for older saves.

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

// Manually include support buildings that don't appear in recipes / miners /
// generators arrays but matter for planning (1.0 extras + fluid extractors).
const SUPPORT_BUILDINGS = [
  'Desc_WaterPump_C',                 // Water Extractor
  'Desc_FrackingSmasher_C',           // Resource Well Pressurizer
  'Desc_GeneratorGeoThermal_C',       // Geothermal Generator (variable; tied to geysers)
  'Desc_AlienPowerBuilding_C',        // Alien Power Augmenter (1.0)
  'Desc_PipelinePump_C',              // Pipeline Pump Mk.1
  'Desc_PipelinePumpMk2_C',           // Pipeline Pump Mk.2
];
for (const cls of SUPPORT_BUILDINGS) {
  if (src.buildings[cls]) usedBuildings.add(cls);
}

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

const recipes = machineRecipes.map((r) => {
  const base = {
    className: r.className,
    slug: r.slug,
    name: r.name,
    alternate: !!r.alternate,
    time: r.time,
    ingredients: r.ingredients,
    products: r.products,
    producedIn: r.producedIn,
  };
  if (r.isVariablePower) {
    return {
      ...base,
      isVariablePower: true,
      minPower: r.minPower ?? 0,
      maxPower: r.maxPower ?? 0,
    };
  }
  return base;
});

const resources = {};
for (const [k, v] of Object.entries(src.resources)) {
  resources[k] = v;
}

const generators = Object.values(src.generators);
const miners = Object.values(src.miners);

// Stamp every prune with a build identifier so the browser knows when the data
// changed. The loader appends this to the URL as ?v=… to force a refetch.
const buildId = `${new Date().toISOString().replace(/[:.]/g, '-')}-r${recipes.length}-b${Object.keys(buildings).length}`;

const out = {
  buildId,
  builtAt: new Date().toISOString(),
  items,
  buildings,
  recipes,
  resources,
  generators,
  miners,
};

const outPath = path.join(root, 'public', 'data', 'satisfactory.json');
fs.writeFileSync(outPath, JSON.stringify(out));
// Side-car version file the loader can hit cheaply before the big payload.
fs.writeFileSync(path.join(root, 'public', 'data', 'version.json'), JSON.stringify({ buildId, builtAt: out.builtAt }));

const bytes = fs.statSync(outPath).size;
console.log(`Wrote ${outPath}`);
console.log(`  buildId=${buildId}`);
console.log(`  items=${Object.keys(items).length} buildings=${Object.keys(buildings).length} recipes=${recipes.length} resources=${Object.keys(resources).length} generators=${generators.length} miners=${miners.length}`);
console.log(`  size=${(bytes / 1024).toFixed(1)} KB`);
