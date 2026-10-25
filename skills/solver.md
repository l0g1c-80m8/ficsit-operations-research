# Skill: Work on the production solver

**Use when:** changing the LP production solver, its objective modes, power
balance, overclock handling, or the infeasibility diagnostics.

Core file: `lib/solver/factory-solver.ts`. Graph layout (Sugiyama via dagre) is
alongside it. The headless CLI is `scripts/plan.mjs` (`npm run plan`).

## Formulation

- Per-item flow-balance **equalities**, supply **caps**, and either target output
  **minimums** or a weighted objective.
- **Dual mode:** if *any* target has `minRatePerMin`, the objective **minimizes
  total machines** subject to flooring those rates. Otherwise it **maximizes**
  weighted target output subject to supplies.
- `autoSupplyRawResources: true` (default) auto-uncaps every raw item not in the
  user's supply list. Strict mode flips this off.
- Variable-power recipes (Converter, Quantum Encoder, Particle Accelerator) carry
  `isVariablePower` + `minPower`/`maxPower`. Per-line power in
  `FactoryPlanLine.powerKW` uses the building's static `powerConsumption`; the UI
  and the CLI surface the variable range separately.
- `diagnose.ts` turns an `infeasible` status into a human-readable explanation —
  extend it when you add a new way for the model to be infeasible.

## Power production needs the fuels array

`includePowerProduction` models generators as consumers of fuel/water and
producers of byproducts, using `generators[].fuels`
(`supplementalItem`, `byproduct`, `byproductAmount`). If that array is missing
from the dataset, the power-balance LP reports `infeasible` with no visible
cause. That array only survives when the data was pruned from the **dev** dump —
see [refresh-game-data.md](refresh-game-data.md).

## Coupled contracts

The solver shares class names and recipe shape with the dataset schema
(`lib/data/types.ts`), the prune (`scripts/prune-data.mjs`), and the save parser
(`lib/save/`). Changing any recipe/building field means walking all four.

## Verify your change

```bash
npm run test                       # lib/solver/factory-solver.test.ts
node scripts/test-solver.mjs       # ad-hoc LP probes (not assertion-based)
node scripts/test-graph.mjs        # exercises the dagre layout
npm run plan -- <target> --rate N  # end-to-end headless plan
```

Pin alternates **off** in new assertion tests unless the test specifically
exercises the alt path — alternates change machine counts, so defaults are not
predictable without locking them down.
