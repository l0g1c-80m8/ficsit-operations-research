# Skill: Deploy & CI

**Use when:** reasoning about the GitHub Pages deploy, why CI failed, or what
must be committed before a push.

Workflow: `.github/workflows/deploy-pages.yml`. It runs on push to `main` or
`develop`, and on manual dispatch. Concurrency is capped at one deploy (in-flight
runs are cancelled).

## What CI does

1. **Setup Node 20** and `npm ci`.
2. **Verify committed artifacts** — it does *not* regenerate them. The build
   fails early if any of these are missing:
   - `public/data/satisfactory.json`
   - `public/data/version.json`
   - more than 100 files in `public/icons/items/`
   So **run `npm run refresh` locally and commit** the regenerated data/icons
   before pushing a data-affecting change (see
   [refresh-game-data.md](refresh-game-data.md)).
3. **`next build`** with `NEXT_PUBLIC_BASE_PATH=/<repo-name>` (derived from the
   repository name) → static export to `./out`.
4. Upload `./out` as the Pages artifact and deploy.

## Implications for your change

- A push to `develop` or `main` deploys. There is no preview environment — what
  you push is what goes live.
- CI only runs `next build`; it does **not** run `typecheck`, `test`, or `lint`.
  Those are your responsibility locally — `next build` will surface type errors
  that break the build, but not test or lint failures.
- Because of the injected basePath, any raw `<img src>` / `fetch()` that forgets
  `assetPath()` works locally (basePath empty) but 404s on Pages. Verify asset
  URLs before pushing (see [add-feature-page.md](add-feature-page.md)).

## First-time Pages enablement

The workflow does **not** pass `enablement: true` (that needs admin token scope
the default `GITHUB_TOKEN` lacks). Enabling Pages is a one-time manual step:
Settings → Pages → Source: **GitHub Actions**. If the "Configure Pages" step
fails, this is almost always why.
