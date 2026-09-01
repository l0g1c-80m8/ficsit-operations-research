'use client';
// Space Elevator / Project Assembly progress. The active phase shows delivered
// vs required per part; completed phases collapse to a check; locked phases
// list what they'll want.

import { Check, Rocket } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ItemIcon } from '@/components/ui/ItemIcon';
import type { PhaseStatus } from '@/lib/progression/derive';
import type { SatData } from '@/lib/data/types';
import { cn, fmt } from '@/lib/utils';

export function PhaseTracker({
  phases,
  data,
  currentPhase,
}: {
  phases: PhaseStatus[];
  data: SatData | null;
  currentPhase?: number;
}) {
  return (
    <div className="space-y-3">
      {currentPhase == null && (
        <Card>
          <CardBody className="text-xs text-ficsit-subtle">
            This save didn&apos;t expose a game-phase manager, so elevator progress is unknown. The
            phase costs below are still accurate — they just aren&apos;t checked off.
          </CardBody>
        </Card>
      )}
      {phases.map(({ phase, state, delivered, remaining }) => {
        const totalReq = phase.cost.reduce((n, c) => n + c.amount, 0);
        const totalDone = delivered.reduce((n, c) => n + c.amount, 0);
        return (
          <Card
            key={phase.phase}
            className={cn(state === 'active' && 'border-ficsit-accent/50')}
          >
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Rocket className="h-3.5 w-3.5" />
                  Phase {phase.phase} — {phase.name}
                </span>
              }
              right={
                state === 'done' ? (
                  <Badge tone="good">
                    <Check className="h-3 w-3" /> Complete
                  </Badge>
                ) : state === 'active' ? (
                  <Badge tone="accent">In progress</Badge>
                ) : (
                  <Badge tone="muted">Locked</Badge>
                )
              }
            />
            <CardBody className="space-y-3 p-3">
              <ProgressBar
                value={totalReq === 0 ? 0 : totalDone / totalReq}
                tone={state === 'done' ? 'good' : 'accent'}
              />
              <ul className="space-y-1.5">
                {phase.cost.map((c, i) => {
                  const got = delivered[i]?.amount ?? 0;
                  const left = remaining[i]?.amount ?? 0;
                  return (
                    <li key={c.item} className="flex items-center gap-2 text-sm">
                      <ItemIcon className={c.item} size={20} />
                      <span className="min-w-0 flex-1 truncate">
                        {data?.items[c.item]?.name ?? c.item}
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums">
                        <span className={got >= c.amount ? 'text-ficsit-good' : 'text-ficsit-text'}>
                          {fmt(got, 0)}
                        </span>
                        <span className="text-ficsit-subtle"> / {fmt(c.amount, 0)}</span>
                      </span>
                      {left > 0 && (
                        <span className="w-24 shrink-0 text-right font-mono text-[10px] tabular-nums text-ficsit-warn">
                          {fmt(left, 0)} to go
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
