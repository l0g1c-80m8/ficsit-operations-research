'use client';
import { AlertTriangle, FlaskConical, Sparkles } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { useGameData } from '@/lib/data/use-data';
import type { Diagnosis } from '@/lib/solver/diagnose';

export function InfeasibilityHelp({
  diagnosis,
  alternatesEnabled,
  autoSupplyRaw,
  onEnableAlternates,
  onEnableAutoSupply,
}: {
  diagnosis: Diagnosis;
  alternatesEnabled: boolean;
  autoSupplyRaw: boolean;
  onEnableAlternates: () => void;
  onEnableAutoSupply: () => void;
}) {
  const { data } = useGameData();
  const nameOf = (cls: string) => data?.items[cls]?.name ?? cls;

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5 text-ficsit-bad">
            <AlertTriangle className="h-4 w-4" /> Infeasible — and here's why
          </span>
        }
        subtitle="The LP returned no solution. Below is what's actually blocking your plan."
      />
      <CardBody className="space-y-3">
        {diagnosis.unknownTargets.length > 0 && (
          <div className="rounded-md border border-ficsit-bad/30 bg-ficsit-bad/5 p-3 text-sm">
            <div className="font-medium text-ficsit-bad">Unknown target item(s):</div>
            <ul className="mt-1 list-inside list-disc text-ficsit-subtle">
              {diagnosis.unknownTargets.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        {diagnosis.unreachableTargets.length > 0 && (
          <div className="rounded-md border border-ficsit-bad/30 bg-ficsit-bad/5 p-3 text-sm">
            <div className="font-medium text-ficsit-bad">Targets that can't be produced under current toggles:</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {diagnosis.unreachableTargets.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 rounded border border-ficsit-bad/40 bg-ficsit-bad/10 px-1.5 py-0.5 text-xs">
                  <ItemIcon className={item} size={14} />
                  {nameOf(item)}
                </span>
              ))}
            </div>
          </div>
        )}

        {diagnosis.enablingAltsWouldHelp && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <div className="flex items-center gap-1.5 font-medium text-amber-300">
              <Sparkles className="h-4 w-4" /> Alternate recipes would unblock this
            </div>
            <p className="mt-1 text-xs text-ficsit-subtle">
              The following alternate recipe{diagnosis.keyAltRecipes.length === 1 ? '' : 's'} need to be
              enabled to bridge the gap (each unlocks an intermediate the standard chain can't make):
            </p>
            {diagnosis.keyAltRecipes.length > 0 && (
              <ul className="mt-2 space-y-1">
                {diagnosis.keyAltRecipes.map((r) => (
                  <li
                    key={r.className}
                    className="flex items-center justify-between gap-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <FlaskConical className="h-3 w-3 shrink-0 text-amber-300" />
                      <span className="truncate font-medium">{r.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-ficsit-subtle">
                      unlocks
                      <ItemIcon className={r.unlocks} size={14} />
                      {nameOf(r.unlocks)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!alternatesEnabled && (
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={onEnableAlternates}
              >
                <Sparkles className="h-3.5 w-3.5" /> Enable alternates &amp; re-run
              </Button>
            )}
          </div>
        )}

        {!diagnosis.enablingAltsWouldHelp && !autoSupplyRaw && (
          <div className="rounded-md border border-sky-500/30 bg-sky-500/5 p-3 text-sm">
            <div className="font-medium text-sky-300">Strict mode is on</div>
            <p className="mt-1 text-xs text-ficsit-subtle">
              You disabled <em>Auto-supply unspecified raw resources</em>, so every consumed raw must
              be listed under Supply Caps with a positive rate. Either add the missing supplies
              explicitly, or re-enable auto-supply.
            </p>
            <Button variant="primary" size="sm" className="mt-3" onClick={onEnableAutoSupply}>
              Enable auto-supply &amp; re-run
            </Button>
          </div>
        )}

        {!diagnosis.enablingAltsWouldHelp && autoSupplyRaw && diagnosis.unreachableTargets.length === 0 && (
          <p className="text-xs text-ficsit-subtle">
            The LP rejected the plan but no simple toggle would unblock it. Likely causes: supply
            caps are too low for the required rate, the requested target is a bare raw resource
            (try a different target), or you've requested an item with no machine recipe (browse the
            Recipes page to check).
          </p>
        )}
      </CardBody>
    </Card>
  );
}
