#!/usr/bin/env node
// FICSIT Operations Research — Terminal planner.
//
//   $ npm run plan -- iron-plate --supply iron-ore=120
//   $ node scripts/plan.mjs Desc_TimeCrystal_C --supply Desc_Coal_C=240,Desc_LiquidOil_C=120 --alts
//   $ node scripts/plan.mjs --list                 # browse recipes & items
//   $ node scripts/plan.mjs --interactive          # prompt-driven
//
// Reads public/data/satisfactory.json (the same bundle the web UI uses) and
// solves the LP with javascript-lp-solver. Prints an ASCII table with totals,
// building manifest, recipe lines, and AWESOME Sink value.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import solver from 'javascript-lp-solver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'public/data/satisfactory.json');

if (!fs.existsSync(dataPath)) {
  console.error(`Missing ${dataPath}. Run \`npm run data\` (or \`npm run refresh\`) first.`);
  process.exit(2);
}
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

/* ─── ANSI styles (must be initialized before any helper that uses them) ─── */

const ORANGE = '[38;5;208m';
const GRAY = '[38;5;245m';
const GREEN = '[38;5;46m';
const RED = '[38;5;196m';
const YELLOW = '[38;5;220m';
const BLUE = '[38;5;39m';
const DIM = '[2m';
const BOLD = '[1m';
const RESET = '[0m';

const UNLIMITED_SUPPLY = 1_000_000;

/* ─── Lookup helpers ─── */

const itemBySlug = new Map();
const itemByClass = new Map();
const itemByLower = new Map();
for (const it of Object.values(data.items)) {
  itemBySlug.set(it.slug, it);
  itemByClass.set(it.className, it);
  itemByLower.set(it.name.toLowerCase(), it);
}

// Normalize British spellings + non-alphanumerics so search tolerates "Sulphuric Acid",
// "Aluminium Ingot", "iron-plate", "IRON PLATE", etc.
function normalize(s) {
  return (s ?? '')
    .toLowerCase()
    .replace(/sulphur/g, 'sulfur')
    .replace(/aluminium/g, 'aluminum')
    .replace(/colour/g, 'color')
    .replace(/fibre/g, 'fiber')
    .replace(/grey/g, 'gray')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function resolveItem(token) {
  if (!token) return null;
  if (itemByClass.has(token)) return itemByClass.get(token);
  if (itemBySlug.has(token)) return itemBySlug.get(token);
  const lower = token.toLowerCase();
  if (itemByLower.has(lower)) return itemByLower.get(lower);
  const slugified = token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (itemBySlug.has(slugified)) return itemBySlug.get(slugified);

  // Spell-tolerant + partial match.
  const needle = normalize(token);
  if (!needle) return null;
  const tokens = needle.split(' ');
  const partial = [...itemByLower.values()].filter((i) => {
    const hay = normalize(i.name);
    return tokens.every((t) => hay.includes(t));
  });
  // Prefer exact normalized match first.
  const exact = partial.find((i) => normalize(i.name) === needle);
  if (exact) return exact;
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    const err = new Error(
      `Ambiguous item "${token}". Matches:\n  ${partial.slice(0, 8).map((i) => ` ${i.slug} (${i.name})`).join('\n  ')}`,
    );
    err.code = 'AMBIGUOUS';
    throw err;
  }
  return null;
}

/* ─── Argument parsing ─── */

const args = process.argv.slice(2);
const opts = {
  positional: [],
  supplies: [],
  targetRate: 0,
  weight: 1,
  alternates: false,
  list: null,
  interactive: false,
  raw: false,
  strict: false,
  autoRaw: false,
  shards: 0,
  withPower: false,
  topRecipes: Infinity,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '-h' || a === '--help') opts.help = true;
  else if (a === '--alts' || a === '--alternates') opts.alternates = true;
  else if (a === '--interactive' || a === '-i') opts.interactive = true;
  else if (a === '--list') opts.list = args[i + 1] && !args[i + 1].startsWith('-') ? args[++i] : 'recipes';
  else if (a === '--rate') opts.targetRate = Number(args[++i]);
  else if (a === '--weight') opts.weight = Number(args[++i]);
  else if (a === '--raw') opts.raw = true;
  else if (a === '--strict' || a === '--no-auto-raw') opts.strict = true;
  else if (a === '--auto-raw' || a === '--unlimited-raws') opts.autoRaw = true;
  else if (a === '--shards' || a === '--power-shards') opts.shards = Math.max(0, Math.floor(Number(args[++i]) || 0));
  else if (a === '--with-power' || a === '--power' || a === '--plan-power') opts.withPower = true;
  else if (a === '--top') opts.topRecipes = Number(args[++i]);
  else if (a === '--supply' || a === '-s') {
    const value = args[++i] ?? '';
    for (const pair of value.split(',')) {
      const [k, v] = pair.split('=');
      if (!k) continue;
      opts.supplies.push({ token: k.trim(), rate: Number(v) || 0 });
    }
  } else if (a.startsWith('-')) {
    console.error(`Unknown flag: ${a}`);
    process.exit(2);
  } else {
    opts.positional.push(a);
  }
}

