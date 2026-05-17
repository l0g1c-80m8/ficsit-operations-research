'use client';
import { useMemo, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { cn, fmt } from '@/lib/utils';
import type { ParsedSaveSummary, PlacedActor, SaveCategory } from '@/lib/save/types';
import { CATEGORY_META } from '@/lib/save/categorize';

const ORDERED_CATEGORIES: SaveCategory[] = (
  Object.entries(CATEGORY_META) as [SaveCategory, (typeof CATEGORY_META)[SaveCategory]][]
)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([k]) => k);

export function Topograph({ summary }: { summary: ParsedSaveSummary }) {
  const initialVisible = useMemo<Record<SaveCategory, boolean>>(() => ({
    foundation: true, rail: true, belt: true, pipe: true, power: true,
    storage: true, extractor: true, production: true, vehicle: true, misc: false,
  }), []);
  const [visible, setVisible] = useState(initialVisible);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  if (!summary.bbox || summary.actors.length === 0) {
    return (
      <Card>
        <CardHeader title="Topography" subtitle="2D footprint of every placed actor (top-down, X/Y plane)." />
        <CardBody>
          <p className="text-sm text-ficsit-subtle">
            No actor geometry available. Reupload with a newer version of the parser, or this save
            doesn't have placed entities.
          </p>
        </CardBody>
      </Card>
    );
  }

  const { minX, maxX, minY, maxY } = summary.bbox;
  const padding = 4000; // cm — give the plot a small border
  const x0 = minX - padding, x1 = maxX + padding;
  const y0 = minY - padding, y1 = maxY + padding;
  const worldW = x1 - x0 || 1;
  const worldH = y1 - y0 || 1;
  const viewW = 1000;
  const viewH = (worldH / worldW) * viewW;
  // World-units → SVG-units conversion factor.
  const scale = viewW / worldW;

  const grouped = useMemo(() => {
    const map = new Map<SaveCategory, PlacedActor[]>();
    for (const a of summary.actors) {
      const arr = map.get(a.category);
      if (arr) arr.push(a);
      else map.set(a.category, [a]);
    }
    return map;
  }, [summary]);

  const setLayerVisible = (cat: SaveCategory, v: boolean) =>
    setVisible((s) => ({ ...s, [cat]: v }));

  const all = (v: boolean) =>
    setVisible(
      Object.fromEntries(ORDERED_CATEGORIES.map((c) => [c, v])) as Record<SaveCategory, boolean>,
    );

  return (
    <Card className={cn(fullscreen && 'fixed inset-4 z-50 flex flex-col overflow-hidden')}>
      <CardHeader
        title="Topography"
        subtitle={`${fmt(summary.actors.length)} actors · ${fmt(worldW / 100, 0)}m × ${fmt(worldH / 100, 0)}m footprint`}
        right={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z / 1.4))} title="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setZoom(1)} title="Reset zoom">
              <span className="font-mono text-[10px]">{Math.round(zoom * 100)}%</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(8, z * 1.4))} title="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setFullscreen((f) => !f)}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        }
      />
      <CardBody className={cn('space-y-3', fullscreen && 'flex flex-1 flex-col')}>
        <LayerControls
          counts={summary.categoryCounts}
          visible={visible}
          onToggle={setLayerVisible}
          onAll={all}
        />

        <div
          className={cn(
            'overflow-auto rounded-md border border-ficsit-border bg-ficsit-bg',
            fullscreen ? 'flex-1' : 'max-h-[70vh]',
          )}
        >
          <div style={{ width: viewW * zoom, height: viewH * zoom }}>
            <svg
              viewBox={`${x0} ${y0} ${worldW} ${worldH}`}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              // Flip Y so north is up — Satisfactory's +Y is north but SVG's +Y is down.
              style={{ transform: 'scaleY(-1)' }}
            >
              <rect x={x0} y={y0} width={worldW} height={worldH} fill="#0d1117" />
              {/* World-axis cross at origin */}
              <line x1={x0} y1={0} x2={x1} y2={0} stroke="#1c232c" strokeWidth={Math.max(20, 1 / scale)} />
              <line x1={0} y1={y0} x2={0} y2={y1} stroke="#1c232c" strokeWidth={Math.max(20, 1 / scale)} />
              {ORDERED_CATEGORIES.filter((c) => visible[c]).map((cat) => (
                <Layer key={cat} category={cat} actors={grouped.get(cat) ?? []} />
              ))}
            </svg>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-ficsit-subtle">
          <span>+Y north · +X east · origin marked with thin cross</span>
          <span>scroll / drag to pan · use zoom controls above</span>
        </div>
      </CardBody>
    </Card>
  );
}

