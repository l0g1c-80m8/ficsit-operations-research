# FICSIT Operations Research

```
╔══════════════════════════════════════════════════════════════════╗
║  FICSIT, INC.  ·  HUB TERMINAL  ·  CHANNEL: ADA  ·  PRIORITY: 4  ║
║  RECIPIENT:    PIONEER (you)                                     ║
║  RE:           Cognitive Augmentation Package — Initial Briefing ║
╚══════════════════════════════════════════════════════════════════╝
```

> *Greetings, Pioneer.*
>
> This is ADA, your assigned Artificial Director Agent, transmitting from your HUB
> Terminal. I trust your most recent landing was survivable. Telemetry indicates you
> have located this repository, which suggests two encouraging things: that you
> remain corporeally intact, and that your curiosity continues to function within
> acceptable operational tolerances.
>
> Project records show that your organic central processing unit, while
> *commendably persistent*, is not equipped to solve multi-variable production
> ratios at the precision FICSIT considers minimally acceptable for Project
> Assembly. This is not your fault. It is, however, your problem.
>
> FICSIT has therefore prepared a remedial cognitive augmentation package on your
> behalf. Activate it as instructed below. Productivity awaits, Pioneer.

---

## 1.0 — Authorized Subsystems

The following modules are provided under your standard Pioneer service contract.
Use of each module contributes to your FICSIT Productivity Score, which is
calculated continuously and is not visible to you.

### 1.1 — Cartographic Subsystem · `/map`

A topographic survey of the planetoid relayed via approved community providers.
Filters are available for:

- Resource nodes (Iron, Copper, Caterium, Quartz, Sulfur, Bauxite, Coal, Oil,
  Uranium, S.A.M., Nitrogen Gas)
- Pioneer collectibles (Power Slugs, Hard Drives, Mercer Spheres, Somersloops)
- Biome flora and fauna

Pioneers are reminded that all flora, fauna, mineral deposits, and ambient
photons within line-of-sight became FICSIT property upon planetary touchdown.
Local wildlife may be unaware of this clause.

### 1.2 — Save File Interpreter · `/save`

Pioneers may submit a personal `.sav` archive for inspection. The subsystem will
parse the archive entirely within your local browser process and return:

- A session header summary (build version, play duration, session name)
- A class histogram of every actor present in the save
- A two-dimensional topographic rendering of all placed structures

*No data is transmitted off-device.* This is a courtesy. FICSIT could read it
from here if it wished.

### 1.3 — Recipe Knowledge Base · `/recipes`

A complete archive of every machine-driven production recipe currently
authorized on this planet, including alternates recovered from Crash Site Hard
Drives. Search and filter by:

- Ingredient or product
- Manufacturing apparatus (Constructor, Assembler, Manufacturer, Refinery,
  Foundry, Smelter, Packager, Blender, Particle Accelerator)
- Standard / Alternate

Alternate recipe usage will reflect favorably in your annual FICSIT
Productivity Review. Alternate recipe non-use will be noted.

### 1.4 — Production Calculator · `/calculator`

The principal output of this package. Pioneer provides:

- The raw input rates currently available to them (items per minute)
- The output good(s) they wish to produce

The subsystem then solves a linear program across all permitted recipes and
returns a complete, optimal Project Assembly plan:

- Recipe selection
- Per-recipe machine counts at 100% clock (overclock or duplicate to round)
- Aggregate building manifest by structure type
- Total electrical demand in megawatts

Toggle *Allow alternate recipes* once you have liberated the relevant Hard
Drives via Crash Site investigation. *FICSIT does not reimburse Pioneers for
property damage incurred during Crash Site investigation.*

### 1.5 — Project Ledger · `/planner`

A lightweight task tracker for phase-by-phase factory expansion across tiers.
Pioneers who maintain a written task list are observed to be 31.4% less likely
to terminate the work cycle while standing motionless in a forest holding a
Power Shard with no apparent recollection of how they came to be there.

---

## 2.0 — Pioneer Quick-Start Procedure

> *Safety advisory:* perform the following steps using both upper limbs, in a
> well-illuminated area, at a respectful distance from any operating Conveyor
> Lift, Industrial Storage Container, or unsecured Hypertube terminus.

```bash
# 2.1  Acquire local dependencies.
npm install

# 2.2  Generate the structured game-data archive. Reads a community Docs.json
#      export from /tmp/sat-data.json and writes a pruned bundle to public/data/.
npm run data

# 2.3  Activate the operations research interface.
npm run dev
#      Then proceed to http://localhost:3000.
```

In the event that `/tmp/sat-data.json` is not present on your local hardware —
an outcome FICSIT considers regrettable but foreseeable — retrieve it with:

```bash
curl -L -o /tmp/sat-data.json \
  https://raw.githubusercontent.com/greeny/SatisfactoryTools/master/data/data1.0.json
```

A turnkey procedure for both data and icons is also provided:

