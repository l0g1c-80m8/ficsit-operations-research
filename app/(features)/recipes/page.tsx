'use client';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ItemBadge } from '@/components/ui/ItemBadge';
import { useGameData } from '@/lib/data/use-data';
import { fmt, ratePerMin } from '@/lib/utils';
import type { SatRecipe } from '@/lib/data/types';
import { ArrowRight, Search } from 'lucide-react';

type RecipeFilter = 'all' | 'standard' | 'alternate';

export default function RecipesPage() {
  const { data, loading } = useGameData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RecipeFilter>('all');
  const [building, setBuilding] = useState<string | 'all'>('all');

  const buildings = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const r of data.recipes) for (const b of r.producedIn) set.add(b);
    return [...set].map((b) => ({ className: b, name: data.buildings[b]?.name ?? b })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.recipes.filter((r) => {
      if (filter === 'standard' && r.alternate) return false;
      if (filter === 'alternate' && !r.alternate) return false;
      if (building !== 'all' && !r.producedIn.includes(building)) return false;
      if (!q) return true;
      if (r.name.toLowerCase().includes(q)) return true;
      if (r.products.some((p) => data.items[p.item]?.name.toLowerCase().includes(q))) return true;
      if (r.ingredients.some((i) => data.items[i.item]?.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [data, query, filter, building]);

  return (
    <>
      <PageHeader
        title="Recipe Knowledge Base"
        subtitle={loading ? 'Spinning up the FICSIT recipe archive…' : `${filtered.length} recipes`}
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-ficsit-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipe, ingredient, product…"
              className="pl-8"
            />
          </div>

          <div className="flex rounded-md border border-ficsit-border bg-ficsit-panel2 p-0.5">
            {(['all', 'standard', 'alternate'] as RecipeFilter[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>

          <select
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            className="h-9 rounded-md border border-ficsit-border bg-ficsit-panel2 px-2 text-sm"
          >
            <option value="all">All buildings</option>
            {buildings.map((b) => (
              <option key={b.className} value={b.className}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <RecipeCard key={r.className} recipe={r} />
          ))}
          {!loading && filtered.length === 0 && (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardBody className="text-center text-sm text-ficsit-subtle">No recipes match.</CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function RecipeCard({ recipe }: { recipe: SatRecipe }) {
  const { data } = useGameData();
  const building = recipe.producedIn[0];
  const bName = data?.buildings[building]?.name ?? building;
  const power = data?.buildings[building]?.metadata?.powerConsumption ?? 0;
  return (
    <Card>
      <CardHeader
        title={recipe.name}
        subtitle={`${bName} · ${recipe.time}s`}
        right={
          <div className="flex items-center gap-1">
            {recipe.alternate && <Badge tone="warn">Alternate</Badge>}
            {power > 0 && <Badge tone="muted">{fmt(power)} MW</Badge>}
          </div>
        }
      />
      <CardBody className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {recipe.ingredients.map((i) => (
            <div key={i.item} className="flex items-center gap-1">
              <span className="font-mono text-xs text-ficsit-subtle">{fmt(ratePerMin(i.amount, recipe.time))}/m</span>
              <ItemBadge item={i.item} />
            </div>
          ))}
          <ArrowRight className="h-4 w-4 text-ficsit-subtle" />
          {recipe.products.map((p) => (
            <div key={p.item} className="flex items-center gap-1">
              <span className="font-mono text-xs text-ficsit-good">{fmt(ratePerMin(p.amount, recipe.time))}/m</span>
              <ItemBadge item={p.item} />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
