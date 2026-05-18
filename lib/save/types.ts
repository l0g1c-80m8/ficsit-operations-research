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
 * groups so the topograph can render each in its own color/shape, with toggles.
 * Names are chosen so each bucket has a clearly delimited scope; do NOT lump
 * extractors with generators or pipes with fluid tanks. */
export type SaveCategory =
  | 'foundation'      // foundations, walls, roofs, ramps, beams, frames, structural
  | 'production'      // production machines (Constructor … Quantum Encoder)
  | 'extractor'       // miners, oil/water/fracking extractors + pressurizer
  | 'generator'       // power generators (biomass, coal, fuel, nuclear, geothermal)
  | 'power_grid'      // power lines, poles, switches, towers
  | 'power_storage'   // power storage units + Alien Power Augmenter
  | 'conveyor'        // belts, lifts, splitters, mergers, conveyor poles
  | 'pipeline'        // pipes, pumps, valves, junctions, supports, flow meters
  | 'hypertube'       // hypertube segments, entrances, boosters — player transit
  | 'fluid_storage'   // fluid buffers, pipe storage tanks
  | 'item_storage'    // storage containers, dimensional depot, central storage
  | 'rail'            // rail track, stations, freight platforms, signals
  | 'train'           // locomotives, freight wagons (rolling stock)
  | 'vehicle'         // road vehicles (trucks, tractors, explorer, factory cart)
  | 'pioneer'         // hub, workbench, equipment workshop, AWESOME sink/shop, MAM
  | 'decoration'      // signs, lights, beacons, displays
  | 'misc';           // anything unrecognized

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
  /** For production machines that have a recipe assigned in-game, this is
   *  the simplified recipe class name (e.g. `Recipe_IronPlate_C`). Undefined
   *  for machines with no recipe set or for non-production actors. */
  currentRecipe?: string;
}

/** A single edge in the topograph network rendering — either a spline
 *  segment on a belt/pipe/hypertube/rail actor, or a power-line connection
 *  resolved from its source/target pole references. World-space coords. */
export interface NetworkEdge {
  category: SaveCategory;
  ax: number;
  ay: number;
  /** World Z of endpoint A; allows the floor slicer to filter cross-floor edges. */
  az: number;
  bx: number;
  by: number;
  bz: number;
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
  /** Explicit edges for network categories — extracted from `mSplineData` on
   *  spline-based actors (rails/hypertubes/pipes/non-chain belts) and from
   *  `PowerLineSpecialProperties` source/target on power-line actors. */
  connections: NetworkEdge[];
}

/** A persisted upload entry in the save history (localStorage). */
export interface SaveHistoryEntry {
  id: string;
  fileName: string;
  uploadedAt: number;
  fileSize: number;
  summary: ParsedSaveSummary;
}

// v2: category taxonomy split (extractor/generator/power_storage, train,
// pioneer, decoration, fluid_storage); old v1 entries are ignored on load.
export const SAVE_HISTORY_KEY = 'ficsit.save.history.v2';
