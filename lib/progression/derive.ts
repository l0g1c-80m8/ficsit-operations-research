// Turns the pruned schematic table + a save's SaveProgression into the shape
// the /progression view renders: milestone tiers, MAM research trees, Hard
// Drive alternates, Space Elevator phases, and the "parts you still owe"
// roll-ups.
//
// Pure functions only — no React, no storage — so the arithmetic is testable
// in isolation (see derive.test.ts).

import type { RecipeIO, SatSchematic } from '@/lib/data/types';
import type { SaveProgression } from '@/lib/save/types';
import { PROJECT_PHASES, type ProjectPhase } from './phases';

export interface SchematicStatus {
  schematic: SatSchematic;
  done: boolean;
}

export interface SchematicGroup {
  id: string;
  label: string;
  entries: SchematicStatus[];
  done: number;
  total: number;
  /** Summed cost of every not-yet-done entry in this group. */
  remaining: RecipeIO[];
}

export type PhaseState = 'done' | 'active' | 'locked';

export interface PhaseStatus {
  phase: ProjectPhase;
  state: PhaseState;
  /** Parts already delivered to the elevator for this phase. */
  delivered: RecipeIO[];
  /** cost − delivered, floored at 0. */
  remaining: RecipeIO[];
}

export interface ProgressionModel {
  milestones: SchematicGroup[];
  mam: SchematicGroup[];
  alternates: SchematicGroup;
  phases: PhaseStatus[];
  /** 1-based active phase, or undefined when the save didn't expose it. */
  currentPhase?: number;
  totals: {
    milestonesDone: number;
    milestonesTotal: number;
    mamDone: number;
    mamTotal: number;
    alternatesDone: number;
    alternatesTotal: number;
    phasesDone: number;
    phasesTotal: number;
  };
}

/** MAM research trees, derived from the `Research_<Tree>_*` class-name prefix —
 *  `requiredSchematics` is empty for MAM nodes in the community dump, so the
 *  real dependency graph isn't available and the prefix is the best grouping we
 *  have. The alien-organism research is split across four prefixes in the game
 *  files; they're one tree in-game, so they're merged here. */
const MAM_TREES: { id: string; label: string; prefixes: string[] }[] = [
  { id: 'caterium', label: 'Caterium', prefixes: ['Caterium'] },
  { id: 'quartz', label: 'Quartz', prefixes: ['Quartz'] },
  { id: 'sulfur', label: 'Sulfur', prefixes: ['Sulfur'] },
  { id: 'alien', label: 'Alien Technology', prefixes: ['Alien'] },
  { id: 'organisms', label: 'Alien Organisms', prefixes: ['ACarapace', 'AOrgans', 'AOrganisms', 'AO'] },
  { id: 'mycelia', label: 'Mycelia', prefixes: ['Mycelia'] },
  { id: 'nutrients', label: 'Nutrients', prefixes: ['Nutrients'] },
  { id: 'slugs', label: 'Power Slugs', prefixes: ['PowerSlugs'] },
];

