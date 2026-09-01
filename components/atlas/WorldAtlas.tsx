'use client';
// Native SVG world map for /atlas: static resource-node and collectible markers
// drawn in UE world coordinates on the shared MapBackdrop, so the same (x, y)
// lands in the same place here and on the save Topograph.

import { useMemo, useRef, useState } from 'react';
import { Crosshair, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BackgroundLayer, BgChips, type BgMode } from '@/components/shared/MapBackdrop';
import { paddedWorldBox } from '@/lib/save/bounds';
import { usePanZoom } from '@/lib/hooks/use-pan-zoom';
import type { MarkerLayer, MarkerPurity, WorldMarker } from '@/lib/data/markers';
import { cn, fmt } from '@/lib/utils';
import {
  CATEGORY_ORDER,
  CATEGORY_SHAPE,
  markerColor,
  markerPath,
  markerRadius,
  PURITY_LABEL,
  PURITY_SCALE,
} from './markerStyles';

/** One marker flattened with the layer context the tooltip needs. */
interface FlatMarker {
  m: WorldMarker;
  layer: MarkerLayer;
  color: string;
}

export function WorldAtlas({
  layers,
  visibleLayers,
  visiblePurities,
}: {
  layers: MarkerLayer[];
  /** Layer ids currently switched on. */
  visibleLayers: Set<string>;
  /** Purities to show for markers that carry one; markers without purity always show. */
  visiblePurities: Set<MarkerPurity>;
}) {
  const worldBox = useMemo(() => paddedWorldBox(), []);
  const { svgRef, viewBox, cursor, handlers, zoomBy, reset, panning } = usePanZoom(worldBox);
  const [bgMode, setBgMode] = useState<BgMode>('terrain');
  const [fullscreen, setFullscreen] = useState(false);
  const [hover, setHover] = useState<{ marker: FlatMarker; left: number; top: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Flatten to a single indexable array so hover can use one delegated
  // listener instead of 2 000+ per-element handlers.
  const flat = useMemo<FlatMarker[]>(() => {
    const out: FlatMarker[] = [];
    for (const cat of CATEGORY_ORDER) {
      for (const layer of layers) {
        if (layer.category !== cat) continue;
        if (!visibleLayers.has(layer.id)) continue;
        for (const m of layer.markers) {
          if (m.purity && !visiblePurities.has(m.purity)) continue;
          out.push({ m, layer, color: markerColor(layer.id, m.subtype) });
        }
      }
    }
    return out;
  }, [layers, visibleLayers, visiblePurities]);

  const onPointerOver = (e: React.PointerEvent<SVGGElement>) => {
    const el = (e.target as Element).closest?.('[data-marker]');
    const idx = el ? Number(el.getAttribute('data-marker')) : NaN;
    const wrap = wrapRef.current;
    if (!el || !Number.isInteger(idx) || !flat[idx] || !wrap) {
      setHover(null);
      return;
    }
    const rect = wrap.getBoundingClientRect();
    setHover({
      marker: flat[idx],
      left: e.clientX - rect.left,
      top: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative overflow-hidden rounded-lg border border-ficsit-border bg-ficsit-panel',
        fullscreen && 'fixed inset-0 z-50 rounded-none',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-ficsit-border px-3 py-2">
        <BgChips mode={bgMode} onSelect={setBgMode} />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => zoomBy(1.4)} title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => zoomBy(1 / 1.4)} title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={reset} title="Fit to view">
            <Crosshair className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="ml-auto font-mono text-[11px] text-ficsit-subtle">
          {cursor
            ? `${fmt(cursor.x / 100, 0)} m, ${fmt(cursor.y / 100, 0)} m`
            : `${fmt(flat.length, 0)} markers`}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        className={cn('w-full touch-none select-none', panning ? 'cursor-grabbing' : 'cursor-grab')}
        style={{ height: fullscreen ? 'calc(100vh - 3.25rem)' : 'calc(100vh - 16rem)' }}
        {...handlers}
      >
        <BackgroundLayer worldBox={worldBox} viewBox={viewBox} mode={bgMode} />
        <g onPointerOver={onPointerOver} onPointerLeave={() => setHover(null)}>
          {flat.map((f, i) => (
            <Marker key={`${f.layer.id}-${i}`} index={i} flat={f} viewBoxW={viewBox.w} />
          ))}
        </g>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-[16rem] rounded-md border border-ficsit-border bg-ficsit-panel/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur"
          style={{
            left: Math.min(hover.left + 14, (wrapRef.current?.clientWidth ?? 0) - 200),
            top: hover.top + 14,
          }}
        >
          <div className="flex items-center gap-1.5 font-semibold">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: hover.marker.color }}
            />
            {hover.marker.layer.label}
            {hover.marker.m.subtype && (
              <span className="capitalize text-ficsit-subtle">· {hover.marker.m.subtype}</span>
            )}
          </div>
          {hover.marker.m.purity && (
            <div className="mt-0.5 text-ficsit-subtle">
              Purity: <span className="text-ficsit-text">{PURITY_LABEL[hover.marker.m.purity]}</span>
            </div>
          )}
          <div className="mt-0.5 font-mono text-[10px] text-ficsit-subtle">
            {fmt(hover.marker.m.x / 100, 0)} m, {fmt(hover.marker.m.y / 100, 0)} m,{' '}
            {fmt(hover.marker.m.z / 100, 0)} m
          </div>
        </div>
      )}
    </div>
  );
}

function Marker({ index, flat, viewBoxW }: { index: number; flat: FlatMarker; viewBoxW: number }) {
  const { m, layer, color } = flat;
  const shape = CATEGORY_SHAPE[layer.category];
  const r = markerRadius(viewBoxW, layer.category) * (m.purity ? PURITY_SCALE[m.purity] : 1);
  // Pure nodes get a bright halo so the best sites read at a glance.
  const stroke = m.purity === 'pure' ? '#f8fafc' : '#0d1117';
  const strokeWidth = r * (m.purity === 'pure' ? 0.28 : 0.2);

  const common = {
    'data-marker': index,
    fill: color,
    stroke,
    strokeWidth,
  } as const;

  if (shape === 'circle') {
    return <circle cx={m.x} cy={m.y} r={r} {...common} />;
  }
  return <path transform={`translate(${m.x} ${m.y})`} d={markerPath(shape, r)} {...common} />;
}
