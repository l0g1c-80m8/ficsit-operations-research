import type { SaveCategory } from './types';

/** Maps a Satisfactory actor's typePath to one of our coarse layer categories.
 *  Order matters — earlier matches win. */
const CATEGORY_PATTERNS: { pattern: RegExp; category: SaveCategory }[] = [
  // Production/manufacturing apparatus.
  { pattern: /Build_(Manufacturer|Constructor|Smelter|Foundry|Refinery|Blender|Packager|HadronCollider|Converter|QuantumEncoder|Assembler)/i, category: 'production' },
  // Power generation + extraction.
  { pattern: /Build_(Generator|Miner|OilPump|WaterPump|FrackingExtractor|FrackingSmasher|AlienPower|PowerStorage)/i, category: 'extractor' },
  // Belts, lifts, splitters, mergers — the conveyor network.
  { pattern: /Build_(ConveyorBelt|ConveyorLift|ConveyorAttachment|Splitter|Merger|ConveyorPole)/i, category: 'belt' },
  // Pipes, supports, valves, fluid storage.
  { pattern: /Build_(Pipeline|Valve|FluidBuffer|PipeStorageTank|PipelineSupport|PipelinePump|PipelineFlowMeter)/i, category: 'pipe' },
  // Rails come before vehicles so locomotives don't get caught by /Vehicle/.
  { pattern: /(RailroadTrack|TrainStation|FreightWagon|TrainPlatform|Build_Train)/i, category: 'rail' },
  // Power lines, poles, switches.
  { pattern: /Build_(PowerLine|PowerPole|PowerSwitch|PowerTower|PriorityPowerSwitch)/i, category: 'power' },
  // Storage containers + dimensional depot.
  { pattern: /Build_(StorageContainer|IndustrialStorageContainer|StorageIntegratedTank|DimensionalDepot|CentralStorage)/i, category: 'storage' },
  // Foundations / walls / roofs / ramps / structural.
  { pattern: /Build_(Foundation|Wall|Roof|Ramp|StackableConveyorPole|Pillar|Beam|FlatBeam|CatwalkRailing|Frame|Concrete)/i, category: 'foundation' },
  // Vehicles (trucks, tractors, explorer, factory cart).
  { pattern: /(Vehicle|Build_Truck|Build_Tractor|Build_Explorer|FactoryCart)/i, category: 'vehicle' },
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
  foundation: { label: 'Foundations & structural', color: '#5a6470', shape: 'rect', size: 800, opacity: 0.45, order: 0 },
  rail: { label: 'Rail network', color: '#a78bfa', shape: 'dot', size: 220, opacity: 0.75, order: 1 },
  belt: { label: 'Belts & splitters', color: '#38bdf8', shape: 'dot', size: 120, opacity: 0.75, order: 2 },
  pipe: { label: 'Pipes & fluid', color: '#22d3ee', shape: 'dot', size: 130, opacity: 0.75, order: 3 },
  power: { label: 'Power grid', color: '#fde047', shape: 'dot', size: 140, opacity: 0.85, order: 4 },
  storage: { label: 'Storage', color: '#c084fc', shape: 'rect', size: 400, opacity: 0.85, order: 5 },
  extractor: { label: 'Extractors & generators', color: '#22c55e', shape: 'rect', size: 700, opacity: 0.95, order: 6 },
  production: { label: 'Production', color: '#f97316', shape: 'rect', size: 600, opacity: 0.95, order: 7 },
  vehicle: { label: 'Vehicles', color: '#fb7185', shape: 'triangle', size: 250, opacity: 0.8, order: 8 },
  misc: { label: 'Other / signs / pioneer-placed', color: '#64748b', shape: 'dot', size: 60, opacity: 0.4, order: 9 },
};

/** Quaternion to yaw (degrees). Satisfactory uses UE4 XYZW format. */
export function quaternionToYawDeg(q: { x: number; y: number; z: number; w: number } | undefined): number {
  if (!q) return 0;
  const { x, y, z, w } = q;
  const yawRad = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  return (yawRad * 180) / Math.PI;
}
