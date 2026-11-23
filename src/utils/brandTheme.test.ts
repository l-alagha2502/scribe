import test from 'node:test';
import assert from 'node:assert/strict';
import * as fabric from 'fabric';
import {
  applyBrandThemeToObjects,
  getSwatchUpdatePropsForObject,
  isColorChangeableObject,
  restoreBrandThemeSnapshots,
} from './brandTheme.ts';
import { BrandRecord } from '../types/index.ts';

function makeMockTextbox(fill: string): fabric.FabricObject {
  const obj: any = {
    type: 'textbox',
    fill,
    stroke: null,
    set(keyOrObj: string | Record<string, any>, val?: any) {
      if (typeof keyOrObj === 'string') {
        obj[keyOrObj] = val;
      } else {
        Object.assign(obj, keyOrObj);
      }
      return obj;
    },
    setCoords() {},
  };
  return obj as fabric.FabricObject;
}

const SAMPLE_BRAND: BrandRecord = {
  id: 'brand_test',
  name: 'Test Brand',
  primaryColor: '#ccff00',
  secondaryColors: ['#0b0c10', '#8b5cf6', '#ffffff'],
  fonts: ['Outfit', 'Space Grotesk'],
  createdAt: 1000,
};

test('applyBrandThemeToObjects updates color-changeable shapes, lines, icons, and text, and restores exactly', () => {
  const rect = new fabric.Rect({ width: 100, height: 100, fill: '#ff0000' });
  const text = makeMockTextbox('#123456');
  const line = new fabric.Line([0, 0, 100, 0], { stroke: '#999999', fill: '#999999' });
  (line as any).isLineDivider = true;

  const iconChild = new fabric.Path('M 0 0 L 10 10 Z', {
    stroke: '#abcdef',
    fill: 'none',
  });
  (iconChild as any).isIconFillable = true;
  const vectorIcon = new fabric.Group([iconChild]);
  (vectorIcon as any).isVectorIcon = true;
  (vectorIcon as any).iconColor = '#abcdef';
  (vectorIcon as any).iconFill = 'none';
  (vectorIcon as any).iconFillMode = 'none';

  const objects: fabric.FabricObject[] = [rect, text, line, vectorIcon];
  for (const obj of objects) {
    assert.equal(isColorChangeableObject(obj), true);
  }

  const snapshots = applyBrandThemeToObjects(objects, SAMPLE_BRAND, '#08080a');
  assert.equal(snapshots.length, 4);

  // Text remains legible against dark canvas background (#08080a)
  assert.notEqual(text.fill, '#0b0c10');
  assert.notEqual(rect.fill, '#ff0000');
  assert.notEqual((vectorIcon as any).iconColor, '#abcdef');

  // Toggle / revert back to exact prior colors
  restoreBrandThemeSnapshots(snapshots);
  assert.equal(rect.fill, '#ff0000');
  assert.equal(text.fill, '#123456');
  assert.equal(line.stroke, '#999999');
  assert.equal((vectorIcon as any).iconColor, '#abcdef');
  assert.equal(iconChild.stroke, '#abcdef');
});

test('getSwatchUpdatePropsForObject returns object-specific color props without affecting background', () => {
  const rect = new fabric.Rect({ width: 50, height: 50, fill: '#ffffff' });
  assert.deepEqual(getSwatchUpdatePropsForObject(rect, '#ccff00'), { fill: '#ccff00' });

  const text = makeMockTextbox('#ffffff');
  assert.deepEqual(getSwatchUpdatePropsForObject(text, '#8b5cf6'), { fill: '#8b5cf6' });

  const line = new fabric.Line([0, 0, 10, 0], { stroke: '#ffffff' });
  (line as any).isLineDivider = true;
  assert.deepEqual(getSwatchUpdatePropsForObject(line, '#ff5c35'), {
    stroke: '#ff5c35',
    fill: '#ff5c35',
  });

  const icon = new fabric.Group([]);
  (icon as any).isVectorIcon = true;
  assert.deepEqual(getSwatchUpdatePropsForObject(icon, '#00e5ff'), {
    stroke: '#00e5ff',
  });
});
