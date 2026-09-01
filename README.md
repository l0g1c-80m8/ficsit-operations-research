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

### 📡 Live FICSIT terminal

> The active broadcast is hosted at:
>
> **<https://l0g1c-80m8.github.io/ficsit-operations-research/>**
>
> Bookmark it. FICSIT pre-warmed the entry hyperlink on your behalf. *You're welcome.*

---

## Table of Contents

- [§1.0 — Authorized Subsystems](#10--authorized-subsystems)
  - [§1.1 — Cartographic Subsystem · `/map`](#11--cartographic-subsystem--map)
  - [§1.2 — Save File Interpreter · `/save`](#12--save-file-interpreter--save)
  - [§1.3 — Recipe Knowledge Base · `/recipes`](#13--recipe-knowledge-base--recipes)
  - [§1.4 — Building Browser · `/buildings`](#14--building-browser--buildings)
  - [§1.5 — Production Calculator · `/calculator`](#15--production-calculator--calculator)
  - [§1.6 — Project Ledger · `/planner`](#16--project-ledger--planner)
  - [§1.7 — World Atlas · `/atlas`](#17--world-atlas--atlas)
  - [§1.8 — Progression Ledger · `/progression`](#18--progression-ledger--progression)
- [§2.0 — Pioneer Quick-Start Procedure](#20--pioneer-quick-start-procedure)
  - [§2.1 — Data Source Switching](#21--data-source-switching)
- [§3.0 — Terminal Planner (Headless Mode)](#30--terminal-planner-headless-mode)
  - [§3.1 — Examples](#31--examples)
  - [§3.2 — Output Format](#32--output-format)
  - [§3.3 — Flags](#33--flags)
- [§4.0 — Technical Manifest](#40--technical-manifest)
- [§5.0 — Operational Reminders](#50--operational-reminders)

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

The planner auto-derives the right behavior from your inputs:

- **No supply caps listed** — every raw is treated as unlimited. A Pioneer
  wishing to produce 60 Iron Plate per minute just specifies that single
  target; the planner assumes Iron Ore is available.
- **One or more supply caps listed** — strict mode. Only the raws you list
  are available. This stops the Converter recipe from transmuting unlimited
  Quartz (or any other unspecified raw) into the resources you capped — a
  pre-1.1 trap where bounding Iron Ore could still produce a plan running
  on synthesized iron from elsewhere.

Toggle *Auto-supply unspecified raw resources* manually for the advanced
case ("cap Iron Ore at 60 but leave everything else unlimited"), or hit
*Use default* to return to the derived behavior.

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

### 1.7 — World Atlas · `/atlas`

A first-party survey chart rendered locally, without contacting an external
cartographic provider. Unlike §1.1, this subsystem draws directly onto the
FICSIT coordinate grid — the same UE world-space the Save File Interpreter
reports — so a marker here occupies the position your structures would.

Catalogued deposits and articles of interest:

| Layer | Count | Notes |
| --- | --- | --- |
| Resource nodes | 459 | 11 ore and fluid types, graded Impure / Normal / Pure |
| Resource wells & geysers | 149 | Nitrogen, Crude Oil, Water, and geothermal vents |
| Power Slugs | 1 242 | Green / Yellow / Purple, colour-coded |
| Artifacts | 404 | Mercer Spheres and Somersloops |
| Crash sites | 118 | Drop-pods containing Hard Drives |

Purity is encoded by marker size; Pure deposits carry a bright halo. Layers
toggle individually or by category, and the backdrop offers the same Grid /
Terrain / Plain modes as the Save topograph.

Marker coordinates are generated by `npm run map-markers` into
`public/data/map-markers.json` (≈ 131 KB) from community survey data — the
Satisfactory-Calculator Interactive Map, via
[`Tjark-Kuehl/satisfactorymap`](https://github.com/Tjark-Kuehl/satisfactorymap).
Attribution is displayed in-subsystem, as required.

### 1.8 — Progression Ledger · `/progression`

Determines, from your submitted `.sav` archive, precisely how far behind
schedule you are. Completion is read from the archive's schematic and
game-phase manager records — there is no manual checklist, because Pioneer
self-reporting has historically proven unreliable.

- **Milestones** — all 48 HUB schematics across Tier 0 (HUB Upgrades) through
  Tier 9, grouped by tier with per-tier part costs
- **MAM Research** — 96 nodes across 8 research trees (Caterium, Quartz,
  Sulfur, Alien Technology, Alien Organisms, Mycelia, Nutrients, Power Slugs)
- **Space Elevator** — all 5 Project Assembly phases, with parts already
  delivered subtracted from what remains
- **Alternates** — which of the 110 Hard Drive recipes you have recovered

The **Parts still owed** panel sums the cost of everything outstanding across
whichever scopes you select (optionally narrowed to a single tier) and hands
the largest items to §1.5 via `/calculator?targets=…`.

*Archive parsing occurs entirely within your local browser process.* The same
upload history backs §1.2 and §1.8, so one submission serves both.

---

## 2.0 — Pioneer Quick-Start Procedure

> *Safety advisory:* perform the following steps using both upper limbs, in a
> well-illuminated area, at a respectful distance from any operating Conveyor
> Lift, Industrial Storage Container, or unsecured Hypertube terminus.

```bash
# 2.1  Acquire local dependencies.
npm install

# 2.2  Refresh the cached data + icons in one shot. Pulls the community 1.1
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
npm run refresh                  # 1.1 dataset (default) + missing icons
npm run refresh -- --legacy-1.0  # pre-1.1 (1.0) dataset
npm run refresh -- --ficsmas     # 1.0 Ficsmas variant (holiday recipes)
npm run refresh -- --legacy-u8   # Update 8 dataset, no Converter
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
  https://raw.githubusercontent.com/greeny/SatisfactoryTools/dev/data/data.json
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
| `--strict` | Force-disable auto-supply (every raw must be specified) |
| `--auto-raw` | Force auto-supply ON even when `--supply` is given (advanced) |
| `--shards N` | Power Shard budget for overclocking; >0 lets the solver run recipes at 150/200/250 % clock |
| `--with-power` | Plan power production end-to-end: generators + fuel chain enter the LP |
| `--max-sink` | Optimize for AWESOME-Sink ticket throughput instead of weighted target output |
| `--top N` | Truncate recipe-line dump to top N by machine count |
| `--list KIND` | List `recipes` (default), `items`, or `buildings` |
| `-i, --interactive` | Prompt-driven mode |

---

## 4.0 — Technical Manifest

For the unusually inquisitive Pioneer. FICSIT recognizes that curiosity, while
not strictly required by the Pioneer contract, is occasionally tolerated.

| Subsystem | Implementation |
| --- | --- |
| Interface | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS |
| Game data | Community Docs.json (1.1) — pruned to **276 machine recipes**, **152 items**, **26 buildings** (production + extractors + generators + support), **254 schematics** (milestones / MAM / alternates), 13 raw resources |
| World markers | **2 372 markers** (nodes, wells, geysers, slugs, artifacts, drop-pods) pruned from Satisfactory-Calculator survey data via `Tjark-Kuehl/satisfactorymap`; Space Elevator phase costs hand-maintained in `lib/progression/phases.ts` |
| Icons | 152 items + 26 buildings · downloaded once from `satisfactory.wiki.gg` via `Special:FilePath`, cached in `public/icons/` |
| Optimization | `javascript-lp-solver` — linear program over recipe rates, dual-mode (minimize machines vs. maximize output) |
| Graph layout | `@dagrejs/dagre` — left-to-right layered Sugiyama; SVG render with inline icons; PNG via canvas rasterization |
| Save parsing | `@etothepii/satisfactory-file-parser` v4 — executed in-browser |
| Map | `/map` embeds a community cartographic provider (Satisfactory Calculator / Map Genie selectable); `/atlas` renders markers natively as SVG in UE world coordinates |
| Persistence | `localStorage` for Calculator inputs + history, Planner state; JSON export/import for both |

The dataset is content-hashed (`buildId=<ISO>-r<recipes>-b<buildings>`) so a
browser auto-busts its cache the moment you re-prune. The current build is
visible in the sidebar footer.

---

## 5.0 — Operational Reminders

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
