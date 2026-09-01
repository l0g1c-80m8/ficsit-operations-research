'use client';
// Pan/zoom state machine for a world-coordinate SVG canvas.
//
// Extracted from the interaction model proven in components/save-viewer/Topograph.tsx
// (wheel-zoom anchored at the cursor, left-drag pan, clamped zoom range) so the
// /atlas map behaves identically. Topograph still carries its own inline copy;
// it can adopt this hook once there's a sample save to regression-test the
// canvas against.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewBox } from '@/lib/save/bounds';

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export interface PanZoom {
  svgRef: React.RefObject<SVGSVGElement | null>;
  viewBox: ViewBox;
  /** World coords under the cursor, or null when it isn't over the canvas. */
  cursor: { x: number; y: number } | null;
  /** Spread onto the <svg> element. */
  handlers: {
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerLeave: (e: React.PointerEvent<SVGSVGElement>) => void;
  };
  /** >1 zooms in, <1 zooms out, anchored at the viewBox center. */
  zoomBy: (factor: number) => void;
  /** Snap back to the full world box. */
  reset: () => void;
  /** True while a drag-pan is in progress (for cursor styling). */
  panning: boolean;
}

/** @param worldBox the full extent; also the reset target and zoom-out limit. */
export function usePanZoom(worldBox: ViewBox, minWidth = 1000): PanZoom {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<ViewBox>(worldBox);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const dragRef = useRef<{ startVB: ViewBox; startPt: { x: number; y: number } } | null>(null);

  // Refit when the extent changes (e.g. a different dataset loads).
  useEffect(() => setViewBox(worldBox), [worldBox]);

  const screenToWorld = useCallback((e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }, []);

  // React attaches onWheel at the document root as a *passive* listener, so
  // preventDefault() inside an onWheel prop is a no-op and the page scrolls
  // anyway. Bind a native non-passive listener instead.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const worldPt = screenToWorld(e);
      if (!worldPt) return;
      const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
      setViewBox((vb) => {
        const maxW = worldBox.w * 1.4;
        const aspect = vb.h / vb.w;
        const newW = clamp(vb.w * factor, minWidth, maxW);
        const newH = newW * aspect;
        // Keep the world point under the cursor stationary.
        const ratioX = (worldPt.x - vb.x) / vb.w;
        const ratioY = (worldPt.y - vb.y) / vb.h;
        return { x: worldPt.x - ratioX * newW, y: worldPt.y - ratioY * newH, w: newW, h: newH };
      });
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [screenToWorld, worldBox, minWidth]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return; // left-drag pans
      const worldPt = screenToWorld(e);
      if (!worldPt) return;
      svgRef.current?.setPointerCapture(e.pointerId);
      dragRef.current = { startVB: viewBox, startPt: { x: worldPt.x, y: worldPt.y } };
      setPanning(true);
    },
    [screenToWorld, viewBox],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const worldPt = screenToWorld(e);
      if (worldPt) setCursor({ x: worldPt.x, y: worldPt.y });

      const drag = dragRef.current;
      const svg = svgRef.current;
      if (!drag || !svg) return;
      // startPt was measured under the OLD viewBox while worldPt is under the
      // LATEST one, so recompute the cursor's position under the drag-start
      // viewBox and slide the box until the two coincide.
      const rect = svg.getBoundingClientRect();
      const sx = (e.clientX - rect.left) / rect.width;
      const sy = (e.clientY - rect.top) / rect.height;
      const currentWorldX = drag.startVB.x + sx * drag.startVB.w;
      const currentWorldY = drag.startVB.y + sy * drag.startVB.h;
      setViewBox({
        x: drag.startVB.x + (drag.startPt.x - currentWorldX),
        y: drag.startVB.y + (drag.startPt.y - currentWorldY),
        w: drag.startVB.w,
        h: drag.startVB.h,
      });
    },
    [screenToWorld],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (svgRef.current?.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setPanning(false);
  }, []);

  const onPointerLeave = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    setCursor(null);
    onPointerUp(e);
  }, [onPointerUp]);

  const zoomBy = useCallback(
    (factor: number) => {
      setViewBox((vb) => {
        const maxW = worldBox.w * 1.4;
        const aspect = vb.h / vb.w;
        const newW = clamp(vb.w / factor, minWidth, maxW);
        const newH = newW * aspect;
        const cx = vb.x + vb.w / 2;
        const cy = vb.y + vb.h / 2;
        return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
      });
    },
    [worldBox, minWidth],
  );

  const reset = useCallback(() => setViewBox(worldBox), [worldBox]);

  return {
    svgRef,
    viewBox,
    cursor,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave },
    zoomBy,
    reset,
    panning,
  };
}
