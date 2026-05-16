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
Drives. Features:

- **Search** with spelling tolerance — *Sulphuric Acid*, *Aluminium Ingot*,
  *Colour Cartridge*, *Iron-Plate* all resolve to their canonical entries
- **Filter** by standard / alternate, by producing apparatus, or by free text
- **Detailed drawer view** (click any card) with per-cycle and per-minute flow,
  building info with power range, sister-recipes that make the same product,
  consumers, and producers of every input
- **Variable-power recipes** (Converter, Quantum Encoder, Particle Accelerator)
  display their full *min–max MW* range in an accent badge

Alternate recipe usage will reflect favorably in your annual FICSIT
Productivity Review. Alternate recipe non-use will be noted.

### 1.4 — Building Browser · `/buildings`

Every building currently authorized for Pioneer construction:

- **Production apparatus** (Smelter, Foundry, Constructor, Assembler, Manufacturer,
  Refinery, Packager, Blender, Particle Accelerator, Converter, Quantum Encoder)
- **Extractors** (Miner Mk.1/2/3, Oil Extractor, Water Extractor, Resource Well
  Extractor + Pressurizer)
- **Generators & power** (Biomass Burner, Coal-, Fuel-, Nuclear-Powered Generator,
  Geothermal Generator, Alien Power Augmenter)
- **Support** (Pipeline Pump Mk.1/2)

Each card surfaces icon, description, power draw (or output for generators), and
a collapsible list of every recipe that runs in it.

### 1.5 — Production Calculator · `/calculator`

The principal cognitive prosthesis. Pioneer provides:

- A list of output goods to produce, by item and required rate per minute
- *Optional* supply caps for individual raw inputs

The subsystem then solves a linear program across all permitted recipes and
returns a complete, optimal Project Assembly plan with **four output tabs**:

| Tab | Contents |
| --- | --- |
| **Summary** | Targets achieved · raw inputs consumed (with cap utilization %) · building manifest with per-type machine counts |
| **Graph** | Topographic production-chain rendering (left-to-right, item ↔ recipe bipartite graph) with downloadable exports — **SVG** (icons inlined as base64, fully portable), **PNG**, **DOT** (Graphviz), **JSON** |
| **Economics** | AWESOME Sink point valuation in/out/net · power-infrastructure suggestions at every generator tier (Biomass Burner, Coal, Fuel, Nuclear) with required unit counts and headroom |
| **Recipes** | Every recipe line with machine count, building, and power demand (including variable-power ranges) |

#### Operating modes

The objective auto-switches based on Pioneer intent:

- **Fixed-rate mode** — when a target has a positive rate, the LP **minimizes
  total machines** subject to producing *at least* that rate. The result is the
  smallest factory that achieves the goal.
- **Maximize mode** — when no rate is given, the LP **maximizes weighted output**
  subject to your supply caps. Tells you how much you can produce.

#### Auto-supply

Raw resources not in the supply list are treated as **unlimited** by default.
A Pioneer wishing to produce 60 Iron Plate per minute need only specify that
single target — the planner assumes Iron Ore is available. Toggle the
*Auto-supply unspecified raw resources* option off to enforce strict mode.

#### Persistence and history

- Inputs auto-save to `localStorage` after every keystroke
- The **Save plan** button captures the current setup + result summary into a
  named history entry
- The **History** drawer lists every saved plan with output icons, machine
  count, power, recipe count; restore, delete, **Export JSON**, **Import JSON**
- A **Reset** button restores defaults

Toggle *Allow alternate recipes* once you have liberated the relevant Hard
Drives via Crash Site investigation. *FICSIT does not reimburse Pioneers for
property damage incurred during Crash Site investigation.*

### 1.6 — Project Ledger · `/planner`

A UniFi-styled master/detail planner for phase-by-phase factory expansion across
tiers.

- **KPI strip** — Projects · Tasks · Complete (with progress bar) · In Progress · Blocked
- **Project list** (left, 340px) — searchable, each row shows target-item icon
  (or tier badge), status pill with pulse dot for active projects, task counts,
  and an inline progress bar
- **Detail pane** (right) with three tabs:
  - **Tasks** grouped by status (Doing / Blocked / To Do / Done), inline edit,
    priority + status dropdowns, click-circle to cycle status
  - **Targets** pin an item + rate per project, lifecycle (planning/active/paused/done),
    and tier (T0–T9)
  - **Activity** vertical timeline of every state change

