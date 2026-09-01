// Visual language for the /atlas map.
//
// Colour identifies the *resource* (so the same crude oil reads the same
// whether it's a node or a well); shape identifies the *category* (node, well,
// slug, artifact, drop pod); size and ring encode purity. Hues are picked for
// pairwise distance on the #0d1117 canvas, following the same reasoning as
// CATEGORY_META in lib/save/categorize.ts.

import type { MarkerCategory, MarkerPurity } from '@/lib/data/markers';

export type MarkerShape = 'circle' | 'square' | 'diamond' | 'triangle';

/** Per-layer colour, keyed by MarkerLayer.id. */
export const LAYER_COLOR: Record<string, string> = {
  // Solid resource nodes
  'nodes.iron-ore': '#b8c4d0',      // light steel
  'nodes.copper-ore': '#f0803c',    // copper orange
  'nodes.limestone': '#efe3bd',     // bone
  'nodes.coal': '#7b8794',          // grey-blue
  'nodes.caterium-ore': '#ffd24a',  // gold
  'nodes.raw-quartz': '#ff8fd0',    // pink
  'nodes.sulfur': '#d9e04a',        // chartreuse
  'nodes.bauxite': '#d98f6b',       // terracotta
  'nodes.uranium': '#5ce65c',       // radioactive green
  'nodes.sam': '#b96cff',           // violet
  'nodes.crude-oil': '#14b8a6',     // teal

  // Resource wells + geysers
  'wells.crude-oil': '#14b8a6',     // same resource, same hue as the node layer
  'wells.water': '#38bdf8',         // sky
  'wells.nitrogen-gas': '#a5b4fc',  // periwinkle
  'wells.geysers': '#fb7185',       // rose (power, not a material)

  // Collectibles
  'slugs.power-slugs': '#22c55e',
  'artifacts.artifacts': '#06b6d4',
  'collectibles.drop-pods': '#fbbf24',
};

/** Subtype overrides — slug colour and artifact kind vary inside one layer. */
export const SUBTYPE_COLOR: Record<string, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  mercer: '#06b6d4',
  somersloop: '#f472b6',
};

export const CATEGORY_SHAPE: Record<MarkerCategory, MarkerShape> = {
  nodes: 'circle',
  wells: 'square',
  slugs: 'circle',
  artifacts: 'diamond',
  collectibles: 'triangle',
};

export const CATEGORY_LABEL: Record<MarkerCategory, string> = {
  nodes: 'Resource nodes',
  wells: 'Resource wells & geysers',
  slugs: 'Power slugs',
  artifacts: 'Artifacts',
  collectibles: 'Hard drive crash sites',
};

/** Render order — big node markers first, small collectibles painted on top. */
export const CATEGORY_ORDER: MarkerCategory[] = [
  'nodes',
  'wells',
  'artifacts',
  'collectibles',
  'slugs',
];

export const PURITIES: MarkerPurity[] = ['impure', 'normal', 'pure'];

export const PURITY_LABEL: Record<MarkerPurity, string> = {
  impure: 'Impure',
  normal: 'Normal',
  pure: 'Pure',
};

/** Purity scales the marker: a pure node is visibly the fat one. Markers
 *  without purity (slugs, artifacts, drop pods) use 1. */
export const PURITY_SCALE: Record<MarkerPurity, number> = {
  impure: 0.7,
  normal: 1,
  pure: 1.35,
};

/** Base marker radius in *world units*, derived from the current viewBox width
 *  so markers hold a roughly constant on-screen size at any zoom — the same
 *  trick the Topograph grid uses for stroke widths.
 *
 *  The floor takes over once you zoom past ~600 m of visible width, pinning
 *  markers to roughly the physical footprint of the thing they represent (a
 *  resource node is a few hundred world units across). Past that point they
 *  stop being map pins and start reading as the deposit itself, which is what
 *  you want when lining a build up against a node cluster. */
export function markerRadius(viewBoxW: number, category: MarkerCategory): number {
  const base = viewBoxW * (category === 'slugs' ? 0.0035 : 0.0048);
  return Math.max(base, category === 'slugs' ? 150 : 300);
}

export function markerColor(layerId: string, subtype?: string): string {
  if (subtype && SUBTYPE_COLOR[subtype]) return SUBTYPE_COLOR[subtype];
  return LAYER_COLOR[layerId] ?? '#94a3b8';
}

/** SVG path for one marker centred at (0,0) with radius r. Circles are drawn
 *  as <circle> by the caller; the rest come back as path data. */
export function markerPath(shape: Exclude<MarkerShape, 'circle'>, r: number): string {
  switch (shape) {
    case 'square':
      return `M${-r} ${-r}H${r}V${r}H${-r}Z`;
    case 'diamond':
      return `M0 ${-r * 1.3}L${r * 1.3} 0L0 ${r * 1.3}L${-r * 1.3} 0Z`;
    case 'triangle':
      return `M0 ${-r * 1.3}L${r * 1.2} ${r * 0.9}L${-r * 1.2} ${r * 0.9}Z`;
  }
}
