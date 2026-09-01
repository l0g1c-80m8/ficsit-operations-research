// One-off probe: parse a .sav and dump the schematic / game-phase manager
// actors so we can confirm the property names lib/save/progression.ts reads.
//
// Those names have shifted between game versions, and the extractor is written
// defensively around that. If /progression shows an empty state for a save you
// know has milestones done, run this and compare.
//
// usage: node scripts/probe-progression.mjs <sample/foo.sav>

import { Parser } from '@etothepii/satisfactory-file-parser';
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/probe-progression.mjs <sample/foo.sav>');
  process.exit(2);
}

const bytes = fs.readFileSync(path.resolve(file));
const save = Parser.ParseSave(path.basename(file), bytes.buffer, { throwErrors: false });

// Cast a wide net: anything that smells like a progression singleton.
const PATTERNS = [
  { kind: 'schematic-manager', pattern: /SchematicManager/i },
  { kind: 'game-phase-manager', pattern: /GamePhaseManager/i },
  { kind: 'research-manager', pattern: /ResearchManager/i },
  { kind: 'unlock-subsystem', pattern: /UnlockSubsystem/i },
  { kind: 'tutorial-subsystem', pattern: /TutorialIntroManager|SchematicPurchase/i },
];

const found = [];
for (const lvl of Object.values(save.levels ?? {})) {
  for (const obj of lvl.objects ?? []) {
    const tp = obj.typePath ?? '';
    const hit = PATTERNS.find((p) => p.pattern.test(tp));
    if (hit) found.push({ kind: hit.kind, obj });
  }
}

console.log(`\nMatched ${found.length} progression-ish object(s) in ${path.basename(file)}\n`);

for (const { kind, obj } of found) {
  console.log(`── ${kind.toUpperCase()} ─────────────────────────────────`);
  console.log(`typePath:     ${obj.typePath}`);
  console.log(`instanceName: ${obj.instanceName ?? '—'}`);
  const props = obj.properties ?? {};
  const names = Object.keys(props);
  console.log(`properties (${names.length}): ${names.join(', ') || '—'}`);

  for (const [name, p] of Object.entries(props)) {
    const type = p?.type ?? typeof p;
    if (type === 'ArrayProperty') {
      const vals = p.values ?? [];
      console.log(`  ★ ${name}: ArrayProperty × ${vals.length}`);
      if (vals.length > 0) {
        console.log(`     [0] = ${JSON.stringify(vals[0]).slice(0, 400)}`);
        if (vals.length > 1) console.log(`     [1] = ${JSON.stringify(vals[1]).slice(0, 200)}`);
      }
    } else {
      console.log(`  · ${name}: ${type} = ${JSON.stringify(p?.value ?? p).slice(0, 240)}`);
    }
  }
  console.log('');
}

// Show what the real extractor makes of it, so a mismatch is obvious.
const { extractProgression } = await import('../lib/save/progression.ts').catch(() => ({}));
if (extractProgression) {
  const prog = extractProgression(found.map((f) => f.obj));
  console.log('── EXTRACTOR OUTPUT ─────────────────────────────────');
  console.log(`sources:            ${JSON.stringify(prog.sources)}`);
  console.log(`purchasedSchematics: ${prog.purchasedSchematics.length}`);
  console.log(`  ${prog.purchasedSchematics.slice(0, 20).join(', ')}${prog.purchasedSchematics.length > 20 ? ', …' : ''}`);
  console.log(`currentPhase:       ${prog.currentPhase ?? '—'}`);
  console.log(`phasePaidOff:       ${JSON.stringify(prog.phasePaidOff ?? null)}`);
} else {
  console.log('(run with `npx tsx scripts/probe-progression.mjs …` to also see extractor output)');
}