Auto-saves to `localStorage` (`ficsit.planner.v1`). The header offers **Export**
(downloads the entire planner state as JSON), **Import** (file picker, replaces
state with confirmation), and **Reset** (restores sample projects).

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

# 2.2  Refresh the cached data + icons in one shot. Pulls the community 1.0
#      Docs.json into /tmp, prunes to public/data/, fetches any missing icons.
npm run refresh

# 2.3  Activate the operations research interface.
npm run dev
#      Then proceed to http://localhost:3000.
```

A pre-pruned dataset + all icons are committed to the repository — `npm run refresh`
is only required if you want to pick up newer game data from the community dump.

### 2.1 — Data Source Switching

```bash
npm run refresh                  # 1.0 dataset + missing icons (default)
npm run refresh -- --ficsmas     # 1.0 Ficsmas variant (holiday recipes)
npm run refresh -- --legacy-u8   # pre-1.0 (Update 8) dataset, no Converter
npm run refresh -- --force-icons # also re-download every icon
```

Granular sub-tasks if you don't want the all-in-one:

```bash
npm run data            # re-prune /tmp/sat-data.json → public/data/
npm run icons           # fetch only icons missing from public/icons/
npm run icons:force     # re-download every icon (overwrites)
npm run icons:missing   # retry only the icons in public/icons/_missing.json
```

If `/tmp/sat-data.json` is not present on your local hardware — an outcome
FICSIT considers regrettable but foreseeable — retrieve it manually with:

```bash
curl -L -o /tmp/sat-data.json \
  https://raw.githubusercontent.com/greeny/SatisfactoryTools/master/data/data1.0.json
```

A live dataset version badge appears in the sidebar footer (`276r · 152i · 26b`)
so you can verify you're on the expected build.

---

## 3.0 — Terminal Planner (Headless Mode)

> *For Pioneers who prefer their cognitive prostheses delivered in monospace.*

The full LP solver is also accessible from the terminal. No browser required, no
state to remember, no ergonomic dignity preserved.

### 3.1 — Examples

```bash
# Produce exactly 60 Iron Plate/min — auto-supplies Iron Ore. Solver picks the
# smallest factory (3 Smelters + 3 Constructors, 24 MW, 90 Iron Ore/m).
npm run plan -- iron-plate --rate 60

# Spelling tolerance — British "Sulphuric" resolves to "Sulfuric Acid".
npm run plan -- "Sulphuric Acid" --rate 100

# Diamonds from Coal via the Particle Accelerator.
npm run plan -- diamonds --supply coal=240 --rate 10

# Time Crystal — Coal → Diamonds → Time Crystals (Converter), with alternates.
npm run plan -- time-crystal --rate 5 --alts

# Maximize Iron Plate given a 480 ore/min cap (no rate = maximize).
npm run plan -- iron-plate --supply iron-ore=480

# Browse the recipe / item / building catalog.
npm run plan -- --list recipes
npm run plan -- --list items
npm run plan -- --list buildings

# Prompt-driven interactive mode.
npm run plan -- --interactive

