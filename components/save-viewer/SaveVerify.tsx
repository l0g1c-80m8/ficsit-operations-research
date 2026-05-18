'use client';
import { useMemo } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ItemBadge } from '@/components/ui/ItemBadge';
import { useGameData } from '@/lib/data/use-data';
import { fmt } from '@/lib/utils';
import type { ParsedSaveSummary } from '@/lib/save/types';
import { verifyFactory, type VerifyFlow } from '@/lib/save/verify';
import { ArrowDown, ArrowUp, ArrowRightLeft } from 'lucide-react';

/** Verify-this-factory pass: builds the recipe→machine map directly off the
 *  save's actor list (only actors with `currentRecipe` count) and shows the
 *  implied per-item flow at 100% clock. Intermediates that don't balance
 *  surface as a deficit (factory is short upstream) or surplus (factory is
 *  overbuilt downstream / has a partially-routed byproduct). */
export function SaveVerify({ summary }: { summary: ParsedSaveSummary }) {
  const { data } = useGameData();

  const report = useMemo(() => {
    if (!data) return null;
    const usage = new Map<string, number>();
    for (const a of summary.actors) {
      if (!a.currentRecipe) continue;
      usage.set(a.currentRecipe, (usage.get(a.currentRecipe) ?? 0) + 1);
    }
    if (usage.size === 0) return null;
    return verifyFactory(data, usage);
  }, [data, summary]);

  if (!data || !report) return null;
  if (report.lines.length === 0) return null;

  const EPS = 1e-6;
  const deficits = report.intermediates.filter((f) => f.net < -EPS);
  const surpluses = report.intermediates.filter((f) => f.net > EPS);
  const balanced = report.intermediates.filter((f) => Math.abs(f.net) <= EPS);

  return (
    <Card>
      <CardHeader
        title="Factory verification"
        subtitle={`Folds the assigned recipes on every machine into a flow analysis. ${fmt(report.lines.length)} active recipe lines · ${fmt(report.totalPowerKW)} MW draw at 100% clock.`}
      />
      <CardBody className="space-y-4">
        <FlowSection
          title="Net outputs"
          icon={<ArrowUp className="h-3.5 w-3.5 text-ficsit-good" />}
          flows={report.outputs}
          variant="output"
          emptyText="Nothing is produced solely as a final good — every product is consumed downstream too."
        />
        <FlowSection
          title="Net raw inputs"
          icon={<ArrowDown className="h-3.5 w-3.5 text-ficsit-accent" />}
          flows={report.inputs}
          variant="input"
          emptyText="No raw inputs detected — your factory either makes everything from itself, or no recipes are assigned yet."
        />
        {deficits.length > 0 && (
          <FlowSection
            title="Deficits (factory is short)"
            icon={<ArrowRightLeft className="h-3.5 w-3.5 text-ficsit-bad" />}
            flows={deficits}
            variant="deficit"
            emptyText=""
            subtitle="More machines consume this item than produce it — add capacity upstream or feed it in from elsewhere."
          />
        )}
        {surpluses.length > 0 && (
          <FlowSection
            title="Surpluses (factory overproduces)"
            icon={<ArrowRightLeft className="h-3.5 w-3.5 text-amber-300" />}
            flows={surpluses}
            variant="surplus"
            emptyText=""
            subtitle="Produced more than consumed — usually byproducts that need a sink, or downstream lines waiting to scale."
          />
        )}
        {balanced.length > 0 && (
          <details className="text-xs text-ficsit-subtle">
            <summary className="cursor-pointer select-none hover:text-ficsit-text">
              Balanced intermediates ({balanced.length})
            </summary>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {balanced.map((f) => (
                <li key={f.item}>
                  <span className="inline-flex items-center gap-1 rounded border border-ficsit-border bg-ficsit-panel2 px-1.5 py-0.5">
                    <ItemBadge item={f.item} />
                    <span className="font-mono">{fmt(f.produced)}/m</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
        {report.unknownRecipes.length > 0 && (
          <p className="text-[11px] text-ficsit-subtle">
            {report.unknownRecipes.length} recipe class{report.unknownRecipes.length === 1 ? '' : 'es'} found in the save that aren't in the current dataset — run <code>npm run refresh</code> if these matter to you.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function FlowSection({
  title,
  icon,
  flows,
  variant,
  emptyText,
  subtitle,
}: {
  title: string;
  icon: React.ReactNode;
  flows: VerifyFlow[];
  variant: 'output' | 'input' | 'surplus' | 'deficit';
  emptyText: string;
  subtitle?: string;
}) {
  if (flows.length === 0) {
    if (!emptyText) return null;
    return (
      <div>
        <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ficsit-subtle">
          {icon} {title}
        </h3>
        <p className="mt-1 text-xs text-ficsit-subtle">{emptyText}</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ficsit-subtle">
        {icon} {title}
      </h3>
      {subtitle && <p className="mt-0.5 text-[11px] text-ficsit-subtle">{subtitle}</p>}
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {flows.map((f) => (
          <FlowChip key={f.item} flow={f} variant={variant} />
        ))}
      </ul>
    </div>
  );
}

function FlowChip({ flow, variant }: { flow: VerifyFlow; variant: 'output' | 'input' | 'surplus' | 'deficit' }) {
  const display = variant === 'output' || variant === 'surplus' ? flow.produced - flow.consumed
    : variant === 'input' ? flow.consumed - flow.produced
    : Math.abs(flow.net);
  const tone =
    variant === 'output'
      ? 'border-ficsit-good/40 bg-ficsit-good/10 text-ficsit-good'
      : variant === 'input'
      ? 'border-ficsit-border bg-ficsit-panel2 text-ficsit-text'
      : variant === 'deficit'
      ? 'border-ficsit-bad/40 bg-ficsit-bad/10 text-ficsit-bad'
      : 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  return (
    <li className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${tone}`}>
      <span className="font-mono">{fmt(display)}/m</span>
      <ItemBadge item={flow.item} />
    </li>
  );
}
