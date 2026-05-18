'use client';
import { useMemo } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { useGameData } from '@/lib/data/use-data';
import { fmt } from '@/lib/utils';
import type { ParsedSaveSummary } from '@/lib/save/types';
import { buildableToDescriptor, categorize } from '@/lib/save/categorize';
import { Activity, Boxes, Coins, Factory, Hash, Layers, Zap } from 'lucide-react';

/** Compact, data-driven analytics computed from the actor histogram + game data:
 *
 *  - **Foundations**: count of `foundation` category actors, plus an area estimate
 *    treating each foundation as 8×8 m (the standard tile) and a scaled
 *    component for larger pieces. Indicative only — we don't know the exact
 *    foundation variant per actor.
 *  - **Production buildings**: every save actor whose `simplified className`
 *    matches a known building class from the game data, summed.
 *  - **Power draw estimate**: sum of `metadata.powerConsumption` over the matched
 *    production/extractor buildings — what they'd pull at 100% clock.
 *  - **Top production buildings**: count by building class with icon. */

export function SaveStats({ summary }: { summary: ParsedSaveSummary }) {
  const { data } = useGameData();

  const computed = useMemo(() => {
    if (!data) return null;

    // Aggregate building counts. Save actors carry the *buildable* class
    // (`Build_*_C`), so we keep that as the key (categorize() expects it), but
    // look up the descriptor form (`Desc_*_C`) in the game data.
    const buildingByClass = new Map<string, number>();
    for (const row of summary.classCounts) {
      if (data.buildings[buildableToDescriptor(row.className)]) {
        buildingByClass.set(row.className, (buildingByClass.get(row.className) ?? 0) + row.count);
      }
    }
    // Walk the actor list for classes that fell off the top-50 histogram.
    for (const a of summary.actors) {
      const cls = a.className;
      if (buildingByClass.has(cls)) continue;
      if (data.buildings[buildableToDescriptor(cls)]) {
        buildingByClass.set(cls, (buildingByClass.get(cls) ?? 0) + 1);
      }
    }

    // Power draw sums production + extractor (the two categories whose
    // SatBuilding.metadata.powerConsumption is meaningful). Generators have
    // power *production* in the data but it isn't on SatBuilding.metadata, so
    // we don't roll it up here. The manifest lists every recognized building
    // grouped by save category.
    let powerKW = 0;
    let productionTotal = 0;
    const manifest: { className: string; name: string; count: number; mw: number; pcat: ReturnType<typeof categorize> }[] = [];
    for (const [cls, count] of buildingByClass.entries()) {
      const b = data.buildings[buildableToDescriptor(cls)];
      if (!b) continue;
      const pcat = categorize(cls);
      const mwEach = b.metadata?.powerConsumption ?? 0;
      if (pcat === 'production' || pcat === 'extractor') {
        powerKW += mwEach * count;
        productionTotal += count;
      }
      if (pcat === 'production' || pcat === 'extractor' || pcat === 'generator' || pcat === 'power_storage' || pcat === 'item_storage' || pcat === 'fluid_storage') {
        manifest.push({ className: b.className, name: b.name, count, mw: mwEach * count, pcat });
      }
    }
    manifest.sort((a, b) => b.count - a.count);

    // Recipe utilization: walk the actor list (the histogram has no recipe
    // info) and count actors per assigned recipe. Tally active vs idle counts
    // and an "active-only" power draw alongside the original 100%-clock
    // upper-bound estimate.
    const recipeCounts = new Map<string, number>();
    let activeMachines = 0;
    let totalProductionMachines = 0;
    let activePowerKW = 0;
    for (const a of summary.actors) {
      if (a.category !== 'production' && a.category !== 'extractor') continue;
      totalProductionMachines++;
      if (a.currentRecipe) {
        activeMachines++;
        recipeCounts.set(a.currentRecipe, (recipeCounts.get(a.currentRecipe) ?? 0) + 1);
        const b = data.buildings[buildableToDescriptor(a.className)];
        activePowerKW += b?.metadata?.powerConsumption ?? 0;
      }
    }
    const recipeUsage = [...recipeCounts.entries()]
      .map(([className, machines]) => {
        const recipe = data.recipes.find((r) => r.className === className);
        return {
          className,
          machines,
          name: recipe?.name ?? className,
          product: recipe?.products[0]?.item,
          building: recipe?.producedIn[0],
        };
      })
      .sort((a, b) => b.machines - a.machines);

    const foundations = summary.categoryCounts.foundation ?? 0;
    // Standard 8m × 8m tile = 64 m². Wall/roof actors mixed in here too so this
    // is an upper-bound estimate of total floor footprint.
    const estFloorAreaM2 = foundations * 64;

    return {
      foundations,
      estFloorAreaM2,
      powerKW,
      productionTotal,
      manifest: manifest.slice(0, 24),
      totalKnownBuildings: [...buildingByClass.values()].reduce((a, b) => a + b, 0),
      activeMachines,
      totalProductionMachines,
      activePowerKW,
      recipeUsage: recipeUsage.slice(0, 24),
      recipesIdentified: recipeUsage.length,
    };
  }, [summary, data]);

  if (!data) return null;
  if (!computed) return null;

  const activePct = computed.totalProductionMachines > 0
    ? Math.round((computed.activeMachines / computed.totalProductionMachines) * 100)
    : 0;
  const stats = [
    { icon: Factory, label: 'Production buildings', value: fmt(computed.productionTotal) },
    {
      icon: Activity,
      label: 'Active machines',
      value: `${fmt(computed.activeMachines)} / ${fmt(computed.totalProductionMachines)}`,
      sub: `${activePct}% with a recipe assigned`,
    },
    {
      icon: Zap,
      label: 'Estimated power draw',
      value: `${fmt(computed.activePowerKW)} MW`,
      sub: `active · ${fmt(computed.powerKW)} MW @ full clock`,
    },
    { icon: Layers, label: 'Foundations', value: fmt(computed.foundations), sub: `≈ ${fmt(computed.estFloorAreaM2)} m²` },
    { icon: Boxes, label: 'Logistics network', value: fmt((summary.categoryCounts.conveyor ?? 0) + (summary.categoryCounts.pipeline ?? 0) + (summary.categoryCounts.power_grid ?? 0)), sub: 'conveyors · pipes · power' },
    { icon: Hash, label: 'Total placed actors', value: fmt(summary.actorCount) },
    { icon: Coins, label: 'Identified buildings', value: fmt(computed.totalKnownBuildings) },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Factory snapshot" subtitle="Derived from the save's actor histogram cross-referenced with the game data." />
        <CardBody className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-7">
          {stats.map((s) => (
            <StatTile key={s.label} icon={s.icon} label={s.label} value={s.value} sub={s.sub} tone="accent" compact />
          ))}
        </CardBody>
      </Card>

      {computed.recipeUsage.length > 0 && (
        <Card>
          <CardHeader
            title="Recipe utilization"
            subtitle={`${fmt(computed.recipesIdentified)} distinct recipes assigned across ${fmt(computed.activeMachines)} machines.`}
          />
          <CardBody>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {computed.recipeUsage.map((r) => (
                <li
                  key={r.className}
                  className="flex items-center gap-3 rounded-md border border-ficsit-border bg-ficsit-panel2 px-3 py-2"
                >
                  {r.product ? (
                    <ItemIcon className={r.product} size={28} cls="rounded-md p-0.5 bg-ficsit-panel" />
                  ) : (
                    <div className="h-7 w-7 shrink-0 rounded-md border border-dashed border-ficsit-border bg-ficsit-panel2/40" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{r.name}</div>
                    {r.building && (
                      <div className="text-[10px] text-ficsit-subtle">
                        {data.buildings[r.building]?.name ?? r.building}
                      </div>
                    )}
                  </div>
                  <div className="font-mono text-lg text-ficsit-accent">{fmt(r.machines)}</div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {computed.manifest.length > 0 && (
        <Card>
          <CardHeader
            title="Building manifest"
            subtitle="Every recognized production, extractor, generator, and storage building this save has placed."
          />
          <CardBody>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {computed.manifest.map((b) => (
                <li
                  key={b.className}
                  className="flex items-center gap-3 rounded-md border border-ficsit-border bg-ficsit-panel2 px-3 py-2"
                >
                  <ItemIcon className={b.className} kind="building" size={28} cls="rounded-md p-0.5 bg-ficsit-panel" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{b.name}</div>
                    {b.mw > 0 && <div className="text-[10px] text-ficsit-subtle">{fmt(b.mw)} MW</div>}
                  </div>
                  <div className="font-mono text-lg text-ficsit-accent">{fmt(b.count)}</div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

