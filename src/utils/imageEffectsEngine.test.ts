import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCompositeEffectToImageData,
  buildEffectFiltersForImage,
  ScribeCompositeEffectFilter,
  ScribeTonalColorFilter,
  ScribeSharpenFilter,
  ScribeVignetteFilter,
  ScribeDitherFilter,
  computeSmoothEdgeClipRadii,
  computeCoverBackgroundTransform,
  DEFAULT_FILTER_SLIDERS,
  normalizeFilterSliders,
  buildSharpenSvgFilterMarkup,
  applySharpenToImageData,
  applyStudioAdjustmentsToImageData,
  applyDitherToImageData,
  cloneImageData,
  renderDeterministicFilterPipelineOnImageData,
  buildFullImageFilterPipeline,
  buildFabricDropShadow,
} from './imageEffectsEngine';
import { IMAGE_EFFECT_PRESETS } from '../components/editor/ImageEffectsSubView';

function createSyntheticImageData(width = 8, height = 8): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      data[idx] = Math.round((x / (width - 1)) * 220 + 20); // R
      data[idx + 1] = Math.round((y / (height - 1)) * 200 + 30); // G
      data[idx + 2] = Math.round((((x + y) / (width + height - 2)) * 180) + 40); // B
      data[idx + 3] = 255; // A
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

test('imageEffectsEngine: intensity 0 preserves original pixels identically across all 17 effects', () => {
  const baseline = createSyntheticImageData();

  for (const preset of IMAGE_EFFECT_PRESETS) {
    const copy = {
      ...createSyntheticImageData(),
      data: new Uint8ClampedArray(baseline.data),
    } as ImageData;

    applyCompositeEffectToImageData(copy, preset.id, 0);
    assert.deepEqual(
      Array.from(copy.data),
      Array.from(baseline.data),
      `Expected 0% intensity on "${preset.id}" to match original pixels exactly`
    );
  }
});

test('imageEffectsEngine: intensity 50 is an exact 50/50 blend between original and 100% effect across all 17 effects', () => {
  const orig = createSyntheticImageData();

  for (const preset of IMAGE_EFFECT_PRESETS) {
    const at50 = {
      ...createSyntheticImageData(),
      data: new Uint8ClampedArray(orig.data),
    } as ImageData;
    const at100 = {
      ...createSyntheticImageData(),
      data: new Uint8ClampedArray(orig.data),
    } as ImageData;

    applyCompositeEffectToImageData(at50, preset.id, 50);
    applyCompositeEffectToImageData(at100, preset.id, 100);

    let totalDiffAt100 = 0;
    for (let i = 0; i < orig.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const expected50 = (orig.data[i + c] + at100.data[i + c]) / 2;
        assert.ok(
          Math.abs(at50.data[i + c] - expected50) <= 1.5,
          `Preset "${preset.id}" channel ${c} at pixel ${i / 4}: got ${at50.data[i + c]}, expected ~${expected50}`
        );
        totalDiffAt100 += Math.abs(at100.data[i + c] - orig.data[i + c]);
      }
      assert.equal(at50.data[i + 3], 255);
      assert.equal(at100.data[i + 3], 255);
    }

    assert.ok(
      totalDiffAt100 > 300,
      `Preset "${preset.id}" should produce a bold visual transform at 100% (diff=${totalDiffAt100})`
    );
  }
});

test('imageEffectsEngine: ScribeCompositeEffectFilter neutral state, GLSL fragment source, and serialization', () => {
  assert.equal(buildEffectFiltersForImage('none', 100).length, 0);
  assert.equal(buildEffectFiltersForImage('teal-orange', 0).length, 0);

  const built = buildEffectFiltersForImage('teal-orange', 72);
  assert.equal(built.length, 1);
  const filter = built[0] as ScribeCompositeEffectFilter;
  assert.equal(filter.type, 'ScribeCompositeEffect');
  assert.equal(filter.isNeutralState(), false);
  assert.equal(filter.getCacheKey(), 'ScribeCompositeEffect_teal-orange');

  const glsl = filter.getFragmentSource();
  assert.ok(glsl.includes('uniform float uIntensity;'));
  assert.ok(glsl.includes('mix(orig, graded, clamp(uIntensity, 0.0, 1.0))'));

  assert.deepEqual(filter.toObject(), {
    type: 'ScribeCompositeEffect',
    effectId: 'teal-orange',
    intensity: 72,
  });
});

