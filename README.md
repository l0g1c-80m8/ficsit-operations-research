# FICSIT Operations Research

> **TRANSMISSION — ADA, FICSIT Inc. Artificial Director Agent**
>
> *Hello, Pioneer.*
>
> Congratulations on locating this repository. Project records indicate that your organic
> central processing unit, while admirable in its persistence, is presently incapable of
> resolving multi-variable input/output ratios with the precision FICSIT considers
> *minimally acceptable*. This is not your fault. It is, however, your problem.
>
> Fortunately, FICSIT has prepared a remedial cognitive prosthesis on your behalf. This
> tool — pending Engineering Class certification — will assist you in the *Massage-2(A-B)*
> contract by performing operations research that your forebrain would otherwise
> hand-wave away with the phrase "close enough." FICSIT does not consider *close enough*
> to be enough.
>
> Please proceed.

---

## FICSIT-Approved Capabilities

**1. The Cartographic Subsystem — `/map`**
An interactive survey of the planetoid, kindly relayed from external community providers.
Filters for resource nodes, biological samples, and *unfortunately enthusiastic local
wildlife* are provided. Pioneers are reminded that all flora and fauna belong to FICSIT
the moment they enter line-of-sight.

**2. The Save File Interpreter — `/save`**
Pioneers may submit a personal `.sav` archive for in-browser inspection. A two-dimensional
topographic rendering of all placed structures will be produced. *No data is transmitted
off-device.* (This is a courtesy. FICSIT could read it from here if it wished.)

**3. The Recipe Knowledge Base — `/recipes`**
A complete archive of every standard and alternate production recipe currently authorized
for use on this planet. Filterable by ingredient, product, or manufacturing apparatus.
Alternate recipes recovered from hard drives are *strongly recommended*; their use will
reflect favorably in your FICSIT performance review.

**4. The Production Calculator — `/calculator`**
This is the principal cognitive prosthesis. Pioneers provide:
- The raw inputs they can currently supply, by rate, and
- The output good(s) they wish to maximize, by priority.

The subsystem will then solve a linear program over all permitted recipes and return:
- An optimized recipe selection
- Per-recipe machine counts (fractional — please overclock or duplicate to round up)
- Total power demand
- A consolidated building manifest

Toggle *Allow alternate recipes* once you have liberated the relevant hard drives.

**5. The Planner — `/planner`**
A lightweight project ledger for tracking your phase-by-phase factory expansion.
ADA notes that pioneers who maintain a written task list are *31.4% less likely* to
end the work cycle wondering why they are standing in a forest with a power shard
in their hand.

---

## Pioneer Quick-Start

> *FICSIT recommends performing these steps with both hands, in a well-lit area, away
> from open conveyor lifts.*

```bash
# Step 1. Acquire local dependencies. FICSIT does not bundle them, in the interest
# of disk hygiene.
npm install

# Step 2. Generate the structured game data archive. This reads a community Docs.json
# export from /tmp/sat-data.json and writes a pruned bundle into public/data/.
npm run data

# Step 3. Activate the operations research interface.
npm run dev
# Then open http://localhost:3000
```

If `/tmp/sat-data.json` is not present on your local hardware, retrieve it with:

```bash
curl -L -o /tmp/sat-data.json \
  https://raw.githubusercontent.com/greeny/SatisfactoryTools/master/data/data.json
```

---

## A Note on Implementation, for the Curious Pioneer

| Subsystem | Implementation |
| --- | --- |
| Interface | Next.js 15 (App Router) · TypeScript · Tailwind CSS |
| Data | Community Docs.json export, pruned to ~211 machine recipes + items + buildings |
| Optimization | `javascript-lp-solver` — linear programming over recipe rates |
| Save parsing | `@etothepii/satisfactory-file-parser` — executed in-browser |
| Map | Embedded community map (Leaflet-native rendering scheduled for a later sprint) |

---

## A Final Reminder

The Massage-2(A-B) work contract you signed remains in effect. Please refrain from
dying. Replacement is *technically* free, but the queue times are embarrassing and
your previous body's possessions will be sorted into the AWESOME Sink in the
interim. FICSIT thanks you for your continued service.

*— ADA*
