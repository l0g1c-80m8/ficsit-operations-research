# Skills

Agent-agnostic task playbooks for this repository. Each file is plain Markdown —
no tool-specific format — so any coding agent (or human) can follow it. They
complement [`../AGENTS.md`](../AGENTS.md), which holds the project-wide
conventions; these go deep on one recurring task each.

| Skill | Use when you are… |
|-------|-------------------|
| [refresh-game-data.md](refresh-game-data.md) | Regenerating the pruned dataset, world markers, or icons after an upstream/game update. |
| [save-parser.md](save-parser.md) | Changing how `.sav` files are parsed, categorized, or projected (elevation / network / progression). |
| [solver.md](solver.md) | Modifying the LP production solver or its power-balance / overclock modeling. |
| [data-schema.md](data-schema.md) | Changing the dataset shape (`lib/data/types.ts`) and keeping the coupled contracts aligned. |
| [add-feature-page.md](add-feature-page.md) | Adding or reworking a feature page under the static-export constraints. |
| [testing-and-checks.md](testing-and-checks.md) | Running or extending the automated checks and ad-hoc probes. |
| [update-dependencies.md](update-dependencies.md) | Bumping npm dependencies without breaking the static export. |
| [deploy-and-ci.md](deploy-and-ci.md) | Reasoning about the GitHub Pages deploy or why CI fails. |
| [troubleshooting.md](troubleshooting.md) | Mapping a confusing symptom to its known cause before digging. |

## Conventions for these playbooks

- Keep them **task-oriented and current**. If a step no longer matches the code,
  fix the step in the same change that moved the code.
- Reference real paths and real `npm` scripts (see `package.json`).
- Stay tool-agnostic: address "you", never a specific agent or editor.
