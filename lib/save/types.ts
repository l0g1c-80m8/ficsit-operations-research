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

export interface PlacedActor {
  className: string;
  /** world x */
  x: number;
  /** world y */
  y: number;
  /** world z (height) */
  z: number;
}

export interface ParsedSaveSummary {
  header: SaveHeaderInfo | null;
  actorCount: number;
  /** subset of placed objects with positions — capped for perf */
  actors: PlacedActor[];
  /** counts by simplified class name */
  classCounts: { className: string; count: number }[];
  /** axis-aligned bounding box of placed actors */
  bbox: { minX: number; maxX: number; minY: number; maxY: number } | null;
}
