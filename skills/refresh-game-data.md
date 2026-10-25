# Skill: Refresh game data

**Use when:** the game updated, or `public/data/*` is stale/wrong, and you need
to regenerate the pruned dataset, the world markers, and/or the icons.

## The one trap that fails silently

The data prune expects the upstream dump at `/tmp/sat-data.json`. **Use the
`dev` branch dump, not `master` / `data1.0.json`.** Only `dev/data/data.json`
carries the detailed `generators[].fuels` records (`supplementalItem`,
`byproduct`, `byproductAmount`). The solver's `includePowerProduction` mode needs
them to model a coal generator's water draw and a nuclear plant's waste. Prune
from a master dump and every generator silently loses that array, which makes the
power-balance LP report `infeasible` with no visible cause — and the prune's
printed counts look completely normal.

`scripts/prune-data.mjs` now hard-fails on a missing fuels array, and
`scripts/refresh.mjs` defaults to `dev`.

```bash
curl -L -o /tmp/sat-data.json \
  https://raw.githubusercontent.com/greeny/SatisfactoryTools/dev/data/data.json
```

## Do it

```bash
npm run refresh      # prune data + world markers + missing icons (all-in-one)
```

Targeted alternatives:

```bash
npm run data         # only prune /tmp/sat-data.json → public/data/satisfactory.json
npm run map-markers  # only refetch public/data/map-markers.json  (--src <url|path>)
npm run icons        # only fetch missing icons
npm run icons:force  # re-download every icon
```

`refresh.mjs` flags: `--legacy-1.0`, `--ficsmas`, `--legacy-u8`, `--force-icons`,
`--no-markers`. It tolerates a marker-fetch failure (keeps the committed file)
because that upstream is not ours.

## Two committed datasets, one buildId

- `public/data/satisfactory.json` — pruned game data (from the greeny dump).
- `public/data/map-markers.json` — world survey markers (from a **different**
  upstream, Satisfactory-Calculator via `Tjark-Kuehl/satisfactorymap`).

Both are cache-busted by the **same** `buildId` in `public/data/version.json`,
which the prune rewrites. So if you regenerate markers you must **also** re-run
`npm run data`, or browsers keep the stale markers. `npm run refresh` does both.

## After regenerating

1. `npm run typecheck` — a schema drift in the dump can break `lib/data/types.ts`
   consumers.
2. If the schema shape changed, walk the coupled contracts (see
   [solver.md](solver.md) and [save-parser.md](save-parser.md)).
3. **Commit the regenerated `public/data/*.json` and any new `public/icons/*`.**
   CI does not regenerate them; an uncommitted prune ships stale data.
