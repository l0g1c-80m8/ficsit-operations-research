// Browser-side parser for Satisfactory save files.
//
// Uses @etothepii/satisfactory-file-parser's synchronous Parser.ParseSave to
// extract the header and walk every level's objects, collecting world-space
// translations, rotations, and a per-class histogram.

import type { NetworkEdge, ParsedSaveSummary, PlacedActor, SaveCategory, SaveHeaderInfo } from './types';
import { categorize, quaternionToYawDeg } from './categorize';
import { extractProgression, isProgressionManager } from './progression';

const MAX_ACTORS_FOR_VIZ = 80000;

export async function parseSaveFile(file: File): Promise<ParsedSaveSummary> {
  const mod = await import('@etothepii/satisfactory-file-parser');
  const { Parser, isSaveEntity } = mod;

  const bytes = await file.arrayBuffer();

  // Yield to the UI before doing the synchronous parse, so the "Parsing…" label paints.
  await new Promise((r) => setTimeout(r, 0));

  const save = Parser.ParseSave(file.name, bytes, { throwErrors: false });

  const h = save.header;
  const header: SaveHeaderInfo = {
    saveHeaderVersion: h.saveHeaderType ?? 0,
    saveVersion: h.saveVersion ?? 0,
    buildVersion: h.buildVersion ?? 0,
    mapName: String(h.mapName ?? ''),
    mapOptions: String(h.mapOptions ?? ''),
    sessionName: String(h.sessionName ?? ''),
    playDurationSeconds: Number(h.playDurationSeconds ?? 0),
    saveDateTimeTicks: String(h.saveDateTime ?? ''),
    sessionVisibility: Number(h.sessionVisibility ?? 0),
  };

  const counts = new Map<string, number>();
  const categoryCounts: Record<SaveCategory, number> = {
    foundation: 0,
    production: 0,
    extractor: 0,
    generator: 0,
    power_grid: 0,
    power_storage: 0,
    conveyor: 0,
    pipeline: 0,
    hypertube: 0,
    fluid_storage: 0,
    item_storage: 0,
    rail: 0,
    train: 0,
    vehicle: 0,
    pioneer: 0,
    decoration: 0,
    misc: 0,
  };
  const actors: PlacedActor[] = [];
  let actorCount = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const connections: NetworkEdge[] = [];
  // `instanceName → world translation` map, populated as we walk actors.
  // Power-line actors carry source/target ObjectReferences (instance name
  // strings); we resolve them to coordinates in a second pass below.
  const positionByInstance = new Map<string, { x: number; y: number; z: number }>();
  // Buffered power-line references whose endpoints we'll resolve once every
  // actor has been seen — order in the save file isn't guaranteed.
  const pendingPowerLines: { srcInst?: string; tgtInst?: string; srcWorld?: { x: number; y: number; z: number }; tgtWorld?: { x: number; y: number; z: number } }[] = [];
  // Schematic / game-phase manager singletons. Collected during the same walk
  // and decoded afterwards — see lib/save/progression.ts. Matched outside the
  // isSaveEntity branch because these carry no transform and can be serialized
  // as components rather than entities.
  const progressionManagers: { typePath?: string; properties?: Record<string, unknown> }[] = [];

  const levels = save.levels ?? {};
  for (const lvl of Object.values(levels)) {
    for (const obj of lvl.objects ?? []) {
      const typePath = (obj as { typePath?: string }).typePath ?? 'Unknown';
      const className = simplifyClass(typePath);
      counts.set(className, (counts.get(className) ?? 0) + 1);

      if (isProgressionManager(typePath)) {
        progressionManagers.push(obj as { typePath?: string; properties?: Record<string, unknown> });
      }

      if (isSaveEntity(obj)) {
        actorCount++;
        const t = obj.transform?.translation;
        const r = obj.transform?.rotation;
        const s = obj.transform?.scale3d;
        if (t && Number.isFinite(t.x) && Number.isFinite(t.y)) {
          const category = categorize(typePath);
          categoryCounts[category]++;

          const inst = (obj as { instanceName?: string }).instanceName;
          if (inst) positionByInstance.set(inst, { x: t.x, y: t.y, z: t.z ?? 0 });

          if (actors.length < MAX_ACTORS_FOR_VIZ) {
            const yaw = quaternionToYawDeg(r);
            const scale = Math.max(Math.abs(s?.x ?? 1), Math.abs(s?.y ?? 1)) || 1;
            const wantsRecipe = category === 'production' || category === 'extractor' || category === 'generator';
            const currentRecipe = wantsRecipe ? extractCurrentRecipe(obj) : undefined;
            actors.push({
              className,
              x: t.x,
              y: t.y,
              z: t.z ?? 0,
              yaw,
              scale,
              category,
              currentRecipe,
            });
          }
          if (t.x < minX) minX = t.x;
          if (t.x > maxX) maxX = t.x;
          if (t.y < minY) minY = t.y;
          if (t.y > maxY) maxY = t.y;

          // Pull explicit connectivity. Spline-based actors hand us local-
          // space spline points; we project them through the actor's yaw to
          // world coordinates and emit one edge per polyline segment.
          if (
            category === 'conveyor' ||
            category === 'pipeline' ||
            category === 'hypertube' ||
            category === 'rail'
          ) {
            extractSplineEdges(obj, category, t, r, connections);
          }
          // Power lines: PowerLineSpecialProperties has source/target object
          // refs (and optional pre-resolved translations in newer saves).
          if (category === 'power_grid' && /Build_PowerLine/i.test(typePath)) {
            extractPowerLine(obj, pendingPowerLines);
          }
        }
      }
    }
  }

  // Resolve any power-line edges whose endpoints were ObjectReferences. The
  // translation fields on `PowerLineSpecialProperties` are sometimes
  // populated (newer saves) and sometimes not — fall back to the
  // instance-name lookup we built during the actor walk. Source/target
  // pathNames carry a trailing `.<ComponentName>` (e.g. `.PowerConnection`,
  // `.PowerTowerConnection`) which we strip so they line up with the
  // actor's bare instance name.
  for (const p of pendingPowerLines) {
    const src = p.srcWorld ?? resolveActorRef(p.srcInst, positionByInstance);
    const tgt = p.tgtWorld ?? resolveActorRef(p.tgtInst, positionByInstance);
    if (!src || !tgt) continue;
    connections.push({
      category: 'power_grid',
      ax: src.x,
      ay: src.y,
      az: src.z,
      bx: tgt.x,
      by: tgt.y,
      bz: tgt.z,
    });
  }

  return {
    header,
    actorCount,
    actors,
    classCounts: [...counts.entries()]
      .map(([className, count]) => ({ className, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50),
    categoryCounts,
    bbox: actors.length > 0 ? { minX, maxX, minY, maxY } : null,
    connections,
    progression: extractProgression(progressionManagers),
  };
}

/** Rotate a local-space xyz by a quaternion (UE XYZW). Result is world-space
 *  relative to the actor's pivot — caller adds the actor's translation. */
function rotateByQuat(
  v: { x: number; y: number; z: number },
  q: { x: number; y: number; z: number; w: number } | undefined,
): { x: number; y: number; z: number } {
  if (!q) return v;
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

/** Try the raw pathName, then strip a trailing `.Component` suffix. UE save
 *  ObjectReferences point at a *component on* an actor (e.g.
 *  `…Build_PowerTower_C_42.PowerTowerConnection`); the position map is
 *  keyed by the actor's bare instance name (`…Build_PowerTower_C_42`). */
function resolveActorRef(
  pathName: string | undefined,
  map: Map<string, { x: number; y: number; z: number }>,
): { x: number; y: number; z: number } | undefined {
  if (!pathName) return undefined;
  const direct = map.get(pathName);
  if (direct) return direct;
  const lastDot = pathName.lastIndexOf('.');
  if (lastDot > 0) return map.get(pathName.slice(0, lastDot));
  return undefined;
}

/** Read `mSplineData` off a buildable that has one (rails, hypertubes,
 *  pipes, non-chain belts). Each entry is a SplinePointData struct with a
 *  `Location` vec3 in actor-local space. We rotate by the actor's quaternion
 *  and add its translation to get world coords, then emit one edge per
 *  consecutive pair. */
function extractSplineEdges(
  obj: unknown,
  category: SaveCategory,
  translation: { x: number; y: number; z: number },
  rotation: { x: number; y: number; z: number; w: number } | undefined,
  out: NetworkEdge[],
): void {
  const props = (obj as { properties?: Record<string, { type?: string; values?: unknown[] }> }).properties;
  const spline = props?.mSplineData;
  if (!spline || spline.type !== 'ArrayProperty' || !Array.isArray(spline.values)) return;
  const worldPts: { x: number; y: number; z: number }[] = [];
  for (const v of spline.values) {
    const loc = (v as { properties?: { Location?: { value?: { x: number; y: number; z: number } } } })
      ?.properties?.Location?.value;
    if (!loc || !Number.isFinite(loc.x) || !Number.isFinite(loc.y)) continue;
    const rotated = rotateByQuat(loc, rotation);
    worldPts.push({
      x: translation.x + rotated.x,
      y: translation.y + rotated.y,
      z: translation.z + rotated.z,
    });
  }
  for (let i = 0; i + 1 < worldPts.length; i++) {
    out.push({
      category,
      ax: worldPts[i].x,
      ay: worldPts[i].y,
      az: worldPts[i].z,
      bx: worldPts[i + 1].x,
      by: worldPts[i + 1].y,
      bz: worldPts[i + 1].z,
    });
  }
}

/** Collect a power-line actor's source/target endpoints. Translations are
 *  resolved later, once every actor's `instanceName → translation` mapping
 *  is built — order in the save file is not guaranteed. */
function extractPowerLine(
  obj: unknown,
  out: { srcInst?: string; tgtInst?: string; srcWorld?: { x: number; y: number; z: number }; tgtWorld?: { x: number; y: number; z: number } }[],
): void {
  const sp = (obj as { specialProperties?: { type?: string; source?: { pathName?: string }; target?: { pathName?: string }; sourceTranslation?: { x: number; y: number; z: number }; targetTranslation?: { x: number; y: number; z: number } } }).specialProperties;
  if (!sp || sp.type !== 'PowerLineSpecialProperties') return;
  out.push({
    srcInst: sp.source?.pathName,
    tgtInst: sp.target?.pathName,
    srcWorld: sp.sourceTranslation,
    tgtWorld: sp.targetTranslation,
  });
}

function simplifyClass(typePath: string): string {
  // typePath looks like "/Game/FactoryGame/Buildable/Foo/Bar/Build_Foo.Build_Foo_C"
  const tail = typePath.split('/').pop() ?? typePath;
  return tail.split('.').pop() ?? tail;
}

/** Pull the simplified recipe class out of a production-machine actor's
 *  `mCurrentRecipe` ObjectProperty. The parser exposes properties as a map of
 *  `{ name → property }`; an ObjectProperty's payload is `{ value: { pathName,
 *  levelName } }`. Empty path = no recipe assigned. */
function extractCurrentRecipe(obj: unknown): string | undefined {
  const props = (obj as { properties?: Record<string, unknown> }).properties;
  if (!props) return undefined;
  const raw = props.mCurrentRecipe as { value?: { pathName?: string } } | undefined;
  const pathName = raw?.value?.pathName;
  if (!pathName) return undefined;
  return simplifyClass(pathName);
}

export { MAX_ACTORS_FOR_VIZ };
