'use client';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { useGameData } from '@/lib/data/use-data';
import { fmt } from '@/lib/utils';
import { matchesQuery } from '@/lib/utils/normalize';
import type { SatBuilding, SatRecipe } from '@/lib/data/types';
import { Search, Factory, Drill, Zap, Wrench } from 'lucide-react';

type BuildingCategory = 'production' | 'extractor' | 'generator' | 'other';

interface BuildingEntry {
  building: SatBuilding;
  category: BuildingCategory;
  recipeCount: number;
  recipes: SatRecipe[];
  power: number;
  perUnitMW?: number;
  generatorMW?: number;
}

const CATEGORY_LABEL: Record<BuildingCategory, string> = {
  production: 'Production',
  extractor: 'Extractors',
  generator: 'Generators & Power',
  other: 'Support',
};

const CATEGORY_ICON: Record<BuildingCategory, React.ComponentType<{ className?: string }>> = {
  production: Factory,
  extractor: Drill,
  generator: Zap,
  other: Wrench,
};

export default function BuildingsPage() {
  const { data, loading } = useGameData();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<BuildingCategory | 'all'>('all');

  const entries = useMemo<BuildingEntry[]>(() => {
    if (!data) return [];
    const minerClasses = new Set(data.miners.map((m) => m.className));
    const genByClass = new Map(data.generators.map((g) => [g.className, g]));
    const buildingRecipes = new Map<string, SatRecipe[]>();
    for (const r of data.recipes) {
      for (const b of r.producedIn) {
        if (!buildingRecipes.has(b)) buildingRecipes.set(b, []);
        buildingRecipes.get(b)!.push(r);
      }
    }
    return Object.values(data.buildings)
      .map((b): BuildingEntry => {
        const recipes = buildingRecipes.get(b.className) ?? [];
        let category: BuildingCategory = 'other';
        if (recipes.length > 0) category = 'production';
        else if (minerClasses.has(b.className) || /Pump|Extractor|Pressur/i.test(b.className)) category = 'extractor';
        else if (genByClass.has(b.className) || /Generator|AlienPower/i.test(b.className)) category = 'generator';
        return {
          building: b,
          category,
          recipeCount: recipes.length,
          recipes,
          power: b.metadata?.powerConsumption ?? 0,
          generatorMW: genByClass.get(b.className)?.powerProduction,
        };
      })
      .sort((a, b) => {
        const ord = { production: 0, extractor: 1, generator: 2, other: 3 } as const;
        if (ord[a.category] !== ord[b.category]) return ord[a.category] - ord[b.category];
        return a.building.name.localeCompare(b.building.name);
      });
  }, [data]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (cat !== 'all' && e.category !== cat) return false;
      if (!query.trim()) return true;
      if (matchesQuery(e.building.name, query)) return true;
      if (matchesQuery(e.building.description, query)) return true;
      return false;
    });
  }, [entries, query, cat]);

  const counts = useMemo(() => {
    const c = { production: 0, extractor: 0, generator: 0, other: 0 } as Record<BuildingCategory, number>;
    for (const e of entries) c[e.category]++;
    return c;
  }, [entries]);

  return (
    <>
      <PageHeader
        title="Buildings"
        subtitle={loading ? 'Spinning up…' : `${entries.length} buildings · ${filtered.length} shown`}
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-ficsit-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or description…"
              className="pl-8"
            />
          </div>

          <div className="flex rounded-md border border-ficsit-border bg-ficsit-panel2 p-0.5">
            {(['all', 'production', 'extractor', 'generator', 'other'] as const).map((c) => (
              <Button
                key={c}
                variant={cat === c ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setCat(c)}
                className="capitalize"
              >
                {c === 'all'
                  ? `All (${entries.length})`
                  : `${CATEGORY_LABEL[c as BuildingCategory]} (${counts[c as BuildingCategory]})`}
              </Button>
            ))}
          </div>
        </div>

        {(['production', 'extractor', 'generator', 'other'] as BuildingCategory[]).map((section) => {
          if (cat !== 'all' && cat !== section) return null;
          const sectionEntries = filtered.filter((e) => e.category === section);
          if (sectionEntries.length === 0) return null;
          const Icon = CATEGORY_ICON[section];
          return (
            <section key={section}>
              <h2 className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-widest text-ficsit-subtle">
                <Icon className="h-3.5 w-3.5" /> {CATEGORY_LABEL[section]} · {sectionEntries.length}
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sectionEntries.map((e) => <BuildingCard key={e.building.className} entry={e} />)}
              </div>
            </section>
          );
        })}

        {filtered.length === 0 && (
          <Card>
            <CardBody className="text-center text-sm text-ficsit-subtle">No buildings match.</CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

function BuildingCard({ entry }: { entry: BuildingEntry }) {
  const { building, category, recipes, power, generatorMW } = entry;
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <ItemIcon className={building.className} kind="building" size={28} cls="rounded-md bg-ficsit-panel2 p-0.5" />
            <span>{building.name}</span>
          </span>
        }
        right={
          <div className="flex items-center gap-1">
            {category === 'production' && <Badge tone="accent">{recipes.length} recipe{recipes.length === 1 ? '' : 's'}</Badge>}
            {category === 'generator' && generatorMW && <Badge tone="good">{fmt(generatorMW)} MW</Badge>}
            {category !== 'generator' && power > 0 && <Badge tone="muted">{fmt(power)} MW draw</Badge>}
          </div>
        }
      />
      <CardBody className="space-y-2">
        <p className="line-clamp-3 text-xs text-ficsit-subtle">{building.description}</p>
        {category === 'production' && recipes.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-ficsit-subtle hover:text-ficsit-text">
              show {recipes.length} recipe{recipes.length === 1 ? '' : 's'}
            </summary>
            <ul className="mt-2 space-y-1">
              {recipes.slice().sort((a, b) => Number(a.alternate) - Number(b.alternate)).map((r) => (
                <li key={r.className} className="flex items-center justify-between gap-2">
                  <span className="truncate">{r.name}</span>
                  {r.alternate && <Badge tone="warn">Alt</Badge>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardBody>
    </Card>
  );
}
