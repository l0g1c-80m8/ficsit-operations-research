// Downloads item + building icons from the Satisfactory wiki (wiki.gg)
// via the Special:FilePath endpoint into public/icons/.
//
//   <name>.png becomes /<root>/Special:FilePath/<urlencode(name).png?width=64>
//
// The endpoint redirects to the hashed asset URL. We follow redirects and write
// out the PNG. Items that fail are logged to public/icons/_missing.json so we
// can fall back to text glyphs at runtime.

import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'public/data/satisfactory.json'), 'utf8'));

const outItems = path.join(root, 'public/icons/items');
const outBld = path.join(root, 'public/icons/buildings');
fs.mkdirSync(outItems, { recursive: true });
fs.mkdirSync(outBld, { recursive: true });

const WIDTH = 64;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CONCURRENCY = 1;
const DELAY_MS = 350;

// Many item names have multiple historical wiki filename variants — try a few.
function nameVariants(name) {
  const base = name.replace(/\s+/g, '_');
  const noPunct = base.replace(/['"]/g, '');
  return Array.from(new Set([
    `${base}.png`,
    `${noPunct}.png`,
    `${base.replace(/-/g, '_')}.png`,
    `${noPunct.replace(/-/g, '_')}.png`,
  ]));
}

async function fetchOne(name, outFile) {
  for (const fname of nameVariants(name)) {
    const url = `https://satisfactory.wiki.gg/wiki/Special:FilePath/${encodeURIComponent(fname)}?width=${WIDTH}`;
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'image/*' },
        redirect: 'follow',
      });
      if (res.status === 429 || res.status === 403) {
        await wait(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) break; // 404 etc.: try next variant
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 200) break;
      fs.writeFileSync(outFile, buf);
      await wait(DELAY_MS);
      return true;
    }
  }
  return false;
}

async function runPool(jobs) {
  const queue = [...jobs];
  const results = [];
  let inflight = 0;
  let idx = 0;
  return new Promise((resolve) => {
    function next() {
      while (inflight < CONCURRENCY && queue.length) {
        const job = queue.shift();
        const i = idx++;
        inflight++;
        job()
          .then((r) => {
            results.push(r);
            inflight--;
            if (i % 10 === 0) process.stdout.write(`  ${i}/${jobs.length}\r`);
            next();
          })
          .catch(() => {
            inflight--;
            next();
          });
      }
      if (inflight === 0 && queue.length === 0) resolve(results);
    }
    next();
  });
}

const missing = { items: [], buildings: [] };

console.log(`Downloading ${Object.keys(data.items).length} item icons…`);
const itemJobs = Object.values(data.items).map((it) => async () => {
  const out = path.join(outItems, `${it.className}.png`);
  if (fs.existsSync(out)) return { ok: true, name: it.name };
  const ok = await fetchOne(it.name, out);
  if (!ok) missing.items.push({ className: it.className, name: it.name });
  return { ok, name: it.name };
});
await runPool(itemJobs);

console.log(`\nDownloading ${Object.keys(data.buildings).length} building icons…`);
const bldJobs = Object.values(data.buildings).map((b) => async () => {
  const out = path.join(outBld, `${b.className}.png`);
  if (fs.existsSync(out)) return { ok: true, name: b.name };
  const ok = await fetchOne(b.name, out);
  if (!ok) missing.buildings.push({ className: b.className, name: b.name });
  return { ok, name: b.name };
});
await runPool(bldJobs);

fs.writeFileSync(path.join(root, 'public/icons/_missing.json'), JSON.stringify(missing, null, 2));

console.log(`\nDone. Items missing: ${missing.items.length} · Buildings missing: ${missing.buildings.length}`);
if (missing.items.length) {
  console.log('Missing items:');
  for (const m of missing.items) console.log(`  ${m.name} (${m.className})`);
}
if (missing.buildings.length) {
  console.log('Missing buildings:');
  for (const m of missing.buildings) console.log(`  ${m.name} (${m.className})`);
}
