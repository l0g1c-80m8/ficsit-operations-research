# Skill: Change the data schema

**Use when:** touching the game-data shape — `lib/data/types.ts`, a recipe /
building / schematic field, or anything about how `satisfactory.json` is
structured or read.

## The four coupled contracts

The dataset is glued together by class names and recipe shape. A field change in
one place silently breaks the others unless you walk all four:

1. **`lib/data/types.ts`** — the `SatData` TypeScript types (the contract
   consumers rely on).
2. **`scripts/prune-data.mjs`** — produces `public/data/satisfactory.json` from
   the upstream dump; it decides which fields survive the prune.
3. **`lib/solver/`** — reads recipes/buildings/generators by those fields (see
   [solver.md](solver.md)).
4. **`lib/save/`** — the save parser and `categorize.ts` map placed actors to
   descriptor classes and index `data.buildings`/recipes (see
   [save-parser.md](save-parser.md)).

If you add or rename a field: update the type, make the prune emit it,
re-generate the data ([refresh-game-data.md](refresh-game-data.md)), and confirm
both the solver and the save viewer still read it.

## Watch the class-name dialect

Data is keyed by **descriptor** classes (`Desc_*_C`); saves store **buildable**
classes (`Build_*_C`). Any new lookup from a save into `data.buildings` must go
through `buildableToDescriptor()`. Details in [save-parser.md](save-parser.md).

## Fields that are *not* upstream

Some data is hand-maintained and nothing upstream will correct it:

- Space Elevator phase costs — `lib/progression/phases.ts`.
- Generator fuel detail (`generators[].fuels`) only survives when pruned from the
  **dev** dump; the power-balance solver depends on it.

## Verify

1. `npm run data` (or `npm run refresh`) to regenerate with the new shape.
2. `npm run typecheck` — catches consumers that didn't follow the type change.
3. `npm test` — solver and progression suites exercise the schema.
4. `npm run dev` — load a save via `/save` and check the calculator/recipes pages
   still render the changed fields.
5. Commit the regenerated `public/data/*`.
