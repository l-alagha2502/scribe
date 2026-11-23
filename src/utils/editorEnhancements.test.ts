import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  isSupportedImageFile,
  computeCanvasDropCoordinates,
} from './imageUploadPaste';
import {
  VECTOR_ICON_CATALOG,
  VECTOR_ICON_CATEGORIES,
  buildIconSvgString,
  isSvgPathClosed,
  isVectorIconFillable,
} from './vectorIcons';
import {
  VECTOR_SHAPES_CATALOG,
  VECTOR_SHAPE_CATEGORIES,
  regularPolygonPoints,
  starPolygonPoints,
  createFabricShape,
} from './vectorShapes';
import {
  CURATED_FONT_CATALOG,
  FONT_FILTER_CATEGORIES,
  buildGoogleFontCssUrl,
  getFontFallbackStack,
  isFontCachedLoaded,
  loadFontOnDemand,
} from './fontCatalog';
import { removeBackgroundCanvas } from './imageTools';

test('imageUploadPaste: validates accepted image MIME types and file extensions', () => {
  assert.ok(ACCEPTED_IMAGE_MIME_TYPES.includes('image/png'));
  assert.ok(ACCEPTED_IMAGE_MIME_TYPES.includes('image/jpeg'));
  assert.ok(ACCEPTED_IMAGE_MIME_TYPES.includes('image/webp'));
  assert.ok(ACCEPTED_IMAGE_MIME_TYPES.includes('image/gif'));
  assert.ok(ACCEPTED_IMAGE_MIME_TYPES.includes('image/svg+xml'));

  assert.equal(isSupportedImageFile({ name: 'photo.png', type: 'image/png' } as File), true);
  assert.equal(isSupportedImageFile({ name: 'photo.webp', type: 'image/webp' } as File), true);
  assert.equal(isSupportedImageFile({ name: 'vector.svg', type: 'image/svg+xml' } as File), true);
  assert.equal(isSupportedImageFile({ name: 'fallback.jpg', type: '' } as File), true);
  assert.equal(isSupportedImageFile({ name: 'notes.txt', type: 'text/plain' } as File), false);
  assert.equal(isSupportedImageFile(null), false);
});

test('imageUploadPaste: computeCanvasDropCoordinates accounts for zoom and clamps within artboard', () => {
  const rect = { left: 200, top: 100, width: 540, height: 540 };
  const center = computeCanvasDropCoordinates(470, 370, rect, 0.5, 1080, 1080);
  assert.deepEqual(center, { left: 540, top: 540 });

  const clampedTopLeft = computeCanvasDropCoordinates(50, 20, rect, 1, 1080, 1080);
  assert.deepEqual(clampedTopLeft, { left: 0, top: 0 });

  const clampedBottomRight = computeCanvasDropCoordinates(5000, 5000, rect, 1, 1080, 1920);
  assert.deepEqual(clampedBottomRight, { left: 1080, top: 1920 });
});

test('vectorIcons: indexes 1,600+ Lucide icons across expected categories and renders clean SVG strings', () => {
  assert.ok(
    VECTOR_ICON_CATALOG.length >= 1500,
    `Expected >= 1500 Lucide icons, got ${VECTOR_ICON_CATALOG.length}`
  );
  assert.deepEqual(VECTOR_ICON_CATEGORIES, [
    'All',
    'UI & Arrows',
    'Media',
    'Social & Communication',
    'Shapes & Badges',
    'Tools',
  ]);

  const categories = new Set(VECTOR_ICON_CATALOG.map((i) => i.category));
  assert.ok(categories.has('UI & Arrows'));
  assert.ok(categories.has('Media'));
  assert.ok(categories.has('Social & Communication'));
  assert.ok(categories.has('Shapes & Badges'));
  assert.ok(categories.has('Tools'));

  const heartIcon = VECTOR_ICON_CATALOG.find((i) => i.id === 'heart');
  const arrowRightIcon = VECTOR_ICON_CATALOG.find((i) => i.id === 'arrow-right');
  const lockIcon = VECTOR_ICON_CATALOG.find((i) => i.id === 'lock');
  assert.ok(heartIcon && arrowRightIcon && lockIcon);

  assert.equal(isVectorIconFillable(heartIcon), true);
  assert.equal(isVectorIconFillable(lockIcon), true);
  assert.equal(isVectorIconFillable(arrowRightIcon), false);
  assert.equal(isSvgPathClosed('M5 12h14'), false);
  assert.equal(isSvgPathClosed('m12 5 7 7-7 7'), false);
  assert.equal(isSvgPathClosed('M0 0 L10 0 L10 10 Z'), true);

  const svgStr = buildIconSvgString(heartIcon, '#ff0055', 64, {
    strokeWidth: 2.5,
    fillMode: 'solid',
    fill: '#331122',
  });
  assert.ok(svgStr.startsWith('<svg'));
  assert.ok(svgStr.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svgStr.includes('viewBox="0 0 24 24"'));
  assert.ok(svgStr.includes('stroke="#ff0055"'));
  assert.ok(svgStr.includes('stroke-width="2.5"'));
  assert.ok(svgStr.includes('fill="#331122"'));

  const softSvg = buildIconSvgString(heartIcon, '#06b6d4', 120, {
    fillMode: 'soft',
  });
  assert.ok(softSvg.includes('fill="#06b6d4"'));
  assert.ok(softSvg.includes('fill-opacity="0.28"'));

  // Open stroke-only arrow keeps fill="none" even in solid fillMode
  const arrowSolid = buildIconSvgString(arrowRightIcon, '#06b6d4', 120, {
    fillMode: 'solid',
  });
  assert.ok(!arrowSolid.includes('fill="#06b6d4"'));
});