# Strict mode — disable auto-supply, every consumed raw must be listed.
npm run plan -- iron-plate --rate 60 --strict --supply iron-ore=120
```

### 3.2 — Output Format

The script prints an ANSI-colored, ASCII-tabled summary:

- **Target** — what you asked for
- **Outputs** — actual produced rate(s)
- **Raw / Inputs Consumed** — net consumption per supply item, with cap
  utilization for capped items and an `(auto-supplied)` tag for unconstrained ones
- **Totals** — total machines · total power MW (with suggested counts of Coal /
  Fuel / Nuclear generators) · recipe lines
- **Buildings** — manifest by structure type, sorted by count
- **Recipe Lines** — every line with machines, building, power range
  (variable-power recipes show `min–max MW`), alternate flag, plus per-line
  input/output flows
- **AWESOME Sink Value** — output points/min minus input points/min, with net.
  Liquids and gases are correctly excluded (can't be sunk)

### 3.3 — Flags

| Flag | Effect |
| --- | --- |
| `<target>` | Item to produce (slug, class name, or partial name with spelling tolerance) |
| `-s, --supply item=rate,...` | Comma-separated supply caps |
| `--rate N` | Required minimum output rate per minute. When set, solver minimizes machines instead of maximizing output |
| `--weight N` | Objective weight on the target (default 1; for multi-target plans) |
| `--alts` | Allow alternate recipes |
| `--strict` | Disable auto-supply (every raw must be specified) |
| `--top N` | Truncate recipe-line dump to top N by machine count |
| `--list KIND` | List `recipes` (default), `items`, or `buildings` |
| `-i, --interactive` | Prompt-driven mode |

---

## 4.0 — Public Deployment (GitHub Pages)

> *FICSIT permits, with measured enthusiasm, the broadcast of this interface to
> the general Pioneer population via the GitHub Pages infrastructure.*

The site is configured as a fully-static Next.js export and ships with a GitHub
Actions workflow that builds and publishes it on every push to `main` or `develop`.

### 4.1 — One-time setup

> ⚠ **You must enable Pages once manually** before the first workflow run.
> GitHub's default `GITHUB_TOKEN` does not have permission to create a Pages
> site from scratch, so the `configure-pages` action will fail with
> *"Resource not accessible by integration"* if you skip this step.

1. **Settings → Pages → Source** → choose **GitHub Actions**.
2. Push to `main` (or `develop`). The workflow at
   `.github/workflows/deploy-pages.yml` runs automatically. You can also trigger
   it manually under *Actions → Deploy to GitHub Pages → Run workflow*.
3. The first run completes in ~2 minutes; subsequent runs cache `node_modules`
   and finish faster.

If you skip step 1, the workflow fails with a clear in-log message telling you
exactly which switch to flip. Re-run the job once you've enabled Pages.

Your site will be served at:

```
https://<username>.github.io/<repo-name>/
```

The workflow auto-detects `<repo-name>` from `${GITHUB_REPOSITORY}` and passes
it as `NEXT_PUBLIC_BASE_PATH=/<repo-name>` to the build, so every internal link,
asset, and `fetch()` is correctly prefixed.

### 4.2 — What's committed

The workflow does **not** fetch game data or icons during the build. The pruned
data and icon PNGs must be present in `public/data/` and `public/icons/` at the
time of commit. The workflow performs a sanity check and fails fast if either
is missing — re-run `npm run refresh` locally and commit the result before
pushing.

### 4.3 — Local preview of the production build

```bash
NEXT_PUBLIC_BASE_PATH=/ficsit-operations-research npm run build
npx serve out -l 8080
# then open http://localhost:8080/ficsit-operations-research/
```

### 4.4 — Tech notes

- `output: 'export'` in `next.config.mjs` writes a fully-static site to `./out`.
- `trailingSlash: true` so URLs like `/calculator/` map to
  `out/calculator/index.html`.
- `images: { unoptimized: true }` because the next/image optimizer requires a
  server.
- A `public/.nojekyll` file prevents GitHub from running Jekyll over `_next/`.
- `lib/utils/paths.ts → assetPath(...)` wraps raw `<img src>` and `fetch()` URLs
  so basePath is applied at runtime — `next/link` and `next/image` handle it
  natively.

---

## 5.0 — Technical Manifest

For the unusually inquisitive Pioneer. FICSIT recognizes that curiosity, while
not strictly required by the Pioneer contract, is occasionally tolerated.

| Subsystem | Implementation |
| --- | --- |
| Interface | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS |
| Game data | Community Docs.json (1.0) — pruned to **276 machine recipes**, **152 items**, **26 buildings** (production + extractors + generators + support), 13 raw resources |
| Icons | 152 items + 26 buildings · downloaded once from `satisfactory.wiki.gg` via `Special:FilePath`, cached in `public/icons/` |
| Optimization | `javascript-lp-solver` — linear program over recipe rates, dual-mode (minimize machines vs. maximize output) |
| Graph layout | `@dagrejs/dagre` — left-to-right layered Sugiyama; SVG render with inline icons; PNG via canvas rasterization |
| Save parsing | `@etothepii/satisfactory-file-parser` v4 — executed in-browser |
| Map | Embedded community cartographic provider (Satisfactory Calculator / Map Genie selectable) |
| Persistence | `localStorage` for Calculator inputs + history, Planner state; JSON export/import for both |
| Deployment | Static export, GitHub Actions, GitHub Pages |

The dataset is content-hashed (`buildId=<ISO>-r<recipes>-b<buildings>`) so a
browser auto-busts its cache the moment you re-prune. The current build is
visible in the sidebar footer.

---

## 6.0 — Operational Reminders

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