if (opts.help) {
  console.log(help());
  process.exit(0);
}

if (opts.list) {
  doList(opts.list);
  process.exit(0);
}

if (opts.interactive || opts.positional.length === 0) {
  await interactive();
  process.exit(0);
}

/* ─── One-shot mode ─── */

const targetItem = resolveItem(opts.positional[0]);
if (!targetItem) {
  console.error(`Unknown target item "${opts.positional[0]}". Try \`--list items\` or partial name.`);
  process.exit(2);
}
const supplies = [];
for (const s of opts.supplies) {
  const it = resolveItem(s.token);
  if (!it) {
    console.error(`Unknown supply item "${s.token}". Try \`--list items\`.`);
    process.exit(2);
  }
  supplies.push({ item: it.className, ratePerMin: s.rate });
}

const plan = solveFactory({
  data,
  supplies,
  targets: [
    { item: targetItem.className, minRatePerMin: opts.targetRate > 0 ? opts.targetRate : undefined, weight: opts.weight },
  ],
  includeAlternates: opts.alternates,
});

printPlan(plan, data, { targetItemName: targetItem.name, topRecipes: opts.topRecipes });

/* ─────────────────── helpers ─────────────────── */

async function interactive() {
  const rl = readline.createInterface({ input, output, terminal: true });
  banner();
  console.log('Interactive mode. Empty line = done.\n');
  const targetToken = (await rl.question('Target item (name/slug/class): ')).trim();
  if (!targetToken) {
    console.log('Aborted.');
    rl.close();
    return;
  }
  const target = resolveItem(targetToken);
  if (!target) {
    console.error(`Unknown item "${targetToken}".`);
    rl.close();
    return;
  }
  const rateRaw = (await rl.question(`Target rate /min (blank = maximize): `)).trim();
  const targetRate = rateRaw ? Number(rateRaw) : 0;
  const supplies = [];
  console.log('\nEnter supply rows as "item rate" (blank line to finish). Examples:');
  console.log('  iron-ore 480');
  console.log('  Desc_Water_C 1200\n');
  for (;;) {
    const line = (await rl.question('supply> ')).trim();
    if (!line) break;
    const parts = line.split(/\s+/);
    const it = resolveItem(parts[0]);
    if (!it) {
      console.error(`  unknown item "${parts[0]}"; skipped`);
      continue;
    }
    const rate = Number(parts[1]);
    if (!Number.isFinite(rate) || rate <= 0) {
      console.error(`  invalid rate "${parts[1]}"; skipped`);
      continue;
    }
    supplies.push({ item: it.className, ratePerMin: rate });
  }
  const altsLine = (await rl.question('Allow alternate recipes? [y/N]: ')).trim().toLowerCase();
  const includeAlternates = altsLine === 'y' || altsLine === 'yes';
  rl.close();

  const plan = solveFactory({
    data,
    supplies,
    targets: [{ item: target.className, minRatePerMin: targetRate > 0 ? targetRate : undefined, weight: 1 }],
    includeAlternates,
  });
  printPlan(plan, data, { targetItemName: target.name, topRecipes: Infinity });
}