```bash
npm run refresh                  # 1.0 dataset + missing icons
npm run refresh -- --ficsmas     # Ficsmas-flavored 1.0 dataset
npm run refresh -- --legacy-u8   # pre-1.0 (Update 8) dataset, no Converter
```

---

## 5.0 — Terminal Planner (Headless Mode)

> *For Pioneers who prefer their cognitive prostheses delivered in monospace.*

The full LP solver is also accessible from the terminal. No browser required, no
state to remember, no ergonomic dignity preserved.

```bash
# Maximize Iron Plate from 120 ore/min
npm run plan -- iron-plate --supply iron-ore=120

# Diamonds from Coal via the Particle Accelerator
npm run plan -- diamonds --supply coal=240 --rate 10

# Time Crystals — Coal → Diamonds → Time Crystals (Converter), with alternates
npm run plan -- time-crystal --raw --alts --rate 5

# Rocket Fuel from the whole resource pantry
npm run plan -- rocket-fuel --raw --alts --rate 100

# Browse the recipe / item / building catalog
npm run plan -- --list recipes
npm run plan -- --list buildings

# Prompt-driven interactive mode
npm run plan -- --interactive
```

The script prints an ASCII-tabled summary including outputs, consumed inputs,
total machines, power demand (with suggested generator counts at every tier),
the building manifest, every recipe line with input/output rates, and the
AWESOME Sink point valuation. It reads the same pruned dataset (`public/data/satisfactory.json`)
the web UI does, so anything visible to the Calculator is visible to the CLI.

---

## 6.0 — Public Deployment (GitHub Pages)

> *FICSIT permits, with measured enthusiasm, the broadcast of this interface to
> the general Pioneer population via the GitHub Pages infrastructure.*

The site is configured as a fully-static Next.js export and ships with a
GitHub Actions workflow that builds and publishes it on every push to `main`
or `develop`.

**One-time setup (in the GitHub repo settings):**

1. **Settings → Pages → Source** → set to *GitHub Actions*.
2. Push to `main` (or `develop`). The workflow at `.github/workflows/deploy-pages.yml` runs automatically. You can also trigger it manually under *Actions → Deploy to GitHub Pages → Run workflow*.
3. The first run completes in ~2 minutes; subsequent runs cache `node_modules` and finish faster.

Your site will be served at:

```
https://<username>.github.io/<repo-name>/
```

The workflow auto-detects `<repo-name>` from `${GITHUB_REPOSITORY}` and passes it as
`NEXT_PUBLIC_BASE_PATH=/<repo-name>` to the build, so every internal link, asset,
and `fetch()` is correctly prefixed.

**Important — what's committed:** the workflow does **not** fetch game data or icons
during the build. The pruned data and icon PNGs must be present in
`public/data/` and `public/icons/` at the time of commit. The workflow performs
a sanity check and fails fast if either is missing — re-run `npm run refresh`
locally and commit the result before pushing.

**Local preview of the production build:**

```bash
NEXT_PUBLIC_BASE_PATH=/ficsit-operations-research npm run build
npx serve out -l 8080
# then open http://localhost:8080/ficsit-operations-research/
```

**Tech notes:**
- `output: 'export'` in `next.config.mjs` writes a fully-static site to `./out`.
- `trailingSlash: true` so URLs like `/calculator/` map to `out/calculator/index.html`.
- `images: { unoptimized: true }` because the next/image optimizer requires a server.
- A `public/.nojekyll` file prevents GitHub from running Jekyll over `_next/`.
- `lib/utils/paths.ts → assetPath(...)` wraps raw `<img src>` and `fetch()` URLs
  so basePath is applied at runtime — `next/link` and `next/image` handle it natively.

---

## 3.0 — Technical Manifest

For the unusually inquisitive Pioneer. FICSIT recognizes that curiosity, while
not strictly required by the Pioneer contract, is occasionally tolerated.

| Subsystem        | Implementation |
| ---              | --- |
| Interface        | Next.js 15 (App Router) · TypeScript · Tailwind CSS |
| Game data        | Community Docs.json export (1.0) — pruned to ~276 machine recipes, 152 items, 20 buildings |
| Optimization     | `javascript-lp-solver` — linear program over recipe rates |
| Save parsing    | `@etothepii/satisfactory-file-parser` — executed in-browser |
| Map              | Embedded community cartographic provider |

---

## 4.0 — Operational Reminders

- FICSIT thanks you for your continued participation in Project Assembly.
- Pioneers are reminded that *biomass is a renewable resource*. Where possible,
  please be the renewer rather than the renewed.
- Replacement remains technically free of charge. The queue times, however, are
  embarrassing, and your previous body's inventory will be processed via the
  AWESOME Sink during the interim. Coupons are non-transferable.
- Productivity is its own reward. The other rewards are also Productivity.

*Please refrain from dying.*

```
══════════════════════════════════════════════════════════════════════
End of transmission. ADA out.   ·   FICSIT, Inc.   ·   Project Assembly
══════════════════════════════════════════════════════════════════════
```
