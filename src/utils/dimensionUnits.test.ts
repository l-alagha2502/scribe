import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertToPixels,
  convertFromPixels,
  calculateAspectRatio,
  SIZE_PRESETS,
} from './dimensionUnits';

test('dimensionUnits: convertToPixels correctly converts across units and DPI', () => {
  // px returns rounded directly
  assert.equal(convertToPixels(1080, 'px'), 1080);
  
  // inches at 72 DPI
  assert.equal(convertToPixels(1, 'in', 72), 72);
  assert.equal(convertToPixels(10, 'in', 300), 3000);

  // cm at 72 DPI (1 inch = 2.54 cm -> 2.54 cm = 72 px)
  assert.equal(convertToPixels(2.54, 'cm', 72), 72);

  // mm at 300 DPI (25.4 mm = 1 in = 300 px)
  assert.equal(convertToPixels(25.4, 'mm', 300), 300);

  // zero or negative values
  assert.equal(convertToPixels(0, 'px'), 0);
  assert.equal(convertToPixels(-10, 'in'), 0);
});

test('dimensionUnits: convertFromPixels correctly converts back to target units', () => {
  assert.equal(convertFromPixels(1080, 'px'), 1080);
  assert.equal(convertFromPixels(300, 'in', 300), 1);
  assert.equal(convertFromPixels(72, 'in', 72), 1);
  assert.equal(convertFromPixels(72, 'cm', 72), 2.54);
  assert.equal(convertFromPixels(300, 'mm', 300), 25.4);
});

test('dimensionUnits: calculateAspectRatio correctly determines canonical ratios', () => {
  assert.equal(calculateAspectRatio(1080, 1080), '1:1');
  assert.equal(calculateAspectRatio(1920, 1080), '16:9');
  assert.equal(calculateAspectRatio(1080, 1920), '9:16');
  assert.equal(calculateAspectRatio(1200, 900), '4:3');
  assert.equal(calculateAspectRatio(900, 1200), '3:4');
  assert.equal(calculateAspectRatio(1500, 1000), '3:2');
});

test('dimensionUnits: SIZE_PRESETS catalog contains all required categories and real dimensions', () => {
  const categories = new Set(SIZE_PRESETS.map((p) => p.category));
  assert.ok(categories.has('Suggested'));
  assert.ok(categories.has('Social Media'));
  assert.ok(categories.has('Print'));
  assert.ok(categories.has('Ads'));
  assert.equal(SIZE_PRESETS.length, 20);

  const igPost = SIZE_PRESETS.find((p) => p.id === 'ig-post-square');
  assert.ok(igPost);
  assert.equal(igPost.width, 1080);
  assert.equal(igPost.height, 1080);

  const igPortrait = SIZE_PRESETS.find((p) => p.id === 'ig-post-portrait');
  assert.ok(igPortrait);
  assert.equal(igPortrait.width, 1080);
  assert.equal(igPortrait.height, 1350);

  const posterA3 = SIZE_PRESETS.find((p) => p.id === 'print-poster-a3');
  assert.ok(posterA3);
  assert.equal(posterA3.width, 3508);
  assert.equal(posterA3.height, 4961);

  const skyscraper = SIZE_PRESETS.find((p) => p.id === 'ad-skyscraper');
  assert.ok(skyscraper);
  assert.equal(skyscraper.width, 160);
  assert.equal(skyscraper.height, 600);
});
