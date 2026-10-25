# AGENTS.md

Guidance for any coding agent working in this repository. This file is
tool-agnostic — it does not assume a particular agent, editor, or assistant.
Keep it terse; the user-facing pitch lives in `README.md`, and step-by-step
playbooks for recurring tasks live in [`skills/`](skills/).

## What this is

A static **Next.js 15** (App Router, React 19, TypeScript, Tailwind) site that
ships Satisfactory game data plus tooling: a production calculator (LP solver),
recipe/building browsers, an in-browser save-file viewer, a planner, and a map
embed.

It deploys via `output: 'export'` to GitHub Pages. **There is no SSR, no API
routes, and no server.** Everything runs in the browser or at build time.

## Golden rules

1. **The only automated correctness gate is `npm run typecheck`.** Run it before
   declaring any change done.
2. **UI changes need `npm run dev` + browser verification.** A passing typecheck
   proves nothing about whether a feature actually works on screen.
3. **Static export constrains everything.** No `getServerSideProps`, no route
   handlers, no `next/image` optimizer, no Node-only modules in client code.
4. **Game data is regenerated from a specific upstream, not hand-edited.** See
   [`skills/refresh-game-data.md`](skills/refresh-game-data.md) — the dump
   source matters and a wrong one fails silently.
5. **Commit data/icon changes before pushing.** CI does not regenerate them.
6. Prefer small, reviewable diffs that read like the surrounding code.

## Layout

```
app/                Next.js App Router pages
  (features)/       /atlas /buildings /calculator /map /planner /progression
                    /recipes /save
components/         Per-feature UI (calculator/, planner/, save-viewer/,
                    recipes/, atlas/, progression/, shell/)
  shared/           MapBackdrop — grid/terrain/plain backdrop shared by BOTH the
                    save Topograph and the /atlas map
  ui/               Shared primitives (Card, Button, ItemIcon, StatTile, …)
lib/
  data/             Loader + types for the dataset (SatData); world markers
  solver/           javascript-lp-solver wrapper + Sugiyama (dagre) graph layout
  save/             Browser save parser + categorizer (client-side only),
                    bounds.ts (SAT_MAP_BOUNDS), progression.ts (schematic reader)
  progression/      Space Elevator phases + tech-tree derivation
  planner/          Planner localStorage types
  calculator/       Calculator types
  hooks/            usePanZoom — shared SVG pan/zoom state machine
  storage/          useLocalStorage hook
  utils/            assetPath() basePath helper, normalize.ts; utils.ts (fmt)
public/
  data/             satisfactory.json (pruned game data), map-markers.json
                    (world markers), version.json (buildId)
  icons/            items/ and buildings/ — PNGs keyed by Desc_*_C class names
scripts/            Node CLI tools: prune-data, fetch-map-markers, fetch-icons,
                    refresh, plan, probe-*, test-*
sample/             Sample save files for manual testing
skills/             Task playbooks (this repo's agent-agnostic "skills")
```

## Commands

```bash
npm run dev          # next dev — the only way to verify UI
npm run build        # static export → ./out
npm run typecheck    # tsc --noEmit — the automated gate
npm run lint         # next lint
npm test             # vitest run (single pass, CI-style) — needs Node >= 20
npm run test:watch

npm run refresh      # prune game data + world markers + missing icons
npm run data         # only prune /tmp/sat-data.json → public/data/
npm run map-markers  # only refetch public/data/map-markers.json
npm run icons        # only fetch missing icons
npm run icons:force  # re-download every icon
npm run plan -- <target> [--rate N] [--supply x=N,...] [--alts] [--strict] [-i]
```

## Key conventions & gotchas

### Class-name dialects (read before touching save code)

Two parallel class hierarchies collide constantly:

- **Buildable** classes — `Build_ManufacturerMk1_C` — what save files store on
  placed actors (`obj.typePath`).
- **Descriptor** classes — `Desc_ManufacturerMk1_C` — what the pruned game data
  is keyed by (`SatData.buildings`, recipe `producedIn`, icon filenames).

Convert with `buildableToDescriptor()` from `lib/save/categorize.ts` whenever you
index `data.buildings` with something from a save. `categorize()` regexes match
the `Build_` prefix only — pass the buildable class to it. Forgetting this makes
counts and power roll up as 0 even though the histogram looks fine. Full detail
in [`skills/save-parser.md`](skills/save-parser.md).

### Static export

