import { useCallback, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import {
  ensureFontsLoaded,
  loadFontOnDemand,
  subscribeFontLoaded,
} from '../utils/fontCatalog';

/**
 * Canvas text re-render hook:
 * - Refreshes Fabric.js text measurement caches (`initDimensions` / `clearFabricFontCache`)
 *   whenever any font finishes loading asynchronously.
 * - Exposes `applyFontToCanvasText` and `syncLoadedProjectFonts` for zero-lag typography.
 */
export function useCanvasFontSync(
  fabricRef: React.MutableRefObject<fabric.Canvas | null>
) {
  const [loadedFontRevision, setLoadedFontRevision] = useState(0);

  const remeasureAndRenderCanvas = useCallback(
    (targetFamily?: string) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const fabricUtil = (fabric as any).util;
      if (fabricUtil && typeof fabricUtil.clearFabricFontCache === 'function') {
        fabricUtil.clearFabricFontCache(targetFamily);
      }

      const targetLower = targetFamily?.toLowerCase();
      let updatedAny = false;

      canvas.getObjects().forEach((obj) => {
        const objFont = (obj as any).fontFamily;
        if (
          typeof objFont === 'string' &&
          (!targetLower || objFont.toLowerCase() === targetLower)
        ) {
          if (typeof (obj as any).initDimensions === 'function') {
            (obj as any).initDimensions();
          }
          obj.set('dirty', true);
          obj.setCoords();
          updatedAny = true;
        }
      });

      if (updatedAny || !targetFamily) {
        canvas.requestRenderAll();
      }
    },
    [fabricRef]
  );

  useEffect(() => {
    const unsubscribe = subscribeFontLoaded((family) => {
      setLoadedFontRevision((r) => r + 1);
      remeasureAndRenderCanvas(family);
    });
    return unsubscribe;
  }, [remeasureAndRenderCanvas]);

  const loadAndRefreshFont = useCallback(
    async (family: string) => {
      if (!family) return;
      await loadFontOnDemand(family);
      remeasureAndRenderCanvas(family);
    },
    [remeasureAndRenderCanvas]
  );

  const syncCanvasProjectFonts = useCallback(
    async (canvas?: fabric.Canvas | null) => {
      const activeCanvas = canvas || fabricRef.current;
      if (!activeCanvas) return;

      const families = new Set<string>();
      activeCanvas.getObjects().forEach((obj) => {
        const f = (obj as any).fontFamily;
        if (typeof f === 'string' && f.trim()) {
          families.add(f.trim());
        }
      });

      if (families.size === 0) return;
      await ensureFontsLoaded(Array.from(families));
      remeasureAndRenderCanvas();
    },
    [fabricRef, remeasureAndRenderCanvas]
  );

  return {
    loadedFontRevision,
    loadAndRefreshFont,
    remeasureAndRenderCanvas,
    syncCanvasProjectFonts,
  };
}
