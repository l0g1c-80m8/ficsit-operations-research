'use client';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { fmt } from '@/lib/utils';
import type { ParsedSaveSummary } from '@/lib/save/types';

export function SaveSummary({ summary }: { summary: ParsedSaveSummary }) {
  const h = summary.header;
  const hours = h ? h.playDurationSeconds / 3600 : 0;

  return (
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

      <Card>
        <CardHeader
          title="Topography"
          subtitle="2D footprint of every placed actor (top-down, X/Y plane)."
        />
        <CardBody>
          {summary.actors.length === 0 ? (
            <p className="text-sm text-ficsit-subtle">
              Header parsed. Actor positions weren't available from the parser version installed — install/upgrade{' '}
              <code>@etothepii/satisfactory-file-parser</code> if you'd like to visualize structures here.
            </p>
          ) : (
            <Topograph summary={summary} />
          )}
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title="Top Classes" subtitle="Most common actor classes in the save." />
        <CardBody>
          {summary.classCounts.length === 0 ? (
            <p className="text-sm text-ficsit-subtle">No class histogram available.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2 xl:grid-cols-3">
              {summary.classCounts.map((c) => (
                <li key={c.className} className="flex items-center justify-between border-b border-ficsit-border/60 py-1">
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
      <span className="font-mono">{v}</span>
    </div>
  );
}

function Topograph({ summary }: { summary: ParsedSaveSummary }) {
  if (!summary.bbox) return null;
  const { minX, maxX, minY, maxY } = summary.bbox;
  const w = 640;
  const h = 480;
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const scale = Math.min(w / dx, h / dy);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-md border border-ficsit-border bg-ficsit-bg">
      <rect x={0} y={0} width={w} height={h} fill="#0d1117" />
      {summary.actors.map((a, i) => {
        const x = (a.x - minX) * scale;
        const y = h - (a.y - minY) * scale;
        return <circle key={i} cx={x} cy={y} r={0.8} fill="#f97316" opacity={0.6} />;
      })}
    </svg>
  );
}
