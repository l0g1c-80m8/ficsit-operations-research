import type { SaveCategory } from './types';

/** Maps a Satisfactory actor's typePath (or simplified class name) to one of
 *  our layer categories. Order matters — earlier matches win, so more specific
 *  patterns are listed before broader ones (e.g. fluid_storage before pipeline,
 *  power_storage and generator before extractor, train before rail/vehicle). */
const CATEGORY_PATTERNS: { pattern: RegExp; category: SaveCategory }[] = [
  // Fluid tanks/buffers — listed first so they don't fall into `pipeline`.
  { pattern: /Build_(FluidBuffer|PipeStorageTank|PipeReservoir)/i, category: 'fluid_storage' },
  // Power storage and the Alien Power Augmenter — before generators/grid so
  // PowerStorage* doesn't accidentally fall into the power-grid bucket.
  { pattern: /Build_(PowerStorage|AlienPowerBuilding|AlienPower)/i, category: 'power_storage' },
  // Power generators (biomass, coal, fuel, nuclear, geothermal).
  { pattern: /Build_Generator/i, category: 'generator' },
  // Resource extractors (miners + oil/water/resource-well).
  { pattern: /Build_(Miner|OilPump|WaterPump|Fracking)/i, category: 'extractor' },
  // Production / manufacturing apparatus.
  { pattern: /Build_(Manufacturer|Constructor|Smelter|Foundry|OilRefinery|Refinery|Blender|Packager|HadronCollider|Converter|QuantumEncoder|Assembler)/i, category: 'production' },
  // Conveyor network (belts, lifts, splitters, mergers, poles).
  { pattern: /Build_(ConveyorBelt|ConveyorLift|ConveyorAttachment|ConveyorCeilingAttachment|Splitter|Merger|ConveyorPole)/i, category: 'conveyor' },
  // Hypertubes — player transit. Matched *before* `pipeline` so the
  // `PipeHyper*` classes don't get swallowed by the fluid-pipe bucket.
  { pattern: /Build_(PipeHyper|HyperTube)/i, category: 'hypertube' },
  // Pipeline network (pipes, pumps, valves, junctions, supports, flow meters).
  { pattern: /Build_(Pipeline|Valve)/i, category: 'pipeline' },
  // Power transmission grid.
  { pattern: /Build_(PowerLine|PowerPole|PowerSwitch|PriorityPowerSwitch|PowerTower)/i, category: 'power_grid' },
  // Item storage (containers, dimensional depot, central storage).
  { pattern: /Build_(StorageContainer|IndustrialStorageContainer|DimensionalDepot|CentralStorage|StorageBlueprint|StorageHazard|StorageMercer|StoragePlayer)/i, category: 'item_storage' },
  // Rolling stock — match by explicit class names. We deliberately do NOT
  // match the broad `/Train/` path segment because rail-track classes also
  // live under `/Factory/Train/Track/` and that pattern was swallowing them
  // into the train bucket (instead of rail), which silently broke the
  // network-edge extraction downstream.
  { pattern: /(Build_Locomotive|Build_FreightWagon|BP_Locomotive|BP_FreightWagon|BP_Train)/i, category: 'train' },
  // Rail infrastructure (track, stations, platforms, signals).
  { pattern: /Build_(RailroadTrack|RailroadSignal|RailroadSwitch|TrainStation|TrainPlatform|TrainDocking|FreightPlatform)/i, category: 'rail' },
  // Pioneer-placed special buildings: Hub, workbench/workshop, AWESOME, MAM,
  // Space Elevator.
  { pattern: /Build_(TradingPost|WorkBench|Workshop|AwesomeSink|AwesomeShop|SpaceElevator|Mam|HUBTerminal)/i, category: 'pioneer' },
  // Decoration: signs, lights, beacons, displays, customizer placeables.
  { pattern: /Build_(StandaloneWidgetSign|Sign|WallSign|FloodlightWall|FloodlightPole|Floodlight|StreetLight|XmassLights|BeaconMessage|Beacon|Display|Lamp)/i, category: 'decoration' },
  // Foundations / walls / roofs / structural — kept late so its broad walls/
  // roofs/ramps prefixes don't preempt anything more specific above.
  { pattern: /Build_(Foundation|Wall|Roof|Ramp|QuarterPipe|Stairs|Pillar|Beam|FlatBeam|FrameworkSupport|CatwalkRailing|Frame|Concrete|StackableConveyorPole)/i, category: 'foundation' },
  // Road / cart vehicles — last so /Vehicle/ doesn't poach trains/rail above.
  { pattern: /(Build_Truck|Build_Tractor|Build_Explorer|FactoryCart|Cyberwagon|BP_Vehicle|\/Vehicle\/)/i, category: 'vehicle' },
];

export function categorize(typePath: string): SaveCategory {
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(typePath)) return category;
  }
  return 'misc';
}

export type CategoryShape = 'rect' | 'dot' | 'triangle' | 'line' | 'network';

