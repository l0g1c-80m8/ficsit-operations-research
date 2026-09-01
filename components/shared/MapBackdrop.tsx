'use client';
// Shared SVG backdrop for the two world-space views: the save Topograph and the
// /atlas marker map. Extracted from Topograph so both draw the same rectangle,
// the same two-tier grid, and the same procedural biome wash — a marker at
// world (x, y) lands in the same visual spot on either.

import { cn } from '@/lib/utils';
import { SAT_MAP_BOUNDS, type ViewBox } from '@/lib/save/bounds';

export type BgMode = 'grid' | 'terrain' | 'plain';

/** Renders the canvas backdrop. Three modes:
 *  - 'plain'   — solid near-black rect (no grid).
 *  - 'grid'    — dark base with a two-tier grid (100 m thin lines + 1 km
 *               bolder lines). Lines render as explicit `<line>` elements so
 *               their stroke width can be tied to the *current* viewBox —
 *               world-unit strokes in a pattern would collapse to fractional
 *               pixels at default zoom.
 *  - 'terrain' — base + procedural biome blobs (no external assets) + grid.
 *               Self-contained, zero copyright surface. */
export function BackgroundLayer({
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
export function ProceduralTerrain() {
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
        <clipPath id="terrain-clip">
          <rect x={SAT_MAP_BOUNDS.x} y={SAT_MAP_BOUNDS.y} width={SAT_MAP_BOUNDS.w} height={SAT_MAP_BOUNDS.h} />
        </clipPath>
      </defs>
      {/* Mask everything to the play area so blurred edges don't bleed past
          the actual world rectangle. */}
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
export function Grid({ worldBox, viewBox }: { worldBox: ViewBox; viewBox: ViewBox }) {
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

/** Background-mode chip strip shared by the Topograph and Atlas toolbars. */
export function BgChips({ mode, onSelect }: { mode: BgMode; onSelect: (m: BgMode) => void }) {
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
