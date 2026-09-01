// Reads tech progression out of a Satisfactory save's manager actors.
//
// Two singletons carry everything the /progression view needs:
//
//   FGSchematicManager   — `mPurchasedSchematics` (and friends): object refs to
//                          the Schematic_*_C / Research_*_C assets the pioneer
//                          has completed. These class names match
//                          `SatSchematic.className` in the pruned dataset
//                          one-for-one, so no translation table is needed.
//   FGGamePhaseManager   — the active Project Assembly phase plus the parts
//                          already delivered toward it.
//
// The property names differ across game versions (and the parser exposes
// ObjectProperty arrays in more than one shape), so every read here is
// speculative and guarded: unknown layout → the field is simply absent, and the
// UI degrades to an empty state. Run `node scripts/probe-progression.mjs
// <sample.sav>` to see what a given save actually carries.

import type { SaveProgression } from './types';

/** typePath fragments that identify the two manager singletons. */
const SCHEMATIC_MANAGER_RE = /SchematicManager/i;
const GAME_PHASE_MANAGER_RE = /GamePhaseManager/i;

export function isProgressionManager(typePath: string): boolean {
  return SCHEMATIC_MANAGER_RE.test(typePath) || GAME_PHASE_MANAGER_RE.test(typePath);
}

interface SaveObjectLike {
  typePath?: string;
  properties?: Record<string, unknown>;
}

/** `/Game/…/Schematic_3-1.Schematic_3-1_C` → `Schematic_3-1_C`. Mirrors
 *  simplifyClass() in parse.ts; duplicated to keep this module standalone. */
function simplifyClass(pathName: string): string {
  const tail = pathName.split('/').pop() ?? pathName;
  return tail.split('.').pop() ?? tail;
}

/** Pull class names out of an ArrayProperty of object references. The parser
 *  emits array entries either as a bare `{ levelName, pathName }` or wrapped as
 *  `{ value: { pathName } }` depending on the property's element type, so
 *  accept both. */
function objectRefNames(prop: unknown): string[] {
  const values = (prop as { values?: unknown[] } | undefined)?.values;
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const v of values) {
    const pathName =
      (v as { pathName?: string })?.pathName ??
      (v as { value?: { pathName?: string } })?.value?.pathName;
    if (typeof pathName === 'string' && pathName.length > 0) out.push(simplifyClass(pathName));
  }
  return out;
}

/** First property whose name matches, searched case-insensitively — save
 *  property casing has shifted between versions. */
function prop(obj: SaveObjectLike, ...names: string[]): unknown {
  const props = obj.properties;
  if (!props) return undefined;
  for (const n of names) {
    if (n in props) return props[n];
  }
  const lower = new Map(Object.keys(props).map((k) => [k.toLowerCase(), k]));
  for (const n of names) {
    const hit = lower.get(n.toLowerCase());
    if (hit) return props[hit];
  }
  return undefined;
}

/** `GP_Project_Assembly_Phase_3_C` / `Phase_3` / `…Phase3` → 3. */
function phaseNumberFromPath(pathName: string): number | undefined {
  const m = /phase[_\-\s]*(\d+)/i.exec(pathName);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

/** Read the parts already delivered toward the active phase. The struct array
 *  entries look like `{ properties: { ItemClass: {value:{pathName}}, amount:
 *  {value: n} } }`; field names vary, so probe generously. */
function readPaidOff(prop_: unknown): { item: string; amount: number }[] | undefined {
  const values = (prop_ as { values?: unknown[] } | undefined)?.values;
  if (!Array.isArray(values) || values.length === 0) return undefined;
  const out: { item: string; amount: number }[] = [];
  for (const v of values) {
    const props = (v as { properties?: Record<string, unknown> })?.properties;
    if (!props) continue;
    let item: string | undefined;
    let amount: number | undefined;
    for (const [k, raw] of Object.entries(props)) {
      const val = (raw as { value?: unknown })?.value;
      if (/item|class/i.test(k)) {
        const pathName = (val as { pathName?: string })?.pathName;
        if (typeof pathName === 'string' && pathName) item = simplifyClass(pathName);
      } else if (/amount|count|quantity/i.test(k) && typeof val === 'number') {
        amount = val;
      }
    }
    if (item && typeof amount === 'number') out.push({ item, amount });
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Build a SaveProgression from the manager actors collected during the save
 * walk. Never throws — a save with no recognizable managers returns empty
 * `purchasedSchematics` and `sources` both false.
 */
export function extractProgression(managers: SaveObjectLike[]): SaveProgression {
  const result: SaveProgression = {
    purchasedSchematics: [],
    sources: { schematicManager: false, gamePhaseManager: false },
  };

  const seen = new Set<string>();

  for (const obj of managers) {
    const typePath = obj.typePath ?? '';

    if (SCHEMATIC_MANAGER_RE.test(typePath)) {
      result.sources.schematicManager = true;
      // 1.0 uses mPurchasedSchematics; older/modded saves have spelled it
      // several ways. Union everything we recognize as "completed".
      for (const name of [
        ...objectRefNames(prop(obj, 'mPurchasedSchematics')),
        ...objectRefNames(prop(obj, 'mUnlockedSchematics')),
        ...objectRefNames(prop(obj, 'mCompletedSchematics')),
      ]) {
        if (!seen.has(name)) {
          seen.add(name);
          result.purchasedSchematics.push(name);
        }
      }
      const active = [
        ...objectRefNames(prop(obj, 'mActiveSchematic')),
        ...objectRefNames(prop(obj, 'mIncompleteSchematics')),
      ];
      if (active.length > 0) result.activeSchematics = active;
    }

    if (GAME_PHASE_MANAGER_RE.test(typePath)) {
      result.sources.gamePhaseManager = true;

      // 1.0: mCurrentGamePhase is an object ref to a phase data asset.
      const current = prop(obj, 'mCurrentGamePhase', 'mGamePhase');
      const refPath =
        (current as { value?: { pathName?: string } })?.value?.pathName ??
        (current as { pathName?: string })?.pathName;
      if (typeof refPath === 'string' && refPath) {
        result.currentPhase = phaseNumberFromPath(refPath);
      } else {
        // Pre-1.0: a plain numeric/enum phase index (0-based).
        const raw = (current as { value?: unknown })?.value;
        if (typeof raw === 'number' && Number.isFinite(raw)) result.currentPhase = raw + 1;
      }

      const paid = readPaidOff(prop(obj, 'mGamePhasePaidOffCosts', 'mPaidOffCosts'));
      if (paid) result.phasePaidOff = paid;
    }
  }

  result.purchasedSchematics.sort();
  return result;
}
