// Browser-side parser for Satisfactory save files.
//
// Uses @etothepii/satisfactory-file-parser's synchronous Parser.ParseSave to
// extract the header and walk every level's objects, collecting world-space
// translations, rotations, and a per-class histogram.

import type { ParsedSaveSummary, PlacedActor, SaveCategory, SaveHeaderInfo } from './types';
import { categorize, quaternionToYawDeg } from './categorize';

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

  const levels = save.levels ?? {};
  for (const lvl of Object.values(levels)) {
    for (const obj of lvl.objects ?? []) {
      const typePath = (obj as { typePath?: string }).typePath ?? 'Unknown';
      const className = simplifyClass(typePath);
      counts.set(className, (counts.get(className) ?? 0) + 1);

      if (isSaveEntity(obj)) {
        actorCount++;
        const t = obj.transform?.translation;
        const r = obj.transform?.rotation;
        const s = obj.transform?.scale3d;
        if (t && Number.isFinite(t.x) && Number.isFinite(t.y)) {
          const category = categorize(typePath);
          categoryCounts[category]++;
          if (actors.length < MAX_ACTORS_FOR_VIZ) {
            const yaw = quaternionToYawDeg(r);
            const scale = Math.max(Math.abs(s?.x ?? 1), Math.abs(s?.y ?? 1)) || 1;
            // Production / extractor / generator machines carry `mCurrentRecipe`
            // as an ObjectProperty whose `value.pathName` looks like
            // `/Game/FactoryGame/Recipes/Standard/Recipe_IronPlate.Recipe_IronPlate_C`.
            // Read it only for categories where it's meaningful — saves the
            // properties walk on the tens of thousands of foundation/belt actors.
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
        }
      }
    }
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
  };
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
