'use client';
import { useMemo } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { useGameData } from '@/lib/data/use-data';
import { fmt } from '@/lib/utils';
import type { ParsedSaveSummary } from '@/lib/save/types';
import { buildableToDescriptor, categorize } from '@/lib/save/categorize';
import { Boxes, Coins, Factory, Hash, Layers, Zap } from 'lucide-react';

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

    let powerKW = 0;
    const productionList: { className: string; name: string; count: number; mw: number }[] = [];
    for (const [cls, count] of buildingByClass.entries()) {
      const b = data.buildings[buildableToDescriptor(cls)];
      if (!b) continue;
      const pcat = categorize(cls);
      const mwEach = b.metadata?.powerConsumption ?? 0;
      if (pcat === 'production' || pcat === 'extractor') {
        powerKW += mwEach * count;
      }
      if (pcat === 'production' || pcat === 'extractor' || pcat === 'storage') {
        productionList.push({ className: b.className, name: b.name, count, mw: mwEach * count });
      }
    }
    productionList.sort((a, b) => b.count - a.count);

    const foundations = summary.categoryCounts.foundation ?? 0;
    // Standard 8m × 8m tile = 64 m². Wall/roof actors mixed in here too so this
    // is an upper-bound estimate of total floor footprint.
    const estFloorAreaM2 = foundations * 64;

    return {
      foundations,
      estFloorAreaM2,
      powerKW,
      productionTotal: productionList.reduce((a, p) => a + p.count, 0),
      productionList: productionList.slice(0, 18),
      totalKnownBuildings: [...buildingByClass.values()].reduce((a, b) => a + b, 0),
    };
  }, [summary, data]);

  if (!data) return null;
  if (!computed) return null;

  const stats = [
    { icon: Factory, label: 'Production buildings', value: fmt(computed.productionTotal) },
    { icon: Zap, label: 'Estimated power draw', value: `${fmt(computed.powerKW)} MW`, sub: '@ 100% clock' },
    { icon: Layers, label: 'Foundations', value: fmt(computed.foundations), sub: `≈ ${fmt(computed.estFloorAreaM2)} m²` },
    { icon: Boxes, label: 'Belts + pipes + power', value: fmt((summary.categoryCounts.belt ?? 0) + (summary.categoryCounts.pipe ?? 0) + (summary.categoryCounts.power ?? 0)) },
    { icon: Hash, label: 'Total placed actors', value: fmt(summary.actorCount) },
    { icon: Coins, label: 'Identified buildings', value: fmt(computed.totalKnownBuildings) },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Factory snapshot" subtitle="Derived from the save's actor histogram cross-referenced with the game data." />
        <CardBody className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {stats.map((s) => (
            <StatTile key={s.label} icon={s.icon} label={s.label} value={s.value} sub={s.sub} tone="accent" compact />
          ))}
        </CardBody>
      </Card>

      {computed.productionList.length > 0 && (
        <Card>
          <CardHeader
            title="Building manifest"
            subtitle="Every recognized production / extraction / storage building this save has placed."
          />
          <CardBody>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {computed.productionList.map((b) => (
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

