'use client';
import { useMemo, useRef, useState } from 'react';
import dagre from '@dagrejs/dagre';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useGameData } from '@/lib/data/use-data';
import { cn, fmt } from '@/lib/utils';
import type { FactoryPlan } from '@/lib/solver/factory-solver';
import { buildProductionGraph, type GraphNode, type GraphEdge, type ProductionGraph } from '@/lib/solver/graph';
import { graphToDOT, graphToJSON, download } from '@/lib/solver/graph-export';
import { assetPath } from '@/lib/utils/paths';
import { Code2, Download, FileJson, ImageDown, Maximize2, Minimize2 } from 'lucide-react';

interface LaidOutNode extends GraphNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LaidOutEdge extends GraphEdge {
  points: { x: number; y: number }[];
}

interface Layout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
}

const RECIPE_W = 220;
const RECIPE_H = 86;
const ITEM_W = 170;
const ITEM_H = 56;
const PAD = 24;

function layout(graph: ProductionGraph): Layout {
  if (graph.nodes.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 80, marginx: PAD, marginy: PAD } as Record<string, unknown>);
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of graph.nodes) {
    g.setNode(n.id, {
      width: n.kind === 'recipe' ? RECIPE_W : ITEM_W,
      height: n.kind === 'recipe' ? RECIPE_H : ITEM_H,
    });
  }
  graph.edges.forEach((e, i) => {
    g.setEdge(e.from, e.to, { weight: 1 + e.ratePerMin / 60 }, `e${i}`);
  });
  dagre.layout(g);

  const nodes: LaidOutNode[] = graph.nodes.map((n) => {
    const d = g.node(n.id);
    return { ...n, x: d.x - d.width / 2, y: d.y - d.height / 2, width: d.width, height: d.height };
  });

  const edges: LaidOutEdge[] = graph.edges.map((e, i) => {
    const d = g.edge({ v: e.from, w: e.to, name: `e${i}` });
    return { ...e, points: (d?.points ?? []) as { x: number; y: number }[] };
  });

  return { nodes, edges, width: g.graph().width ?? 800, height: g.graph().height ?? 600 };
}

