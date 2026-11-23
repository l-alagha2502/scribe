import * as fabric from 'fabric';

export type AlignmentAnchor9 =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface BoundingBoxRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Calculates the target scene-space bounding box origin and (dx, dy) translation
 * needed to snap an object's transformed bounding box cleanly onto any of the
 * 9 artboard alignment points without overflowing off-canvas.
 */
export function computeNinePointAlignmentDelta(
  bbox: BoundingBoxRect,
  canvasWidth: number,
  canvasHeight: number,
  anchor: AlignmentAnchor9
): { targetLeft: number; targetTop: number; dx: number; dy: number } {
  const artW = Math.max(1, canvasWidth);
  const artH = Math.max(1, canvasHeight);

  const horizontal: 'left' | 'center' | 'right' = anchor.endsWith('left')
    ? 'left'
    : anchor.endsWith('right')
    ? 'right'
    : 'center';

  const vertical: 'top' | 'middle' | 'bottom' = anchor.startsWith('top')
    ? 'top'
    : anchor.startsWith('bottom')
    ? 'bottom'
    : 'middle';

  let targetLeft =
    horizontal === 'left'
      ? 0
      : horizontal === 'right'
      ? artW - bbox.width
      : (artW - bbox.width) / 2;

  let targetTop =
    vertical === 'top'
      ? 0
      : vertical === 'bottom'
      ? artH - bbox.height
      : (artH - bbox.height) / 2;

  if (bbox.width <= artW) {
    targetLeft = Math.max(0, Math.min(artW - bbox.width, targetLeft));
  }
  if (bbox.height <= artH) {
    targetTop = Math.max(0, Math.min(artH - bbox.height, targetTop));
  }

  return {
    targetLeft,
    targetTop,
    dx: targetLeft - bbox.left,
    dy: targetTop - bbox.top,
  };
}

/**
 * Snaps a Fabric.js object to a 9-point artboard anchor using its full
 * transformed bounding box (accounting for scale, rotation, and flip state).
 */
export function alignFabricObjectOnCanvas(
  obj: fabric.FabricObject,
  canvasWidth: number,
  canvasHeight: number,
  anchor: AlignmentAnchor9
): { left: number; top: number; bbox: BoundingBoxRect } {
  obj.setCoords();
  const currentBBox = obj.getBoundingRect();
  const { dx, dy } = computeNinePointAlignmentDelta(
    currentBBox,
    canvasWidth,
    canvasHeight,
    anchor
  );

  const nextLeft = (obj.left ?? 0) + dx;
  const nextTop = (obj.top ?? 0) + dy;
  obj.set({ left: nextLeft, top: nextTop });
  obj.setCoords();

  return {
    left: nextLeft,
    top: nextTop,
    bbox: obj.getBoundingRect(),
  };
}

/**
 * Detects if a bounding box currently rests at one of the 9 alignment anchors.
 */
export function detectActiveAlignmentAnchor(
  bbox: BoundingBoxRect,
  canvasWidth: number,
  canvasHeight: number,
  tolerance: number = 1.5
): AlignmentAnchor9 | null {
  const anchors: AlignmentAnchor9[] = [
    'top-left',
    'top-center',
    'top-right',
    'middle-left',
    'center',
    'middle-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ];

  for (const anchor of anchors) {
    const { dx, dy } = computeNinePointAlignmentDelta(
      bbox,
      canvasWidth,
      canvasHeight,
      anchor
    );
    if (Math.abs(dx) <= tolerance && Math.abs(dy) <= tolerance) {
      return anchor;
    }
  }
  return null;
}

/**
 * Returns whether an axis is visually mirrored via Fabric flip flags or negative scale.
 */
export function isAxisInverted(
  obj: Pick<fabric.FabricObject, 'flipX' | 'flipY' | 'scaleX' | 'scaleY'>,
  axis: 'x' | 'y'
): boolean {
  if (axis === 'x') {
    return Boolean(obj.flipX) !== ((obj.scaleX ?? 1) < 0);
  }
  return Boolean(obj.flipY) !== ((obj.scaleY ?? 1) < 0);
}

/**
 * Toggles horizontal (X-axis) or vertical (Y-axis) mirror state cleanly on a Fabric object.
 */
export function toggleFabricObjectAxisFlip(
  obj: fabric.FabricObject,
  axis: 'x' | 'y'
): { flipX: boolean; flipY: boolean } {
  if (axis === 'x') {
    const sx = obj.scaleX ?? 1;
    if (sx < 0) {
      obj.set({ scaleX: Math.abs(sx), flipX: Boolean(obj.flipX) });
    } else {
      obj.set('flipX', !obj.flipX);
    }
  } else {
    const sy = obj.scaleY ?? 1;
    if (sy < 0) {
      obj.set({ scaleY: Math.abs(sy), flipY: Boolean(obj.flipY) });
    } else {
      obj.set('flipY', !obj.flipY);
    }
  }
  obj.setCoords();
  return {
    flipX: isAxisInverted(obj, 'x'),
    flipY: isAxisInverted(obj, 'y'),
  };
}