/** Sums any number of cost lists into one deduplicated list, largest first. */
export function sumCosts(...lists: RecipeIO[][]): RecipeIO[] {
  const totals = new Map<string, number>();
  for (const list of lists) {
    for (const c of list) totals.set(c.item, (totals.get(c.item) ?? 0) + c.amount);
  }
  return [...totals.entries()]
    .filter(([, amount]) => amount > 0)
    .map(([item, amount]) => ({ item, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function group(
  id: string,
  label: string,
  entries: SchematicStatus[],
): SchematicGroup {
  return {
    id,
    label,
    entries,
    done: entries.filter((e) => e.done).length,
    total: entries.length,
    remaining: sumCosts(...entries.filter((e) => !e.done).map((e) => e.schematic.cost)),
  };
}

/** Which MAM tree a research class name belongs to. Longest prefix wins so
 *  `AOrganisms` isn't swallowed by `AO`. */
function mamTreeFor(className: string): string {
  const m = /^Research_([A-Za-z]+)/.exec(className);
  if (!m) return 'other';
  const name = m[1];
  let best: { id: string; len: number } | null = null;
  for (const tree of MAM_TREES) {
    for (const p of tree.prefixes) {
      if (name === p && (!best || p.length > best.len)) best = { id: tree.id, len: p.length };
    }
  }
  return best?.id ?? 'other';
}

export function deriveProgression(
  schematics: SatSchematic[],
  progression: SaveProgression | undefined,
): ProgressionModel {
  const done = new Set(progression?.purchasedSchematics ?? []);
  const isDone = (s: SatSchematic) => done.has(s.className);

  // ── Milestones, grouped by tech tier. Tier 0 is the HUB upgrade chain. ──
  const byTier = new Map<number, SchematicStatus[]>();
  for (const s of schematics) {
    if (s.kind !== 'milestone') continue;
    const list = byTier.get(s.tier);
    const entry = { schematic: s, done: isDone(s) };
    if (list) list.push(entry);
    else byTier.set(s.tier, [entry]);
  }
  const milestones = [...byTier.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tier, entries]) => {
      entries.sort((a, b) => a.schematic.name.localeCompare(b.schematic.name));
      return group(`tier-${tier}`, tier === 0 ? 'HUB Upgrades' : `Tier ${tier}`, entries);
    });

  // ── MAM research, grouped into trees. ──
  const byTree = new Map<string, SchematicStatus[]>();
  for (const s of schematics) {
    if (s.kind !== 'mam') continue;
    const id = mamTreeFor(s.className);
    const list = byTree.get(id);
    const entry = { schematic: s, done: isDone(s) };
    if (list) list.push(entry);
    else byTree.set(id, [entry]);
  }
  const mam = [...MAM_TREES, { id: 'other', label: 'Other research', prefixes: [] }]
    .filter((t) => byTree.has(t.id))
    .map((t) => {
      const entries = byTree.get(t.id)!;
      entries.sort((a, b) => a.schematic.name.localeCompare(b.schematic.name));
      return group(t.id, t.label, entries);
    });

  // ── Hard Drive alternates. These cost nothing (you pay in hard drives), so
  //    their `remaining` is always empty and they never enter the roll-ups. ──
  const altEntries = schematics
    .filter((s) => s.kind === 'alternate')
    .map((s) => ({ schematic: s, done: isDone(s) }))
    .sort((a, b) => a.schematic.name.localeCompare(b.schematic.name));
  const alternates = group('alternates', 'Hard Drive alternates', altEntries);

  // ── Space Elevator phases. ──
  const currentPhase = progression?.currentPhase;
  const deliveredByItem = new Map<string, number>();
  for (const d of progression?.phasePaidOff ?? []) {
    deliveredByItem.set(d.item, (deliveredByItem.get(d.item) ?? 0) + d.amount);
  }
  const phases: PhaseStatus[] = PROJECT_PHASES.map((phase) => {
    let state: PhaseState = 'locked';
    if (currentPhase != null) {
      if (phase.phase < currentPhase) state = 'done';
      else if (phase.phase === currentPhase) state = 'active';
    }
    // Only the active phase has partial deliveries; done phases are fully paid,
    // locked ones untouched.
    const delivered: RecipeIO[] =
      state === 'active'
        ? phase.cost.map((c) => ({ item: c.item, amount: deliveredByItem.get(c.item) ?? 0 }))
        : state === 'done'
          ? phase.cost.map((c) => ({ ...c }))
          : phase.cost.map((c) => ({ item: c.item, amount: 0 }));
    const remaining =
      state === 'done'
        ? []
        : phase.cost.map((c, i) => ({
            item: c.item,
            amount: Math.max(0, c.amount - (delivered[i]?.amount ?? 0)),
          }));
    return { phase, state, delivered, remaining };
  });

  const sum = (groups: SchematicGroup[], key: 'done' | 'total') =>
    groups.reduce((n, g) => n + g[key], 0);

  return {
    milestones,
    mam,
    alternates,
    phases,
    currentPhase,
    totals: {
      milestonesDone: sum(milestones, 'done'),
      milestonesTotal: sum(milestones, 'total'),
      mamDone: sum(mam, 'done'),
      mamTotal: sum(mam, 'total'),
      alternatesDone: alternates.done,
      alternatesTotal: alternates.total,
      phasesDone: phases.filter((p) => p.state === 'done').length,
      phasesTotal: phases.length,
    },
  };
}

/** Everything still owed across the selected scopes, as one shopping list. */
export function remainingParts(
  model: ProgressionModel,
  scope: { milestones?: boolean; mam?: boolean; phases?: boolean; tier?: number | null } = {},
): RecipeIO[] {
  const lists: RecipeIO[][] = [];
  if (scope.milestones !== false) {
    for (const g of model.milestones) {
      if (scope.tier != null && g.id !== `tier-${scope.tier}`) continue;
      lists.push(g.remaining);
    }
  }
  if (scope.mam) for (const g of model.mam) lists.push(g.remaining);
  if (scope.phases) for (const p of model.phases) lists.push(p.remaining);
  return sumCosts(...lists);
}
