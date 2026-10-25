# Skill: Update dependencies

**Use when:** bumping npm dependencies — a routine Next.js/React/tooling upgrade,
or a security advisory.

## Constraints to respect

- **Node >= 20** is required (Vitest breaks on 18). CI pins Node 20; do not
  introduce anything that needs newer than what CI runs.
- The site is a **static export** (`output: 'export'`). Upgrades to Next.js must
  not rely on server-only features; re-read [add-feature-page.md](add-feature-page.md)
  before a major Next bump.
- The save parser's Node deps are kept out of the client bundle via dynamic
  import + `serverExternalPackages` in `next.config.mjs`. If you change those
  deps, confirm the bundle still builds and the parser still only runs
  client-side.

## Do it

```bash
npm outdated                 # see what's behind
npm update                   # in-range bumps
# for a major bump, change package.json explicitly, then:
npm install
```

## Verify after any bump

1. `npm run typecheck`
2. `npm test` (Node >= 20)
3. `npm run build` — the static export is the real integration test; it catches
   Next/React behavior changes that `dev` tolerates.
4. `npm run dev` — smoke-test the heavy pages: `/calculator` (solver + dagre
   graph), `/save` (dynamic parser import), `/map` and `/atlas` (backdrop).
5. Commit `package.json` **and** `package-lock.json` together.

Bump one risky dependency at a time (Next.js, React, the LP solver, dagre) so a
regression is easy to bisect.
