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
import { useLocalStorage } from '@/lib/storage/use-local-storage';
import {
  CALC_CURRENT_KEY,
  CALC_HISTORY_KEY,
  DEFAULT_INPUTS,
  summarizePlan,
  type CalcInputs,
  type CalcRow,
  type CalcSaveEntry,
} from '@/lib/calculator/types';
import { CalcHistory } from '@/components/calculator/CalcHistory';
import { PlanGraph } from '@/components/calculator/PlanGraph';
import { Economics } from '@/components/calculator/Economics';
import { Activity, BarChart3, History, ListTree, Network, Play, Plus, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CalculatorPage() {
  const { data, loading } = useGameData();
  const [inputs, setInputs] = useLocalStorage<CalcInputs>(CALC_CURRENT_KEY, DEFAULT_INPUTS);
  const [history, setHistory] = useLocalStorage<CalcSaveEntry[]>(CALC_HISTORY_KEY, []);
  const [plan, setPlan] = useState<FactoryPlan | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const allItems = useMemo(() => {
    if (!data) return [];
    return Object.values(data.items).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  const rawItems = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.resources).map((k) => data.items[k]).filter(Boolean);
  }, [data]);

  function setSupplies(updater: (s: CalcRow[]) => CalcRow[]) {
    setInputs((i) => ({ ...i, supplies: updater(i.supplies) }));
  }
  function setTargets(updater: (s: CalcRow[]) => CalcRow[]) {
    setInputs((i) => ({ ...i, targets: updater(i.targets) }));
  }

  function run() {
    if (!data) return;
    const sup = inputs.supplies.filter((s) => s.item && s.rate > 0);
    const tgt = inputs.targets.filter((t) => t.item);
    const result = solveFactory(
      data,
      sup.map((s) => ({ item: s.item, ratePerMin: s.rate })),
      tgt.map((t) => ({
        item: t.item,
        minRatePerMin: t.rate > 0 ? t.rate : undefined,
        weight: 1,
      })),
      {
        includeAlternates: inputs.allowAlternates,
        autoSupplyRawResources: inputs.autoSupplyRaw ?? true,
      },
    );
    setPlan(result);
  }

  function suggestSaveName(): string {
    const t = inputs.targets.find((x) => x.item);
    const itemName = t ? data?.items[t.item]?.name : null;
    if (itemName) return `${itemName} plan`;
    return `Plan ${new Date().toLocaleString()}`;
  }

  function savePlan() {
    const suggested = suggestSaveName();
    const name = window.prompt('Name this plan:', suggested);
    if (!name || !name.trim()) return;
    const entry: CalcSaveEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      savedAt: Date.now(),
      inputs,
      summary: plan ? summarizePlan(plan) : null,
    };
    setHistory((h) => [entry, ...h]);
  }

  function loadEntry(entry: CalcSaveEntry) {
    setInputs(entry.inputs);
    setPlan(null);
    setShowHistory(false);
  }

  function deleteEntry(id: string) {
    setHistory((h) => h.filter((e) => e.id !== id));
  }

  function clearHistory() {
    if (!confirm('Delete all saved plans? This cannot be undone.')) return;
    setHistory([]);
  }

  function exportHistory() {
    const blob = new Blob(
      [
        JSON.stringify(
          { exportedAt: new Date().toISOString(), schema: 'ficsit.calculator.history.v1', history },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ficsit-calculator-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importHistory(file: File) {
    try {
      const text = await file.text();
      const obj = JSON.parse(text) as { history?: CalcSaveEntry[] } | CalcSaveEntry[];
      const incoming = Array.isArray(obj) ? obj : obj.history;
      if (!incoming || !Array.isArray(incoming)) throw new Error('Invalid file');
      // De-dup by id; new entries win.
      const byId = new Map(history.map((e) => [e.id, e]));
      for (const e of incoming) byId.set(e.id, e);
      setHistory([...byId.values()].sort((a, b) => b.savedAt - a.savedAt));
    } catch (e) {
      alert(`Failed to import history: ${(e as Error).message}`);
    }
  }

  function resetToDefaults() {
    if (!confirm('Reset all inputs to defaults?')) return;
    setInputs(DEFAULT_INPUTS);
    setPlan(null);
  }

  if (loading || !data) {
    return <PageHeader title="Production Calculator" subtitle="Loading game data…" />;
  }

  return (
    <>
      <PageHeader
        title="Production Calculator"
        subtitle="Linear-programming optimization over every machine recipe. Inputs auto-save."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4" /> History
              {history.length > 0 && (
                <span className="ml-1 rounded bg-ficsit-bg/40 px-1 text-[10px] font-mono">{history.length}</span>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={savePlan}>
              <Save className="h-4 w-4" /> Save plan
            </Button>
            <Button variant="ghost" size="sm" onClick={resetToDefaults} title="Reset to defaults">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button onClick={run}>
              <Play className="h-4 w-4" /> Optimize
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Supply Caps (optional)"
              subtitle={
                inputs.autoSupplyRaw !== false
                  ? 'Raw resources are unlimited by default. Add a row only to cap one (e.g., your actual mining throughput).'
                  : 'Strict mode: every consumed item must be explicitly listed here.'
              }
            />
            <CardBody className="space-y-2">
              {inputs.supplies.length === 0 && inputs.autoSupplyRaw !== false && (
                <UnlimitedRawHint rawItems={rawItems} />
              )}
              {inputs.supplies.map((row, idx) => (
                <RateRow
                  key={row.id ?? `s-${idx}`}
                  row={row}
                  options={allItems}
                  unit="/m"
                  onChange={(r) => setSupplies((s) => s.map((x, i) => (i === idx ? r : x)))}
                  onRemove={() => setSupplies((s) => s.filter((_, i) => i !== idx))}
                />
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSupplies((s) => [...s, { id: crypto.randomUUID(), item: '', rate: 0 }])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add cap
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Targets"
              subtitle="What to produce. Rate=0 → maximize. Rate>0 → produce at least that much, then maximize."
            />
            <CardBody className="space-y-2">
              {inputs.targets.map((row, idx) => (
                <RateRow
                  key={row.id ?? `t-${idx}`}
                  row={row}
                  options={allItems}
                  unit="/m min"
                  placeholderRate="0 = max"
                  onChange={(r) => setTargets((s) => s.map((x, i) => (i === idx ? r : x)))}
                  onRemove={() => setTargets((s) => s.filter((_, i) => i !== idx))}
                />
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setTargets((s) => [...s, { id: crypto.randomUUID(), item: '', rate: 0 }])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add target
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Options" />
            <CardBody className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inputs.allowAlternates}
                  onChange={(e) => setInputs((i) => ({ ...i, allowAlternates: e.target.checked }))}
                  className="h-4 w-4 accent-ficsit-accent"
                />
                Allow alternate recipes
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inputs.autoSupplyRaw !== false}
                  onChange={(e) => setInputs((i) => ({ ...i, autoSupplyRaw: e.target.checked }))}
                  className="h-4 w-4 accent-ficsit-accent"
                />
                Auto-supply unspecified raw resources
                <span className="text-[10px] text-ficsit-subtle">(treat as unlimited)</span>
              </label>
            </CardBody>
          </Card>
        </div>

        {/* min-w-0 stops the grid item from being widened by the SVG inside PlanGraph */}
        <div className="min-w-0">
          <PlanView plan={plan} />
        </div>
      </div>

      <CalcHistory
        open={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onLoad={loadEntry}
        onDelete={deleteEntry}
        onClearAll={clearHistory}
        onExport={exportHistory}
        onImport={importHistory}
      />
    </>
  );
}

function UnlimitedRawHint({ rawItems }: { rawItems: { className: string; name: string }[] }) {
  return (
    <div className="rounded-md border border-dashed border-ficsit-good/40 bg-ficsit-good/5 p-2 text-xs text-ficsit-subtle">
      <div className="mb-1.5 flex items-center gap-1.5 text-ficsit-good">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ficsit-good" />
        <span className="font-medium uppercase tracking-wide">Auto-supply on</span>
      </div>
      All raw resources are assumed unlimited:
      <div className="mt-1.5 flex flex-wrap gap-1">
        {rawItems.map((it) => (
          <span
            key={it.className}
            className="inline-flex items-center gap-1 rounded border border-ficsit-border bg-ficsit-panel2 px-1.5 py-0.5"
          >
            <ItemIcon className={it.className} size={12} />
            {it.name}
          </span>
        ))}
      </div>
    </div>
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
  row: CalcRow;
  options: { className: string; name: string }[];
  unit: string;
  placeholderRate?: string;
  onChange: (r: CalcRow) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      {/* Item picker — takes the row on its own on narrow widths */}
      <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto">
        {row.item ? (
          <ItemIcon
            className={row.item}
            size={28}
            cls="rounded-md bg-ficsit-panel2 p-0.5 shrink-0"
          />
        ) : (
          <div className="h-7 w-7 shrink-0 rounded-md border border-dashed border-ficsit-border bg-ficsit-panel2/40" />
        )}
        <select
          value={row.item}
          onChange={(e) => onChange({ ...row, item: e.target.value })}
          className="h-9 w-full min-w-0 flex-1 rounded-md border border-ficsit-border bg-ficsit-panel2 px-2 text-sm"
        >
          <option value="">— select item —</option>
          {options.map((o) => (
            <option key={o.className} value={o.className}>{o.name}</option>
          ))}
        </select>
      </div>

      {/* Rate input + remove button — stay together as a unit */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative w-32">
          <Input
            type="number"
            min={0}
            step="any"
            value={row.rate || ''}
            placeholder={placeholderRate}
            onChange={(e) => onChange({ ...row, rate: Number(e.target.value) || 0 })}
            className="pr-12 text-right font-mono tabular-nums"
          />
          <span className="pointer-events-none absolute right-2 top-2 text-[10px] uppercase text-ficsit-subtle">
            {unit}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove row"
          title="Remove row"
          className={cn(
            'inline-grid h-9 w-9 shrink-0 place-items-center rounded-md border border-ficsit-border',
            'bg-ficsit-panel2 text-ficsit-subtle transition-colors',
            'hover:border-ficsit-bad/50 hover:bg-ficsit-bad/15 hover:text-ficsit-bad',
            'focus:outline-none focus:ring-2 focus:ring-ficsit-bad/40',
          )}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

type PlanTab = 'summary' | 'graph' | 'economics' | 'recipes';

function PlanView({ plan }: { plan: FactoryPlan | null }) {
  const [tab, setTab] = useState<PlanTab>('summary');
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
        <CardHeader title="Plan Summary" right={<Badge tone="good">Optimal</Badge>} />
        <CardBody className="grid grid-cols-3 gap-4">
          <Stat label="Total Machines" value={fmt(plan.totalMachines, 1)} />
          <Stat label="Total Power" value={`${fmt(plan.totalPowerKW)} MW`} />
          <Stat label="Recipe Lines" value={String(plan.lines.length)} />
        </CardBody>
      </Card>

      <div className="flex items-end gap-1 border-b border-ficsit-border">
        {([
          { id: 'summary', label: 'Summary', icon: BarChart3 },
          { id: 'graph', label: 'Graph', icon: Network },
          { id: 'economics', label: 'Economics', icon: Activity },
          { id: 'recipes', label: 'Recipes', icon: ListTree },
        ] as { id: PlanTab; label: string; icon: React.ComponentType<{ className?: string }> }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors',
              tab === t.id
                ? 'border-ficsit-accent text-ficsit-text'
                : 'border-transparent text-ficsit-subtle hover:text-ficsit-text',
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && <SummaryTab plan={plan} />}
      {tab === 'graph' && <PlanGraph plan={plan} />}
      {tab === 'economics' && <Economics plan={plan} />}
      {tab === 'recipes' && <RecipesTab plan={plan} />}
    </div>
  );
}

function SummaryTab({ plan }: { plan: FactoryPlan }) {
  const { data } = useGameData();
  return (
    <div className="space-y-4">
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
    </div>
  );
}

function RecipesTab({ plan }: { plan: FactoryPlan }) {
  const { data } = useGameData();
  return (
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
