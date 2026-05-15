'use client';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ItemBadge } from '@/components/ui/ItemBadge';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { useGameData } from '@/lib/data/use-data';
import { fmt } from '@/lib/utils';
import { solveFactory, type FactoryPlan } from '@/lib/solver/factory-solver';
import { Play, Plus, Trash2 } from 'lucide-react';

interface Row {
  item: string;
  rate: number;
}

const DEFAULT_SUPPLY_CAPS = [
  ['Desc_OreIron_C', 480],
  ['Desc_OreCopper_C', 240],
  ['Desc_Stone_C', 240],
  ['Desc_Coal_C', 240],
  ['Desc_LiquidOil_C', 240],
  ['Desc_Water_C', 1200],
] as const;

export default function CalculatorPage() {
  const { data, loading } = useGameData();
  const [supplies, setSupplies] = useState<Row[]>(
    DEFAULT_SUPPLY_CAPS.map(([item, rate]) => ({ item, rate })),
  );
  const [targets, setTargets] = useState<Row[]>([{ item: 'Desc_IronPlate_C', rate: 0 }]);
  const [allowAlternates, setAllowAlternates] = useState(false);
  const [plan, setPlan] = useState<FactoryPlan | null>(null);

  const allItems = useMemo(() => {
    if (!data) return [];
    return Object.values(data.items).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const rawItems = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.resources).map((k) => data.items[k]).filter(Boolean);
  }, [data]);

  function run() {
    if (!data) return;
    const sup = supplies.filter((s) => s.item && s.rate > 0);
    const tgt = targets.filter((t) => t.item);
    setPlan(
      solveFactory(
        data,
        sup.map((s) => ({ item: s.item, ratePerMin: s.rate })),
        tgt.map((t) => ({
          item: t.item,
          minRatePerMin: t.rate > 0 ? t.rate : undefined,
          weight: 1,
        })),
        { includeAlternates: allowAlternates },
      ),
    );
  }

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Production Calculator" subtitle="Loading game data…" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Production Calculator"
        subtitle="Linear-programming optimization over every machine recipe."
        actions={
          <Button onClick={run}>
            <Play className="h-4 w-4" /> Optimize
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Available Inputs"
              subtitle="Items/min you can supply (raw or otherwise). Caps the solver."
            />
            <CardBody className="space-y-2">
              {supplies.map((row, idx) => (
                <RateRow
                  key={idx}
                  row={row}
                  options={rawItems.length ? rawItems : allItems}
                  unit="/m"
                  onChange={(r) =>
                    setSupplies((s) => s.map((x, i) => (i === idx ? r : x)))
                  }
                  onRemove={() => setSupplies((s) => s.filter((_, i) => i !== idx))}
                />
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSupplies((s) => [...s, { item: '', rate: 0 }])}
              >
                <Plus className="h-3.5 w-3.5" /> Add input
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Targets"
              subtitle="What to produce. Rate=0 → maximize. Rate>0 → produce at least that much, then maximize."
            />
            <CardBody className="space-y-2">
              {targets.map((row, idx) => (
                <RateRow
                  key={idx}
                  row={row}
                  options={allItems}
                  unit="/m min"
                  placeholderRate="0 = max"
                  onChange={(r) =>
                    setTargets((s) => s.map((x, i) => (i === idx ? r : x)))
                  }
                  onRemove={() => setTargets((s) => s.filter((_, i) => i !== idx))}
                />
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTargets((s) => [...s, { item: '', rate: 0 }])}
              >
                <Plus className="h-3.5 w-3.5" /> Add target
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Options" />
            <CardBody>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowAlternates}
                  onChange={(e) => setAllowAlternates(e.target.checked)}
                  className="h-4 w-4 accent-ficsit-accent"
                />
                Allow alternate recipes
              </label>
            </CardBody>
          </Card>
        </div>

        <PlanView plan={plan} />
      </div>
    </>
  );
}

function RateRow({
  row,
  options,
  unit,
  placeholderRate,
  onChange,
  onRemove,
}: {
  row: Row;
  options: { className: string; name: string }[];
  unit: string;
  placeholderRate?: string;
  onChange: (r: Row) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={row.item}
        onChange={(e) => onChange({ ...row, item: e.target.value })}
        className="h-9 flex-1 rounded-md border border-ficsit-border bg-ficsit-panel2 px-2 text-sm"
      >
        <option value="">— select item —</option>
        {options.map((o) => (
          <option key={o.className} value={o.className}>{o.name}</option>
        ))}
      </select>
      <div className="relative w-32">
        <Input
          type="number"
          min={0}
          step="any"
          value={row.rate || ''}
          placeholder={placeholderRate}
          onChange={(e) => onChange({ ...row, rate: Number(e.target.value) || 0 })}
          className="pr-8 text-right font-mono"
        />
        <span className="pointer-events-none absolute right-2 top-2 text-[10px] uppercase text-ficsit-subtle">
          {unit}
        </span>
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function PlanView({ plan }: { plan: FactoryPlan | null }) {
  const { data } = useGameData();

  if (!plan) {
    return (
      <Card>
        <CardBody className="text-center text-sm text-ficsit-subtle py-12">
          Set inputs and targets, then press <span className="text-ficsit-text font-medium">Optimize</span>.
          <br />
          The solver maximizes weighted output subject to your supply limits.
        </CardBody>
      </Card>
    );
  }

  if (plan.status !== 'optimal') {
    return (
      <Card>
        <CardBody>
          <Badge tone="bad">{plan.status}</Badge>
          <p className="mt-2 text-sm text-ficsit-subtle">{plan.message ?? 'No feasible plan.'}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Plan Summary"
          right={<Badge tone="good">Optimal</Badge>}
        />
        <CardBody className="grid grid-cols-3 gap-4">
          <Stat label="Total Machines" value={fmt(plan.totalMachines, 1)} />
          <Stat label="Total Power" value={`${fmt(plan.totalPowerKW)} MW`} />
          <Stat label="Recipe Lines" value={String(plan.lines.length)} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Outputs" />
        <CardBody className="flex flex-wrap gap-2">
          {plan.outputs.map((o) => (
            <div key={o.item} className="flex items-center gap-1 rounded-md border border-ficsit-good/30 bg-ficsit-good/10 px-2 py-1 text-xs">
              <span className="font-mono text-ficsit-good">{fmt(o.ratePerMin)}/m</span>
              <ItemBadge item={o.item} />
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Consumed Inputs" />
        <CardBody className="flex flex-wrap gap-2">
          {plan.consumedInputs.map((o) => (
            <div key={o.item} className="flex items-center gap-1 rounded-md border border-ficsit-border bg-ficsit-panel2 px-2 py-1 text-xs">
              <span className="font-mono">{fmt(o.ratePerMin)}/m</span>
              <ItemBadge item={o.item} />
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Building Manifest" />
        <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {plan.buildingsByType.map((b) => (
            <div
              key={b.building}
              className="flex items-center gap-3 rounded-md border border-ficsit-border bg-ficsit-panel2 px-3 py-2"
            >
              <ItemIcon className={b.building} kind="building" size={32} cls="rounded-md p-0.5 bg-ficsit-panel" />
              <div className="flex-1 text-sm">{data?.buildings[b.building]?.name ?? b.building}</div>
              <div className="text-right">
                <div className="font-mono text-lg text-ficsit-accent">{fmt(b.machines, 1)}</div>
                <div className="text-[10px] uppercase tracking-wide text-ficsit-subtle">machines</div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recipe Lines" subtitle="Machines at 100% clock. Overclock to round up." />
        <CardBody>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-ficsit-subtle">
                <th className="text-left py-2">Recipe</th>
                <th className="text-left">Building</th>
                <th className="text-right">Machines</th>
                <th className="text-right">Power</th>
              </tr>
            </thead>
            <tbody>
              {plan.lines
                .slice()
                .sort((a, b) => b.machines - a.machines)
                .map((l, i) => (
                  <tr key={i} className="border-t border-ficsit-border">
                    <td className="py-1.5">
                      <div className="flex items-center gap-2">
                        <ItemIcon
                          className={l.recipe.products[0]?.item ?? ''}
                          size={22}
                          cls="rounded-sm bg-ficsit-panel2 p-0.5"
                        />
                        <span>{l.recipe.name}</span>
                        {l.recipe.alternate && <Badge tone="warn">Alt</Badge>}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <ItemIcon className={l.building} kind="building" size={18} />
                        {data?.buildings[l.building]?.name ?? l.building}
                      </div>
                    </td>
                    <td className="text-right font-mono">{fmt(l.machines, 2)}</td>
                    <td className="text-right font-mono">{fmt(l.powerKW)} MW</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ficsit-subtle">{label}</div>
      <div className="mt-1 font-mono text-2xl text-ficsit-accent">{value}</div>
    </div>
  );
}
