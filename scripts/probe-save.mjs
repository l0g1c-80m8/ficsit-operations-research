// One-off probe: parse a .sav file and print property structure for the
// linear-infrastructure actor classes (rail / hypertube / power line / pipe)
// so we can see how to extract spline + connection data.

import { Parser } from '@etothepii/satisfactory-file-parser';
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/probe-save.mjs <sample/foo.sav>');
  process.exit(2);
}
const bytes = fs.readFileSync(path.resolve(file));
const save = Parser.ParseSave(path.basename(file), bytes.buffer, { throwErrors: false });

const KIND_PATTERNS = [
  { kind: 'power-line', pattern: /Build_PowerLine/i },
  { kind: 'power-tower', pattern: /Build_PowerTower/i },
  { kind: 'rail-track', pattern: /Build_RailroadTrack/i },
  { kind: 'hypertube', pattern: /Build_PipeHyper/i },
  { kind: 'pipeline', pattern: /Build_Pipeline\b/i },
  { kind: 'conveyor', pattern: /Build_ConveyorBelt/i },
  { kind: 'conveyor-chain', pattern: /Build_ConveyorChainActor/i },
];

const samples = new Map();
for (const lvl of Object.values(save.levels ?? {})) {
  for (const obj of lvl.objects ?? []) {
    const tp = obj.typePath ?? '';
    for (const k of KIND_PATTERNS) {
      if (samples.has(k.kind)) continue;
      if (k.pattern.test(tp)) {
        samples.set(k.kind, obj);
        break;
      }
    }
    if (samples.size === KIND_PATTERNS.length) break;
  }
}

console.log(`\nFound ${samples.size}/${KIND_PATTERNS.length} kinds with at least one sample:`);
for (const [kind, obj] of samples) {
  console.log(`\n── ${kind.toUpperCase()} ─────────────────────────────────`);
  console.log(`typePath: ${obj.typePath}`);
  console.log(`instanceName: ${obj.instanceName ?? '—'}`);
  const t = obj.transform?.translation;
  console.log(`translation: ${t ? `${t.x.toFixed(0)},${t.y.toFixed(0)},${t.z.toFixed(0)}` : '—'}`);
  const sp = obj.specialProperties;
  console.log(`specialProperties.type: ${sp?.type ?? '—'}`);
  if (sp && sp.type !== 'EmptySpecialProperties') {
    console.log(`specialProperties keys: ${Object.keys(sp).join(', ')}`);
    if (sp.sourceTranslation) console.log(`  sourceTranslation: ${sp.sourceTranslation.x.toFixed(0)},${sp.sourceTranslation.y.toFixed(0)}`);
    if (sp.targetTranslation) console.log(`  targetTranslation: ${sp.targetTranslation.x.toFixed(0)},${sp.targetTranslation.y.toFixed(0)}`);
    if (sp.beltsInChain) console.log(`  beltsInChain count: ${sp.beltsInChain.length}, first spline pts: ${sp.beltsInChain[0]?.splinePoints?.length ?? 0}`);
  }
  const props = obj.properties ?? {};
  const propNames = Object.keys(props);
  console.log(`properties keys (${propNames.length}): ${propNames.slice(0, 30).join(', ')}${propNames.length > 30 ? ', …' : ''}`);

  // Probe known spline / connection property names.
  for (const key of ['mSplineData', 'mConnection0', 'mConnection1', 'mPowerInfo', 'mPowerConnection']) {
    if (!(key in props)) continue;
    const p = props[key];
    console.log(`  ★ ${key}: type=${p?.type ?? typeof p}`);
    if (p?.type === 'ArrayProperty') {
      console.log(`     values length: ${p.values?.length ?? 0}`);
      const sample = p.values?.[0];
      if (sample) {
        console.log(`     sample value: ${JSON.stringify(sample, replacer, 2).slice(0, 500)}`);
      }
    } else if (p) {
      console.log(`     value: ${JSON.stringify(p, replacer, 2).slice(0, 500)}`);
    }
  }
}

function replacer(_, v) {
  if (typeof v === 'number') return Number.isFinite(v) ? Number(v.toFixed(2)) : v;
  return v;
}
