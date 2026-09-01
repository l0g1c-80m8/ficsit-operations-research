// Fetches the community world-marker dump and prunes it into
// public/data/map-markers.json for the /atlas view.
//
// Source: https://github.com/Tjark-Kuehl/satisfactorymap (resources.json),
// itself derived from the Satisfactory-Calculator Interactive Map (SCIM).
// The upstream file is ~2 MB and includes ~5 400 berry/nut/flower pickups we
// don't render; after pruning we keep resource nodes, resource wells, geysers,
// power slugs, artifacts (Mercer Spheres / Somersloops), and hard-drive drop
// pods — roughly 2 300 markers.
//
// Coordinates are UE world units (1 unit = 1 cm), the same space the save
// parser reports actor translations in, so atlas markers and Topograph factory
// footprints line up.
//
// Usage: node scripts/fetch-map-markers.mjs [--src <url-or-path>]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const SOURCE_URL =
  'https://raw.githubusercontent.com/Tjark-Kuehl/satisfactorymap/main/resources.json';
const ATTRIBUTION =
  'World marker data from the Satisfactory-Calculator Interactive Map, via github.com/Tjark-Kuehl/satisfactorymap';

// Which upstream tabs to keep, and how to label them. `category` groups layers
// in the atlas legend; `id` is the stable key the UI toggles on.
const KEEP_TABS = {
  resource_nodes: { category: 'nodes', label: 'Resource nodes' },
  resource_wells: { category: 'wells', label: 'Resource wells' },
  power_slugs: { category: 'slugs', label: 'Power slugs' },
  artifacts: { category: 'artifacts', label: 'Artifacts' },
  collectibles: { category: 'collectibles', label: 'Collectibles' },
};

// Within `collectibles` the upstream file has Drop-Pods (hard-drive crash
// sites, ~400) plus thousands of Consumable/Items pickups. Only the drop pods
// are planning-relevant.
const COLLECTIBLE_GROUPS = new Set(['Drop-Pods']);

const argSrc = (() => {
  const i = process.argv.indexOf('--src');
  return i >= 0 ? process.argv[i + 1] : null;
})();

async function readSource() {
  const src = argSrc ?? SOURCE_URL;
  if (!/^https?:/i.test(src)) {
    console.log(`Source: ${src} (local)`);
    return JSON.parse(fs.readFileSync(path.resolve(src), 'utf8'));
  }
  console.log(`Source: ${src}`);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
}

/** Depth-first walk to the leaf option objects (the ones carrying `markers`). */
function* leaves(node) {
  if (Array.isArray(node.markers)) {
    yield node;
    return;
  }
  for (const child of node.options ?? []) yield* leaves(child);
}

const src = await readSource();

const layers = [];
let skipped = 0;

for (const tab of src.options ?? []) {
  const keep = KEEP_TABS[tab.tabId];
  if (!keep) {
    skipped += 1;
    continue;
  }
  for (const group of tab.options ?? []) {
    if (tab.tabId === 'collectibles' && !COLLECTIBLE_GROUPS.has(group.name)) continue;

    // One layer per top-level group (e.g. "Iron Ore", "Geysers"). Purity lives
    // on the individual markers, so the purity sub-layers upstream collapse
    // into a single layer the UI can filter by purity itself.
    const markers = [];
    for (const leaf of leaves(group)) {
      for (const m of leaf.markers ?? []) {
        if (!Number.isFinite(m.x) || !Number.isFinite(m.y)) continue;
        const marker = { x: Math.round(m.x), y: Math.round(m.y), z: Math.round(m.z ?? 0) };
        const purity = m.purity ?? leaf.purity;
        if (purity) marker.purity = purity;
        // `type` distinguishes slug colors (green/yellow/purple) and artifact
        // kinds (mercer sphere vs somersloop) within one layer.
        const subtype = m.type ?? leaf.type;
        if (subtype && subtype !== group.type) marker.subtype = subtype;
        markers.push(marker);
      }
    }
    if (markers.length === 0) continue;

    layers.push({
      id: `${keep.category}.${slug(group.name)}`,
      label: group.name,
      category: keep.category,
      /** Desc_*_C class of the mined resource, when the group maps to one. */
      item: typeof group.type === 'string' && group.type.startsWith('Desc_') ? group.type : undefined,
      count: markers.length,
      markers,
    });
  }
}

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

layers.sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));

const out = {
  attribution: ATTRIBUTION,
  sourceUrl: SOURCE_URL,
  sourceVersion: String(src.version ?? 'unknown'),
  generatedAt: new Date().toISOString(),
  layers,
};

const outPath = path.join(root, 'public', 'data', 'map-markers.json');
fs.writeFileSync(outPath, JSON.stringify(out));

const total = layers.reduce((n, l) => n + l.count, 0);
const bytes = fs.statSync(outPath).size;
console.log(`Wrote ${outPath}`);
console.log(`  sourceVersion=${out.sourceVersion}  tabs skipped=${skipped}`);
console.log(`  layers=${layers.length} markers=${total} size=${(bytes / 1024).toFixed(1)} KB`);
for (const l of layers) console.log(`    ${l.category.padEnd(12)} ${l.label.padEnd(22)} ${l.count}`);