test('computeSmoothEdgeClipRadii: handles 0px, scale compensation at 24px, and 100px cap', () => {
  assert.deepEqual(computeSmoothEdgeClipRadii(0, 400, 300, 0.5, 0.5), {
    visualRadius: 0,
    rx: 0,
    ry: 0,
  });

  // At scale 0.5, a 24px visual radius needs 48px local rx/ry in unscaled image coordinates
  assert.deepEqual(computeSmoothEdgeClipRadii(24, 400, 300, 0.5, 0.5), {
    visualRadius: 24,
    rx: 48,
    ry: 48,
  });

  // Capped at 100px visual radius and clamped to half the object dimensions
  assert.deepEqual(computeSmoothEdgeClipRadii(150, 120, 80, 1, 1), {
    visualRadius: 100,
    rx: 60,
    ry: 40,
  });
});

test('computeCoverBackgroundTransform: fills canvas edge-to-edge centered without gaps', () => {
  // Wide landscape image onto portrait canvas (1080x1920)
  const portraitCover = computeCoverBackgroundTransform(1600, 900, 1080, 1920);
  assert.equal(portraitCover.left, 540);
  assert.equal(portraitCover.top, 960);
  assert.ok(1600 * portraitCover.scale >= 1080 - 1e-6);
  assert.ok(900 * portraitCover.scale >= 1920 - 1e-6);

  // Tall portrait image onto landscape canvas (1200x630)
  const landscapeCover = computeCoverBackgroundTransform(600, 1200, 1200, 630);
  assert.equal(landscapeCover.left, 600);
  assert.equal(landscapeCover.top, 315);
  assert.ok(600 * landscapeCover.scale >= 1200 - 1e-6);
  assert.ok(1200 * landscapeCover.scale >= 630 - 1e-6);
});

test('sharpen filter: SVG feConvolveMatrix markup and 3x3 pixel edge amplification', () => {
  const svg = buildSharpenSvgFilterMarkup(100, 'test-sharp');
  assert.ok(svg.includes('<feConvolveMatrix order="3"'));
  assert.ok(svg.includes('kernelMatrix="0 -0.4 0 -0.4 2.6 -0.4 0 -0.4 0"'));

  // Step edge: left half dark (60), right half bright (180)
  const w = 6;
  const h = 4;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const v = x < 3 ? 60 : 180;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  const img = { data, width: w, height: h, colorSpace: 'srgb' } as ImageData;
  applySharpenToImageData(img, 100);

  // Right beside the step edge (x=2 dark side should drop < 60; x=3 bright side should boost > 180)
  const darkEdgeIdx = (1 * w + 2) * 4;
  const brightEdgeIdx = (1 * w + 3) * 4;
  assert.ok(img.data[darkEdgeIdx] < 60, `Expected dark edge to sharpen below 60, got ${img.data[darkEdgeIdx]}`);
  assert.ok(img.data[brightEdgeIdx] > 180, `Expected bright edge to sharpen above 180, got ${img.data[brightEdgeIdx]}`);
});

