'use client';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { fmt } from '@/lib/utils';
import type { ParsedSaveSummary } from '@/lib/save/types';
import { Topograph } from './Topograph';

export function SaveSummary({ summary }: { summary: ParsedSaveSummary }) {
  const h = summary.header;
  const hours = h ? h.playDurationSeconds / 3600 : 0;

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

        <Topograph summary={summary} />
      </div>

      <Card>
        <CardHeader title="Top Classes" subtitle="Most common actor classes in the save." />
        <CardBody>
          {summary.classCounts.length === 0 ? (
            <p className="text-sm text-ficsit-subtle">No class histogram available.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2 xl:grid-cols-3">
              {summary.classCounts.map((c) => (
                <li
                  key={c.className}
                  className="flex items-center justify-between border-b border-ficsit-border/60 py-1"
                >
                  <span className="truncate text-ficsit-subtle">{c.className}</span>
                  <Badge tone="muted">{fmt(c.count)}</Badge>
                </li>
              ))}
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
