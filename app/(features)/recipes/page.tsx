'use client';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { useGameData } from '@/lib/data/use-data';
import { fmt, ratePerMin, cn } from '@/lib/utils';
import { matchesQuery } from '@/lib/utils/normalize';
import type { SatRecipe } from '@/lib/data/types';
import { RecipeDetail } from '@/components/recipes/RecipeDetail';
import { ArrowRight, Search, ChevronRight } from 'lucide-react';

type RecipeFilter = 'all' | 'milestone' | 'mam' | 'alternate';

const FILTER_LABEL: Record<RecipeFilter, string> = {
  all: 'All',
  milestone: 'Milestone',
  mam: 'MAM',
  alternate: 'Hard Drive',
};

export default function RecipesPage() {
  const { data, loading } = useGameData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RecipeFilter>('all');
  const [building, setBuilding] = useState<string | 'all'>('all');
  const [selected, setSelected] = useState<SatRecipe | null>(null);

  const buildings = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const r of data.recipes) for (const b of r.producedIn) set.add(b);
    return [...set]
      .map((b) => ({ className: b, name: data.buildings[b]?.name ?? b }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim();
    return data.recipes.filter((r) => {
      if (filter !== 'all') {
        const t = r.unlockType ?? (r.alternate ? 'alternate' : 'milestone');
        if (t !== filter) return false;
      }
      if (building !== 'all' && !r.producedIn.includes(building)) return false;
      if (!q) return true;
      if (matchesQuery(r.name, q)) return true;
      if (r.products.some((p) => matchesQuery(data.items[p.item]?.name ?? '', q))) return true;
      if (r.ingredients.some((i) => matchesQuery(data.items[i.item]?.name ?? '', q))) return true;
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
            {(['all', 'milestone', 'mam', 'alternate'] as RecipeFilter[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {FILTER_LABEL[f]}
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
            <RecipeCard key={r.className} recipe={r} onOpen={() => setSelected(r)} />
          ))}
          {!loading && filtered.length === 0 && (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardBody className="text-center text-sm text-ficsit-subtle">No recipes match.</CardBody>
            </Card>
          )}
        </div>
      </div>

      <RecipeDetail
        recipe={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onJumpToRecipe={(r) => setSelected(r)}
      />
    </>
  );
}

function RecipeCard({ recipe, onOpen }: { recipe: SatRecipe; onOpen: () => void }) {
  const { data } = useGameData();
  const building = recipe.producedIn[0];
  const bName = data?.buildings[building]?.name ?? building;
  const power = data?.buildings[building]?.metadata?.powerConsumption ?? 0;
  const primaryProduct = recipe.products[0];

  return (
    <button
      onClick={onOpen}
      className={cn(
        'group block w-full text-left rounded-lg border border-ficsit-border bg-ficsit-panel transition-all',
        'hover:border-ficsit-accent/50 hover:shadow-lg hover:shadow-ficsit-accent/5',
      )}
    >
      <div className="flex items-start gap-3 p-3 pb-2">
        <ItemIcon
          className={primaryProduct?.item ?? ''}
          size={44}
          cls="rounded-md bg-ficsit-panel2 p-1"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate font-semibold">{recipe.name}</div>
            <ChevronRight className="h-4 w-4 shrink-0 text-ficsit-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ficsit-accent" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {recipe.unlockType === 'alternate' && <Badge tone="warn">Hard Drive</Badge>}
            {recipe.unlockType === 'mam' && <Badge tone="accent">MAM</Badge>}
            <Badge tone="muted">
              <ItemIcon className={building} kind="building" size={12} /> {bName}
            </Badge>
            <Badge tone="muted">{recipe.time}s</Badge>
            {recipe.isVariablePower && recipe.minPower != null && recipe.maxPower != null ? (
              <Badge tone="accent" title="Variable-power recipe — load oscillates between these values">
                {fmt(recipe.minPower)}–{fmt(recipe.maxPower)} MW
              </Badge>
            ) : (
              power > 0 && <Badge tone="muted">{fmt(power)} MW</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-ficsit-border/60 p-3 pt-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="space-y-1">
            {recipe.ingredients.map((i) => (
              <Flow key={i.item} item={i.item} rate={ratePerMin(i.amount, recipe.time)} kind="in" />
            ))}
          </div>
          <ArrowRight className="h-4 w-4 text-ficsit-subtle" />
          <div className="space-y-1">
            {recipe.products.map((p) => (
              <Flow key={p.item} item={p.item} rate={ratePerMin(p.amount, recipe.time)} kind="out" />
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

function Flow({ item, rate, kind }: { item: string; rate: number; kind: 'in' | 'out' }) {
  const { data } = useGameData();
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <ItemIcon className={item} size={20} cls="rounded-sm bg-ficsit-panel2 p-0.5" />
      <span className={cn('font-mono', kind === 'out' ? 'text-ficsit-good' : 'text-ficsit-subtle')}>
        {fmt(rate)}/m
      </span>
      <span className="truncate text-ficsit-subtle">{data?.items[item]?.name}</span>
    </div>
  );
}
