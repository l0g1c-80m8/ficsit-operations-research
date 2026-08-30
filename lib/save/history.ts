// Persistence layer for the Save File upload history.
//
// This used to live in localStorage, but a single ParsedSaveSummary (up to
// ~80 k actors) serializes to several MB — well past the ~5 MB localStorage
// quota. The old code caught QuotaExceededError and dropped entries until the
// list was empty, so in practice *nothing* ever persisted and the History
// drawer was always blank. IndexedDB stores structured clones with a
// multi-hundred-MB budget, so full summaries survive a reload and can be
// re-viewed. All calls are async and best-effort — a storage failure degrades
// to an empty/unchanged history rather than throwing into the UI.

import type { ParsedSaveSummary, SaveHistoryEntry } from './types';
import { SAVE_HISTORY_KEY } from './types';

const DB_NAME = 'ficsit-save-viewer';
const DB_VERSION = 1;
const STORE = 'history';
const MAX_ENTRIES = 15;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('uploadedAt', 'uploadedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
  return dbPromise;
}

/** Run a single request against the object store and resolve its result. */
function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
      }),
  );
}

/** One-time best-effort migration of any small histories left behind in
 *  localStorage by the previous implementation. Runs on first load; clears the
 *  old key once copied so it doesn't re-import. */
let migrated = false;
async function migrateFromLocalStorage(): Promise<void> {
  if (migrated || typeof window === 'undefined') return;
  migrated = true;
  try {
    const raw = window.localStorage.getItem(SAVE_HISTORY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const entries: SaveHistoryEntry[] = Array.isArray(parsed) ? parsed : parsed?.entries;
    if (Array.isArray(entries)) {
      await Promise.all(entries.map((e) => run('readwrite', (s) => s.put(e)).catch(() => undefined)));
    }
    window.localStorage.removeItem(SAVE_HISTORY_KEY);
  } catch {
    // Ignore — migration is a nicety, not a requirement.
  }
}

export async function loadHistory(): Promise<SaveHistoryEntry[]> {
  try {
    await migrateFromLocalStorage();
    const all = await run<SaveHistoryEntry[]>('readonly', (s) => s.getAll());
    return all.sort((a, b) => b.uploadedAt - a.uploadedAt);
  } catch {
    return [];
  }
}

/** Delete the oldest entries beyond MAX_ENTRIES so the store stays bounded. */
async function trimHistory(): Promise<void> {
  const all = await loadHistory(); // sorted newest-first
  if (all.length <= MAX_ENTRIES) return;
  await Promise.all(
    all.slice(MAX_ENTRIES).map((e) => run('readwrite', (s) => s.delete(e.id)).catch(() => undefined)),
  );
}

export async function appendHistory(
  file: File,
  summary: ParsedSaveSummary,
): Promise<SaveHistoryEntry[]> {
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
  try {
    await run('readwrite', (s) => s.put(entry));
    await trimHistory();
  } catch {
    // Storage failed — return whatever we can still read.
  }
  return loadHistory();
}

export async function removeHistory(id: string): Promise<SaveHistoryEntry[]> {
  try {
    await run('readwrite', (s) => s.delete(id));
  } catch {
    // ignore
  }
  return loadHistory();
}

export async function clearHistory(): Promise<void> {
  try {
    await run('readwrite', (s) => s.clear());
  } catch {
    // ignore
  }
}

export async function exportHistoryJSON(): Promise<string> {
  const entries = await loadHistory();
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), schema: SAVE_HISTORY_KEY, entries },
    null,
    2,
  );
}

export async function importHistoryJSON(
  text: string,
): Promise<{ merged: SaveHistoryEntry[]; added: number }> {
  const obj = JSON.parse(text) as { entries?: SaveHistoryEntry[] } | SaveHistoryEntry[];
  const incoming = Array.isArray(obj) ? obj : obj.entries;
  if (!incoming || !Array.isArray(incoming)) throw new Error('Invalid save-history export');
  const existing = new Set((await loadHistory()).map((e) => e.id));
  let added = 0;
  for (const e of incoming) {
    if (!e || typeof e.id !== 'string') continue;
    if (!existing.has(e.id)) added++;
    await run('readwrite', (s) => s.put(e)).catch(() => undefined);
  }
  await trimHistory();
  return { merged: await loadHistory(), added };
}
