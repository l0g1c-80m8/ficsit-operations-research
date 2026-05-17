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
  // Pipeline network (pipes, pumps, valves, junctions, supports, flow meters).
  { pattern: /Build_(Pipeline|Valve|PipeHyper)/i, category: 'pipeline' },
  // Power transmission grid.
  { pattern: /Build_(PowerLine|PowerPole|PowerSwitch|PriorityPowerSwitch|PowerTower)/i, category: 'power_grid' },
  // Item storage (containers, dimensional depot, central storage).
  { pattern: /Build_(StorageContainer|IndustrialStorageContainer|DimensionalDepot|CentralStorage|StorageBlueprint|StorageHazard|StorageMercer|StoragePlayer)/i, category: 'item_storage' },
  // Rolling stock — before `rail` and `vehicle` so locomotives don't fall
  // into the rail-infrastructure bucket via `/Train/` paths.
  { pattern: /(Build_Locomotive|Build_FreightWagon|BP_Locomotive|BP_FreightWagon|\/Train\/)/i, category: 'train' },
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

export const CATEGORY_META: Record<
  SaveCategory,
  { label: string; color: string; shape: 'rect' | 'dot' | 'triangle' | 'line'; size: number; opacity: number; order: number }
> = {
  // Order = render z-order. Big translucent layers (foundations) render first
  // and sit at the bottom; small dots paint last on top.
  foundation:    { label: 'Foundations & structural', color: '#5a6470', shape: 'rect',     size: 800, opacity: 0.45, order: 0  },
  rail:          { label: 'Rail infrastructure',      color: '#a78bfa', shape: 'dot',      size: 220, opacity: 0.75, order: 1  },
  conveyor:      { label: 'Conveyors',                color: '#38bdf8', shape: 'dot',      size: 120, opacity: 0.75, order: 2  },
  pipeline:      { label: 'Pipelines',                color: '#22d3ee', shape: 'dot',      size: 130, opacity: 0.75, order: 3  },
  power_grid:    { label: 'Power grid',               color: '#fde047', shape: 'dot',      size: 140, opacity: 0.85, order: 4  },
  fluid_storage: { label: 'Fluid storage',            color: '#06b6d4', shape: 'rect',     size: 420, opacity: 0.9,  order: 5  },
  item_storage:  { label: 'Item storage',             color: '#c084fc', shape: 'rect',     size: 400, opacity: 0.9,  order: 6  },
  power_storage: { label: 'Power storage',            color: '#eab308', shape: 'rect',     size: 460, opacity: 0.95, order: 7  },
  extractor:     { label: 'Extractors',               color: '#22c55e', shape: 'rect',     size: 700, opacity: 0.95, order: 8  },
  generator:     { label: 'Power generators',         color: '#f59e0b', shape: 'rect',     size: 720, opacity: 0.95, order: 9  },
  production:    { label: 'Production machines',      color: '#f97316', shape: 'rect',     size: 600, opacity: 0.95, order: 10 },
  pioneer:       { label: 'Pioneer-placed',           color: '#ef4444', shape: 'rect',     size: 460, opacity: 0.9,  order: 11 },
  train:         { label: 'Trains & freight wagons',  color: '#ec4899', shape: 'rect',     size: 320, opacity: 0.9,  order: 12 },
  vehicle:       { label: 'Road vehicles',            color: '#fb7185', shape: 'triangle', size: 250, opacity: 0.8,  order: 13 },
  decoration:    { label: 'Decoration & signage',     color: '#94a3b8', shape: 'dot',      size: 90,  opacity: 0.6,  order: 14 },
  misc:          { label: 'Other / unrecognized',     color: '#64748b', shape: 'dot',      size: 60,  opacity: 0.4,  order: 15 },
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