function doList(kind) {
  banner();
  if (kind === 'items' || kind === 'item') {
    const items = Object.values(data.items).sort((a, b) => a.name.localeCompare(b.name));
    for (const i of items) console.log(`  ${pad(i.slug, 36)} ${i.name}`);
  } else if (kind === 'buildings' || kind === 'building') {
    const bs = Object.values(data.buildings).sort((a, b) => a.name.localeCompare(b.name));
    for (const b of bs) {
      const mw = b.metadata?.powerConsumption ?? 0;
      console.log(`  ${pad(b.slug, 30)} ${pad(b.name, 26)} ${mw ? mw + ' MW' : ''}`);
    }
  } else {
    // recipes (default)
    const recs = data.recipes
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const r of recs) {
      const bld = data.buildings[r.producedIn[0]]?.name ?? r.producedIn[0];
      const tag = r.alternate ? '[alt]' : '     ';
      console.log(`  ${tag} ${pad(r.slug, 50)} ${pad(r.name, 36)} ${bld}`);
    }
  }
}

function help() {
  return `FICSIT Operations Research — Terminal planner

Usage:
  node scripts/plan.mjs <target> [--supply <item>=<rate>,...] [--alts] [--rate N] [--top N]
  node scripts/plan.mjs --interactive
  node scripts/plan.mjs --list [recipes|items|buildings]

Arguments:
  <target>                Item to produce (slug, class name, or partial name).

Flags:
  -s, --supply LIST       Comma-separated item=rate pairs (items/minute).
      --rate N            Required minimum output rate (default: maximize).
      --weight N          Objective weight on the target (default: 1).
      --alts              Allow alternate recipes.
      --top N             Limit recipe lines printed to top N by machines.
      --raw               (deprecated; auto-supply is on when no --supply is given).
      --strict            Force-disable auto-supply. Every consumed raw must be listed via --supply.
      --auto-raw          Force auto-supply ON even when --supply is given (advanced; otherwise --supply
                          implies strict so the Converter can't transmute around your caps).
      --shards N          Power Shard budget for overclocking. >0 lets the solver run recipes at
                          150/200/250% clock (1/2/3 shards per machine) wherever it cuts the machine
                          count the most. Power scales by clock^1.32.
      --with-power        Plan power production end-to-end: generators + fuel chain enter the LP.
  -i, --interactive       Prompt-driven mode.
      --list KIND         List "recipes" (default), "items", or "buildings".
  -h, --help              Show this help.

Examples:
  node scripts/plan.mjs iron-plate -s iron-ore=120
  node scripts/plan.mjs Desc_Diamond_C -s Desc_Coal_C=240 --alts
  node scripts/plan.mjs time-crystal --raw --alts --rate 4
  npm run plan -- diamonds --supply coal=240 --alts
`;
}

function banner() {
  const id = data.buildId ?? 'unknown';
  console.log('[38;5;208m▰▰▰  FICSIT OPS RES  ▰▰▰[0m  dataset:', id);
  console.log(`recipes: ${data.recipes.length}   items: ${Object.keys(data.items).length}   buildings: ${Object.keys(data.buildings).length}\n`);
}

function ratePerMin(amount, time) {
  return (amount * 60) / time;
}

function recipePowerKW(r) {
  if (r.isVariablePower && r.minPower != null && r.maxPower != null) {
    return (r.minPower + r.maxPower) / 2;
  }
  const building = r.producedIn[0];
  return data.buildings[building]?.metadata?.powerConsumption ?? 0;
}

