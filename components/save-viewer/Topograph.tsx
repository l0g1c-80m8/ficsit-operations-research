'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Crosshair,
  Download,
  Eye,
  EyeOff,
  ImageDown,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn, fmt } from '@/lib/utils';
import type { ParsedSaveSummary, PlacedActor, SaveCategory } from '@/lib/save/types';
import { CATEGORY_META, type CategoryMeta, type CategoryShape } from '@/lib/save/categorize';
import { actorOnFloor, detectFloors, type DetectedFloor } from '@/lib/save/floors';
import { buildProximityEdges } from '@/lib/save/network';
import { download } from '@/lib/solver/graph-export';

/** Approximate Satisfactory play-area bounds in UE world units (1 unit = 1 cm).
 *  Used to anchor the procedural terrain blobs across the in-game playable
 *  rectangle so the background lines up roughly with where buildings can be
 *  placed. */
const SAT_MAP_BOUNDS = { x: -324_698, y: -375_000, w: 749_628, h: 750_000 } as const;

type BgMode = 'grid' | 'terrain' | 'plain';

const ORDERED_CATEGORIES: SaveCategory[] = (
  Object.entries(CATEGORY_META) as [SaveCategory, (typeof CATEGORY_META)[SaveCategory]][]
)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([k]) => k);

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function Topograph({
  summary,
  highlightClasses,
}: {
  summary: ParsedSaveSummary;
  /** Optional set of className(s) to highlight with an outline ring. */
  highlightClasses?: Set<string>;
}) {
  const initialVisible = useMemo<Record<SaveCategory, boolean>>(
    () => ({
      foundation: true,
      production: true,
      extractor: true,
      generator: true,
      power_grid: true,
      power_storage: true,
      conveyor: true,
      pipeline: true,
      hypertube: true,
      fluid_storage: true,
      item_storage: true,
      rail: true,
      train: true,
      vehicle: true,
      pioneer: true,
      decoration: false, // off by default — usually thousands of signs/lights add clutter
      misc: false,
    }),
    [],
  );
  const [visible, setVisible] = useState(initialVisible);
  const [fullscreen, setFullscreen] = useState(false);
  // null = all floors visible; otherwise the DetectedFloor.idx to isolate.
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  // Background mode: 'grid' is the default (visible 100 m / 1 km gridlines on
  // a dark base). 'terrain' adds a procedural biome backdrop underneath the
  // grid — soft colored blobs roughly placed where Satisfactory's major
  // biomes sit. 'plain' restores the original solid-dark fill.
  const [bgMode, setBgMode] = useState<BgMode>('grid');
  const svgRef = useRef<SVGSVGElement>(null);

  const floors = useMemo(() => detectFloors(summary.actors), [summary]);
  // Drop the selection if the new save doesn't have that floor (e.g. switching
  // history entries). Cheap to recompute on every render.
  useEffect(() => {
    if (selectedFloor != null && !floors.some((f) => f.idx === selectedFloor)) {
      setSelectedFloor(null);
    }
  }, [floors, selectedFloor]);
  const activeFloor = selectedFloor == null ? null : floors.find((f) => f.idx === selectedFloor) ?? null;

  // Compute world bounds once per summary. Add a small border so things on the
  // edge don't sit flush against the canvas frame.
  const worldBox = useMemo(() => {
    if (!summary.bbox) return { x: -1000, y: -1000, w: 2000, h: 2000 };
    const { minX, maxX, minY, maxY } = summary.bbox;
    const pad = 4000;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };
  }, [summary]);

  /** World Z bounds for the side elevation view (summary.bbox is X/Y only). */
  const zBounds = useMemo(() => {
    if (summary.actors.length === 0) return { zMin: 0, zMax: 1000 };
    let zMin = Infinity, zMax = -Infinity;
    for (const a of summary.actors) {
      if (a.z < zMin) zMin = a.z;
      if (a.z > zMax) zMax = a.z;
    }
    const pad = 400;
    return { zMin: zMin - pad, zMax: zMax + pad };
  }, [summary]);

  const [viewBox, setViewBox] = useState<ViewBox>(worldBox);
  // Reset view whenever a new save is loaded.
  useEffect(() => setViewBox(worldBox), [worldBox]);

  // Cursor world coords for the HUD. null when cursor isn't over the canvas.
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startVB: ViewBox; startPt: { x: number; y: number } } | null>(null);

  // grouped: actors split by category, filtered to the active floor if any.
  // filteredCounts: per-category totals used by LayerControls. When a floor
  // is selected, these reflect what's actually on-screen; otherwise we fall
  // through to summary.categoryCounts which already covers everything.
  const { grouped, filteredCounts } = useMemo(() => {
    const map = new Map<SaveCategory, PlacedActor[]>();
    const counts = activeFloor
      ? ({} as Partial<Record<SaveCategory, number>>)
      : null;
    for (const a of summary.actors) {
      if (activeFloor && !actorOnFloor(a, activeFloor)) continue;
      const arr = map.get(a.category);
      if (arr) arr.push(a);
      else map.set(a.category, [a]);
      if (counts) counts[a.category] = (counts[a.category] ?? 0) + 1;
    }
    return {
      grouped: map,
      filteredCounts: counts as Record<SaveCategory, number> | null,
    };
  }, [summary, activeFloor]);

  const screenToWorld = useCallback((e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    return pt.matrixTransform(inv);
  }, []);

  // React 18+ attaches `onWheel` to the document root as a *passive* listener,
  // so `e.preventDefault()` inside an `onWheel` prop is a no-op and the page
  // continues to scroll. Attach a native non-passive handler on the SVG so
  // the wheel only zooms the map and never bubbles to page scroll.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const worldPt = screenToWorld(e);
      if (!worldPt) return;
      const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
      setViewBox((vb) => {
        const minW = 1000;
        const maxW = worldBox.w * 1.4;
        const newW = clamp(vb.w * factor, minW, maxW);
        const newH = clamp(vb.h * factor, minW * (vb.h / vb.w), maxW * (vb.h / vb.w));
        // Keep the world point under the cursor stationary.
        const ratioX = (worldPt.x - vb.x) / vb.w;
        const ratioY = (worldPt.y - vb.y) / vb.h;
        return { x: worldPt.x - ratioX * newW, y: worldPt.y - ratioY * newH, w: newW, h: newH };
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [screenToWorld, worldBox]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return; // left-click pan only
      const worldPt = screenToWorld(e);
      if (!worldPt) return;
      svgRef.current?.setPointerCapture(e.pointerId);
      dragRef.current = { startVB: viewBox, startPt: worldPt };
    },
    [screenToWorld, viewBox],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const worldPt = screenToWorld(e);
      if (!worldPt) return;
      setCursor({ x: worldPt.x, y: worldPt.y });
      const drag = dragRef.current;
      if (!drag) return;
      // The startPt was computed under the OLD viewBox; the current call's
      // worldPt is under the LATEST viewBox. To pan correctly, recompute the
      // current world point under the drag-start viewBox and slide vb so they
      // coincide.
      const svg = svgRef.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const rect = svg.getBoundingClientRect();
      const sx = (e.clientX - rect.left) / rect.width;
      const sy = (e.clientY - rect.top) / rect.height;
      const currentWorldX = drag.startVB.x + sx * drag.startVB.w;
      const currentWorldY = drag.startVB.y + sy * drag.startVB.h;
      const dx = drag.startPt.x - currentWorldX;
      const dy = drag.startPt.y - currentWorldY;
      setViewBox({
        x: drag.startVB.x + dx,
        y: drag.startVB.y + dy,
        w: drag.startVB.w,
        h: drag.startVB.h,
      });
    },
    [screenToWorld],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (svgRef.current?.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      // Zoom around viewbox center.
      setViewBox((vb) => {
        const minW = 1000;
        const maxW = worldBox.w * 1.4;
        const newW = clamp(vb.w / factor, minW, maxW);
        const newH = clamp(vb.h / factor, minW * (vb.h / vb.w), maxW * (vb.h / vb.w));
        const cx = vb.x + vb.w / 2;
        const cy = vb.y + vb.h / 2;
        return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
      });
    },
    [worldBox],
  );

  if (!summary.bbox || summary.actors.length === 0) {
    return (
      <Card>
        <CardHeader title="Topography" subtitle="2D footprint of every placed actor (top-down, X/Y plane)." />
        <CardBody>
          <p className="text-sm text-ficsit-subtle">
            No actor geometry available in this save.
          </p>
        </CardBody>
      </Card>
    );
  }

  const setLayerVisible = (cat: SaveCategory, v: boolean) =>
    setVisible((s) => ({ ...s, [cat]: v }));
  const all = (v: boolean) =>
    setVisible(Object.fromEntries(ORDERED_CATEGORIES.map((c) => [c, v])) as Record<SaveCategory, boolean>);

  // Display-only zoom %, computed from how zoomed-in the viewBox is vs initial.
  const zoomPct = Math.round((worldBox.w / viewBox.w) * 100);
  const isDragging = dragRef.current !== null;

  return (
    <Card className={cn('min-w-0', fullscreen && 'fixed inset-4 z-50 flex flex-col overflow-hidden')}>
      <CardHeader
        title="Topography"
        subtitle={`${fmt(summary.actors.length)} actors · ${fmt(worldBox.w / 100, 0)}m × ${fmt(worldBox.h / 100, 0)}m footprint`}
        right={
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={() => exportSVG(svgRef.current, summary, worldBox)} title="Download as SVG">
              <Download className="h-3.5 w-3.5" /> SVG
            </Button>
            <Button variant="secondary" size="sm" onClick={() => exportPNG(svgRef.current, summary, worldBox)} title="Download as PNG (2× resolution)">
              <ImageDown className="h-3.5 w-3.5" /> PNG
            </Button>
            <span className="mx-1 h-5 w-px bg-ficsit-border" />
            <Button variant="ghost" size="sm" onClick={() => zoomBy(1 / 1.4)} title="Zoom out (or scroll-wheel)">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setViewBox(worldBox)} title="Fit to view">
              <span className="font-mono text-[10px]">{zoomPct}%</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => zoomBy(1.4)} title="Zoom in (or scroll-wheel)">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setViewBox(worldBox)} title="Reset / fit to view">
              <Crosshair className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setFullscreen((f) => !f)}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        }
      />
      <CardBody className={cn('space-y-3', fullscreen && 'flex min-h-0 min-w-0 flex-1 flex-col')}>
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-stretch">
          {floors.length > 0 && (
            <FloorChips
              floors={floors}
              selected={selectedFloor}
              onSelect={setSelectedFloor}
            />
          )}
          <BgChips mode={bgMode} onSelect={setBgMode} />
        </div>
        <LayerControls
          counts={filteredCounts ?? summary.categoryCounts}
          filtered={filteredCounts != null}
          visible={visible}
          onToggle={setLayerVisible}
          onAll={all}
        />

        <div
          className={cn(
            'relative overflow-hidden rounded-md border border-ficsit-border bg-ficsit-bg',
            fullscreen ? 'min-h-0 min-w-0 flex-1' : 'aspect-[4/3] max-h-[70vh]',
          )}
        >
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={(e) => {
              setCursor(null);
              onPointerUp(e);
            }}
            style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
          >
            <BackgroundLayer worldBox={worldBox} viewBox={viewBox} mode={bgMode} />
            {/* World-axis cross at origin */}
            <line x1={worldBox.x} y1={0} x2={worldBox.x + worldBox.w} y2={0} stroke="#475569" strokeWidth={viewBox.w * 0.0015} opacity={0.6} />
            <line x1={0} y1={worldBox.y} x2={0} y2={worldBox.y + worldBox.h} stroke="#475569" strokeWidth={viewBox.w * 0.0015} opacity={0.6} />
            {ORDERED_CATEGORIES.filter((c) => visible[c]).map((cat) => (
              <Layer
                key={cat}
                category={cat}
                actors={grouped.get(cat) ?? []}
                viewBoxW={viewBox.w}
                highlightClasses={highlightClasses}
              />
            ))}
            {/* Compass anchored in the SVG container coords (not world). */}
          </svg>
          {/* Overlays — kept in HTML, positioned absolutely on top of the SVG. */}
          <Compass />
          <ScaleBar viewBoxW={viewBox.w} />
          <CursorHUD cursor={cursor} />
        </div>

        {floors.length >= 2 && (
          <SideElevation
            actors={summary.actors}
            xMin={viewBox.x}
            xMax={viewBox.x + viewBox.w}
            zMin={zBounds.zMin}
            zMax={zBounds.zMax}
            floors={floors}
            selected={selectedFloor}
            onSelect={setSelectedFloor}
          />
        )}

        <div className="flex items-center justify-between text-[10px] text-ficsit-subtle">
          <span>North up · East right · scroll to zoom · drag to pan</span>
          <span>
            Hold a row in the <strong>Top Classes</strong> table to highlight on the map.
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