function LayerControls({
  counts,
  visible,
  onToggle,
  onAll,
}: {
  counts: Record<SaveCategory, number>;
  visible: Record<SaveCategory, boolean>;
  onToggle: (c: SaveCategory, v: boolean) => void;
  onAll: (v: boolean) => void;
}) {
  return (
    <div className="rounded-md border border-ficsit-border bg-ficsit-panel2/40 p-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ficsit-subtle">Layers</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onAll(true)}>
            <Eye className="h-3 w-3" /> All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAll(false)}>
            <EyeOff className="h-3 w-3" /> None
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {ORDERED_CATEGORIES.map((c) => {
          const meta = CATEGORY_META[c];
          const count = counts[c] ?? 0;
          const on = visible[c];
          return (
            <label
              key={c}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors',
                on
                  ? 'border-ficsit-border bg-ficsit-panel hover:bg-ficsit-panel2'
                  : 'border-ficsit-border/40 bg-ficsit-panel2/30 text-ficsit-subtle hover:bg-ficsit-panel2',
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => onToggle(c, e.target.checked)}
                  className="h-3.5 w-3.5 accent-ficsit-accent"
                />
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: meta.color, opacity: on ? 1 : 0.4 }}
                />
                <span className="truncate">{meta.label}</span>
              </span>
              <span className="shrink-0 font-mono text-[10px] text-ficsit-subtle">{fmt(count)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Layer({ category, actors }: { category: SaveCategory; actors: PlacedActor[] }) {
  const meta = CATEGORY_META[category];
  if (actors.length === 0) return null;

  // Dots can be drawn as one combined path to keep the DOM small.
  if (meta.shape === 'dot') {
    const r = meta.size / 2;
    // Single path with many subpaths — far cheaper than N <circle> elements.
    // M<x>,<y> m -r,0 a r,r 0 1,0 2r,0 a r,r 0 1,0 -2r,0
    const d = actors
      .map((a) => `M${a.x},${a.y}m -${r},0 a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 -${2 * r},0`)
      .join(' ');
    return <path d={d} fill={meta.color} opacity={meta.opacity} />;
  }

  // Pull shape into a local of the narrowed type so the .map closure sees it.
  const shape: 'rect' | 'triangle' | 'line' = meta.shape;
  return (
    <g fill={meta.color} opacity={meta.opacity}>
      {actors.map((a, i) => (
        <ActorMark key={i} actor={a} shape={shape} size={meta.size} />
      ))}
    </g>
  );
}

function ActorMark({
  actor,
  shape,
  size,
}: {
  actor: PlacedActor;
  shape: 'rect' | 'triangle' | 'line';
  size: number;
}) {
  const w = size * actor.scale;
  const h = size * actor.scale;
  // SVG is flipped (scaleY(-1)), so we negate yaw to keep visual orientation consistent.
  const transform = `translate(${actor.x},${actor.y}) rotate(${-actor.yaw})`;
  if (shape === 'rect') {
    return <rect x={-w / 2} y={-h / 2} width={w} height={h} transform={transform} rx={w / 12} ry={h / 12} />;
  }
  if (shape === 'triangle') {
    const half = size / 2;
    return (
      <polygon
        points={`0,${-half} ${half * 0.8},${half * 0.6} ${-half * 0.8},${half * 0.6}`}
        transform={transform}
      />
    );
  }
  // line: a thin horizontal segment, rotated by yaw
  return <rect x={-size / 2} y={-size / 10} width={size} height={size / 5} transform={transform} />;
}