export interface CategoryMeta {
  label: string;
  color: string;
  shape: CategoryShape;
  size: number;
  opacity: number;
  order: number;
  /** For `shape: 'network'`, the max world-unit distance allowed between two
   *  same-category actors to draw an edge between them (1-NN spanning + a few
   *  branch hops). Roughly the typical placement gap for that infrastructure
   *  in-game; over-large values introduce zig-zags across unconnected runs.
   *  Ignored for other shapes. */
  networkMaxDist?: number;
}

export const CATEGORY_META: Record<SaveCategory, CategoryMeta> = {
  // Order = render z-order. Big translucent layers (foundations) render first
  // and sit at the bottom; small dots paint last on top.
  //
  // Palette is hand-picked for maximum *pairwise* hue distance — every
  // category's color is in a different wedge of the wheel from its likely
  // neighbours, so a Constructor next to a Power Pole next to a Conveyor
  // reads as three distinct colors even at one-pixel resolution. Hues were
  // chosen to avoid the previous "three blues / three yellows / three pinks /
  // three slates" clustering. Verified visually on the #0d1117 map background.
  foundation:    { label: 'Foundations & structural', color: '#4b5563', shape: 'rect',     size: 800, opacity: 0.45, order: 0  }, // slate-600 — large translucent backdrop
  rail:          { label: 'Rail infrastructure',      color: '#6366f1', shape: 'network',  size: 220, opacity: 0.85, order: 1,  networkMaxDist: 3500 }, // indigo-500; rail segments are large
  conveyor:      { label: 'Conveyors',                color: '#3b82f6', shape: 'network',  size: 120, opacity: 0.85, order: 2,  networkMaxDist: 1200 }, // blue-500; ~12 m between belt actors
  pipeline:      { label: 'Pipelines',                color: '#0e7490', shape: 'network',  size: 130, opacity: 0.9,  order: 3,  networkMaxDist: 1200 }, // cyan-700 dark
  hypertube:     { label: 'Hypertubes',               color: '#d946ef', shape: 'network',  size: 150, opacity: 0.95, order: 3,  networkMaxDist: 1600 }, // fuchsia — hypertube straights can be a touch longer
  power_grid:    { label: 'Power grid',               color: '#fbbf24', shape: 'network',  size: 140, opacity: 0.95, order: 4,  networkMaxDist: 6000 }, // amber-400; power lines span much further
  fluid_storage: { label: 'Fluid storage',            color: '#22d3ee', shape: 'rect',     size: 420, opacity: 0.95, order: 5  }, // cyan-400 bright — lets fluid tanks pop against pipeline dark cyan
  item_storage:  { label: 'Item storage',             color: '#a855f7', shape: 'rect',     size: 400, opacity: 0.95, order: 6  }, // purple-500
  power_storage: { label: 'Power storage',            color: '#a16207', shape: 'rect',     size: 460, opacity: 0.95, order: 7  }, // yellow-700 (mustard) — distinct from yellow grid + orange production
  extractor:     { label: 'Extractors',               color: '#22c55e', shape: 'rect',     size: 700, opacity: 0.95, order: 8  }, // green-500
  generator:     { label: 'Power generators',         color: '#dc2626', shape: 'rect',     size: 720, opacity: 0.95, order: 9  }, // red-600 — strong red, no overlap with orange/amber
  production:    { label: 'Production machines',      color: '#f97316', shape: 'rect',     size: 600, opacity: 0.95, order: 10 }, // orange-500
  pioneer:       { label: 'Pioneer-placed',           color: '#84cc16', shape: 'rect',     size: 460, opacity: 0.95, order: 11 }, // lime-500 — yellow-green, distinct from extractor green
  train:         { label: 'Trains & freight wagons',  color: '#ec4899', shape: 'rect',     size: 320, opacity: 0.95, order: 12 }, // pink-500
  vehicle:       { label: 'Road vehicles',            color: '#92400e', shape: 'triangle', size: 250, opacity: 0.95, order: 13 }, // amber-800 brown — saturated enough to read on dark bg, triangle shape disambiguates from power_storage mustard
  decoration:    { label: 'Decoration & signage',     color: '#cbd5e1', shape: 'dot',      size: 90,  opacity: 0.55, order: 14 }, // slate-300 light
  misc:          { label: 'Other / unrecognized',     color: '#64748b', shape: 'dot',      size: 60,  opacity: 0.4,  order: 15 }, // slate-500
};

/** Save actors carry the *buildable* class (`Build_FooMk1_C`); game data is keyed
 *  by the *descriptor* class (`Desc_FooMk1_C`). Convert so lookups line up. */
export function buildableToDescriptor(className: string): string {
  return className.startsWith('Build_') ? 'Desc_' + className.slice('Build_'.length) : className;
}

/** Quaternion to yaw (degrees). Satisfactory uses UE4 XYZW format. */
export function quaternionToYawDeg(q: { x: number; y: number; z: number; w: number } | undefined): number {
  if (!q) return 0;
  const { x, y, z, w } = q;
  const yawRad = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  return (yawRad * 180) / Math.PI;
}
