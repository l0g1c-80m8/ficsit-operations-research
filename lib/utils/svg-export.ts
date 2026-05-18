// Shared SVG/PNG export helpers used by the topograph and the calculator
// plan graph. Centralising the rasterization keeps quality knobs (target
// resolution, oversampling, smoothing) consistent across every download
// button in the app.

/** Default target width of the rasterized PNG, in pixels. Roughly 4K-class
 *  — enough that printing or zooming the image stays crisp without driving
 *  the canvas past browser per-element limits. Override per call if a
 *  particular export needs more headroom. */
export const DEFAULT_PNG_WIDTH = 4096;
/** Oversampling factor applied during rasterization. The browser draws the
 *  vector content into a canvas this many times larger than `width` and
 *  PNG-encodes the result — the extra resolution removes anti-aliasing
 *  artefacts on long thin strokes (gridlines, edge labels, network lines). */
export const DEFAULT_PNG_OVERSAMPLE = 2;
/** Maximum single-axis canvas dimension. Chrome/Safari silently return an
 *  empty canvas past ~16 384 px on a side; we clamp below that. */
const MAX_AXIS = 14_000;

export interface RasterizeOptions {
  /** Aspect ratio (height / width) of the source SVG. */
  aspect: number;
  /** Target output width before oversampling. Default 4096. */
  width?: number;
  /** Oversample factor — canvas is rendered at `width × oversample`. Default 2. */
  oversample?: number;
  /** Background color painted under the SVG before drawing. */
  background?: string;
}

/** Rasterize an inline SVG string to a PNG Blob at a configurable target
 *  size. The browser does the actual SVG → bitmap conversion (so all
 *  effects, gradients, filters, etc. render exactly as in the page). The
 *  caller owns the SVG string — call `buildStandaloneSVG` (or similar) on
 *  the live DOM tree before passing it in. */
export async function rasterizeSvgToPng(svgText: string, options: RasterizeOptions): Promise<Blob> {
  const width = options.width ?? DEFAULT_PNG_WIDTH;
  const oversample = options.oversample ?? DEFAULT_PNG_OVERSAMPLE;
  const background = options.background ?? '#0d1117';
  let outW = Math.round(width * oversample);
  let outH = Math.round(width * options.aspect * oversample);
  // Clamp so we never silently produce an empty canvas. If we have to
  // shrink, keep the aspect ratio.
  if (outW > MAX_AXIS || outH > MAX_AXIS) {
    const ratio = Math.min(MAX_AXIS / outW, MAX_AXIS / outH);
    outW = Math.floor(outW * ratio);
    outH = Math.floor(outH * ratio);
  }
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.imageSmoothingEnabled = true;
    // 'high' tells the browser to use the best resampler available — sharper
    // text, smoother diagonals — at the cost of a little extra CPU.
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e instanceof Error ? e : new Error('Image load failed'));
    img.src = url;
  });
}
