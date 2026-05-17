'use client';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FileButton } from '@/components/ui/FileButton';
import { fmt } from '@/lib/utils';
import { Download, Trash2, Upload, RotateCw } from 'lucide-react';
import { useMemo } from 'react';
import type { SaveHistoryEntry } from '@/lib/save/types';

export function SaveHistory({
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
  history: SaveHistoryEntry[];
  onLoad: (e: SaveHistoryEntry) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const sorted = useMemo(() => history.slice().sort((a, b) => b.uploadedAt - a.uploadedAt), [history]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="w-[560px]"
      title="Save File History"
      subtitle={`${history.length} upload${history.length === 1 ? '' : 's'} stored locally`}
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
          No save files uploaded yet. Drop a <code>.sav</code> on the dropzone and it'll appear here automatically.
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
  entry: SaveHistoryEntry;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const s = entry.summary;
  const hours = s.header ? s.header.playDurationSeconds / 3600 : 0;
  return (
    <li className="group p-4 hover:bg-ficsit-panel2/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{entry.fileName}</h3>
            {s.header?.sessionName && <Badge tone="muted">{s.header.sessionName}</Badge>}
          </div>
          <div className="mt-0.5 text-[11px] text-ficsit-subtle">
            {new Date(entry.uploadedAt).toLocaleString()} ·{' '}
            {(entry.fileSize / 1024 / 1024).toFixed(1)} MB on disk
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ficsit-subtle">
            <span>{fmt(s.actorCount)} actors</span>
            <span>·</span>
            <span>{fmt(hours, 1)} h play time</span>
            <span>·</span>
            <span>build {s.header?.buildVersion ?? '?'}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(s.categoryCounts ?? {})
              .filter(([, n]) => n > 0)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([cat, n]) => (
                <Badge key={cat} tone="muted">
                  {cat} {fmt(n)}
                </Badge>
              ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="primary" size="sm" onClick={onLoad}>
            <RotateCw className="h-3.5 w-3.5" /> View
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}