function solveFactory({ data, supplies, targets, includeAlternates }) {
  // Auto-supply rules:
  //   * no --supply flags → ON (every raw unlimited; fast "how much can I
  //     make" path).
  //   * one or more --supply flags → OFF (only listed raws available; this
  //     stops the Converter recipe from transmuting unlimited Quartz/etc.
  //     around the user's caps).
  //   * --strict        → force OFF (overrides everything).
  //   * --auto-raw      → force ON (partial-caps mode for advanced use).
  const autoSupplyDefault = supplies.length === 0;
  const autoSupply = opts.strict ? false : opts.autoRaw ? true : autoSupplyDefault;
  let suppliesEff = [...supplies];
  if (autoSupply) {
    const userItems = new Set(supplies.map((s) => s.item));
    for (const raw of Object.keys(data.resources)) {
      if (!userItems.has(raw)) {
        suppliesEff.push({ item: raw, ratePerMin: UNLIMITED_SUPPLY, _auto: true });
      }
    }
  }
  const candidate = data.recipes.filter((r) => includeAlternates || !r.alternate);
  const supplyByItem = new Map();
  for (const s of suppliesEff) supplyByItem.set(s.item, (supplyByItem.get(s.item) ?? 0) + s.ratePerMin);
  const items = new Set();
  for (const r of candidate) {
    for (const i of r.ingredients) items.add(i.item);
    for (const p of r.products) items.add(p.item);
  }
  for (const k of supplyByItem.keys()) items.add(k);
  for (const t of targets) items.add(t.item);

  const variables = {};
  const constraints = {};

  // For each item, production - consumption (after sinking targets) must be ≥ -supply_cap.
  // This naturally allows byproduct surplus to be absorbed (AWESOME Sink) without
  // forcing the LP to perfectly clear every intermediate.
  // Power planning: synthetic `__power__` item that recipes consume and
  // generators produce. Add fuel + byproduct items to the LP scope too.
  if (opts.withPower) {
    items.add('__power__');
    for (const g of data.generators) {
      for (const f of g.fuels ?? []) {
        items.add(f.item);
        if (f.byproduct) items.add(f.byproduct);
      }
    }
  }
  for (const it of items) {
    const cap = supplyByItem.get(it) ?? 0;
    constraints[`bal_${it}`] = { min: -cap };
  }

  // If any target has a fixed min rate, the user wants at-least-that-much with
  // the smallest factory. Otherwise we maximize output (the "how much can I
  // make from this supply" mode).
  const hasFixedTarget = targets.some((t) => (t.minRatePerMin ?? 0) > 0);

  // Overclocking: when shards > 0, expand each recipe across 4 clock tiers
  // (100/150/200/250%) costing 0/1/2/3 shards per machine. Power scales as
  // clock^log2(2.5) ≈ clock^1.32193 per the Update 1.0 formula.
  const OC_TIERS = opts.shards > 0
    ? [
        { clock: 1.0, shardsEach: 0 },
        { clock: 1.5, shardsEach: 1 },
        { clock: 2.0, shardsEach: 2 },
        { clock: 2.5, shardsEach: 3 },
      ]
    : [{ clock: 1.0, shardsEach: 0 }];
  const POWER_EXP = Math.log2(2.5);

  candidate.forEach((r, idx) => {
    const basePowerKW = recipePowerKW(r);
    OC_TIERS.forEach((tier, tIdx) => {
      const v = {};
      for (const p of r.products) v[`bal_${p.item}`] = (v[`bal_${p.item}`] ?? 0) + ratePerMin(p.amount, r.time) * tier.clock;
      for (const i of r.ingredients) v[`bal_${i.item}`] = (v[`bal_${i.item}`] ?? 0) - ratePerMin(i.amount, r.time) * tier.clock;
      v.obj = hasFixedTarget ? 1 : 0;
      if (tier.shardsEach > 0) v.shard_budget = tier.shardsEach;
      if (opts.withPower) v.bal___power__ = -basePowerKW * Math.pow(tier.clock, POWER_EXP);
      variables[`x_${idx}_${tIdx}`] = v;
    });
  });
  if (opts.shards > 0) constraints.shard_budget = { max: opts.shards };

  if (opts.withPower) {
    data.generators.forEach((g, gIdx) => {
      (g.fuels ?? []).forEach((fuel, fIdx) => {
        const energy = data.items[fuel.item]?.energyValue ?? 0;
        if (energy <= 0) return;
        const fuelPerMin = (60 / energy) * g.powerProduction;
        const v = {
          bal___power__: g.powerProduction,
          [`bal_${fuel.item}`]: -fuelPerMin,
          obj: hasFixedTarget ? 1 : 0,
        };
        const byAmt = fuel.byproductAmount ?? 0;
        if (fuel.byproduct && byAmt > 0) v[`bal_${fuel.byproduct}`] = fuelPerMin * byAmt;
        variables[`g_${gIdx}_${fIdx}`] = v;
      });
    });
  }

  for (const t of targets) {
    variables[`produced_${t.item}`] = {
      [`bal_${t.item}`]: -1,
      obj: hasFixedTarget ? 0 : (t.weight ?? 1),
    };
    if (t.minRatePerMin && t.minRatePerMin > 0) {
      constraints[`min_${t.item}`] = { min: t.minRatePerMin };
      variables[`produced_${t.item}`][`min_${t.item}`] = 1;
    }
  }
  if (process.env.FICSIT_DEBUG) {
    console.error('[debug] supplies count:', suppliesEff.length, 'candidate recipes:', candidate.length, 'items:', items.size);
    console.error('[debug] sample variables:', Object.keys(variables).slice(0, 8));
    console.error('[debug] sample constraints:', Object.keys(constraints).slice(0, 8));
  }
  const result = solver.Solve({
    optimize: 'obj',
    opType: hasFixedTarget ? 'min' : 'max',
    constraints,
    variables,
  });
  if (process.env.FICSIT_DEBUG) {
    console.error('[debug] LP result keys:', Object.keys(result).slice(0, 12), '… feasible=', result.feasible, 'bounded=', result.bounded, 'result=', result.result);
  }
  if (!result.feasible) return { status: 'infeasible', message: 'No combination of recipes satisfies the supply/target constraints.', lines: [], suppliesUsed: suppliesEff, targets };

  const EPS = 1e-6;
  const lines = [];
  const buildingTotals = new Map();
  let totalMachines = 0;
  let totalPowerKW = 0;
  let totalShards = 0;
  candidate.forEach((r, idx) => {
    let machines = 0;
    let throughputUnits = 0;
    let powerKW = 0;
    let shards = 0;
    const clockTiers = [];
    OC_TIERS.forEach((tier, tIdx) => {
      const x = result[`x_${idx}_${tIdx}`] ?? 0;
      if (x < EPS) return;
      machines += x;
      throughputUnits += x * tier.clock;
      powerKW += x * recipePowerKW(r) * Math.pow(tier.clock, POWER_EXP);
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
    buildingTotals.set(building, (buildingTotals.get(building) ?? 0) + machines);
    totalMachines += machines;
    totalPowerKW += powerKW;
    totalShards += shards;
  });

  const generatorLines = [];
  let totalPowerProducedKW = 0;
  if (opts.withPower) {
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
        const power = g.powerProduction * machines;
        generatorLines.push({
          generator: g.className,
          fuelItem: fuel.item,
          machines,
          fuelRatePerMin,
          byproductItem: fuel.byproduct ?? null,
          byproductRatePerMin,
          powerKW: power,
        });
        buildingTotals.set(g.className, (buildingTotals.get(g.className) ?? 0) + machines);
        totalMachines += machines;
        totalPowerProducedKW += power;
      });
    });
  }

  const outputs = targets.map((t) => ({ item: t.item, ratePerMin: result[`produced_${t.item}`] ?? 0 }));
  // Tally net raw consumption per supply item. Show user-specified caps even at 0,
  // and any auto-supplied raw actually used.
  const userItems = new Set(supplies.map((s) => s.item));
  const consumedInputs = suppliesEff
    .map((s) => {
      let net = 0;
      for (const line of lines) {
        for (const i of line.inputs) if (i.item === s.item) net += i.ratePerMin;
        for (const o of line.outputs) if (o.item === s.item) net -= o.ratePerMin;
      }
      for (const gl of generatorLines) {
        if (gl.fuelItem === s.item) net += gl.fuelRatePerMin;
        if (gl.byproductItem === s.item) net -= gl.byproductRatePerMin;
      }
      return { item: s.item, ratePerMin: Math.max(0, net), userCapped: userItems.has(s.item), cap: s.ratePerMin };
    })
    .filter((row) => row.userCapped || row.ratePerMin > EPS)
    .sort((a, b) => b.ratePerMin - a.ratePerMin);
  return {
    status: 'optimal',
    lines,
    generatorLines,
    totalMachines,
    totalPowerKW,
    totalPowerProducedKW,
    totalShards,
    shardBudget: opts.shards,
    buildingsByType: [...buildingTotals.entries()].map(([building, machines]) => ({ building, machines })),
    outputs,
    consumedInputs,
    suppliesUsed: suppliesEff,
    targets,
  };
}

