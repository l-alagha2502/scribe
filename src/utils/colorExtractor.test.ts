import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rgbToHex,
  getLuminance,
  colorDistance,
  extractPaletteFromRgba,
} from './colorExtractor';

test('colorExtractor: rgbToHex formats correctly and clamps bounds', () => {
  assert.equal(rgbToHex(255, 0, 0), '#ff0000');
  assert.equal(rgbToHex(0, 255, 0), '#00ff00');
  assert.equal(rgbToHex(0, 0, 255), '#0000ff');
  assert.equal(rgbToHex(204, 255, 0), '#ccff00'); // Luqa lime
  assert.equal(rgbToHex(300, -20, 15), '#ff000f'); // clamped bounds
});

test('colorExtractor: getLuminance detects dark and light values correctly', () => {
  const whiteLum = getLuminance(255, 255, 255);
  const blackLum = getLuminance(0, 0, 0);
  const limeLum = getLuminance(204, 255, 0);

  assert.equal(Math.round(whiteLum), 1);
  assert.equal(Math.round(blackLum), 0);
  assert.ok(limeLum > 0.5, 'Lime should have high luminance');
});

test('colorExtractor: colorDistance computes euclidean distance', () => {
  const dSame = colorDistance([100, 100, 100], [100, 100, 100]);
  assert.equal(dSame, 0);

  const dDiff = colorDistance([0, 0, 0], [255, 255, 255]);
  assert.ok(dDiff > 400);
});

test('colorExtractor: extractPaletteFromRgba extracts dominant clusters from synthetic image data', () => {
  // Create synthetic 100-pixel RGBA buffer: 70 pixels pure lime (204, 255, 0), 30 pixels dark blue (15, 23, 42)
  const pixelCount = 100;
  const data = new Uint8ClampedArray(pixelCount * 4);
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    if (i < 70) {
      data[idx] = 204;
      data[idx + 1] = 255;
      data[idx + 2] = 0;
      data[idx + 3] = 255;
    } else {
      data[idx] = 15;
      data[idx + 1] = 23;
      data[idx + 2] = 42;
      data[idx + 3] = 255;
    }
  }

  const palette = extractPaletteFromRgba(data, 4, 16);
  assert.ok(palette.length >= 2, 'Should extract at least 2 distinct clusters');

  const topColor = palette[0];
  assert.equal(topColor.hex, '#ccff00', 'Top dominant color should be lime');
  assert.ok(topColor.percentage >= 60, 'Lime should have higher percentage');

  // Verify secondary color
  const secondary = palette[1];
  assert.ok(secondary.isDark, 'Secondary color should be marked dark');
});
