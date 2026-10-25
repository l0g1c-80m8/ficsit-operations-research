# Skill: Work on the save parser

**Use when:** changing how `.sav` files are read, categorized, or projected
(the Topograph view, elevation levels, inferred networks, or progression).

The parser is **browser-only** — it is dynamically imported so its Node deps
stay out of the client bundle, and it is listed in `serverExternalPackages`.
There is no Node entry point; you cannot unit-test it headlessly.

## Class-name dialects — the thing that bites

Two parallel class hierarchies:

- **Buildable** — `Build_ManufacturerMk1_C` — stored on placed actors in the
  save (`obj.typePath`).
- **Descriptor** — `Desc_ManufacturerMk1_C` — the key into the pruned data
  (`SatData.buildings`, recipe `producedIn`, icon filenames).

Rules:

- Convert with `buildableToDescriptor()` from `lib/save/categorize.ts` **before**
  indexing `data.buildings` with anything from a save.
- `categorize()` regexes match the `Build_` prefix only — pass it the **buildable**
  class, not the descriptor.
- Symptom of getting this wrong: counts and power roll up as `0` in `SaveStats`
  even though the actor histogram looks correct.

Progression class names are the exception: schematic classes in the save
(`Schematic_3-1_C`, `Research_Quartz_4_1_C`) match `SatSchematic.className`
exactly — no translation table.

## Where things live

- `lib/save/` — parser, `categorize.ts` (category regexes + `CATEGORY_META`),
  `bounds.ts` (`SAT_MAP_BOUNDS`, UE world units), `elevation.ts`,
  `network.ts`, `progression.ts`, `verify.ts`.
- `components/save-viewer/Topograph.tsx` — the 2D/top-down map, the side
  elevation strip, and the SVG/PNG export.
- `components/shared/MapBackdrop.tsx` — grid/terrain/plain backdrop, shared with
  `/atlas`. Coordinates are UE world units, identical to what the parser reports.

### Topograph background modes

Selectable via the Background chip strip; geometry lives at the top of
`Topograph.tsx` / in `MapBackdrop.tsx`:

- **Grid** (default) — 100 m thin + 1 km bold lines drawn as explicit `<line>`
  elements. Stroke widths are tied to the *current* viewBox so the grid stays
  legible at any zoom; a `<pattern>` with world-unit strokes would collapse to
  fractional pixels at default zoom.
- **Terrain** — procedural biome blobs (soft colored ellipses, Gaussian-blurred,
  clipped to the play-area bounds) under the grid. No external assets, no
  copyright surface; positions are loose impressions, not survey-accurate.
- **Plain** — original solid-dark canvas.

## Coordinates & elevation

- Everything is in UE world units (1 unit = 1 cm). The X/Y plane is top-down;
  Z is height.
- Absolute world Z is meaningless to a player (measured from the map origin).
  When showing heights, make them relative to a datum (e.g. the lowest built
  level) — the Topograph labels heights as "above lowest level".
- Elevation levels are binned foundations; stray high/low actors should not be
  allowed to stretch an axis across mostly-empty space.

## Progression is version-sensitive

`lib/save/progression.ts` reads `FGSchematicManager.mPurchasedSchematics` and
`FGGamePhaseManager` defensively (multiple spellings, both ObjectProperty array
shapes) and returns empty rather than throwing. Space Elevator phase costs are
**not** in the upstream dump — they are hand-maintained in
`lib/progression/phases.ts`.

## Verify your change

There is no headless parser test, so:

1. Drop a `.sav` into `sample/` and load it via `/save` in `npm run dev`.
2. Dump raw actor/manager shapes with the probe scripts (these run on any Node):
   ```bash
   node scripts/probe-save.mjs <file.sav>          # spline/connection actor shapes
   node scripts/probe-progression.mjs <file.sav>    # schematic / game-phase managers
   node scripts/probe-edges.mjs <file.sav>          # inferred network edges
   ```
   If progression shows 0/48 milestones, probe **before** editing the extractor —
   the file likely carries a renamed property, not a parsing bug.
3. `npm run test` covers `lib/save/verify.test.ts` and `lib/save/network.test.ts`.
4. If you touched the data contract, walk the coupled files (see
   [solver.md](solver.md) and [refresh-game-data.md](refresh-game-data.md)).
