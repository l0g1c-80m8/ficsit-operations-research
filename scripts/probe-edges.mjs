// Probe the parser's new connection extraction against a sample save.
// Run via tsx so the TS source is loadable: `npx tsx scripts/probe-edges.mjs sample/foo.sav`
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = process.argv[2];
if (!file) {
  console.error('usage: npx tsx scripts/probe-edges.mjs <sample/foo.sav>');
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const parsePath = path.resolve(here, '..', 'lib/save/parse.ts');
const { parseSaveFile } = await import(parsePath);

// Wrap raw bytes in a File-like object that parseSaveFile accepts.
const bytes = fs.readFileSync(path.resolve(file));
const fileLike = {
  name: path.basename(file),
  size: bytes.length,
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
};

const summary = await parseSaveFile(fileLike);
console.log(`actors: ${summary.actorCount}  edges: ${summary.connections.length}`);

const byCat = new Map();
for (const e of summary.connections) byCat.set(e.category, (byCat.get(e.category) ?? 0) + 1);
for (const [cat, n] of [...byCat.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat.padEnd(14)} ${n}`);
}

// Raw probe: walk power-line actors and report what source/target ref shape we get.
const { Parser } = await import('@etothepii/satisfactory-file-parser');
const bytes2 = fs.readFileSync(path.resolve(file));
const save = Parser.ParseSave(path.basename(file), bytes2.buffer, { throwErrors: false });
let lines = 0, withSpecial = 0, withSrc = 0, withTgt = 0;
const sampleNames = new Set();
for (const lvl of Object.values(save.levels ?? {})) {
  for (const obj of lvl.objects ?? []) {
    if (!/Build_PowerLine/i.test(obj.typePath ?? '')) continue;
    lines++;
    const sp = obj.specialProperties;
    if (sp?.type === 'PowerLineSpecialProperties') {
      withSpecial++;
      if (sp.source?.pathName) withSrc++;
      if (sp.target?.pathName) withTgt++;
      if (sampleNames.size < 4 && sp.source?.pathName) sampleNames.add(sp.source.pathName);
    }
  }
}
console.log(`\nPower-line probe: ${lines} actors, ${withSpecial} with special, src=${withSrc}, tgt=${withTgt}`);
console.log('  sample source pathNames:', [...sampleNames]);
let poleNames = 0;
const poleSamples = new Set();
for (const lvl of Object.values(save.levels ?? {})) {
  for (const obj of lvl.objects ?? []) {
    if (!/Build_PowerPole|Build_PowerTower|Build_PowerSwitch/i.test(obj.typePath ?? '')) continue;
    poleNames++;
    if (poleSamples.size < 4) poleSamples.add(obj.instanceName);
  }
}
console.log(`  pole/tower actors: ${poleNames}`);
console.log('  sample pole instanceNames:', [...poleSamples]);
