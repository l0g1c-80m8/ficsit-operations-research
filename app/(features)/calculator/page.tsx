'use client';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/shell/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatTile } from '@/components/ui/StatTile';
import { TabGroup, type Tab } from '@/components/ui/TabGroup';
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
  effectiveAutoSupply,
  summarizePlan,
  type CalcInputs,
  type CalcRow,
  type CalcSaveEntry,
} from '@/lib/calculator/types';
import { requiredTier, tierLabel, type TierRequirement } from '@/lib/utils/tiers';
import { CalcHistory } from '@/components/calculator/CalcHistory';
import { PlanGraph } from '@/components/calculator/PlanGraph';
import { Economics } from '@/components/calculator/Economics';
import { InfeasibilityHelp } from '@/components/calculator/InfeasibilityHelp';
import { diagnose } from '@/lib/solver/diagnose';
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

  function run(overrides?: Partial<CalcInputs>) {
    if (!data) return;
    // Apply overrides synchronously so the click that toggles a setting
    // also re-solves with the new value (instead of waiting for the next render).
    const eff = overrides ? { ...inputs, ...overrides } : inputs;
    if (overrides) setInputs(eff);
    const sup = eff.supplies.filter((s) => s.item && s.rate > 0);
    const tgt = eff.targets.filter((t) => t.item);
    const result = solveFactory(
      data,
      sup.map((s) => ({ item: s.item, ratePerMin: s.rate })),
      tgt.map((t) => ({
        item: t.item,
        minRatePerMin: t.rate > 0 ? t.rate : undefined,
        weight: 1,
      })),
      {
        includeAlternates: eff.allowAlternates,
        autoSupplyRawResources: effectiveAutoSupply(eff),
        shardBudget: eff.shardBudget,
        includePowerProduction: eff.includePowerProduction,
        objective: eff.objective,
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
      // Snapshot inputs — without this, later edits to the form mutate the
      // history entry (because supplies/targets are shared array references).
      inputs: structuredClone(inputs),
      summary: plan ? summarizePlan(plan) : null,
    };
    setHistory((h) => [entry, ...h]);
  }

  function loadEntry(entry: CalcSaveEntry) {
    // Build a fresh inputs object: defaults first (so older saves missing
    // newer fields like autoSupplyRaw still work), then the cloned snapshot.
    // The deep clone is essential — without it, the in-memory history entry
    // and the active form share references, so React's Object.is bail-out
    // would silently skip the re-render when you load a plan you just saved.
    const cloned: CalcInputs = {
      ...DEFAULT_INPUTS,
      ...structuredClone(entry.inputs),
    };
    setInputs(cloned);
    setShowHistory(false);
    // Re-solve so the right pane visibly updates with the loaded plan.
    run(cloned);
  }

  // Deep-link entry: `/calculator#load=<planId>` (planner clicks this to
  // open the linked plan). Runs once per mount when both the history and
  // game data are ready. Clears the hash after consuming it so reloads
  // don't keep re-loading the same plan over the user's current inputs.
  useEffect(() => {
    if (!data || history.length === 0) return;
    if (typeof window === 'undefined') return;
    const match = window.location.hash.match(/^#load=(.+)$/);
    if (!match) return;
    const id = decodeURIComponent(match[1]);
    const entry = history.find((e) => e.id === id);
    if (entry) loadEntry(entry);
    // Clear hash without scrolling.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, history.length]);

  // Deep-link entry: `/calculator?targets=Desc_Foo_C:60,Desc_Bar_C:15`.
  // /progression links here with the parts it still owes. Consumed once per
  // mount, then stripped from the URL so a reload doesn't clobber whatever the
  // user has since typed.
  useEffect(() => {
    if (!data || typeof window === 'undefined') return;
    const raw = new URLSearchParams(window.location.search).get('targets');
    if (!raw) return;
    const targets: CalcRow[] = raw
      .split(',')
      .map((pair) => {
        const [item, rate] = pair.split(':');
        return { item: item?.trim() ?? '', rate: Number(rate) };
      })
      // Ignore anything that isn't a real item class — a stale or hand-edited
      // link shouldn't produce empty rows the solver then chokes on.
      .filter((t) => t.item in data.items && Number.isFinite(t.rate) && t.rate > 0)
      .map((t, i) => ({ id: `tgt-link-${i}`, item: t.item, rate: t.rate }));
    if (targets.length === 0) return;
    const next: CalcInputs = { ...DEFAULT_INPUTS, ...inputs, targets };
    setInputs(next);
    run(next);
    window.history.replaceState(null, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

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

  const autoSupplyOn = effectiveAutoSupply(inputs);
  const autoSupplyOverridden = typeof inputs.autoSupplyRaw === 'boolean';

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
            <Button onClick={() => run()}>
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
                autoSupplyOn
                  ? inputs.supplies.length === 0
                    ? 'No supplies listed → every raw resource is treated as unlimited.'
                    : 'Override active: listed caps applied, everything else still unlimited.'
                  : 'Strict mode: only the raws listed below are available. Everything the plan consumes must appear here.'
              }
            />
            <CardBody className="space-y-2">
              {inputs.supplies.length === 0 && autoSupplyOn && (
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
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-ficsit-subtle">Objective</span>
                <div className="inline-flex rounded-md border border-ficsit-border bg-ficsit-panel2 p-0.5 text-xs">
                  <button
                    type="button"
                    className={cn(
                      'rounded px-2 py-1 transition-colors',
                      (inputs.objective ?? 'output') === 'output'
                        ? 'bg-ficsit-accent text-ficsit-bg'
                        : 'text-ficsit-subtle hover:text-ficsit-text',
                    )}
                    onClick={() => setInputs((i) => ({ ...i, objective: 'output' }))}
                  >
                    Max output
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'rounded px-2 py-1 transition-colors',
                      inputs.objective === 'sink_points'
                        ? 'bg-ficsit-accent text-ficsit-bg'
                        : 'text-ficsit-subtle hover:text-ficsit-text',
                    )}
                    onClick={() => setInputs((i) => ({ ...i, objective: 'sink_points' }))}
                    title="Maximize AWESOME Sink tickets per minute across all sinkable items"
                  >
                    Max sink points
                  </button>
                </div>
                <span className="text-[10px] text-ficsit-subtle">
                  {inputs.objective === 'sink_points'
                    ? 'every sinkable item is a candidate — solver picks the most ticket-dense mix'
                    : 'solver maximizes the targets you list (default)'}
                </span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inputs.allowAlternates}
                  onChange={(e) => setInputs((i) => ({ ...i, allowAlternates: e.target.checked }))}
                  className="h-4 w-4 accent-ficsit-accent"
                />
                Allow alternate recipes <span className="text-[10px] text-ficsit-subtle">(Hard Drive only — MAM-researched recipes are always available)</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inputs.includePowerProduction ?? false}
                  onChange={(e) =>
                    setInputs((i) => ({ ...i, includePowerProduction: e.target.checked }))
                  }
                  className="h-4 w-4 accent-ficsit-accent"
                />
                Plan power production
                <span className="text-[10px] text-ficsit-subtle">
                  (generators + fuel chain folded into the LP)
                </span>
              </label>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoSupplyOn}
                    onChange={(e) => setInputs((i) => ({ ...i, autoSupplyRaw: e.target.checked }))}
                    className="h-4 w-4 accent-ficsit-accent"
                  />
                  Auto-supply unspecified raw resources
                  <span className="text-[10px] text-ficsit-subtle">(treat as unlimited)</span>
                </label>
                {autoSupplyOverridden ? (
                  <button
                    type="button"
                    onClick={() => setInputs((i) => ({ ...i, autoSupplyRaw: undefined }))}
                    className="text-[10px] uppercase tracking-wide text-ficsit-accent hover:underline"
                    title="Stop overriding — let the planner pick based on whether you've listed any supplies"
                  >
                    Use default
                  </button>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide text-ficsit-subtle">
                    Auto · {inputs.supplies.length === 0 ? 'no supplies → on' : 'supplies listed → off'}
                  </span>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Overclocking"
              subtitle={
                (inputs.shardBudget ?? 0) > 0
                  ? `Up to ${inputs.shardBudget} Power Shard${inputs.shardBudget === 1 ? '' : 's'} can be distributed across recipes. 1/2/3 shards = 150/200/250% clock; power scales by clock^1.32.`
                  : 'All machines run at 100% clock. Set a shard budget to let the planner overclock recipes where it cuts the machine count the most.'
              }
            />
            <CardBody>
              <div className="flex items-center gap-2 text-sm">
                <label htmlFor="shard-budget" className="text-ficsit-subtle">
                  Power Shards available
                </label>
                <div className="relative w-28">
                  <Input
                    id="shard-budget"
                    type="number"
                    min={0}
                    step={1}
                    value={inputs.shardBudget || ''}
                    placeholder="0"
                    onChange={(e) =>
                      setInputs((i) => ({ ...i, shardBudget: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))
                    }
                    className="text-right font-mono tabular-nums pr-10"
                  />
                  <span className="pointer-events-none absolute right-2 top-2 text-[10px] uppercase text-ficsit-subtle">
                    shd
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* min-w-0 stops the grid item from being widened by the SVG inside PlanGraph */}
        <div className="min-w-0">
          <PlanView
            plan={plan}
            inputs={inputs}
            data={data}
            onEnableAlternates={() => run({ allowAlternates: true })}
            onEnableAutoSupply={() => run({ autoSupplyRaw: true })}
          />
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
        <Select
          value={row.item}
          onChange={(e) => onChange({ ...row, item: e.target.value })}
          className="min-w-0 flex-1"
        >
          <option value="">— select item —</option>
          {options.map((o) => (
            <option key={o.className} value={o.className}>{o.name}</option>
          ))}
        </Select>
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

interface PlanViewProps {
  plan: FactoryPlan | null;
  inputs: CalcInputs;
  data: ReturnType<typeof useGameData>['data'];
  onEnableAlternates: () => void;
  onEnableAutoSupply: () => void;
}

function PlanView({ plan, inputs, data, onEnableAlternates, onEnableAutoSupply }: PlanViewProps) {
  const [tab, setTab] = useState<PlanTab>('summary');

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
    const diagnosis = data
      ? diagnose(data, {
          supplies: inputs.supplies.filter((s) => s.item && s.rate > 0).map((s) => ({ item: s.item })),
          targets: inputs.targets.filter((t) => t.item).map((t) => ({ item: t.item })),
          includeAlternates: inputs.allowAlternates,
          autoSupplyRawResources: effectiveAutoSupply(inputs),
        })
      : null;

    return (
      <div className="space-y-3">
        <Card>
          <CardBody>
            <Badge tone="bad">{plan.status}</Badge>
            <p className="mt-2 text-sm text-ficsit-subtle">{plan.message ?? 'No feasible plan.'}</p>
          </CardBody>
        </Card>
        {diagnosis && (
          <InfeasibilityHelp
            diagnosis={diagnosis}
            alternatesEnabled={inputs.allowAlternates}
            autoSupplyRaw={effectiveAutoSupply(inputs)}
            onEnableAlternates={onEnableAlternates}
            onEnableAutoSupply={onEnableAutoSupply}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Plan Summary" right={<Badge tone="good">Optimal</Badge>} />
        <CardBody className={cn('grid grid-cols-1 gap-3', summaryTileCount(plan) >= 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
          <StatTile label="Total Machines" value={fmt(plan.totalMachines, 1)} tone="accent" />
          <StatTile
            label={plan.generatorLines.length > 0 ? 'Power · draw / made' : 'Total Power'}
            value={
              plan.generatorLines.length > 0
                ? `${fmt(plan.totalPowerKW)} / ${fmt(plan.totalPowerProducedKW)} MW`
                : `${fmt(plan.totalPowerKW)} MW`
            }
            tone="accent"
          />
          <StatTile label="Recipe Lines" value={String(plan.lines.length)} tone="accent" />
          {plan.totalShards > 0 && (
            <StatTile
              label="Shards Used"
              value={`${fmt(plan.totalShards, 1)}${inputs.shardBudget ? ` / ${inputs.shardBudget}` : ''}`}
              tone="accent"
            />
          )}
        </CardBody>
      </Card>

      <TabGroup<PlanTab>
        tabs={[
          { id: 'summary', label: 'Summary', icon: BarChart3 },
          { id: 'graph', label: 'Graph', icon: Network },
          { id: 'economics', label: 'Economics', icon: Activity },
          { id: 'recipes', label: 'Recipes', icon: ListTree },
        ] as Tab<PlanTab>[]}
        active={tab}
        onSelect={setTab}
      />

      {tab === 'summary' && <SummaryTab plan={plan} />}
      {tab === 'graph' && <PlanGraph plan={plan} />}
      {tab === 'economics' && <Economics plan={plan} />}
      {tab === 'recipes' && <RecipesTab plan={plan} />}
    </div>
  );
}

function summaryTileCount(plan: FactoryPlan): number {
  return 3 + (plan.totalShards > 0 ? 1 : 0);
}

function SummaryTab({ plan }: { plan: FactoryPlan }) {
  const { data } = useGameData();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Outputs" />
        <CardBody className="flex flex-wrap gap-2">
          {plan.outputs.map((o) => {
            const tier = data ? requiredTier(o.item, o.ratePerMin, data) : null;
            return (
              <div key={o.item} className="flex items-center gap-1.5 rounded-md border border-ficsit-good/30 bg-ficsit-good/10 px-2 py-1 text-xs">
                <span className="font-mono text-ficsit-good">{fmt(o.ratePerMin)}/m</span>
                <ItemBadge item={o.item} />
                {tier && <TierBadge tier={tier} />}
              </div>
            );
          })}
        </CardBody>
      </Card>

      {plan.generatorLines.length > 0 && (
        <Card>
          <CardHeader
            title="Power Generation"
            subtitle={`Produces ${fmt(plan.totalPowerProducedKW)} MW vs ${fmt(plan.totalPowerKW)} MW drawn. Fuel + byproduct flows are folded into the Raw consumption tally.`}
          />
          <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {plan.generatorLines.map((gl, i) => (
              <div
                key={`${gl.generator}-${gl.fuelItem}-${i}`}
                className="flex items-center gap-3 rounded-md border border-ficsit-border bg-ficsit-panel2 px-3 py-2"
              >
                <ItemIcon className={gl.generator} kind="building" size={32} cls="rounded-md p-0.5 bg-ficsit-panel" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="truncate font-medium">
                    {data?.buildings[gl.generator]?.name ?? gl.generator}
                  </div>
                  <div className="text-[11px] text-ficsit-subtle">
                    {fmt(gl.fuelRatePerMin)}/m {data?.items[gl.fuelItem]?.name ?? gl.fuelItem}
                    {gl.byproductItem && gl.byproductRatePerMin > 0 && (
                      <>
                        {' · '}
                        <span className="text-amber-300">
                          +{fmt(gl.byproductRatePerMin)}/m {data?.items[gl.byproductItem]?.name ?? gl.byproductItem}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg text-ficsit-accent">{fmt(gl.machines, 1)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-ficsit-subtle">
                    {fmt(gl.powerKW)} MW
                  </div>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Consumed Inputs" />
        <CardBody className="flex flex-wrap gap-2">
          {plan.consumedInputs.map((o) => {
            const tier = data ? requiredTier(o.item, o.ratePerMin, data) : null;
            return (
              <div key={o.item} className="flex items-center gap-1.5 rounded-md border border-ficsit-border bg-ficsit-panel2 px-2 py-1 text-xs">
                <span className="font-mono">{fmt(o.ratePerMin)}/m</span>
                <ItemBadge item={o.item} />
                {tier && <TierBadge tier={tier} />}
              </div>
            );
          })}
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
  const hasOC = plan.lines.some((l) => l.clockTiers.length > 1 || (l.clockTiers[0]?.clock ?? 1) !== 1);
  // Pre-compute the highest-tier badge for each line so the table is just
  // markup. The badge is the *tightest* belt/pipe demand on the line — the
  // user can derive in/out specifically from the flows by clicking through
  // to the recipe drawer if they need.
  const lineTier = (l: FactoryPlan['lines'][number]): TierRequirement | null => {
    if (!data) return null;
    let worst: TierRequirement | null = null;
    for (const f of [...l.outputs, ...l.inputs]) {
      const t = requiredTier(f.item, f.ratePerMin, data);
      if (!t) continue;
      if (
        !worst ||
        t.parallel > worst.parallel ||
        (t.parallel === worst.parallel && t.mark > worst.mark)
      ) {
        worst = t;
      }
    }
    return worst;
  };
  return (
    <Card>
      <CardHeader title="Recipe Lines" subtitle={hasOC ? 'Clock per line is solver-chosen within your shard budget; machine counts reflect the chosen clocks.' : 'Machines at 100% clock. Overclock to round up.'} />
      <CardBody>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-ficsit-subtle">
              <th className="text-left py-2">Recipe</th>
              <th className="text-left">Building</th>
              <th className="text-right">Machines</th>
              {hasOC && <th className="text-right">Clock</th>}
              {hasOC && <th className="text-right">Shards</th>}
              <th className="text-right">Belt/Pipe</th>
              <th className="text-right">Power</th>
            </tr>
          </thead>
          <tbody>
            {plan.lines
              .slice()
              .sort((a, b) => b.machines - a.machines)
              .map((l, i) => {
                const tier = lineTier(l);
                return (
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
                    {hasOC && <td className="text-right font-mono">{formatClockTiers(l)}</td>}
                    {hasOC && <td className="text-right font-mono">{l.shards > 0 ? fmt(l.shards, 1) : '—'}</td>}
                    <td className="text-right">
                      {tier ? <TierBadge tier={tier} /> : <span className="text-ficsit-subtle">—</span>}
                    </td>
                    <td className="text-right font-mono">{fmt(l.powerKW)} MW</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

/** Small badge that tells the user which belt or pipe Mk handles a flow.
 *  Goes red when the flow exceeds a single Mk6 belt / Mk2 pipe and needs
 *  parallel lines, so the user notices buildable bottlenecks at a glance. */
function TierBadge({ tier }: { tier: TierRequirement }) {
  const isMaxed = tier.parallel > 1;
  return (
    <span
      title={`${tier.kind === 'belt' ? 'Belt' : 'Pipe'} ${tierLabel(tier)} · ${tier.perLine}/m per line`}
      className={cn(
        'inline-flex items-center rounded border px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider',
        isMaxed
          ? 'border-ficsit-bad/40 bg-ficsit-bad/10 text-ficsit-bad'
          : 'border-ficsit-border bg-ficsit-panel text-ficsit-subtle',
      )}
    >
      {tierLabel(tier)}
    </span>
  );
}

/** Format the clock-tier breakdown for a recipe line. One tier → just the
 *  clock %; multiple tiers → space-separated "Nm @ X%" segments so a mixed
 *  fleet is unambiguous. */
function formatClockTiers(line: FactoryPlan['lines'][number]): string {
  if (line.clockTiers.length === 0) return '—';
  if (line.clockTiers.length === 1) return `${Math.round(line.clockTiers[0].clock * 100)}%`;
  return line.clockTiers
    .filter((t) => t.machines > 1e-6)
    .map((t) => `${fmt(t.machines, 1)}m @ ${Math.round(t.clock * 100)}%`)
    .join(' · ');
}