test('applyStudioAdjustmentsToImageData: directional Exposure, Shadows, Temperature, Saturation, HueRotate, Vignette', () => {
  const base = createSyntheticImageData(10, 10);

  // Neutral defaults produce zero pixel drift
  const neutral = { ...base, data: new Uint8ClampedArray(base.data) } as ImageData;
  applyStudioAdjustmentsToImageData(neutral, {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    shadows: 0,
    temperature: 0,
    hueRotate: 0,
    sharpen: 0,
    vignette: 0,
  });
  assert.deepEqual(Array.from(neutral.data), Array.from(base.data));

  // Warm temperature (+80) shifts R higher than B on neutral gray
  const grayData = new Uint8ClampedArray(4 * 4 * 4);
  for (let i = 0; i < grayData.length; i += 4) {
    grayData[i] = 128;
    grayData[i + 1] = 128;
    grayData[i + 2] = 128;
    grayData[i + 3] = 255;
  }
  const warmImg = { data: new Uint8ClampedArray(grayData), width: 4, height: 4, colorSpace: 'srgb' } as ImageData;
  applyStudioAdjustmentsToImageData(warmImg, {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    shadows: 0,
    temperature: 80,
    hueRotate: 0,
    sharpen: 0,
    vignette: 0,
  });
  assert.ok(warmImg.data[0] > 128 && warmImg.data[2] < 128 && warmImg.data[0] > warmImg.data[2]);

  // Vignette (100%) darkens corners noticeably more than center
  const vigImg = { data: new Uint8ClampedArray(grayData), width: 4, height: 4, colorSpace: 'srgb' } as ImageData;
  applyStudioAdjustmentsToImageData(vigImg, {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    shadows: 0,
    temperature: 0,
    hueRotate: 0,
    sharpen: 0,
    vignette: 100,
  });
  const cornerLuma = vigImg.data[0];
  const centerIdx = (1 * 4 + 1) * 4;
  const centerLuma = vigImg.data[centerIdx];
  assert.ok(cornerLuma < centerLuma, `Expected vignette corner (${cornerLuma}) darker than center (${centerLuma})`);

  // Shadows lift (+80) increases dark shadow pixels while keeping brighter pixels ordered
  const shadImg = { ...base, data: new Uint8ClampedArray(base.data) } as ImageData;
  applyStudioAdjustmentsToImageData(shadImg, {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    shadows: 80,
    temperature: 0,
    hueRotate: 0,
    sharpen: 0,
    vignette: 0,
  });
  assert.ok(shadImg.data[0] > base.data[0]);
});

test('applyDitherToImageData: crisp binary 0/255 output for Bayer 4x4 & Floyd-Steinberg and neutral at 0%', () => {
  const base = createSyntheticImageData(12, 12);

  // 0% leaves pixels completely untouched
  const neutral = { ...base, data: new Uint8ClampedArray(base.data) } as ImageData;
  applyDitherToImageData(neutral, 0, 'floyd-steinberg');
  assert.deepEqual(Array.from(neutral.data), Array.from(base.data));

  for (const mode of ['bayer-4x4', 'floyd-steinberg'] as const) {
    const out = { ...base, data: new Uint8ClampedArray(base.data) } as ImageData;
    applyDitherToImageData(out, 55, mode);
    let whites = 0;
    let blacks = 0;
    for (let i = 0; i < out.data.length; i += 4) {
      const r = out.data[i];
      const g = out.data[i + 1];
      const b = out.data[i + 2];
      assert.equal(r, g, `Expected crisp monochrome dithering (${mode})`);
      assert.equal(g, b, `Expected crisp monochrome dithering (${mode})`);
      assert.ok(r === 0 || r === 255, `Expected binary 0/255 output for ${mode}, got ${r}`);
      if (r === 255) whites++;
      else blacks++;
    }
    assert.ok(whites > 0 && blacks > 0, `Expected halftone pattern with both black & white dots for ${mode}`);
  }
});