/* ─── Output formatting ─── */

function pad(s, n) {
  s = String(s);
  if (s.length >= n) return s.slice(0, n - 1) + '…';
  return s + ' '.repeat(n - s.length);
}

function padR(s, n) {
  s = String(s);
  if (s.length >= n) return s.slice(0, n - 1) + '…';
  return ' '.repeat(n - s.length) + s;
}

function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(digits);
}

function rule(width = 64, ch = '─') {
  return GRAY + ch.repeat(width) + RESET;
}

function printPlan(plan, data, { targetItemName, topRecipes = Infinity }) {
  banner();

  if (plan.status !== 'optimal') {
    console.log(`${RED}${BOLD}${plan.status}${RESET}`);
    console.log(plan.message ?? '');
    return;
  }

  console.log(`${BOLD}TARGET${RESET}  ${ORANGE}${targetItemName}${RESET}`);
  if (plan.targets[0]?.minRatePerMin) {
    console.log(`        min rate: ${plan.targets[0].minRatePerMin}/m`);
  }
  console.log();

  console.log(rule(64, '═'));
  console.log(`${BOLD}OUTPUTS${RESET}`);
  for (const o of plan.outputs) {
    const it = data.items[o.item];
    console.log(`  ${GREEN}${fmt(o.ratePerMin).padStart(8)}/m${RESET}  ${it?.name ?? o.item}`);
  }
  console.log();

  console.log(`${BOLD}RAW / INPUTS CONSUMED${RESET}`);
  for (const o of plan.consumedInputs) {
    const it = data.items[o.item];
    if (o.ratePerMin <= 1e-6 && !o.userCapped) continue;
    let suffix = '';
    if (o.userCapped) {
      const pct = o.cap > 0 ? Math.round((o.ratePerMin / o.cap) * 100) : 0;
      suffix = ` ${DIM}(${pct}% of ${fmt(o.cap)}/m cap)${RESET}`;
    } else {
      suffix = ` ${DIM}(auto-supplied)${RESET}`;
    }
    console.log(`  ${YELLOW}${fmt(o.ratePerMin).padStart(8)}/m${RESET}  ${pad(it?.name ?? o.item, 24)}${suffix}`);
  }
  console.log();

  console.log(rule(64, '═'));
  console.log(`${BOLD}TOTALS${RESET}`);
  console.log(`  machines: ${ORANGE}${fmt(plan.totalMachines, 1).padStart(8)}${RESET}`);
  if (plan.generatorLines && plan.generatorLines.length > 0) {
    console.log(`  draw:     ${ORANGE}${(fmt(plan.totalPowerKW) + ' MW').padStart(10)}${RESET}  recipes consume`);
    console.log(`  made:     ${ORANGE}${(fmt(plan.totalPowerProducedKW) + ' MW').padStart(10)}${RESET}  generators produce`);
  } else {
    console.log(`  power:    ${ORANGE}${(fmt(plan.totalPowerKW) + ' MW').padStart(10)}${RESET}  ${suggestGenerators(plan.totalPowerKW)}`);
  }
  console.log(`  recipes:  ${ORANGE}${String(plan.lines.length).padStart(8)}${RESET}  lines`);
  if (plan.shardBudget > 0) {
    const usedFmt = fmt(plan.totalShards, 1);
    console.log(`  shards:   ${ORANGE}${usedFmt.padStart(8)}${RESET}  / ${plan.shardBudget} budgeted`);
  }
  console.log();

  if (plan.generatorLines && plan.generatorLines.length > 0) {
    console.log(`${BOLD}POWER GENERATION${RESET}`);
    for (const gl of plan.generatorLines) {
      const gname = data.buildings[gl.generator]?.name ?? gl.generator;
      const fname = data.items[gl.fuelItem]?.name ?? gl.fuelItem;
      let line = `  ${ORANGE}${padR(fmt(gl.machines, 1), 6)}${RESET} × ${pad(gname, 24)}  fuel: ${fmt(gl.fuelRatePerMin)}/m ${fname}`;
      if (gl.byproductItem && gl.byproductRatePerMin > 1e-6) {
        line += `   ${YELLOW}+ ${fmt(gl.byproductRatePerMin)}/m ${data.items[gl.byproductItem]?.name ?? gl.byproductItem}${RESET}`;
      }
      console.log(line);
    }
    console.log();
  }

  console.log(`${BOLD}BUILDINGS${RESET}`);
  const byType = plan.buildingsByType.slice().sort((a, b) => b.machines - a.machines);
  for (const b of byType) {
    const name = data.buildings[b.building]?.name ?? b.building;
    console.log(`  ${ORANGE}${padR(fmt(b.machines, 1), 6)}${RESET} × ${name}`);
  }
  console.log();

  const ocActive = (plan.shardBudget ?? 0) > 0;
  const width = ocActive ? 112 : 96;
  console.log(rule(width, '═'));
  if (ocActive) {
    console.log(
      `${BOLD}${pad('RECIPE LINES', 32)} ${pad('BUILDING', 22)} ${padR('×MACHINES', 12)} ${padR('CLOCK', 14)} ${padR('POWER', 18)} ${padR('FLAG', 6)}${RESET}`,
    );
  } else {
    console.log(
      `${BOLD}${pad('RECIPE LINES', 32)} ${pad('BUILDING', 22)} ${padR('×MACHINES', 12)} ${padR('POWER', 20)} ${padR('FLAG', 6)}${RESET}`,
    );
  }
  console.log(rule(width));
  const sorted = plan.lines.slice().sort((a, b) => b.machines - a.machines);
  let shown = 0;
  for (const l of sorted) {
    if (shown >= topRecipes) {
      console.log(`  ${DIM}… ${sorted.length - shown} more (use --top ${sorted.length} to see all)${RESET}`);
      break;
    }
    shown++;
    const bldName = data.buildings[l.building]?.name ?? l.building;
    const flag = l.recipe.alternate ? `${YELLOW}ALT${RESET}` : '   ';
    const power = l.recipe.isVariablePower
      ? `${fmt(l.recipe.minPower * l.machines)}–${fmt(l.recipe.maxPower * l.machines)} MW`
      : `${fmt(l.powerKW)} MW`;
    if (ocActive) {
      const clockCol = formatClockSummary(l);
      console.log(
        `${pad(l.recipe.name, 32)} ${pad(bldName, 22)} ${padR(fmt(l.machines, 2), 12)} ${padR(clockCol, 14)} ${padR(power, 18)} ${padR(flag, 6)}`,
      );
    } else {
      console.log(
        `${pad(l.recipe.name, 32)} ${pad(bldName, 22)} ${padR(fmt(l.machines, 2), 12)} ${padR(power, 20)} ${padR(flag, 6)}`,
      );
    }
    // Flows per line
    const ins = l.inputs.map((i) => `${fmt(i.ratePerMin)}/m ${data.items[i.item]?.name ?? i.item}`).join(', ');
    const outs = l.outputs.map((o) => `${fmt(o.ratePerMin)}/m ${data.items[o.item]?.name ?? o.item}`).join(', ');
    console.log(`  ${DIM}in:${RESET}  ${ins}`);
    console.log(`  ${DIM}out:${RESET} ${outs}`);
  }
  console.log(rule(width, '═'));

  // AWESOME Sink value. Liquids/gases can't actually be sunk, so they're zero.
  const sinkPts = (item) => {
    const it = data.items[item];
    if (!it || it.liquid) return 0;
    return it.sinkPoints ?? 0;
  };
  const sinkOut = plan.outputs.reduce((acc, o) => acc + sinkPts(o.item) * o.ratePerMin, 0);
  const sinkIn = plan.consumedInputs.reduce((acc, o) => acc + sinkPts(o.item) * o.ratePerMin, 0);
  console.log(`${BOLD}AWESOME SINK VALUE${RESET}`);
  console.log(`  output:  ${GREEN}${fmt(sinkOut).padStart(10)} pts/m${RESET}`);
  console.log(`  inputs:  ${GRAY}${fmt(sinkIn).padStart(10)} pts/m${RESET}`);
  console.log(`  ${BOLD}net:     ${(sinkOut - sinkIn) >= 0 ? GREEN : RED}${fmt(sinkOut - sinkIn).padStart(10)} pts/m${RESET}`);
  console.log();
}

function formatClockSummary(line) {
  if (!line.clockTiers || line.clockTiers.length === 0) return '100%';
  if (line.clockTiers.length === 1) return `${Math.round(line.clockTiers[0].clock * 100)}%`;
  return line.clockTiers
    .filter((t) => t.machines > 1e-6)
    .map((t) => `${fmt(t.machines, 1)}@${Math.round(t.clock * 100)}%`)
    .join(' ');
}

function suggestGenerators(mw) {
  if (mw <= 0) return '';
  const opts = [
    { name: 'Coal', mw: 75 },
    { name: 'Fuel', mw: 250 },
    { name: 'Nuclear', mw: 2500 },
  ];
  return GRAY + '≈ ' + opts.map((g) => `${Math.ceil(mw / g.mw)} ${g.name}`).join(' / ') + RESET;
}
