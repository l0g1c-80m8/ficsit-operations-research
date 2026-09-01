/** Approximate Satisfactory play-area bounds in UE world units (1 unit = 1 cm).
 *  Anchors the procedural terrain blobs and the /atlas default view across the
 *  in-game playable rectangle, so the background lines up roughly with where
 *  buildings can be placed and where resource nodes sit.
 *
 *  Shared by the save Topograph and the world Atlas so both render the same
 *  rectangle and their coordinates overlay cleanly. */
export const SAT_MAP_BOUNDS = { x: -324_698, y: -375_000, w: 749_628, h: 750_000 } as const;

/** An SVG viewBox in world units. */
export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The world rect padded outward by `pad` world units on every side. */
export function paddedWorldBox(pad = 20_000): ViewBox {
  return {
    x: SAT_MAP_BOUNDS.x - pad,
    y: SAT_MAP_BOUNDS.y - pad,
    w: SAT_MAP_BOUNDS.w + 2 * pad,
    h: SAT_MAP_BOUNDS.h + 2 * pad,
  };
}
