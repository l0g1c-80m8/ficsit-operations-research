'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shell/AppShell';
import { Button } from '@/components/ui/Button';
import { SaveDropzone } from '@/components/save-viewer/SaveDropzone';
import { SaveSummary } from '@/components/save-viewer/SaveSummary';
import { SaveHistory } from '@/components/save-viewer/SaveHistory';
import type { ParsedSaveSummary, SaveHistoryEntry } from '@/lib/save/types';
import {
  appendHistory,
  clearHistory,
  exportHistoryJSON,
  importHistoryJSON,
  loadHistory,
  removeHistory,
} from '@/lib/save/history';
import { History, RotateCcw } from 'lucide-react';

export default function SavePage() {
  const [summary, setSummary] = useState<ParsedSaveSummary | null>(null);
  const [history, setHistory] = useState<SaveHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    // Auto-load the most recent upload on first visit so the page isn't empty.
    if (h.length > 0 && !summary) setSummary(h[0].summary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onParsed = (s: ParsedSaveSummary, file: File) => {
    appendHistory(file, s);
    setHistory(loadHistory());
    setSummary(s);
  };

  const onLoadFromHistory = (entry: SaveHistoryEntry) => {
    setSummary(entry.summary);
    setShowHistory(false);
  };

  const onDeleteFromHistory = (id: string) => {
    const next = removeHistory(id);
    setHistory(next);
    if (next.length === 0) setSummary(null);
  };

  const onClearAll = () => {
    if (!confirm('Delete all saved file history? This cannot be undone.')) return;
    clearHistory();
    setHistory([]);
    setSummary(null);
  };

  const onExport = () => {
    const blob = new Blob([exportHistoryJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ficsit-save-history-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const { merged } = importHistoryJSON(text);
      setHistory(merged);
    } catch (e) {
      alert(`Import failed: ${(e as Error).message}`);
    }
  };

  return (
    <>
      <PageHeader
        title="Save File Viewer"
        subtitle="Drop a .sav for a layered top-down topograph. Past uploads are remembered locally."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4" /> History
              {history.length > 0 && (
                <span className="ml-1 rounded bg-ficsit-bg/40 px-1 text-[10px] font-mono">
                  {history.length}
                </span>
              )}
            </Button>
            {summary && (
              <Button variant="ghost" size="sm" onClick={() => setSummary(null)} title="Close current view">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        }
      />
      <div className="space-y-4 p-6">
        <SaveDropzone onParsed={onParsed} />
        {summary && <SaveSummary summary={summary} />}
      </div>

      <SaveHistory
        open={showHistory}
        onClose={() => setShowHistory(false)}
        history={history}
        onLoad={onLoadFromHistory}
        onDelete={onDeleteFromHistory}
        onClearAll={onClearAll}
        onExport={onExport}
        onImport={onImport}
      />
    </>
  );
}
