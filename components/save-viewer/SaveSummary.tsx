'use client';
import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, fmt } from '@/lib/utils';
import type { ParsedSaveSummary } from '@/lib/save/types';
import { Topograph } from './Topograph';
import { SaveStats } from './SaveStats';
import { SaveVerify } from './SaveVerify';
import { Crosshair, X } from 'lucide-react';

export function SaveSummary({ summary }: { summary: ParsedSaveSummary }) {
  const h = summary.header;
  const hours = h ? h.playDurationSeconds / 3600 : 0;
  const [highlightClasses, setHighlightClasses] = useState<Set<string>>(new Set());

  const toggleHighlight = (cls: string) =>
    setHighlightClasses((s) => {
      const next = new Set(s);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader title="Session Header" />
          <CardBody className="space-y-1.5 text-sm">
            <Row k="Session" v={h?.sessionName ?? '—'} />
            <Row k="Map" v={h?.mapName ?? '—'} />
            <Row k="Build" v={h?.buildVersion?.toString() ?? '—'} />
            <Row k="Save version" v={h?.saveVersion?.toString() ?? '—'} />
            <Row k="Play time" v={`${fmt(hours, 1)} h`} />
            <Row k="Actors" v={fmt(summary.actorCount)} />
          </CardBody>
        </Card>

        <Topograph summary={summary} highlightClasses={highlightClasses} />
      </div>

      <SaveStats summary={summary} />

      <SaveVerify summary={summary} />

      <Card>
        <CardHeader
          title="Top Classes"
          subtitle="Click a row to highlight every instance of that class on the topograph."
          right={
            highlightClasses.size > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setHighlightClasses(new Set())}>
                <X className="h-3.5 w-3.5" /> Clear ({highlightClasses.size})
              </Button>
            )
          }
        />
        <CardBody>
          {summary.classCounts.length === 0 ? (
            <p className="text-sm text-ficsit-subtle">No class histogram available.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2 xl:grid-cols-3">
              {summary.classCounts.map((c) => {
                const on = highlightClasses.has(c.className);
                return (
                  <li key={c.className}>
                    <button
                      type="button"
                      onClick={() => toggleHighlight(c.className)}
                      className={cn(
                        'flex w-full items-center justify-between rounded px-2 py-1 text-left transition-colors',
                        on
                          ? 'bg-amber-500/15 ring-1 ring-amber-500/40 text-amber-200'
                          : 'border-b border-ficsit-border/60 hover:bg-ficsit-panel2/40',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        {on && <Crosshair className="h-3 w-3 shrink-0 text-amber-300" />}
                        <span className="truncate font-mono text-xs">{c.className}</span>
                      </span>
                      <Badge tone={on ? 'warn' : 'muted'}>{fmt(c.count)}</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-ficsit-subtle">{k}</span>
      <span className="truncate font-mono">{v}</span>
    </div>
  );
}
