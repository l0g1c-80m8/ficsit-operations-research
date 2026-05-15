// Browser-side parser for Satisfactory save files.
//
// Uses @etothepii/satisfactory-file-parser's synchronous Parser.ParseSave to
// extract the header and walk every level's objects, collecting world-space
// translations and a per-class histogram.

import type { ParsedSaveSummary, PlacedActor, SaveHeaderInfo } from './types';

const MAX_ACTORS_FOR_VIZ = 50000;

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
        if (t && Number.isFinite(t.x) && Number.isFinite(t.y)) {
          if (actors.length < MAX_ACTORS_FOR_VIZ) {
            actors.push({ className, x: t.x, y: t.y, z: t.z ?? 0 });
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
    bbox: actors.length > 0 ? { minX, maxX, minY, maxY } : null,
  };
}

function simplifyClass(typePath: string): string {
  // typePath looks like "/Game/FactoryGame/Buildable/Foo/Bar/Build_Foo.Build_Foo_C"
  const tail = typePath.split('/').pop() ?? typePath;
  return tail.split('.').pop() ?? tail;
}

export { MAX_ACTORS_FOR_VIZ };