test('buildFullImageFilterPipeline & buildFabricDropShadow: enforces strict 4-stage deterministic order', () => {
  // Neutral defaults produce empty pipeline & null shadow
  assert.equal(buildFullImageFilterPipeline('none', 100, DEFAULT_FILTER_SLIDERS).length, 0);
  assert.equal(buildFabricDropShadow(DEFAULT_FILTER_SLIDERS), null);

  const customized = normalizeFilterSliders({
    brightness: 15,
    temperature: -25,
    blur: 12,
    sharpen: 40,
    ditherIntensity: 60,
    ditherMode: 'floyd-steinberg',
    vignette: 35,
    dropShadowBlur: 20,
    dropShadowOffsetX: 8,
    dropShadowOffsetY: 12,
    dropShadowOpacity: 80,
    dropShadowColor: '#1e293b',
  });

  // Strict sequence: Effect -> Stage 1 (TonalColor) -> Stage 2 (Blur, Sharpen) -> Stage 3 (Dither) -> Stage 4 (Vignette)
  const chain = buildFullImageFilterPipeline('teal-orange', 75, customized);
  assert.equal(chain.length, 6);
  assert.ok(chain[0] instanceof ScribeCompositeEffectFilter);
  assert.ok(chain[1] instanceof ScribeTonalColorFilter);
  assert.equal(chain[2].type, 'Blur');
  assert.ok(chain[3] instanceof ScribeSharpenFilter);
  assert.ok(chain[4] instanceof ScribeDitherFilter);
  assert.ok(chain[5] instanceof ScribeVignetteFilter);

  const shadow = buildFabricDropShadow(customized);
  assert.ok(shadow !== null);
  assert.equal(shadow!.blur, 20);
  assert.equal(shadow!.offsetX, 8);
  assert.equal(shadow!.offsetY, 12);
  assert.equal(shadow!.color, 'rgba(30, 41, 59, 0.80)');
});

test('renderDeterministicFilterPipelineOnImageData: non-mutating source buffer + NaN guard + exact reset restoration', () => {
  const source = createSyntheticImageData(12, 12);
  const snapshotBefore = Array.from(source.data);

  // Heavy multi-stage pass including blur, sharpen, dither, and vignette
  const heavyOut = renderDeterministicFilterPipelineOnImageData(source, 'none', 100, {
    brightness: 45,
    contrast: -30,
    saturation: 60,
    exposure: 25,
    shadows: -40,
    temperature: 50,
    hueRotate: 90,
    blur: 6,
    sharpen: 80,
    ditherIntensity: 55,
    ditherMode: 'bayer-4x4',
    vignette: 70,
  });

  // Raw source buffer must remain byte-for-byte unmutated!
  assert.deepEqual(Array.from(source.data), snapshotBefore);
  assert.notDeepEqual(Array.from(heavyOut.data), snapshotBefore);

  // Stage 4 Vignette applied AFTER Stage 3 Dither smoothly darkens bright quantized corner dots below 255
  const whiteMask = heavyOut.data.some((v, idx) => idx % 4 === 0 && v > 0 && v < 255);
  assert.ok(whiteMask, 'Vignette after Dither should smoothly shade border pixels cleanly in Stage 4');

  // Dragging sliders back to 0 / Reset All restores exact original pixels cleanly
  const restored = renderDeterministicFilterPipelineOnImageData(source, 'none', 100, DEFAULT_FILTER_SLIDERS);
  assert.deepEqual(Array.from(restored.data), snapshotBefore);

  // NaN / Infinity inputs sanitize safely without NaN pixel corruption
  const sanitized = normalizeFilterSliders({
    brightness: Number.NaN,
    contrast: Number.POSITIVE_INFINITY,
    exposure: Number.NEGATIVE_INFINITY,
    blur: -999,
    ditherIntensity: Number.NaN,
  });
  assert.deepEqual(sanitized, DEFAULT_FILTER_SLIDERS);

  const nanSafeOut = renderDeterministicFilterPipelineOnImageData(
    cloneImageData(source),
    'none',
    Number.NaN,
    sanitized
  );
  assert.deepEqual(Array.from(nanSafeOut.data), snapshotBefore);
});