export function PlanGraph({ plan }: { plan: FactoryPlan }) {
  const { data } = useGameData();
  const svgRef = useRef<SVGSVGElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const graph = useMemo(() => (data ? buildProductionGraph(plan, data) : { nodes: [], edges: [] }), [plan, data]);
  const lo = useMemo(() => layout(graph), [graph]);

  const empty = lo.nodes.length === 0;

  if (empty) {
    return (
      <Card>
        <CardBody className="text-center text-sm text-ficsit-subtle py-12">
          Run the solver first — the graph mirrors the optimized recipe plan.
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className={cn(fullscreen && 'fixed inset-4 z-40 overflow-hidden')}>
      <CardHeader
        title="Production Graph"
        subtitle="From raw inputs (left) to your targets (right). Edge labels are items/minute."
        right={
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={() => exportSVG(svgRef.current)}>
              <Download className="h-3.5 w-3.5" /> SVG
            </Button>
            <Button variant="secondary" size="sm" onClick={() => exportPNG(svgRef.current)}>
              <ImageDown className="h-3.5 w-3.5" /> PNG
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => download(graphToDOT(graph), `ficsit-plan-${Date.now()}.dot`)}
              title="Graphviz DOT"
            >
              <Code2 className="h-3.5 w-3.5" /> DOT
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => download(graphToJSON(graph), `ficsit-plan-${Date.now()}.json`, 'application/json')}
            >
              <FileJson className="h-3.5 w-3.5" /> JSON
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setFullscreen((f) => !f)}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        }
      />
      <CardBody>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
          <LegendDot color="bg-emerald-700/80 border-emerald-500" label="Raw source" />
          <LegendDot color="bg-amber-700/70 border-amber-500" label="Final product" />
          <LegendDot color="bg-ficsit-panel2 border-ficsit-border" label="Intermediate item" />
          <LegendDot color="bg-ficsit-accent/20 border-ficsit-accent/60" label="Recipe" />
        </div>
        <div
          className={cn(
            'overflow-auto rounded-md border border-ficsit-border bg-ficsit-bg',
            fullscreen ? 'h-[calc(100vh-12rem)]' : 'max-h-[70vh]',
          )}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${lo.width} ${lo.height}`}
            width={lo.width}
            height={lo.height}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="#8b949e" />
              </marker>
            </defs>
            {lo.edges.map((e, i) => (
              <EdgeView key={i} edge={e} />
            ))}
            {lo.nodes.map((n) => (
              <NodeView key={n.id} node={n} />
            ))}
          </svg>
        </div>
      </CardBody>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ficsit-subtle">
      <span className={cn('inline-block h-3 w-3 rounded-sm border', color)} />
      {label}
    </span>
  );
}

function EdgeView({ edge }: { edge: LaidOutEdge }) {
  if (edge.points.length < 2) return null;
  const path = edge.points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const mid = edge.points[Math.floor(edge.points.length / 2)];
  return (
    <g>
      <path d={path} fill="none" stroke="#3d444d" strokeWidth={1.2} markerEnd="url(#arrow)" />
      <g transform={`translate(${mid.x}, ${mid.y - 6})`}>
        <rect x={-22} y={-9} width={44} height={14} rx={3} fill="#161b22" stroke="#262d36" strokeWidth={0.6} />
        <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#e6edf3" fontFamily="ui-monospace, Menlo, monospace">
          {fmt(edge.ratePerMin, 1)}/m
        </text>
      </g>
    </g>
  );
}

function NodeView({ node }: { node: LaidOutNode }) {
  if (node.kind === 'recipe') return <RecipeNode node={node} />;
  return <ItemNode node={node} />;
}

function ItemNode({ node }: { node: LaidOutNode }) {
  const tone = node.isRaw
    ? { fill: 'rgba(16,124,76,0.35)', stroke: '#22c55e' }
    : node.isFinal
      ? { fill: 'rgba(120,53,15,0.35)', stroke: '#f59e0b' }
      : { fill: '#1c232c', stroke: '#262d36' };
  const total = Math.max(node.totalInRate ?? 0, node.totalOutRate ?? 0);
  const iconUrl = assetPath(`/icons/items/${node.iconClass}.png`);
  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <rect width={node.width} height={node.height} rx={10} ry={10} fill={tone.fill} stroke={tone.stroke} strokeWidth={1.2} />
      <image href={iconUrl} x={8} y={(node.height - 36) / 2} width={36} height={36} />
      <text x={52} y={20} fontSize="12" fill="#e6edf3" fontFamily="Helvetica, sans-serif" fontWeight="600">
        {clip(node.label, 18)}
      </text>
      <text x={52} y={38} fontSize="10" fill="#8b949e" fontFamily="ui-monospace, Menlo, monospace">
        {fmt(total, 1)} /m
        {node.isRaw && '  ·  raw'}
        {node.isFinal && '  ·  target'}
      </text>
    </g>
  );
}

function RecipeNode({ node }: { node: LaidOutNode }) {
  const iconUrl = assetPath(`/icons/buildings/${node.iconClass}.png`);
  const variable = node.isVariablePower && node.minPower != null && node.maxPower != null;
  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <rect
        width={node.width}
        height={node.height}
        rx={8}
        ry={8}
        fill="rgba(249,115,22,0.06)"
        stroke="rgba(249,115,22,0.4)"
        strokeWidth={1.4}
      />
      <image href={iconUrl} x={10} y={(node.height - 40) / 2} width={40} height={40} />
      <text x={58} y={20} fontSize="13" fill="#e6edf3" fontFamily="Helvetica, sans-serif" fontWeight="600">
        {clip(node.label, 22)}
      </text>
      {node.isAlternate && (
        <g>
          <rect x={58} y={26} width={28} height={11} rx={2} fill="rgba(234,179,8,0.18)" stroke="rgba(234,179,8,0.5)" strokeWidth={0.6} />
          <text x={72} y={34} textAnchor="middle" fontSize="8" fill="#eab308" fontFamily="Helvetica, sans-serif">ALT</text>
        </g>
      )}
      <text x={58} y={54} fontSize="10" fill="#8b949e" fontFamily="ui-monospace, Menlo, monospace">
        ×{fmt(node.machines ?? 0, 2)} machines
      </text>
      <text x={58} y={70} fontSize="10" fill="#f97316" fontFamily="ui-monospace, Menlo, monospace">
        {variable
          ? `${fmt(node.minPower!)}–${fmt(node.maxPower!)} MW`
          : `${fmt(node.powerKW ?? 0)} MW`}
      </text>
    </g>
  );
}

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/* ─────────────── SVG / PNG export ─────────────── */

async function exportSVG(svg: SVGSVGElement | null) {
  if (!svg) return;
  const standalone = await standaloneSVG(svg);
  download(standalone, `ficsit-plan-${Date.now()}.svg`, 'image/svg+xml');
}

async function exportPNG(svg: SVGSVGElement | null) {
  if (!svg) return;
  const standalone = await standaloneSVG(svg);
  const blob = new Blob([standalone], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = (svg.viewBox.baseVal.width || svg.clientWidth) * scale;
    canvas.height = (svg.viewBox.baseVal.height || svg.clientHeight) * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => {
      if (b) download(b, `ficsit-plan-${Date.now()}.png`, 'image/png');
    }, 'image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Clones the rendered SVG and inlines every <image> href as a base64 data URI so
 * the export is self-contained and renders in any viewer (including Inkscape). */
async function standaloneSVG(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Inline a default background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', '#0d1117');
  clone.insertBefore(bg, clone.firstChild);

  const images = clone.querySelectorAll('image');
  const cache = new Map<string, string>();
  await Promise.all(
    Array.from(images).map(async (img) => {
      const href = img.getAttribute('href') ?? img.getAttribute('xlink:href');
      if (!href) return;
      let data = cache.get(href);
      if (!data) {
        try {
          data = await urlToDataURI(href);
          cache.set(href, data);
        } catch {
          return;
        }
      }
      img.setAttribute('href', data);
    }),
  );
  return new XMLSerializer().serializeToString(clone);
}

async function urlToDataURI(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}
