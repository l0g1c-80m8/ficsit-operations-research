// Shared SVG/PNG export helpers used by the topograph and the calculator
// plan graph. Centralising the rasterization keeps quality knobs (target
// resolution, oversampling, smoothing) consistent across every download
// button in the app.

/** Default target width of the rasterized PNG, in pixels. 6 K-class —
 *  enough to print at A1 / 36" at 200 DPI without visible pixelation, while
 *  staying within browser canvas limits when multiplied by oversample. */
export const DEFAULT_PNG_WIDTH = 6144;
/** Oversampling factor applied during rasterization. The browser draws the
 *  vector content into a canvas this many times larger than `width` and
 *  PNG-encodes the result — the extra resolution removes anti-aliasing
 *  artefacts on long thin strokes (gridlines, edge labels, network lines).
 *  Final image width is `DEFAULT_PNG_WIDTH × DEFAULT_PNG_OVERSAMPLE`
 *  (12 288 px at current defaults). */
export const DEFAULT_PNG_OVERSAMPLE = 2;
/** True supersample factor: we render to an *even larger* intermediate
 *  canvas, then drawImage-downsample to the final size. This is the step
 *  that puts real teeth on AA — thin strokes and small labels become much
 *  cleaner than rendering directly at the target resolution. */
export const DEFAULT_PNG_SUPERSAMPLE = 1.5;
/** Maximum single-axis canvas dimension. Chrome and Firefox cap at 16 384 px
 *  per side; Safari has historically been stricter but iOS 16+ raised the
 *  ceiling. We clamp here, preserving aspect, when settings push past it. */
const MAX_AXIS = 16_384;

export interface RasterizeOptions {
  /** Aspect ratio (height / width) of the source SVG. */
  aspect: number;
  /** Target output width before oversampling. Default `DEFAULT_PNG_WIDTH`. */
  width?: number;
  /** Oversample factor — final image is `width × oversample` on the long
   *  axis (before any clamp). Default `DEFAULT_PNG_OVERSAMPLE`. */
  oversample?: number;
  /** True supersample factor — render the SVG into a canvas this much
   *  bigger than the final size, then drawImage-downsample. Yields the
   *  cleanest anti-aliasing on thin strokes. Default
   *  `DEFAULT_PNG_SUPERSAMPLE`. Set to 1 to skip the extra pass. */
  supersample?: number;
  /** Background color painted under the SVG before drawing. */
  background?: string;
}

/** Rasterize an inline SVG string to a PNG Blob at a configurable target
 *  size. The browser does the actual SVG → bitmap conversion (so all
 *  effects, gradients, filters, etc. render exactly as in the page). The
 *  caller owns the SVG string — call `buildStandaloneSVG` (or similar) on
 *  the live DOM tree before passing it in.
 *
 *  Pipeline (when `supersample > 1`):
 *    1. Render SVG → "render canvas" sized `(target × supersample)`.
 *    2. drawImage(renderCanvas, finalCanvas) at `target` size, using
 *       `imageSmoothingQuality = 'high'` to downsample.
 *    3. PNG-encode the final canvas.
 *  Step 2 is what gives crisp, almost-print-quality AA: even though the
 *  browser already anti-aliases the SVG, a downsample from a 2× rendering
 *  averages the sub-pixel coverage and reads cleaner. */
export async function rasterizeSvgToPng(svgText: string, options: RasterizeOptions): Promise<Blob> {
  const width = options.width ?? DEFAULT_PNG_WIDTH;
  const oversample = options.oversample ?? DEFAULT_PNG_OVERSAMPLE;
  const supersample = options.supersample ?? DEFAULT_PNG_SUPERSAMPLE;
  const background = options.background ?? '#0d1117';

  // Final output dimensions.
  let finalW = Math.round(width * oversample);
  let finalH = Math.round(width * options.aspect * oversample);
  if (finalW > MAX_AXIS || finalH > MAX_AXIS) {
    const ratio = Math.min(MAX_AXIS / finalW, MAX_AXIS / finalH);
    finalW = Math.floor(finalW * ratio);
    finalH = Math.floor(finalH * ratio);
  }
  // Intermediate render canvas — capped at MAX_AXIS even if `supersample`
  // would push past it; we just lose some headroom on the AA pass.
  let renderW = Math.round(finalW * supersample);
  let renderH = Math.round(finalH * supersample);
  if (renderW > MAX_AXIS || renderH > MAX_AXIS) {
    const ratio = Math.min(MAX_AXIS / renderW, MAX_AXIS / renderH);
    renderW = Math.floor(renderW * ratio);
    renderH = Math.floor(renderH * ratio);
  }

  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = await loadImage(url);
    // Render canvas: SVG → bitmap at supersampled resolution.
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = renderW;
    renderCanvas.height = renderH;
    const renderCtx = renderCanvas.getContext('2d');
    if (!renderCtx) throw new Error('Canvas 2D context unavailable');
    renderCtx.imageSmoothingEnabled = true;
    renderCtx.imageSmoothingQuality = 'high';
    renderCtx.fillStyle = background;
    renderCtx.fillRect(0, 0, renderW, renderH);
    renderCtx.drawImage(img, 0, 0, renderW, renderH);

    // Fast path: if no supersampling, encode the render canvas directly.
    if (renderW === finalW && renderH === finalH) {
      return await encodePng(renderCanvas);
    }
    // Final canvas: downsample the render canvas for sharper AA.
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = finalW;
    finalCanvas.height = finalH;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error('Canvas 2D context unavailable');
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(renderCanvas, 0, 0, finalW, finalH);
    return await encodePng(finalCanvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encodePng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png');
  });
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
