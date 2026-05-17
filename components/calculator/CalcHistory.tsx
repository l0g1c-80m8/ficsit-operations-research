'use client';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FileButton } from '@/components/ui/FileButton';
import { ItemIcon } from '@/components/ui/ItemIcon';
import { fmt } from '@/lib/utils';
import type { CalcSaveEntry } from '@/lib/calculator/types';
import { Download, Trash2, Upload, RotateCw, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';

export function CalcHistory({
  open,
  onClose,
  history,
  onLoad,
  onDelete,
  onClearAll,
  onExport,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  history: CalcSaveEntry[];
  onLoad: (entry: CalcSaveEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const sorted = useMemo(() => history.slice().sort((a, b) => b.savedAt - a.savedAt), [history]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="w-[560px]"
      title="Calculation History"
      subtitle={`${history.length} saved ${history.length === 1 ? 'plan' : 'plans'}`}
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={onExport}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <FileButton accept="application/json,.json" onSelect={onImport}>
              <Upload className="h-3.5 w-3.5" /> Import
            </FileButton>
          </div>
          {history.length > 0 && (
            <Button variant="danger" size="sm" onClick={onClearAll}>
              <Trash2 className="h-3.5 w-3.5" /> Clear all
            </Button>
          )}
        </div>
      }
    >
      {sorted.length === 0 ? (
        <div className="p-6 text-center text-sm text-ficsit-subtle">
          No saved plans yet. Press <span className="text-ficsit-text font-medium">Save plan</span> on
          the Calculator to bookmark the current setup.
        </div>
      ) : (
        <ul className="divide-y divide-ficsit-border">
          {sorted.map((entry) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              onLoad={() => onLoad(entry)}
              onDelete={() => onDelete(entry.id)}
            />
          ))}
        </ul>
      )}
    </Drawer>
  );
}

function HistoryRow({
  entry,
  onLoad,
  onDelete,
}: {
  entry: CalcSaveEntry;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const s = entry.summary;
  return (
    <li className="group p-4 hover:bg-ficsit-panel2/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{entry.name}</h3>
            {s?.status === 'infeasible' && <Badge tone="bad"><AlertTriangle className="h-3 w-3" /> infeasible</Badge>}
            {s?.status === 'optimal' && <Badge tone="good">optimal</Badge>}
          </div>
          <div className="mt-0.5 text-[11px] text-ficsit-subtle">
            {new Date(entry.savedAt).toLocaleString()}
          </div>

          {s && s.outputs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.outputs.map((o) => (
                <span
                  key={o.item}
                  className="inline-flex items-center gap-1 rounded-md border border-ficsit-good/30 bg-ficsit-good/10 px-1.5 py-0.5 text-[11px]"
                  title={`${fmt(o.ratePerMin)}/m`}
                >
                  <ItemIcon className={o.item} size={14} />
                  <span className="font-mono text-ficsit-good">{fmt(o.ratePerMin)}/m</span>
                </span>
              ))}
            </div>
          )}

          {s && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ficsit-subtle">
              <span>{fmt(s.totalMachines, 1)} machines</span>
              <span>·</span>
              <span>{fmt(s.totalPowerKW)} MW</span>
              <span>·</span>
              <span>{s.recipeLines} recipes</span>
              <span>·</span>
              <span>
                {entry.inputs.supplies.filter((x) => x.rate > 0).length} supplies,{' '}
                {entry.inputs.targets.filter((x) => x.item).length} targets
              </span>
              {entry.inputs.allowAlternates && (
                <>
                  <span>·</span>
                  <Badge tone="warn">Alts</Badge>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="primary" size="sm" onClick={onLoad}>
            <RotateCw className="h-3.5 w-3.5" /> Load
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}