test('vectorShapes: provides 22 crisp shapes across Basic, Polygons & Stars, and Lines & Dividers', () => {
  assert.deepEqual(VECTOR_SHAPE_CATEGORIES, ['Basic', 'Polygons & Stars', 'Lines & Dividers']);
  assert.equal(VECTOR_SHAPES_CATALOG.length, 22);

  const basicCount = VECTOR_SHAPES_CATALOG.filter((s) => s.category === 'Basic').length;
  const polyStarCount = VECTOR_SHAPES_CATALOG.filter((s) => s.category === 'Polygons & Stars').length;
  const lineCount = VECTOR_SHAPES_CATALOG.filter((s) => s.category === 'Lines & Dividers').length;
  assert.equal(basicCount, 10);
  assert.equal(polyStarCount, 8);
  assert.equal(lineCount, 4);

  assert.equal(regularPolygonPoints(6, 50, 50, 40).length, 6);
  assert.equal(starPolygonPoints(5, 50, 50, 40, 18).length, 10);

  for (const def of VECTOR_SHAPES_CATALOG) {
    const obj = createFabricShape(def.id, {
      canvasWidth: 1080,
      canvasHeight: 1080,
      fill: '#7c3aed',
    });
    assert.ok(obj, `Failed to instantiate shape ${def.id}`);
    assert.equal(obj.strokeUniform, true);
    assert.equal(obj.left, 540);
    assert.equal(obj.top, 540);
    assert.equal((obj as any).shapeType, def.id);
  }
});

test('fontCatalog: provides 60 categorized fonts, fallback stacks, and cached on-demand loader', async () => {
  assert.equal(CURATED_FONT_CATALOG.length, 60);
  const categories = new Set(CURATED_FONT_CATALOG.map((f) => f.category));
  assert.ok(categories.has('Sans-Serif'));
  assert.ok(categories.has('Display & Bold'));
  assert.ok(categories.has('Serif'));
  assert.ok(categories.has('Pixel, Retro & Mono'));
  assert.ok(categories.has('Script & Expressive'));
  assert.ok(FONT_FILTER_CATEGORIES.includes('Custom'));

  const playfairStack = getFontFallbackStack('Playfair Display');
  assert.ok(playfairStack.includes("'Playfair Display'"));
  assert.ok(playfairStack.includes('serif'));

  const pixelStack = getFontFallbackStack('Pixelify Sans');
  assert.ok(pixelStack.includes('monospace'));

  const url1 = buildGoogleFontCssUrl('Space Grotesk');
  assert.equal(
    url1,
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap'
  );
  const url2 = buildGoogleFontCssUrl('Bebas Neue');
  assert.equal(
    url2,
    'https://fonts.googleapis.com/css2?family=Bebas+Neue:wght@400&display=swap'
  );

  // Caching behavior in Node/SSR environment
  assert.equal(isFontCachedLoaded('Inter'), true);
  assert.equal(isFontCachedLoaded('Syne'), false);
  const ok = await loadFontOnDemand('Syne');
  assert.equal(ok, true);
  assert.equal(isFontCachedLoaded('Syne'), true);
});

test('imageTools: removeBackgroundCanvas function signature exists', () => {
  assert.equal(typeof removeBackgroundCanvas, 'function');
});
