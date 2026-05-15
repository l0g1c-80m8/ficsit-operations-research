'use client';
import { useMemo } from 'react';
import { ArrowRight, FlaskConical, Wrench, Zap, BookOpen, Factory } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { useGameData } from '@/lib/data/use-data';
import { fmt, ratePerMin } from '@/lib/utils';
import type { SatRecipe } from '@/lib/data/types';

export function RecipeDetail({
  recipe,
  open,
  onClose,
  onJumpToRecipe,
}: {
  recipe: SatRecipe | null;
  open: boolean;
  onClose: () => void;
  onJumpToRecipe: (r: SatRecipe) => void;
}) {
  const { data } = useGameData();

  const building = recipe?.producedIn[0];
  const bld = building ? data?.buildings[building] : undefined;
  const power = bld?.metadata?.powerConsumption ?? 0;

  const sameProductRecipes = useMemo(() => {
    if (!data || !recipe) return [];
    const productClasses = new Set(recipe.products.map((p) => p.item));
    return data.recipes
      .filter((r) => r.className !== recipe.className && r.products.some((p) => productClasses.has(p.item)))
      .slice(0, 30);
  }, [data, recipe]);

  const consumers = useMemo(() => {
    if (!data || !recipe) return [];
    const productClasses = new Set(recipe.products.map((p) => p.item));
    return data.recipes
      .filter((r) => r.ingredients.some((i) => productClasses.has(i.item)))
      .slice(0, 30);
  }, [data, recipe]);

  const producers = useMemo(() => {
    if (!data || !recipe) return [];
    const ingClasses = new Set(recipe.ingredients.map((i) => i.item));
    return data.recipes
      .filter((r) => r.products.some((p) => ingClasses.has(p.item)))
      .slice(0, 30);
  }, [data, recipe]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="w-[720px]"
      title={
        recipe && (
          <div className="flex items-center gap-3">
            <ItemIcon
              className={recipe.products[0]?.item ?? ''}
              size={36}
              cls="rounded-md bg-ficsit-panel2 p-1"
            />
            <div>
              <h2 className="text-lg font-semibold">{recipe.name}</h2>
              <div className="mt-0.5 flex items-center gap-1.5">
                {recipe.alternate && <Badge tone="warn">Alternate</Badge>}
                <Badge tone="muted">{bld?.name ?? building}</Badge>
                <Badge tone="muted">{recipe.time}s cycle</Badge>
                {power > 0 && <Badge tone="muted">{fmt(power)} MW</Badge>}
              </div>
            </div>
          </div>
        )
      }
    >
      {recipe && (
        <div className="space-y-4 p-5">
          <Card>
            <CardHeader title="Flow" subtitle="Per cycle and per minute." />
            <CardBody>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr]">
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-ficsit-subtle">
                    <FlaskConical className="h-3.5 w-3.5" /> Inputs
                  </div>
                  <ul className="space-y-1.5">
                    {recipe.ingredients.map((i) => (
                      <FlowRow
                        key={i.item}
                        item={i.item}
                        perCycle={i.amount}
                        perMin={ratePerMin(i.amount, recipe.time)}
                        tone="muted"
                      />
                    ))}
                  </ul>
                </div>
                <div className="hidden self-center md:block">
                  <ArrowRight className="h-6 w-6 text-ficsit-accent" />
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-ficsit-subtle">
                    <Wrench className="h-3.5 w-3.5" /> Outputs
                  </div>
                  <ul className="space-y-1.5">
                    {recipe.products.map((p) => (
                      <FlowRow
                        key={p.item}
                        item={p.item}
                        perCycle={p.amount}
                        perMin={ratePerMin(p.amount, recipe.time)}
                        tone="good"
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>

          {bld && (
            <Card>
              <CardHeader title="Producing Apparatus" />
              <CardBody className="flex items-center gap-3">
                <ItemIcon
                  className={building!}
                  kind="building"
                  size={48}
                  cls="rounded-md bg-ficsit-panel2 p-1"
                />
                <div className="flex-1">
                  <div className="font-medium">{bld.name}</div>
                  <p className="line-clamp-2 text-xs text-ficsit-subtle">{bld.description}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-xs text-ficsit-subtle">
                    <Zap className="h-3.5 w-3.5" /> Power
                  </div>
                  <div className="font-mono text-ficsit-accent">{fmt(power)} MW</div>
                </div>
              </CardBody>
            </Card>
          )}

          {sameProductRecipes.length > 0 && (
            <RelatedSection
              title="Other Recipes That Make The Same Output"
              icon={<BookOpen className="h-4 w-4" />}
              recipes={sameProductRecipes}
              onPick={onJumpToRecipe}
            />
          )}

          {consumers.length > 0 && (
            <RelatedSection
              title="Where This Output Is Used"
              icon={<Factory className="h-4 w-4" />}
              recipes={consumers}
              onPick={onJumpToRecipe}
            />
          )}

          {producers.length > 0 && (
            <RelatedSection
              title="Where Inputs Come From"
              icon={<Factory className="h-4 w-4" />}
              recipes={producers}
              onPick={onJumpToRecipe}
            />
          )}
        </div>
      )}
    </Drawer>
  );
}

function FlowRow({
  item,
  perCycle,
  perMin,
  tone,
}: {
  item: string;
  perCycle: number;
  perMin: number;
  tone: 'good' | 'muted';
}) {
  const { data } = useGameData();
  const name = data?.items[item]?.name ?? item;
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-ficsit-border bg-ficsit-panel2 px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        <ItemIcon className={item} size={28} cls="rounded-md p-0.5 bg-ficsit-panel" />
        <span className="truncate text-sm">{name}</span>
      </div>
      <div className="text-right font-mono text-xs">
        <div className={tone === 'good' ? 'text-ficsit-good' : 'text-ficsit-text'}>
          {fmt(perMin)} <span className="text-ficsit-subtle">/m</span>
        </div>
        <div className="text-ficsit-subtle">
          {perCycle} <span className="text-[10px]">×cycle</span>
        </div>
      </div>
    </li>
  );
}

function RelatedSection({
  title,
  icon,
  recipes,
  onPick,
}: {
  title: string;
  icon: React.ReactNode;
  recipes: SatRecipe[];
  onPick: (r: SatRecipe) => void;
}) {
  const { data } = useGameData();
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            {icon} {title}
          </span>
        }
        subtitle={`${recipes.length} recipe${recipes.length === 1 ? '' : 's'}`}
      />
      <CardBody className="space-y-1">
        {recipes.map((r) => (
          <button
            key={r.className}
            onClick={() => onPick(r)}
            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-ficsit-panel2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <ItemIcon
                className={r.products[0]?.item ?? ''}
                size={22}
                cls="rounded-sm bg-ficsit-panel2 p-0.5"
              />
              <span className="truncate">{r.name}</span>
              {r.alternate && <Badge tone="warn">Alt</Badge>}
            </div>
            <span className="text-xs text-ficsit-subtle">
              {data?.buildings[r.producedIn[0]]?.name}
            </span>
          </button>
        ))}
      </CardBody>
    </Card>
  );
}
