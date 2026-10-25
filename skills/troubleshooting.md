# Skill: Troubleshooting

**Use when:** something is wrong and you want the known symptom → cause mappings
before you start digging. Most of these look like bugs in the wrong place.

| Symptom | Most likely cause | Fix / where to look |
|---------|-------------------|---------------------|
| `SaveStats` counts / power roll up as **0** while the actor histogram looks fine | A save `Build_*_C` class was used to index `data.buildings` without conversion | Route it through `buildableToDescriptor()` ([save-parser.md](save-parser.md)) |
| A stat shows **`0.00`** | Input is genuinely zero — usually an upstream lookup miss, **not** a formatting bug | `fmt(0)` is `0.00`; trace the value, not the formatter |
| Power-balance LP reports **`infeasible`** for no clear reason | Dataset was pruned without `generators[].fuels` (wrong dump source) | Re-prune from the **dev** dump ([refresh-game-data.md](refresh-game-data.md)); `diagnose.ts` for other infeasibilities |
| `/progression` shows **0/48** milestones | Version-sensitive save property renamed, or wrong array shape | `node scripts/probe-progression.mjs <file.sav>` before editing the extractor |
| Browser keeps serving **stale data** after a prune | `version.json` buildId not bumped, or markers regenerated without re-running the data prune | Re-run `npm run data` (or `npm run refresh`); both datasets share the buildId |
| Image / icon / data URL **404s on GitHub Pages** but works locally | Raw `<img src>` or `fetch()` missing `assetPath()`; basePath is empty locally, `/<repo>` on Pages | Wrap with `assetPath()` from `lib/utils/paths.ts` ([add-feature-page.md](add-feature-page.md)) |
| Vitest dies at startup: `node:util does not provide an export named 'styleText'` | Running on Node 18 | Use Node >= 20 ([testing-and-checks.md](testing-and-checks.md)) |
| `next build` fails but `next dev` was fine | Server-only code path or a Node-only import leaked into client code | Honor static-export rules; dynamically import Node-dep modules |
| Side elevation view is mostly empty dead space | A few stray high/low actors stretched the Z axis | Fit the axis to built content (percentile clip ∪ detected levels) |

## General approach

1. Reproduce in `npm run dev` with a known `.sav` from `sample/`.
2. For data shape questions, dump it: the `scripts/probe-*.mjs` tools print raw
   actor/manager/edge shapes and run on any Node.
3. `npm run typecheck` first — it rules out whole classes of mistakes cheaply.
4. If the dataset is suspect, re-prune from the dev dump and diff
   `public/data/version.json`.
