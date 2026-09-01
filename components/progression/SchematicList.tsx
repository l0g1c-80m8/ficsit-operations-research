'use client';
// Shared renderer for a group of schematics — a milestone tier, a MAM research
// tree, or the Hard Drive alternate list. Each row shows completion, the part
// cost, and (for alternates) what recipe it unlocks.

import { Check, Lock } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ItemIcon } from '@/components/ui/ItemIcon';
import type { SchematicGroup } from '@/lib/progression/derive';
import type { SatData } from '@/lib/data/types';
import { cn, fmt } from '@/lib/utils';

export function SchematicList({
  group,
  data,
  /** Hide the per-entry cost column (Hard Drive alternates have no part cost). */
  showCost = true,
}: {
  group: SchematicGroup;
  data: SatData | null;
  showCost?: boolean;
}) {
  const complete = group.total > 0 && group.done === group.total;
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {group.label}
            {complete && <Check className="h-3.5 w-3.5 text-ficsit-good" />}
          </span>
        }
        right={
          <span className="font-mono text-xs text-ficsit-subtle">
            {group.done}/{group.total}
          </span>
        }
      />
      <CardBody className="space-y-2 p-3">
        <ProgressBar
          value={group.total === 0 ? 0 : group.done / group.total}
          tone={complete ? 'good' : 'accent'}
        />
        <ul className="divide-y divide-ficsit-border/60">
          {group.entries.map(({ schematic, done }) => (
            <li
              key={schematic.className}
              className={cn(
                'flex items-start gap-2 py-1.5',
                !done && 'text-ficsit-text',
                done && 'text-ficsit-subtle',
              )}
            >
              <span className="mt-0.5 shrink-0">
                {done ? (
                  <Check className="h-3.5 w-3.5 text-ficsit-good" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-ficsit-subtle/50" />
                )}
              </span>
              <span className={cn('min-w-0 flex-1 text-sm', done && 'line-through decoration-ficsit-border')}>
                {schematic.name}
              </span>
              {showCost && schematic.cost.length > 0 && (
                <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {schematic.cost.map((c) => (
                    <span
                      key={c.item}
                      className="inline-flex items-center gap-1 rounded bg-ficsit-panel2 px-1 py-0.5"
                      title={data?.items[c.item]?.name ?? c.item}
                    >
                      <ItemIcon className={c.item} size={14} />
                      <span className="font-mono text-[10px] tabular-nums text-ficsit-subtle">
                        {fmt(c.amount, 0)}
                      </span>
                    </span>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
