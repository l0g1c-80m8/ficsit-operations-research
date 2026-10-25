# Skill: Add or change a feature page

**Use when:** adding a new route under `app/(features)/` or reworking an existing
one (`/atlas`, `/buildings`, `/calculator`, `/map`, `/planner`, `/progression`,
`/recipes`, `/save`).

## Static export rules (non-negotiable)

`next.config.mjs` sets `output: 'export'` + `trailingSlash: true`. That means:

- **No** `getServerSideProps`, route handlers, or any server-only code path.
- **No** `next/image` optimizer — use plain `<img>` (with `assetPath`, below) or
  the shared `ItemIcon` primitive.
- **No** Node-only modules in client code. Anything that must use Node deps (e.g.
  the save parser) is **dynamically imported** and kept client-side only.
- Pages are statically generated at build time or run entirely in the browser.

## Asset & data URLs under a basePath

CI injects `NEXT_PUBLIC_BASE_PATH=/<repo-name>`. For URLs Next.js does **not**
rewrite automatically — raw `<img src>` and `fetch()` — wrap them in
`assetPath('/foo')` from `lib/utils/paths.ts`. `next/link` and `next/image`
already handle basePath, so do not double-wrap those.

Load the dataset through `lib/data/load.ts` (it handles the `version.json`
cache-busting); do not fetch `public/data/*.json` directly.

## Reuse before building

- Shared primitives: `components/ui/` (`Card`, `Button`, `ItemIcon`, `StatTile`, …).
- Map/backdrop: `components/shared/MapBackdrop.tsx` and the `usePanZoom` hook in
  `lib/hooks/`.
- Persisted UI state: `useLocalStorage` in `lib/storage/`. Namespace new keys
  like the existing ones (`ficsit.<feature>.v1`) and bump the version suffix when
  the stored shape changes — never silently rewrite old data.
- Formatting: `fmt()` from `lib/utils.ts` (see its rounding rules in AGENTS.md).

Match the surrounding code's structure: a feature's UI lives in
`components/<feature>/`, its types/logic in `lib/<feature>/`, and the route is a
thin page in `app/(features)/<feature>/`.

## Verify

1. `npm run typecheck`.
2. `npm run dev` and exercise the page in the browser — types do not prove the
   feature works.
3. Optionally `npm run build` to confirm it still statically exports (catches
   accidental server-only usage that `dev` tolerates).
