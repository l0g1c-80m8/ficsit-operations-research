# Skill: Testing and checks

**Use when:** running the automated checks, adding tests, or debugging a check
that fails for environment reasons.

## The gates

```bash
npm run typecheck   # tsc --noEmit — the authoritative automated gate; run always
npm test            # vitest run — single pass, CI-style
npm run lint        # next lint
npm run build       # static export; catches server-only usage dev tolerates
```

**Typecheck is the only thing that reliably proves correctness without a human.**
UI behavior still has to be checked in `npm run dev`.

## Node version

**Vitest needs Node >= 20.** On Node 18 every suite dies at startup with
`node:util does not provide an export named 'styleText'` — that is the runtime,
not your change. Check `node -v` before assuming a test regression.

## Where the real assertions live

Vitest suites are colocated next to the modules:

- `lib/solver/factory-solver.test.ts` — auto-supply, overclock tiers,
  power-balance, sink-points objective.
- `lib/save/verify.test.ts` — flow-classification semantics.
- `lib/save/network.test.ts` — inferred network edges.
- `lib/progression/derive.test.ts` — tier/research-tree grouping, phase state,
  remaining-cost roll-ups.
- `lib/utils/tiers.test.ts` — tier helpers.

When adding solver tests, pin alternates **off** unless the test exercises the
alt path (alternates change machine counts; defaults are otherwise unpredictable).

## Ad-hoc probes (run fine on any Node)

Not assertion-based — they dump shapes for eyeballing:

```bash
node scripts/test-solver.mjs                 # ad-hoc LP probes
node scripts/test-graph.mjs                  # dagre layout
node scripts/probe-save.mjs <file.sav>        # spline/connection actor shapes
node scripts/probe-progression.mjs <file.sav> # schematic / game-phase managers
node scripts/probe-edges.mjs <file.sav>       # inferred edges
```

The save parser has no headless test path — verify parser changes by loading a
`.sav` from `sample/` via `/save` in the browser.
