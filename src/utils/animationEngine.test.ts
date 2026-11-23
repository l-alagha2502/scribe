import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fabric from 'fabric';
import {
  ANIMATION_PRESETS_BY_CATEGORY,
  SCRIBE_ANIMATION_KEYFRAMES_CSS,
  applyAnimationFrameToFabricObject,
  captureRestingBaseline,
  clampDelay,
  clampDuration,
  clearAnimationSlotFromObject,
  evaluateAnimationFrame,
  getPrimaryAnimationSlot,
  getWebAnimationKeyframes,
  hasAnyAnimationSlot,
  normalizeAnimationConfig,
  normalizeAnimationSlots,
  restoreRestingBaseline,
  solveEasing,
  syncAnimationSlotsToObject,
} from './animationEngine';

describe('animationEngine: In / Out / Passive presets, keyframes, and non-destructive Fabric transforms', () => {
  it('all 11 In presets start hidden/off-axis/scaled/clipped at t=0 and land cleanly at identity at t=1', () => {
    assert.equal(ANIMATION_PRESETS_BY_CATEGORY.in.length, 11);

    for (const preset of ANIMATION_PRESETS_BY_CATEGORY.in) {
      const start = evaluateAnimationFrame(preset.id, 0);
      const end = evaluateAnimationFrame(preset.id, 1);

      const isInitiallyAltered =
        start.opacity < 0.05 ||
        start.scaleX < 0.5 ||
        start.scaleY < 0.5 ||
        Math.abs(start.translateX) > 20 ||
        Math.abs(start.translateY) > 20 ||
        start.clipRightPct >= 99;

      assert.ok(
        isInitiallyAltered,
        `In preset ${preset.id} must genuinely start hidden/scaled/displaced at t=0`
      );

      assert.equal(end.opacity, 1, `${preset.id} end opacity`);
      assert.equal(end.translateX, 0, `${preset.id} end translateX`);
      assert.equal(end.translateY, 0, `${preset.id} end translateY`);
      assert.equal(end.scaleX, 1, `${preset.id} end scaleX`);
      assert.equal(end.scaleY, 1, `${preset.id} end scaleY`);
      assert.equal(end.angleDeg, 0, `${preset.id} end angleDeg`);
      assert.equal(end.clipRightPct, 0, `${preset.id} end clipRightPct`);
    }
  });

  it('all 10 Out presets start at identity at t=0 and genuinely disappear at t=1', () => {
    assert.equal(ANIMATION_PRESETS_BY_CATEGORY.out.length, 10);

    for (const preset of ANIMATION_PRESETS_BY_CATEGORY.out) {
      const start = evaluateAnimationFrame(preset.id, 0);
      const end = evaluateAnimationFrame(preset.id, 1);

      assert.equal(start.opacity, 1, `${preset.id} start opacity`);
      assert.equal(start.scaleX, 1, `${preset.id} start scaleX`);
      assert.equal(start.translateX, 0, `${preset.id} start translateX`);

      const genuinelyHiddenAtEnd =
        end.opacity === 0 || (end.scaleX <= 0.05 && end.scaleY <= 0.05) || end.clipRightPct >= 100;
      assert.ok(
        genuinelyHiddenAtEnd,
        `Out preset ${preset.id} must genuinely disappear at t=1`
      );
    }
  });

  it('all 8 Passive presets animate smoothly mid-cycle and preserve Swing top pivot', () => {
    assert.equal(ANIMATION_PRESETS_BY_CATEGORY.passive.length, 8);

    for (const preset of ANIMATION_PRESETS_BY_CATEGORY.passive) {
      const q1 = evaluateAnimationFrame(preset.id, 0.25);
      const q2 = evaluateAnimationFrame(preset.id, 0.5);
      const hasMotion = [q1, q2].some(
        (f) =>
          f.translateX !== 0 ||
          f.translateY !== 0 ||
          f.scaleX !== 1 ||
          f.angleDeg !== 0 ||
          f.glowBlur > 0
      );
      assert.ok(hasMotion, `Passive preset ${preset.id} should animate across cycle`);
      assert.ok(SCRIBE_ANIMATION_KEYFRAMES_CSS.includes(preset.cssKeyframe));
      assert.ok(getWebAnimationKeyframes(preset.id).length >= 2);
    }

    const swingFrame = evaluateAnimationFrame('swing', 0.25);
    assert.equal(swingFrame.pivotTop, true);
    assert.ok(swingFrame.angleDeg > 5);
  });

  it('preserves Invert / Transform positions, flips, Smooth Edges clipPath, and restores baseline cleanly', () => {
    const smoothClip = new fabric.Rect({ width: 100, height: 100, rx: 24, ry: 24 });
    const rect = new fabric.Rect({
      left: 340,
      top: 210,
      width: 120,
      height: 80,
      scaleX: 1.5,
      scaleY: 1.25,
      angle: 15,
      flipX: true,
      opacity: 0.9,
      clipPath: smoothClip,
    });

    const baseline = captureRestingBaseline(rect);
    const midSlide = evaluateAnimationFrame('slide-in-left', 0.5);
    applyAnimationFrameToFabricObject(rect, baseline, midSlide);

    assert.equal(rect.flipX, true);
    assert.ok(rect.left! < 340);
    assert.equal(rect.angle, 15);
    assert.equal(rect.clipPath, smoothClip);

    restoreRestingBaseline(rect);
    assert.equal(rect.left, 340);
    assert.equal(rect.top, 210);
    assert.equal(rect.scaleX, 1.5);
    assert.equal(rect.scaleY, 1.25);
    assert.equal(rect.angle, 15);
    assert.equal(rect.opacity, 0.9);
    assert.equal(rect.flipX, true);
    assert.equal(rect.clipPath, smoothClip);
  });

  it('clamps duration/delay, normalizes AnimationConfig, and solves cubic-bezier easings accurately', () => {
    assert.equal(clampDuration(0.05), 0.2);
    assert.equal(clampDuration(5.5), 3.0);
    assert.equal(clampDelay(-1), 0.0);
    assert.equal(clampDelay(4.2), 2.0);

    const cfg = normalizeAnimationConfig({
      id: 'Pop In',
      duration: 1.4,
      delay: 0.3,
      easing: 'ease-out',
    });
    assert.deepEqual(cfg, {
      id: 'pop-in',
      category: 'in',
      duration: 1.4,
      delay: 0.3,
      easing: 'ease-out',
    });

    assert.equal(solveEasing('cubic-bezier(0.22, 1, 0.36, 1)', 0), 0);
    assert.equal(solveEasing('cubic-bezier(0.22, 1, 0.36, 1)', 1), 1);
    assert.ok(solveEasing('cubic-bezier(0.22, 1, 0.36, 1)', 0.5) > 0.75);
  });

  it('supports independent In/Out/Passive slots and clears a single slot without removing the others', () => {
    const rect = new fabric.Rect({ width: 100, height: 100 });
    const initialSlots = {
      in: normalizeAnimationConfig({ id: 'pop-in', duration: 0.8, delay: 0, easing: 'ease-out' }),
      out: normalizeAnimationConfig({ id: 'fade-out', duration: 0.6, delay: 0.2, easing: 'ease' }),
      passive: normalizeAnimationConfig({ id: 'float', duration: 1.5, delay: 0, easing: 'ease-in-out' }),
    };

    syncAnimationSlotsToObject(rect, initialSlots);
    assert.equal(hasAnyAnimationSlot(normalizeAnimationSlots(rect)), true);
    assert.equal(normalizeAnimationSlots(rect).in?.id, 'pop-in');
    assert.equal(normalizeAnimationSlots(rect).out?.id, 'fade-out');
    assert.equal(normalizeAnimationSlots(rect).passive?.id, 'float');

    // Clear ONLY 'out' -> 'in' and 'passive' remain untouched
    const afterClearOut = clearAnimationSlotFromObject(rect, 'out');
    assert.equal(afterClearOut.in?.id, 'pop-in');
    assert.equal(afterClearOut.out, null);
    assert.equal(afterClearOut.passive?.id, 'float');
    assert.equal(hasAnyAnimationSlot(afterClearOut), true);
    assert.equal(getPrimaryAnimationSlot(afterClearOut)?.id, 'pop-in');

    // Clear ONLY 'in' -> 'passive' remains intact
    const afterClearIn = clearAnimationSlotFromObject(rect, 'in');
    assert.equal(afterClearIn.in, null);
    assert.equal(afterClearIn.out, null);
    assert.equal(afterClearIn.passive?.id, 'float');
    assert.equal((rect as any).animation, 'Float');
    assert.equal((rect as any).animationCategory, 'passive');

    // Clear final remaining slot 'passive' -> all animation fields cleaned up
    const afterClearPassive = clearAnimationSlotFromObject(rect, 'passive');
    assert.equal(hasAnyAnimationSlot(afterClearPassive), false);
    assert.equal((rect as any).animation, undefined);
    assert.equal((rect as any).animationSlots, undefined);
  });

  it('migrates legacy single animationConfig objects cleanly into normalizeAnimationSlots', () => {
    const legacyObj = {
      animation: 'Fade Out',
      animationCategory: 'out',
      animationConfig: {
        id: 'fade-out',
        category: 'out',
        duration: 1.1,
        delay: 0.4,
        easing: 'ease',
      },
    };

    const migrated = normalizeAnimationSlots(legacyObj);
    assert.equal(migrated.in, null);
    assert.equal(migrated.passive, null);
    assert.equal(migrated.out?.id, 'fade-out');
    assert.equal(migrated.out?.duration, 1.1);
  });
});
