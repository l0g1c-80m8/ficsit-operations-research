'use client';
// "What do I still owe?" — the aggregate shopping list across the scopes the
// user selects, with a hand-off into the Calculator.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Calculator } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { remainingParts, type ProgressionModel } from '@/lib/progression/derive';
import type { SatData } from '@/lib/data/types';
import { cn, fmt } from '@/lib/utils';

/** How many parts to hand the Calculator. The LP gets slower and the plan less
 *  readable the more simultaneous targets you give it, and the long tail of a
 *  full-game list is mostly trivial quantities. */
const MAX_CALC_TARGETS = 6;

export function RemainingParts({
  model,
  data,
}: {
  model: ProgressionModel;
  data: SatData | null;
}) {
  const [scope, setScope] = useState<{ milestones: boolean; mam: boolean; phases: boolean }>({
    milestones: true,
    mam: false,
    phases: false,
  });
  const [tier, setTier] = useState<number | null>(null);

  const parts = useMemo(
    () =>
      remainingParts(model, {
        milestones: scope.milestones,
        mam: scope.mam,
        phases: scope.phases,
        tier: scope.milestones ? tier : null,
      }),
    [model, scope, tier],
  );

  // The calculator takes a rate per minute, not a stockpile. We hand it the
  // biggest outstanding parts and let the pioneer dial the rate — the useful
  // output is the recipe tree and machine mix, not a literal delivery schedule.
  const calcHref = useMemo(() => {
    const targets = parts
      .slice(0, MAX_CALC_TARGETS)
      .map((p) => `${p.item}:${Math.max(1, Math.round(p.amount / 60))}`)
      .join(',');
    return targets ? `/calculator?targets=${encodeURIComponent(targets)}` : '/calculator';
  }, [parts]);

  const tiers = model.milestones.map((g) => ({
    id: g.id,
    label: g.label,
    tier: Number(g.id.replace('tier-', '')),
    outstanding: g.total - g.done,
  }));

  return (
    <Card>
      <CardHeader
        title="Parts still owed"
        subtitle="Summed across everything not yet completed in the selected scopes."
        right={
          <Link href={calcHref}>
            <Button variant="secondary" size="sm" disabled={parts.length === 0}>
              <Calculator className="h-3.5 w-3.5" /> Plan in Calculator
            </Button>
          </Link>
        }
      />
      <CardBody className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['milestones', 'Milestones'],
              ['mam', 'MAM research'],
              ['phases', 'Space Elevator'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope((s) => ({ ...s, [key]: !s[key] }))}
              className={cn(
                'rounded-md border px-2 py-1 text-[11px] transition-colors',
                scope[key]
                  ? 'border-ficsit-accent/60 bg-ficsit-accent/15 text-ficsit-accent'
                  : 'border-ficsit-border bg-ficsit-panel text-ficsit-subtle hover:bg-ficsit-panel2',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {scope.milestones && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-ficsit-subtle">Tier</span>
            <button
              type="button"
              onClick={() => setTier(null)}
              className={cn(
                'rounded border px-1.5 py-0.5 font-mono text-[11px] transition-colors',
                tier == null
                  ? 'border-ficsit-accent/60 bg-ficsit-accent/15 text-ficsit-accent'
                  : 'border-ficsit-border text-ficsit-subtle hover:bg-ficsit-panel2',
              )}
            >
              All
            </button>
            {tiers.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTier(t.tier)}
                title={`${t.label} — ${t.outstanding} outstanding`}
                className={cn(
                  'rounded border px-1.5 py-0.5 font-mono text-[11px] transition-colors',
                  tier === t.tier
                    ? 'border-ficsit-accent/60 bg-ficsit-accent/15 text-ficsit-accent'
                    : t.outstanding === 0
                      ? 'border-ficsit-border text-ficsit-subtle/40 hover:bg-ficsit-panel2'
                      : 'border-ficsit-border text-ficsit-subtle hover:bg-ficsit-panel2',
                )}
              >
                {t.tier === 0 ? 'HUB' : t.tier}
              </button>
            ))}
          </div>
        )}

        {parts.length === 0 ? (
          <p className="py-6 text-center text-sm text-ficsit-good">
            Nothing outstanding in this scope. Well done, Pioneer.
          </p>
        ) : (
          <>
            <div className="text-[11px] text-ficsit-subtle">
              {parts.length} distinct part{parts.length === 1 ? '' : 's'} ·{' '}
              {fmt(parts.reduce((n, p) => n + p.amount, 0), 0)} items total
            </div>
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {parts.map((p) => (
                <li
                  key={p.item}
                  className="flex items-center gap-2 rounded bg-ficsit-panel2/50 px-2 py-1"
                >
                  <ItemIcon className={p.item} size={20} />
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {data?.items[p.item]?.name ?? p.item}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-ficsit-accent">
                    {fmt(p.amount, 0)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  );
}
