// Diagnose why a plan came back infeasible. Forward-BFS from raw supplies +
// auto-supplied resources through the candidate recipe set; anything outside
// the reachable closure cannot be produced under the current toggles.
//
// If enabling alternates would unblock the user, we say so AND list the
// specific items that become reachable only with alts (e.g., "Turbofuel").

import type { SatData, SatRecipe } from '../data/types';

export interface KeyAltRecipe {
  className: string;
  name: string;
  /** the gap-bridging product item this recipe unlocks (for display) */
  unlocks: string;
  building: string;
}

export interface Diagnosis {
  /** items that are unreachable under the current toggles */
  unreachable: string[];
  /** targets specifically that are unreachable */
  unreachableTargets: string[];
  /** if enabling alternates would unblock at least one target */
  enablingAltsWouldHelp: boolean;
  /** alt recipes the user needs to enable to lift the gap (frontier set) */
  keyAltRecipes: KeyAltRecipe[];
  /** if any user-supplied target is itself not in the catalog */
  unknownTargets: string[];
}

interface DiagnoseOptions {
  supplies: { item: string }[];
  targets: { item: string }[];
  includeAlternates: boolean;
  autoSupplyRawResources: boolean;
}

export function diagnose(data: SatData, opts: DiagnoseOptions): Diagnosis {
  const candidate = filterRecipes(data, opts.includeAlternates);
  const supplied = sourcesFor(data, opts.supplies, opts.autoSupplyRawResources);
  const reachable = reachableFrom(candidate, supplied);

  const unreachable = opts.targets.map((t) => t.item).filter((t) => !reachable.has(t));
  const unknownTargets = opts.targets.map((t) => t.item).filter((t) => !data.items[t]);

  // Try with alternates flipped on to see if that helps.
  let enablingAltsWouldHelp = false;
  let keyAltRecipes: KeyAltRecipe[] = [];
  if (!opts.includeAlternates && unreachable.length > 0) {
    const altCandidate = filterRecipes(data, true);
    const altReachable = reachableFrom(altCandidate, supplied);
    const targetUnblocked = unreachable.some((t) => altReachable.has(t));
    if (targetUnblocked) {
      enablingAltsWouldHelp = true;
      const upstream = upstreamOf(data, unreachable);
      keyAltRecipes = findFrontierAltRecipes(data, reachable, altReachable).filter((r) =>
        upstream.has(r.unlocks),
      );
    }
  }

  return {
    unreachable: [...new Set([...unreachable, ...findUnreachableIntermediates(data, opts, reachable)])],
    unreachableTargets: unreachable,
    enablingAltsWouldHelp,
    keyAltRecipes,
    unknownTargets,
  };
}

/** "Frontier" alt recipes: an alternate recipe is a frontier recipe if all of
 * its inputs are std-reachable (or supplied) but its product is NOT
 * std-reachable. These are the recipes that, if you flipped the alt switch,
 * would immediately become useful and unlock at least one new item. */
function findFrontierAltRecipes(
  data: SatData,
  stdReachable: Set<string>,
  altReachable: Set<string>,
): KeyAltRecipe[] {
  // Iteratively expand: keep adding frontier alt recipes whose products are now
  // reachable in alt mode but not yet covered by std + already-chosen alts.
  const covered = new Set(stdReachable);
  const chosen: KeyAltRecipe[] = [];
  const altRecipes = data.recipes.filter((r) => r.alternate);
  let changed = true;
  while (changed && chosen.length < 40) {
    changed = false;
    for (const r of altRecipes) {
      if (chosen.some((c) => c.className === r.className)) continue;
      const allInputsCovered = r.ingredients.every((i) => covered.has(i.item));
      const anyNewProduct = r.products.some((p) => !covered.has(p.item) && altReachable.has(p.item));
      if (allInputsCovered && anyNewProduct) {
        const newProduct = r.products.find((p) => !covered.has(p.item))!;
        chosen.push({
          className: r.className,
          name: r.name,
          unlocks: newProduct.item,
          building: r.producedIn[0] ?? '',
        });
        for (const p of r.products) covered.add(p.item);
        changed = true;
      }
    }
  }
  return chosen.slice(0, 12);
}

function filterRecipes(data: SatData, includeAlternates: boolean): SatRecipe[] {
  return data.recipes.filter((r) => includeAlternates || !r.alternate);
}

function sourcesFor(
  data: SatData,
  supplies: { item: string }[],
  autoSupplyRawResources: boolean,
): Set<string> {
  const s = new Set<string>(supplies.map((x) => x.item));
  if (autoSupplyRawResources) {
    for (const raw of Object.keys(data.resources)) s.add(raw);
  }
  return s;
}

/** Backwards-BFS: every item that can be an ancestor of any item in `seeds`
 * via any recipe (alternate included). Used to prune the frontier list to
 * recipes that are actually relevant to the user's unreachable target. */
function upstreamOf(data: SatData, seeds: string[]): Set<string> {
  const upstream = new Set(seeds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of data.recipes) {
      if (r.products.some((p) => upstream.has(p.item))) {
        for (const i of r.ingredients) {
          if (!upstream.has(i.item)) {
            upstream.add(i.item);
            changed = true;
          }
        }
      }
    }
  }
  return upstream;
}

function reachableFrom(recipes: SatRecipe[], sources: Set<string>): Set<string> {
  const reachable = new Set(sources);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of recipes) {
      if (r.ingredients.every((i) => reachable.has(i.item))) {
        for (const p of r.products) {
          if (!reachable.has(p.item)) {
            reachable.add(p.item);
            changed = true;
          }
        }
      }
    }
  }
  return reachable;
}

/** For each unreachable *target*, walk its standard-recipe dependency chain to
 * find the first ingredient that has no standard producer at all — that's the
 * actual bottleneck. */
function findUnreachableIntermediates(
  data: SatData,
  opts: DiagnoseOptions,
  reachable: Set<string>,
): string[] {
  const recipes = filterRecipes(data, opts.includeAlternates);
  const bottlenecks = new Set<string>();
  const visited = new Set<string>();
  function walk(item: string) {
    if (visited.has(item)) return;
    visited.add(item);
    if (reachable.has(item)) return;
    const producers = recipes.filter((r) => r.products.some((p) => p.item === item));
    if (producers.length === 0) {
      bottlenecks.add(item);
      return;
    }
    for (const r of producers) {
      for (const ing of r.ingredients) {
        if (!reachable.has(ing.item)) walk(ing.item);
      }
    }
  }
  for (const t of opts.targets) walk(t.item);
  return [...bottlenecks];
}
