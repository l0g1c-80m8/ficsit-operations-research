export interface SaveHeaderInfo {
  saveHeaderVersion: number;
  saveVersion: number;
  buildVersion: number;
  mapName: string;
  mapOptions: string;
  sessionName: string;
  playDurationSeconds: number;
  saveDateTimeTicks: string;
  sessionVisibility: number;
}

/** Coarse category — buckets every save actor by typePath into one of these
 * groups so the topograph can render each in its own color/shape, with toggles. */
export type SaveCategory =
  | 'foundation'
  | 'belt'
  | 'pipe'
  | 'power'
  | 'production'
  | 'storage'
  | 'extractor'
  | 'vehicle'
  | 'rail'
  | 'misc';

export interface PlacedActor {
  className: string;
  /** world x */
  x: number;
  /** world y */
  y: number;
  /** world z (height) */
  z: number;
  /** yaw (rotation around Z, looking down) in degrees */
  yaw: number;
  /** uniform horizontal scale (max of |scale.x|, |scale.y|); foundations etc. may scale */
  scale: number;
  category: SaveCategory;
}

export interface ParsedSaveSummary {
  header: SaveHeaderInfo | null;
  actorCount: number;
  /** subset of placed objects with positions — capped for perf */
  actors: PlacedActor[];
  /** counts by simplified class name */
  classCounts: { className: string; count: number }[];
  /** counts per category (for the layer-filter UI) */
  categoryCounts: Record<SaveCategory, number>;
  /** axis-aligned bounding box of placed actors */
  bbox: { minX: number; maxX: number; minY: number; maxY: number } | null;
}

/** A persisted upload entry in the save history (localStorage). */
export interface SaveHistoryEntry {
  id: string;
  fileName: string;
  uploadedAt: number;
  fileSize: number;
  summary: ParsedSaveSummary;
}

export const SAVE_HISTORY_KEY = 'ficsit.save.history.v1';
