'use client';
import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { ParsedSaveSummary } from '@/lib/save/types';
import { parseSaveFile } from '@/lib/save/parse';

export function SaveDropzone({
  onParsed,
}: {
  onParsed: (s: ParsedSaveSummary, file: File) => void;
}) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handle = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      try {
        const result = await parseSaveFile(file);
        onParsed(result, file);
      } catch (e) {
        setError((e as Error).message || 'Failed to parse save file.');
      } finally {
        setBusy(false);
      }
    },
    [onParsed],
  );

  return (
    <Card>
      <CardBody>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handle(f);
          }}
          className={cn(
            'grid place-items-center rounded-md border-2 border-dashed py-12 text-center transition-colors',
            drag ? 'border-ficsit-accent bg-ficsit-accent/5' : 'border-ficsit-border',
          )}
        >
          <Upload className="mb-3 h-8 w-8 text-ficsit-subtle" />
          <p className="text-sm">
            Drop a Satisfactory <code>.sav</code> here, or
            <label className="ml-1 cursor-pointer text-ficsit-accent hover:underline">
              browse
              <input
                type="file"
                accept=".sav"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handle(f);
                }}
              />
            </label>
          </p>
          <p className="mt-1 text-xs text-ficsit-subtle">
            Parsed entirely in your browser. Nothing is uploaded.
          </p>
          {busy && <p className="mt-3 text-xs text-ficsit-accent">Parsing…</p>}
          {error && <p className="mt-3 text-xs text-ficsit-bad">{error}</p>}
        </div>
      </CardBody>
    </Card>
  );
}
