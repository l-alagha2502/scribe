import test from 'node:test';
import assert from 'node:assert/strict';
import * as fabric from 'fabric';
import {
  AlignmentAnchor9,
  computeNinePointAlignmentDelta,
  alignFabricObjectOnCanvas,
  detectActiveAlignmentAnchor,
  isAxisInverted,
  toggleFabricObjectAxisFlip,
} from './transformMath';

test('computeNinePointAlignmentDelta: snaps rotated bounding box cleanly inside 1200x630 canvas', () => {
  const canvasW = 1200;
  const canvasH = 630;
  const bbox = { left: 140, top: 85, width: 320, height: 210 };

  const expected: Record<AlignmentAnchor9, [number, number]> = {
    'top-left': [0, 0],
    'top-center': [440, 0],
    'top-right': [880, 0],
    'middle-left': [0, 210],
    center: [440, 210],
    'middle-right': [880, 210],
    'bottom-left': [0, 420],
    'bottom-center': [440, 420],
    'bottom-right': [880, 420],
  };

  for (const [anchor, [expLeft, expTop]] of Object.entries(expected) as [
    AlignmentAnchor9,
    [number, number]
  ][]) {
    const res = computeNinePointAlignmentDelta(bbox, canvasW, canvasH, anchor);
    assert.equal(res.targetLeft, expLeft, `${anchor} targetLeft`);
    assert.equal(res.targetTop, expTop, `${anchor} targetTop`);
    assert.ok(res.targetLeft >= 0 && res.targetLeft + bbox.width <= canvasW);
    assert.ok(res.targetTop >= 0 && res.targetTop + bbox.height <= canvasH);
  }
});

test('alignFabricObjectOnCanvas: aligns scaled & rotated Fabric object without off-canvas overflow', () => {
  const rect = new fabric.Rect({
    left: 220,
    top: 190,
    width: 200,
    height: 100,
    scaleX: 1.5,
    scaleY: 1.2,
    angle: 33,
    originX: 'center',
    originY: 'center',
  });

  const canvasW = 1200;
  const canvasH = 630;
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
    const { bbox } = alignFabricObjectOnCanvas(rect, canvasW, canvasH, anchor);
    assert.ok(bbox.left >= -0.01, `${anchor} left >= 0 (got ${bbox.left})`);
    assert.ok(bbox.top >= -0.01, `${anchor} top >= 0 (got ${bbox.top})`);
    assert.ok(
      bbox.left + bbox.width <= canvasW + 0.01,
      `${anchor} right <= ${canvasW} (got ${bbox.left + bbox.width})`
    );
    assert.ok(
      bbox.top + bbox.height <= canvasH + 0.01,
      `${anchor} bottom <= ${canvasH} (got ${bbox.top + bbox.height})`
    );
    assert.equal(detectActiveAlignmentAnchor(bbox, canvasW, canvasH), anchor);
  }
});

test('toggleFabricObjectAxisFlip: toggles X and Y axis inversion and normalizes negative scale', () => {
  const rect = new fabric.Rect({
    width: 120,
    height: 80,
    flipX: false,
    flipY: false,
  });

  assert.equal(isAxisInverted(rect, 'x'), false);
  assert.equal(isAxisInverted(rect, 'y'), false);

  toggleFabricObjectAxisFlip(rect, 'x');
  assert.equal(rect.flipX, true);
  assert.equal(isAxisInverted(rect, 'x'), true);
  assert.equal(isAxisInverted(rect, 'y'), false);

  toggleFabricObjectAxisFlip(rect, 'y');
  assert.equal(rect.flipY, true);
  assert.equal(isAxisInverted(rect, 'y'), true);

  toggleFabricObjectAxisFlip(rect, 'x');
  assert.equal(rect.flipX, false);
  assert.equal(isAxisInverted(rect, 'x'), false);

  // Also handles plain object negative scaleX inversion checks cleanly
  assert.equal(
    isAxisInverted({ flipX: false, flipY: false, scaleX: -1, scaleY: 1 }, 'x'),
    true
  );
  assert.equal(
    isAxisInverted({ flipX: true, flipY: false, scaleX: -1, scaleY: 1 }, 'x'),
    false
  );
});
