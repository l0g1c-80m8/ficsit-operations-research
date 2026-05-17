# CLAUDE.md

Project-specific notes for assistants working in this repo. Keep this terse — the
authoritative pitch lives in `README.md`. This file is for the things that bite
you if you don't know them.

## What this is

A static Next.js 15 (App Router, React 19, TS, Tailwind) site that ships
Satisfactory game data + tooling: production calculator (LP solver), recipe /
building browsers, save-file viewer (in-browser parse), planner, map embed.

Deploys via `output: 'export'` to GitHub Pages. **No SSR, no API routes, no
server.** Everything runs in the browser or at build time.

## Layout

```
app/                Next.js App Router pages
  (features)/       /map, /save, /recipes, /buildings, /calculator, /planner
components/         Per-feature UI (calculator/, planner/, save-viewer/, recipes/, shell/)
  ui/               Shared UI primitives (Card, Button, ItemIcon, StatTile, …)
lib/
  data/             Loader + types for the Satisfactory dataset (SatData)
  solver/           javascript-lp-solver wrapper + Sugiyama (dagre) graph layout
  save/             Browser save parser + categorizer (used only client-side)
  planner/          Planner localStorage types
  calculator/       Calculator types
  storage/          useLocalStorage hook
  utils/            assetPath() basePath helper, normalize.ts
public/
  data/             satisfactory.json (pruned game data) + version.json (buildId)
  icons/            items/ and buildings/ — PNGs keyed by Desc_*_C class names
scripts/            Node CLI tools: prune-data, fetch-icons, refresh, plan, test-*
sample/             Sample save files for manual testing
```

## Key conventions / gotchas

### Class-name dialects (read this before touching save code)

The game has two parallel class hierarchies and they collide constantly:

- **Buildable** classes — `Build_ManufacturerMk1_C` — what save files store on
  placed actors (`obj.typePath`).
- **Descriptor** classes — `Desc_ManufacturerMk1_C` — what the pruned game data
  is keyed by (`SatData.buildings`, recipe `producedIn`, icon filenames).

Convert with `buildableToDescriptor()` from `lib/save/categorize.ts` whenever
you index `data.buildings` with something pulled from a save. `categorize()`
regexes match the `Build_` prefix only — pass the buildable class to it.

Symptom of forgetting: counts and power roll up as 0 in `SaveStats` even though
the histogram looks fine.

### Static export

`next.config.mjs` sets `output: 'export'` + `trailingSlash: true`. No `getServerSideProps`,
no route handlers, no `<Image>` optimizer, no Node-only modules in client code.
The save parser is dynamically imported so its Node deps stay out of the client
bundle; it's also listed in `serverExternalPackages`.

### basePath for GitHub Pages

In CI, `NEXT_PUBLIC_BASE_PATH=/<repo-name>` is injected. For any URL Next.js
**doesn't** rewrite automatically (raw `<img src>`, `fetch()`), use
`assetPath('/foo')` from `lib/utils/paths.ts`. `next/link` and `next/image`
already handle basePath. Icons and `/data/*.json` are fetched via `assetPath`.

### Dataset cache-busting

`lib/data/load.ts` first fetches `/data/version.json` (no-store) to read
`buildId`, then requests `satisfactory.json?v=<buildId>` with `force-cache`.
Prunes auto-bust because `prune-data.mjs` writes a new buildId. Don't fetch
`satisfactory.json` directly without the version query string.

### localStorage keys (don't collide)

- Calculator inputs + history: see `lib/calculator/`
- Planner state: `ficsit.planner.v1`
- Save uploads history: `ficsit.save.history.v1` (`SAVE_HISTORY_KEY`)

Bump the `v1` suffix when changing the on-disk shape; don't silently rewrite.

### `fmt()` rules

`lib/utils.ts` — `fmt(n, digits=2)`:
- `≥ 1000` → no decimals (`13296`)
- `≥ 10` → 1 decimal (`182.0`)
- otherwise → `digits` decimals (`0.00` by default)

So a `fmt(0)` reads as `0.00`. If a stat shows `0.00`, the input is genuinely
zero — usually a lookup miss upstream, not a formatting bug.

## Scripts

```bash
npm run dev          # next dev
npm run build        # static export → ./out
npm run typecheck    # tsc --noEmit
npm run lint         # next lint

npm run refresh      # prune game data + fetch missing icons (all-in-one)
npm run data         # only prune /tmp/sat-data.json → public/data/
npm run icons        # only fetch missing icons
npm run icons:force  # re-download every icon
npm run icons:missing

npm run plan -- <target> [--rate N] [--supply x=N,...] [--alts] [--strict] [-i]
```

`refresh.mjs` accepts `--legacy-1.0`, `--ficsmas`, `--legacy-u8`, `--force-icons`.

The data prune expects `/tmp/sat-data.json`. If missing:
```
curl -L -o /tmp/sat-data.json \
  https://raw.githubusercontent.com/greeny/SatisfactoryTools/dev/data/data.json
```

## Solver notes (`lib/solver/factory-solver.ts`)

- LP formulation: per-item flow-balance equalities, supply caps, target output
  minimums or weighted objective.
- **Dual mode**: when *any* target has `minRatePerMin`, the objective minimizes
  total machines subject to flooring those rates. Otherwise it maximizes
  weighted target output subject to supplies.
- `autoSupplyRawResources: true` (default) auto-uncaps every raw item not in the
  user's supply list. Strict mode flips this off.
- Variable-power recipes (Converter, Quantum Encoder, Particle Accelerator)
  carry `isVariablePower` + `minPower`/`maxPower`. Per-line power in
  `FactoryPlanLine.powerKW` uses the building's static `powerConsumption`; the
  UI and headless CLI both surface the variable range separately.
- `diagnose.ts` produces human-readable explanations when status is
  `infeasible`.

## Testing

No unit-test framework yet. Two smoke scripts live in `scripts/`:

```bash
node scripts/test-solver.mjs   # exercises the LP across canned targets
node scripts/test-graph.mjs    # exercises dagre layout
```

For save-parser changes, drop a `.sav` into `sample/` and load it via `/save`.
The parser is browser-only — there's no Node entry point.

## CI

`.github/workflows/deploy-pages.yml` — runs on push to `main`/`develop`:
1. Verifies `public/data/satisfactory.json`, `version.json`, and the items
   icon directory are committed (the workflow does **not** regenerate them —
   run `npm run refresh` locally and commit before pushing data-affecting
   changes).
2. `next build` with `NEXT_PUBLIC_BASE_PATH=/<repo-name>`.
3. Uploads `./out` as the Pages artifact and deploys.

First-time Pages enablement is manual: Settings → Pages → Source: GitHub Actions.

## When making changes

- Run `npm run typecheck` before declaring done — it's the only automated gate.
- UI work needs `npm run dev` + browser verification; type/lint passes don't
  prove the feature works.
- If you touch the game data schema (`lib/data/types.ts`), the prune script
  (`scripts/prune-data.mjs`), the solver, **or** the save parser, walk all
  three to make sure the contracts still line up — they're tightly coupled by
  class names and recipe shape.
