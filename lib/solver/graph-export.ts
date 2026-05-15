// Convert a ProductionGraph into download formats: JSON, Graphviz DOT, etc.
//
// SVG and PNG export are handled in the React component, since they read from
// the rendered DOM.

import type { ProductionGraph, GraphNode } from './graph';

export function graphToJSON(graph: ProductionGraph): string {
  return JSON.stringify(graph, null, 2);
}

export function graphToDOT(graph: ProductionGraph, title = 'FICSIT Production Plan'): string {
  const lines: string[] = [];
  lines.push(`// ${title}`);
  lines.push(`// generated ${new Date().toISOString()}`);
  lines.push(`digraph FICSIT {`);
  lines.push(`  rankdir=LR;`);
  lines.push(`  bgcolor="#0d1117";`);
  lines.push(`  node [fontname="Helvetica" color="#262d36" fontcolor="#e6edf3"];`);
  lines.push(`  edge [fontname="Helvetica" color="#8b949e" fontcolor="#e6edf3" fontsize=10];`);
  lines.push('');

  for (const n of graph.nodes) {
    lines.push(`  "${n.id}" [${nodeAttrs(n)}];`);
  }
  lines.push('');
  for (const e of graph.edges) {
    const label = `${round(e.ratePerMin)}/m`;
    lines.push(`  "${e.from}" -> "${e.to}" [label="${label}"];`);
  }
  lines.push(`}`);
  return lines.join('\n');
}

function nodeAttrs(n: GraphNode): string {
  if (n.kind === 'recipe') {
    const label = [
      n.label.replace(/"/g, '\\"'),
      `${round(n.machines ?? 0, 2)}× ${labelForBuilding(n.building ?? '')}`,
      `${round(n.powerKW ?? 0)} MW`,
    ].join('\\n');
    return `label="${label}" shape=box style="filled,rounded" fillcolor="#161b22" fontcolor="#e6edf3"`;
  }
  // Item nodes
  const tone = n.isRaw ? '#1f4733' : n.isFinal ? '#3a2a13' : '#1c232c';
  const label = [
    n.label.replace(/"/g, '\\"'),
    `${round(Math.max(n.totalInRate ?? 0, n.totalOutRate ?? 0))} /m`,
  ].join('\\n');
  return `label="${label}" shape=ellipse style=filled fillcolor="${tone}" fontcolor="#e6edf3"`;
}

function labelForBuilding(cls: string): string {
  return cls.replace(/^Desc_/, '').replace(/_C$/, '');
}

function round(n: number, d = 1) {
  return Number.isFinite(n) ? Number(n.toFixed(d)) : 0;
}

/** Download a string as a file. Safe to call from a click handler. */
export function download(content: string | Blob, filename: string, mime?: string) {
  const blob = typeof content === 'string' ? new Blob([content], { type: mime ?? 'text/plain' }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
