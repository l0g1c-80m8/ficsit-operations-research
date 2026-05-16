/**
 * Returns a path that respects the build-time basePath. Use this for raw
 * `<img src>`, `fetch()`, and any other URL that Next.js doesn't rewrite
 * automatically — next/link and next/image already handle basePath on their own.
 *
 * In dev, NEXT_PUBLIC_BASE_PATH is empty and this is a no-op.
 * On GitHub Pages it expands to `/<repo-name>/icons/foo.png` etc.
 */
export function assetPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  if (!path.startsWith('/')) path = `/${path}`;
  return `${base}${path}`;
}

/** The basePath itself, e.g. "" in dev, "/ficsit-operations-research" on Pages. */
export function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? '';
}