`next.config.mjs` sets `output: 'export'` + `trailingSlash: true`. The save
parser is dynamically imported so its Node deps stay out of the client bundle;
it is also listed in `serverExternalPackages`.

### basePath for GitHub Pages

In CI, `NEXT_PUBLIC_BASE_PATH=/<repo-name>` is injected. For any URL Next.js does
**not** rewrite automatically (raw `<img src>`, `fetch()`), use `assetPath('/foo')`
from `lib/utils/paths.ts`. `next/link` and `next/image` already handle basePath.
Icons and `/data/*.json` are fetched via `assetPath`.

### Dataset cache-busting

`lib/data/load.ts` fetches `/data/version.json` (no-store) for `buildId`, then
requests `satisfactory.json?v=<buildId>` with `force-cache`. Prunes auto-bust
because the prune writes a new buildId. Do not fetch `satisfactory.json` without
the version query string. `map-markers.json` is cache-busted with the **same**
buildId — regenerating markers without re-running the data prune leaves browsers
on a stale copy.

### Topograph background & world markers

`components/shared/MapBackdrop.tsx` draws the grid/terrain/plain backdrop for
both the save Topograph and the `/atlas` map. Coordinates everywhere are UE world
units; `SAT_MAP_BOUNDS` in `lib/save/bounds.ts` is shared so an atlas marker and
a Topograph actor at the same (x, y) land in the same place.

### Progression is read from the save, not tracked

`/progression` has no checklist and no localStorage. Completion comes from two
singleton actors in the `.sav` (`FGSchematicManager.mPurchasedSchematics` and
`FGGamePhaseManager`). Schematic class names match `SatSchematic.className`
exactly (no dialect translation). These property names are version-sensitive;
`lib/save/progression.ts` reads them defensively. Space Elevator phase costs are
hand-maintained in `lib/progression/phases.ts` (not in the upstream dump).

### localStorage keys (do not collide)

- Calculator inputs + history: see `lib/calculator/`
- Planner state: `ficsit.planner.v1`
- Save uploads history tag: `ficsit.save.history.v3` (the history itself lives in
  IndexedDB; this key only tags the JSON export and the legacy migration)

Bump the `v1`/`v3` suffix when changing on-disk shape; do not silently rewrite.

### `fmt()` rules (`lib/utils.ts`)

`fmt(n, digits=2)`: `>= 1000` → no decimals; `>= 10` → 1 decimal; otherwise
`digits` decimals. So `fmt(0)` reads `0.00`. A stat showing `0.00` means the input
is genuinely zero — usually a lookup miss upstream, not a formatting bug.

### Tightly-coupled contracts

The game-data schema (`lib/data/types.ts`), the prune script
(`scripts/prune-data.mjs`), the solver (`lib/solver/`), and the save parser
(`lib/save/`) are coupled by class names and recipe shape. If you touch one, walk
all four to keep the contracts aligned.

## Skills (task playbooks)

Focused, repeatable workflows live in [`skills/`](skills/). Open the matching
one before starting that kind of task:

- [`refresh-game-data.md`](skills/refresh-game-data.md) — regenerate the pruned
  dataset, world markers, and icons (and the dump-source trap).
- [`save-parser.md`](skills/save-parser.md) — change the browser save parser,
  categorization, or elevation/network extraction.
- [`solver.md`](skills/solver.md) — work on the LP production solver.
- [`data-schema.md`](skills/data-schema.md) — change the dataset shape and keep
  the four coupled contracts (types, prune, solver, parser) aligned.
- [`add-feature-page.md`](skills/add-feature-page.md) — add or change a feature
  page under static-export rules.
- [`testing-and-checks.md`](skills/testing-and-checks.md) — run and extend the
  checks (typecheck, vitest, probes).
- [`update-dependencies.md`](skills/update-dependencies.md) — bump npm deps
  without breaking the static export.
- [`deploy-and-ci.md`](skills/deploy-and-ci.md) — what CI expects and how Pages
  deploys.
- [`troubleshooting.md`](skills/troubleshooting.md) — symptom → cause map for the
  traps above.

## Done checklist

- [ ] `npm run typecheck` passes.
- [ ] Touched UI verified in `npm run dev` (not just types).
- [ ] If data/schema/solver/parser changed, the four coupled contracts still line up.
- [ ] If game data or icons changed, regenerated files are committed.
- [ ] localStorage shape changes bumped their version suffix.
