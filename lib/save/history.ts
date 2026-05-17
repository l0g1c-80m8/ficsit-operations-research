// Thin localStorage layer for the Save File upload history.
//
// The summary objects can get large (a 30-50k actor save serializes to a few MB);
// we cap the history to MAX_ENTRIES and silently drop the oldest entries if
// localStorage throws QuotaExceededError.

import type { ParsedSaveSummary, SaveHistoryEntry } from './types';
import { SAVE_HISTORY_KEY } from './types';

const MAX_ENTRIES = 15;

export function loadHistory(): SaveHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SaveHistoryEntry[];
  } catch {
    return [];
  }
}

export function writeHistory(entries: SaveHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  let toWrite = entries.slice(0, MAX_ENTRIES);
  while (toWrite.length > 0) {
    try {
      window.localStorage.setItem(SAVE_HISTORY_KEY, JSON.stringify(toWrite));
      return;
    } catch {
      // Probably QuotaExceededError — drop the oldest entry and try again.
      toWrite = toWrite.slice(0, -1);
    }
  }
}

export function appendHistory(file: File, summary: ParsedSaveSummary): SaveHistoryEntry {
  const entry: SaveHistoryEntry = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: file.name,
    uploadedAt: Date.now(),
    fileSize: file.size,
    summary,
  };
  const next = [entry, ...loadHistory()];
  writeHistory(next);
  return entry;
}

export function removeHistory(id: string): SaveHistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  writeHistory(next);
  return next;
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SAVE_HISTORY_KEY);
}

export function exportHistoryJSON(): string {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), schema: SAVE_HISTORY_KEY, entries: loadHistory() },
    null,
    2,
  );
}

export function importHistoryJSON(text: string): { merged: SaveHistoryEntry[]; added: number } {
  const obj = JSON.parse(text) as { entries?: SaveHistoryEntry[] } | SaveHistoryEntry[];
  const incoming = Array.isArray(obj) ? obj : obj.entries;
  if (!incoming || !Array.isArray(incoming)) throw new Error('Invalid save-history export');
  const byId = new Map(loadHistory().map((e) => [e.id, e]));
  let added = 0;
  for (const e of incoming) {
    if (!byId.has(e.id)) added++;
    byId.set(e.id, e);
  }
  const merged = [...byId.values()].sort((a, b) => b.uploadedAt - a.uploadedAt);
  writeHistory(merged);
  return { merged, added };
}