function Compass() {
  return (
    <div className="pointer-events-none absolute right-3 top-3 grid h-14 w-14 place-items-center rounded-full border border-ficsit-border bg-ficsit-bg/85 text-[10px] font-medium text-ficsit-subtle backdrop-blur">
      <div className="absolute top-1 text-ficsit-accent">N</div>
      <div className="absolute bottom-1">S</div>
      <div className="absolute right-1.5">E</div>
      <div className="absolute left-1.5">W</div>
      <div className="h-7 w-px bg-ficsit-accent/60" />
    </div>
  );
}

function CursorHUD({ cursor }: { cursor: { x: number; y: number } | null }) {
  if (!cursor) return null;
  return (
    <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-ficsit-border bg-ficsit-bg/85 px-2 py-1 font-mono text-[10px] text-ficsit-subtle backdrop-blur">
      <span className="text-ficsit-text">{fmt(cursor.x / 100, 0)}m</span>
      <span> · </span>
      <span className="text-ficsit-text">{fmt(-cursor.y / 100, 0)}m</span>
      <span> </span>
      <span>(N/E)</span>
    </div>
  );
}

function ScaleBar({ viewBoxW }: { viewBoxW: number }) {
  // Pick a "nice" round distance in meters that fits in ~15% of the view width.
  const targetMeters = (viewBoxW * 0.15) / 100;
  const niceMeters = niceRound(targetMeters);
  // Width as a fraction of the canvas (assuming preserveAspectRatio meet, the
  // SVG fills the container by viewBoxW horizontally if aspect is wider).
  const widthFrac = (niceMeters * 100) / viewBoxW;
  const widthPct = Math.min(50, Math.max(3, widthFrac * 100));
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 text-[10px] text-ficsit-subtle">
      <div
        className="h-2 border-x-2 border-b-2 border-ficsit-text"
        style={{ width: `${widthPct}%`, minWidth: 40, maxWidth: 240 }}
      />
      <span className="rounded bg-ficsit-bg/80 px-1.5 py-0.5 text-ficsit-text backdrop-blur">
        {fmtDistance(niceMeters)}
      </span>
    </div>
  );
}

function fmtDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km`;
  return `${m} m`;
}

/** Round to a "nice" engineering scale: 1, 2, 5, 10, 20, 50, 100, … */
function niceRound(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const mantissa = v / pow;
  const nice = mantissa < 1.5 ? 1 : mantissa < 3.5 ? 2 : mantissa < 7.5 ? 5 : 10;
  return nice * pow;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function LayerControls({
  counts,
  filtered,
  visible,
  onToggle,
  onAll,
}: {
  counts: Record<SaveCategory, number>;
  filtered: boolean;
  visible: Record<SaveCategory, boolean>;
  onToggle: (c: SaveCategory, v: boolean) => void;
  onAll: (v: boolean) => void;
}) {
  return (
    <div className="rounded-md border border-ficsit-border bg-ficsit-panel2/40 p-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ficsit-subtle">
          Layers{filtered ? <span className="ml-1 text-ficsit-accent">(filtered to selected floor)</span> : null}
        </span>
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
                <LayerShapeBadge color={meta.color} shape={meta.shape} on={on} />
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

/** Renders the topograph's canvas backdrop. Three modes:
 *  - 'plain'   — solid near-black rect (no grid; original look).
 *  - 'grid'    — dark base with a two-tier grid (100 m thin lines + 1 km
 *               bolder lines). Lines render as explicit `<line>` elements so
 *               their stroke width can be tied to the *current* viewBox —
 *               world-unit strokes in a pattern would collapse to fractional
 *               pixels at default zoom.
 *  - 'terrain' — base + procedural biome blobs (no external assets) + grid.
 *               Self-contained, zero copyright surface. */
function BackgroundLayer({
  worldBox,
  viewBox,
  mode,
}: {
  worldBox: ViewBox;
  viewBox: ViewBox;
  mode: BgMode;
}) {
  if (mode === 'plain') {
    return <rect x={worldBox.x} y={worldBox.y} width={worldBox.w} height={worldBox.h} fill="#0d1117" />;
  }
  return (
    <>
      <rect x={worldBox.x} y={worldBox.y} width={worldBox.w} height={worldBox.h} fill="#0d1117" />
      {mode === 'terrain' && <ProceduralTerrain />}
      <Grid worldBox={worldBox} viewBox={viewBox} />
    </>
  );
}

/** Self-contained terrain backdrop: a handful of soft colored ellipses
 *  representing major biomes, blurred to read as a vibey topo overlay rather
 *  than a literal map. Positions are loose impressions, not survey-accurate.
 *  Coordinates are in UE world units anchored to `SAT_MAP_BOUNDS`. */
function ProceduralTerrain() {
  // World Y grows south (the topograph header notes "North up"), so positive
  // cy = bottom of the canvas. Coordinates clamped within play-area bounds.
  const water = { cx: 60_000, cy: -110_000, rx: 200_000, ry: 130_000, fill: '#1e3a5f' };
  const biomes: { cx: number; cy: number; rx: number; ry: number; fill: string }[] = [
    { cx: -160_000, cy: -240_000, rx: 260_000, ry: 220_000, fill: '#2d4a2b' }, // Northern Forest
    { cx:  60_000, cy:   30_000, rx: 240_000, ry: 200_000, fill: '#3a5238' }, // Grass Fields
    { cx:  290_000, cy:  120_000, rx: 220_000, ry: 240_000, fill: '#4a3f2b' }, // Dune Desert
    { cx: -210_000, cy:  120_000, rx: 200_000, ry: 200_000, fill: '#3f3a35' }, // Rocky Desert
    { cx:  320_000, cy: -120_000, rx: 180_000, ry: 240_000, fill: '#2e2e35' }, // Spire Coast
    { cx:   60_000, cy:  250_000, rx: 220_000, ry: 180_000, fill: '#4a5028' }, // Bamboo Fields
    { cx: -120_000, cy:  280_000, rx: 200_000, ry: 160_000, fill: '#3d4525' }, // Titan Forest
  ];
  return (
    <g pointerEvents="none">
      <defs>
        <filter id="terrain-blur" x="-15%" y="-15%" width="130%" height="130%">
          {/* Heavy blur (~120 m sigma) softens the ellipse edges into one
              continuous topo-like wash — without it the discs look like
              poker chips. */}
          <feGaussianBlur stdDeviation="12000" />
        </filter>
      </defs>
      {/* Mask everything to the play area so blurred edges don't bleed past
          the actual world rectangle. */}
      <g clipPath="url(#terrain-clip)" />
      <defs>
        <clipPath id="terrain-clip">
          <rect x={SAT_MAP_BOUNDS.x} y={SAT_MAP_BOUNDS.y} width={SAT_MAP_BOUNDS.w} height={SAT_MAP_BOUNDS.h} />
        </clipPath>
      </defs>
      <g clipPath="url(#terrain-clip)" filter="url(#terrain-blur)" opacity={0.55}>
        {biomes.map((b, i) => (
          <ellipse key={`biome-${i}`} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={b.fill} />
        ))}
        <ellipse cx={water.cx} cy={water.cy} rx={water.rx} ry={water.ry} fill={water.fill} />
      </g>
    </g>
  );
}

/** Draws gridlines as explicit lines so stroke widths can be tied to the
 *  current viewBox (≈ 1 px / 2 px on screen regardless of zoom). At default
 *  zoom the 100 m sub-grid is faint but visible; the 1 km bold lines
 *  dominate. Zoom in and the 100 m lines crisp up automatically. */
function Grid({ worldBox, viewBox }: { worldBox: ViewBox; viewBox: ViewBox }) {
  // Fade the finer 100 m grid when zoomed way out so it doesn't smear into
  // a flat haze. We turn it off when each 100 m cell would render at < 4 px.
  // Assume ~1000 px target canvas width — close enough for the threshold.
  const cellPxApprox = (10_000 / viewBox.w) * 1000;
  const showFine = cellPxApprox >= 4;
  const fineStroke = viewBox.w * 0.0006; // ≈ 0.6 px on screen
  const boldStroke = viewBox.w * 0.0015; // ≈ 1.5 px on screen
  const fineLines: React.ReactNode[] = [];
  const boldLines: React.ReactNode[] = [];

  const STEP_FINE = 10_000;   // 100 m
  const STEP_BOLD = 100_000;  // 1 km
  const xMin = Math.floor(worldBox.x / STEP_FINE) * STEP_FINE;
  const xMax = worldBox.x + worldBox.w;
  const yMin = Math.floor(worldBox.y / STEP_FINE) * STEP_FINE;
  const yMax = worldBox.y + worldBox.h;

  for (let x = xMin; x <= xMax; x += STEP_FINE) {
    const isBold = x % STEP_BOLD === 0;
    const list = isBold ? boldLines : fineLines;
    if (!isBold && !showFine) continue;
    list.push(
      <line
        key={`gx${x}`}
        x1={x}
        y1={worldBox.y}
        x2={x}
        y2={worldBox.y + worldBox.h}
        stroke={isBold ? '#3a4658' : '#222c3a'}
        strokeWidth={isBold ? boldStroke : fineStroke}
      />,
    );
  }
  for (let y = yMin; y <= yMax; y += STEP_FINE) {
    const isBold = y % STEP_BOLD === 0;
    const list = isBold ? boldLines : fineLines;
    if (!isBold && !showFine) continue;
    list.push(
      <line
        key={`gy${y}`}
        x1={worldBox.x}
        y1={y}
        x2={worldBox.x + worldBox.w}
        y2={y}
        stroke={isBold ? '#3a4658' : '#222c3a'}
        strokeWidth={isBold ? boldStroke : fineStroke}
      />,
    );
  }
  // Fine first, bold on top, so 1 km lines visually win where they cross.
  return (
    <g pointerEvents="none">
      {fineLines}
      {boldLines}
    </g>
  );
}

function BgChips({ mode, onSelect }: { mode: BgMode; onSelect: (m: BgMode) => void }) {
  const modes: { id: BgMode; label: string; hint: string }[] = [
    { id: 'grid', label: 'Grid', hint: '100 m / 1 km gridlines' },
    { id: 'terrain', label: 'Terrain', hint: 'Procedural biome blobs underneath the grid' },
    { id: 'plain', label: 'Plain', hint: 'Solid dark canvas' },
  ];
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-ficsit-border bg-ficsit-panel2/40 px-2 py-1.5">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-ficsit-subtle">
        Background
      </span>
      {modes.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m.id)}
          title={m.hint}
          className={cn(
            'shrink-0 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors',
            mode === m.id
              ? 'border-ficsit-accent/60 bg-ficsit-accent/15 text-ficsit-accent ring-1 ring-ficsit-accent/40'
              : 'border-ficsit-border bg-ficsit-panel text-ficsit-text hover:bg-ficsit-panel2',
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function FloorChips({
  floors,
  selected,
  onSelect,
}: {
  floors: DetectedFloor[];
  selected: number | null;
  onSelect: (idx: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto rounded-md border border-ficsit-border bg-ficsit-panel2/40 px-2 py-1.5">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-ficsit-subtle">Floors</span>
      <FloorChip
        active={selected == null}
        label="All"
        onClick={() => onSelect(null)}
        title={`Show every floor (${floors.length} detected)`}
      />
      {floors.map((f) => (
        <FloorChip
          key={f.idx}
          active={selected === f.idx}
          label={`F${f.idx}`}
          sub={`${fmt(f.z / 100, 1)} m`}
          onClick={() => onSelect(selected === f.idx ? null : f.idx)}
          title={`Floor ${f.idx} · Z ≈ ${fmt(f.z / 100, 1)} m · ${fmt(f.count)} foundations`}
        />
      ))}
    </div>
  );
}

function FloorChip({
  active,
  label,
  sub,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  sub?: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'shrink-0 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors',
        active
          ? 'border-ficsit-accent/60 bg-ficsit-accent/15 text-ficsit-accent ring-1 ring-ficsit-accent/40'
          : 'border-ficsit-border bg-ficsit-panel text-ficsit-text hover:bg-ficsit-panel2',
      )}
    >
      <span>{label}</span>
      {sub && <span className="ml-1.5 text-ficsit-subtle">{sub}</span>}
    </button>
  );
}

/** X-Z elevation projection looking south: east is right, world up is up.
 *  Mirrors the main map's X range so it auto-follows pan/zoom horizontally.
 *  Vertical axis is auto-fit to actor Z range, NOT scaled to match X — it's
 *  an elevation view, not an isometric one. Click a floor band to slice. */
function SideElevation({
  actors,
  xMin,
  xMax,
  zMin,
  zMax,
  floors,
  selected,
  onSelect,
}: {
  actors: PlacedActor[];
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  floors: DetectedFloor[];
  selected: number | null;
  onSelect: (idx: number | null) => void;
}) {
  // SVG y grows downward, so we map world Z → -Z and let the viewBox flip.
  const w = Math.max(1, xMax - xMin);
  const h = Math.max(1, zMax - zMin);
  // Dot radius in world units; chosen so a typical 4 m floor band reads cleanly.
  const dotR = Math.max(80, w * 0.0008);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const bandIdx = target.dataset?.floorIdx ? Number(target.dataset.floorIdx) : NaN;
    if (Number.isFinite(bandIdx)) {
      onSelect(selected === bandIdx ? null : bandIdx);
    } else {
      onSelect(null);
    }
  };

  return (
    <div className="rounded-md border border-ficsit-border bg-ficsit-bg">
      <div className="flex items-center justify-between border-b border-ficsit-border px-2 py-1 text-[10px] text-ficsit-subtle">
        <span>
          <strong className="text-ficsit-text">Elevation</strong> · looking south (X-Z) · click a floor band to slice
        </span>
        <span>
          {fmt((zMax - zMin) / 100, 1)} m vertical · {fmt((xMax - xMin) / 100, 0)} m of current view
        </span>
      </div>
      <svg
        viewBox={`${xMin} ${-zMax} ${w} ${h}`}
        width="100%"
        height={160}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        onClick={handleClick}
        style={{ cursor: 'pointer', display: 'block' }}
      >
        <rect x={xMin} y={-zMax} width={w} height={h} fill="#0d1117" />

        {/* Floor bands. Inactive bands paint a subtle stripe; active band gets
            a colored fill + accent outline. Each band has a data-floor-idx so
            clicks resolve cleanly without coordinate math. */}
        {floors.map((f) => {
          const active = selected === f.idx;
          const bandH = f.zMax - f.zMin;
          return (
            <g key={f.idx}>
              <rect
                data-floor-idx={f.idx}
                x={xMin}
                y={-f.zMax}
                width={w}
                height={bandH}
                fill={active ? '#facc1522' : '#1f2937'}
                stroke={active ? '#facc15' : 'transparent'}
                strokeWidth={Math.max(20, w * 0.0004)}
              />
              <line
                x1={xMin}
                x2={xMin + w}
                y1={-f.z}
                y2={-f.z}
                stroke={active ? '#facc15' : '#475569'}
                strokeWidth={Math.max(10, w * 0.0002)}
                strokeDasharray={active ? undefined : `${w * 0.004} ${w * 0.004}`}
              />
              <text
                x={xMin + w * 0.005}
                y={-f.z - bandH * 0.5}
                fill={active ? '#facc15' : '#94a3b8'}
                fontSize={h * 0.08}
                fontFamily="monospace"
                style={{ pointerEvents: 'none' }}
              >
                F{f.idx} · {fmt(f.z / 100, 1)} m
              </text>
            </g>
          );
        })}

        {/* Actor dots, painted on top of the bands. We collapse every category
            to a dot here — the side view is for vertical sense-making, not
            shape identification (the top view handles that). */}
        {ORDERED_CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const matches = actors.filter(
            (a) => a.category === cat && a.x >= xMin && a.x <= xMax,
          );
          if (matches.length === 0) return null;
          const r = cat === 'foundation' ? dotR * 0.6 : dotR;
          const d = matches
            .map((a) => `M${a.x},${-a.z}m -${r},0 a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 -${2 * r},0`)
            .join(' ');
          return (
            <path
              key={cat}
              d={d}
              fill={meta.color}
              opacity={cat === 'foundation' ? 0.35 : meta.opacity * 0.9}
              style={{ pointerEvents: 'none' }}
            />
          );
        })}
      </svg>
    </div>
  );
}

function LayerShapeBadge({ color, shape, on }: { color: string; shape: CategoryShape; on: boolean }) {
  const fill = on ? color : '#3d444d';
  return (
    <svg viewBox="-1 -1 2 2" width={12} height={12} className="shrink-0">
      {shape === 'dot' && <circle r={0.8} fill={fill} />}
      {shape === 'rect' && <rect x={-0.85} y={-0.85} width={1.7} height={1.7} fill={fill} rx={0.2} />}
      {shape === 'triangle' && <polygon points="0,-0.85 0.7,0.6 -0.7,0.6" fill={fill} />}
      {shape === 'line' && <rect x={-0.9} y={-0.2} width={1.8} height={0.4} fill={fill} />}
      {shape === 'network' && (
        <>
          <line x1={-0.85} y1={-0.5} x2={0.85} y2={0.5} stroke={fill} strokeWidth={0.35} strokeLinecap="round" />
          <circle cx={-0.85} cy={-0.5} r={0.25} fill={fill} />
          <circle cx={0.85} cy={0.5} r={0.25} fill={fill} />
        </>
      )}
    </svg>
  );
}

function Layer({
  category,
  actors,
  viewBoxW,
  highlightClasses,
}: {
  category: SaveCategory;
  actors: PlacedActor[];
  viewBoxW: number;
  highlightClasses?: Set<string>;
}) {
  const meta = CATEGORY_META[category];
  if (actors.length === 0) return null;

  if (meta.shape === 'network') {
    return (
      <NetworkLayer
        actors={actors}
        meta={meta}
        viewBoxW={viewBoxW}
        highlightClasses={highlightClasses}
      />
    );
  }

  if (meta.shape === 'dot') {
    const r = meta.size / 2;
    const d = actors
      .map((a) => `M${a.x},${a.y}m -${r},0 a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 -${2 * r},0`)
      .join(' ');
    return (
      <g>
        <path d={d} fill={meta.color} opacity={meta.opacity} />
        {highlightClasses && highlightClasses.size > 0 && (
          <HighlightDots actors={actors} highlightClasses={highlightClasses} />
        )}
      </g>
    );
  }

  const shape: 'rect' | 'triangle' | 'line' = meta.shape;
  return (
    <g>
      <g fill={meta.color} opacity={meta.opacity}>
        {actors.map((a, i) => (
          <ActorMark key={i} actor={a} shape={shape} size={meta.size} />
        ))}
      </g>
      {highlightClasses && highlightClasses.size > 0 && (
        <g fill="none" stroke="#fde047" strokeWidth={Math.max(meta.size * 0.15, 50)}>
          {actors
            .filter((a) => highlightClasses.has(a.className))
            .map((a, i) => (
              <ActorMark key={i} actor={a} shape={shape} size={meta.size * 1.6} />
            ))}
        </g>
      )}
    </g>
  );
}

/** Render a linear-infrastructure category (belts, pipes, hypertubes, rails,
 *  power lines) as inferred edges between same-category nodes.
 *
 *  The save format doesn't carry connection topology in a form we read; we
 *  approximate it via spatial proximity. For each actor we connect to up to
 *  two of its same-category nearest neighbours within `meta.networkMaxDist`,
 *  enough to capture long straight runs plus the occasional branch at a
 *  splitter/junction. Isolated actors still render as a tiny dot so they
 *  don't disappear. The whole thing is collapsed into one `<path>` so 10 k+
 *  belt poles don't drown the DOM. */
function NetworkLayer({
  actors,
  meta,
  viewBoxW,
  highlightClasses,
}: {
  actors: PlacedActor[];
  meta: CategoryMeta;
  viewBoxW: number;
  highlightClasses?: Set<string>;
}) {
  const maxDist = meta.networkMaxDist ?? 1000;
  const edges = useMemo(() => buildProximityEdges(actors, maxDist, 2), [actors, maxDist]);
  // Stroke width scales with the current viewBox so lines stay ≈ 1.5 px
  // wide on screen at any zoom level (≈ 0.0014 × view-box-width / scale).
  const strokeWidth = Math.max(viewBoxW * 0.0014, 30);
  const edgePath = edges.length === 0 ? '' : edges.map((e) => `M${e.ax},${e.ay}L${e.bx},${e.by}`).join('');
  // Tiny dots at every node so an isolated actor (no neighbour within
  // threshold) still reads — about half the previous dot radius.
  const nodeRadius = Math.max(meta.size * 0.25, viewBoxW * 0.0006);
  const nodePath = actors
    .map((a) => `M${a.x},${a.y}m -${nodeRadius},0 a ${nodeRadius},${nodeRadius} 0 1,0 ${2 * nodeRadius},0 a ${nodeRadius},${nodeRadius} 0 1,0 -${2 * nodeRadius},0`)
    .join(' ');
  return (
    <g>
      {edgePath && (
        <path
          d={edgePath}
          fill="none"
          stroke={meta.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={meta.opacity}
        />
      )}
      <path d={nodePath} fill={meta.color} opacity={meta.opacity} />
      {highlightClasses && highlightClasses.size > 0 && (
        <HighlightDots actors={actors} highlightClasses={highlightClasses} />
      )}
    </g>
  );
}


function HighlightDots({
  actors,
  highlightClasses,
}: {
  actors: PlacedActor[];
  highlightClasses: Set<string>;
}) {
  const matches = actors.filter((a) => highlightClasses.has(a.className));
  if (matches.length === 0) return null;
  const r = 200;
  const d = matches
    .map((a) => `M${a.x},${a.y}m -${r},0 a ${r},${r} 0 1,0 ${2 * r},0 a ${r},${r} 0 1,0 -${2 * r},0`)
    .join(' ');
  return <path d={d} fill="none" stroke="#fde047" strokeWidth={60} />;
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
  const transform = `translate(${actor.x},${actor.y}) rotate(${actor.yaw})`;
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
  return <rect x={-size / 2} y={-size / 10} width={size} height={size / 5} transform={transform} />;
}

/* ─────────────────── SVG / PNG export ─────────────────── */

function safeFilename(summary: ParsedSaveSummary): string {
  const session = (summary.header?.sessionName ?? 'save').replace(/[^A-Za-z0-9-]+/g, '_').slice(0, 40);
  return `ficsit-topograph-${session || 'save'}-${Date.now()}`;
}

/** Clone the live SVG and replace its viewBox with the full world bounds so
 *  the exported file always shows everything (regardless of current zoom). */
function buildStandaloneSVG(live: SVGSVGElement, worldBox: ViewBox): string {
  const clone = live.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('viewBox', `${worldBox.x} ${worldBox.y} ${worldBox.w} ${worldBox.h}`);
  const aspect = worldBox.h / Math.max(worldBox.w, 1);
  const exportW = 2400;
  clone.setAttribute('width', String(exportW));
  clone.setAttribute('height', String(Math.round(exportW * aspect)));
  return new XMLSerializer().serializeToString(clone);
}

function exportSVG(svg: SVGSVGElement | null, summary: ParsedSaveSummary, worldBox: ViewBox) {
  if (!svg) return;
  download(buildStandaloneSVG(svg, worldBox), `${safeFilename(summary)}.svg`, 'image/svg+xml');
}

async function exportPNG(svg: SVGSVGElement | null, summary: ParsedSaveSummary, worldBox: ViewBox) {
  if (!svg) return;
  const text = buildStandaloneSVG(svg, worldBox);
  const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = url;
    });
    const aspect = worldBox.h / Math.max(worldBox.w, 1);
    const scale = 2;
    const baseW = 2400;
    const canvas = document.createElement('canvas');
    canvas.width = baseW * scale;
    canvas.height = Math.round(baseW * aspect * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => {
      if (b) download(b, `${safeFilename(summary)}.png`, 'image/png');
    }, 'image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
