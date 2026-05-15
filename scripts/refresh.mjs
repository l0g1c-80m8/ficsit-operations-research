// Refresh the full cached dataset:
//   1. Re-fetch the community Docs.json into /tmp/sat-data.json
//   2. Re-prune into public/data/satisfactory.json
//   3. Re-fetch any missing icons (existing PNGs kept). Pass --force-icons to
//      re-download every icon.
//
// Usage:
//   node scripts/refresh.mjs              # fetch data, prune, fetch missing icons
//   node scripts/refresh.mjs --force-icons # also force-redownload every icon

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const forceIcons = process.argv.includes('--force-icons');
const DATA_URL = 'https://raw.githubusercontent.com/greeny/SatisfactoryTools/master/data/data.json';

function run(cmd, label) {
  console.log(`\n▶ ${label}`);
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root });
}

function ensureToolPresent(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

console.log('FICSIT data refresh');
console.log('===================');

if (ensureToolPresent('curl')) {
  run(`curl -L --fail -o /tmp/sat-data.json '${DATA_URL}'`, 'Fetching community Docs.json');
} else if (ensureToolPresent('wget')) {
  run(`wget -O /tmp/sat-data.json '${DATA_URL}'`, 'Fetching community Docs.json (wget)');
} else {
  console.error('Neither curl nor wget is available; cannot fetch /tmp/sat-data.json.');
  process.exit(1);
}

const dataSize = fs.statSync('/tmp/sat-data.json').size;
if (dataSize < 500_000) {
  console.error(`/tmp/sat-data.json looks suspiciously small (${dataSize} bytes). Aborting.`);
  process.exit(1);
}
console.log(`  ✓ /tmp/sat-data.json (${(dataSize / 1024).toFixed(1)} KB)`);

run('node scripts/prune-data.mjs', 'Pruning to public/data/satisfactory.json');

run(`node scripts/fetch-icons.mjs${forceIcons ? ' --force' : ''}`, forceIcons ? 'Re-fetching ALL icons' : 'Fetching missing icons');

console.log('\nDone. The dev server picks up new data on next reload.');
