import test from 'node:test';
import assert from 'node:assert/strict';
import * as fabric from 'fabric';
import {
  applyTextOutline,
  cycleTextAlignment,
  cycleTextCapitalization,
  getTextCaseMode,
  isImageFabricObject,
  isShapeFabricObject,
  isTextBulleted,
  isTextFabricObject,
  readTextOutlineState,
  toggleBulletedListText,
} from './textEditHelpers.ts';

function makeMockTextObj(initialText: string): fabric.FabricObject {
  const obj: any = {
    type: 'textbox',
    text: initialText,
    fill: '#ffffff',
    stroke: undefined,
    strokeWidth: 0,
    strokeDashArray: undefined,
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

test('object classification separates text, shapes/icons, and images cleanly', () => {
  const textObj = makeMockTextObj('Hello');
  const rectObj = new fabric.Rect({ width: 80, height: 80 });
  const circleObj = new fabric.Circle({ radius: 40 });
  const iconGroup = new fabric.Group([]);
  (iconGroup as any).isVectorIcon = true;
  const imgPlaceholder = { type: 'image' } as unknown as fabric.FabricObject;

  assert.equal(isTextFabricObject(textObj), true);
  assert.equal(isShapeFabricObject(textObj), false);

  assert.equal(isShapeFabricObject(rectObj), true);
  assert.equal(isShapeFabricObject(circleObj), true);
  assert.equal(isShapeFabricObject(iconGroup), true);
  assert.equal(isTextFabricObject(rectObj), false);

  assert.equal(isImageFabricObject(imgPlaceholder), true);
  assert.equal(isShapeFabricObject(imgPlaceholder), false);
});

test('cycleTextAlignment cycles left -> center -> right -> left', () => {
  assert.equal(cycleTextAlignment('left'), 'center');
  assert.equal(cycleTextAlignment('center'), 'right');
  assert.equal(cycleTextAlignment('right'), 'left');
  assert.equal(cycleTextAlignment(undefined), 'center');
});

test('toggleBulletedListText adds and removes bullet prefixes cleanly across lines', () => {
  const plain = 'First item\n\nSecond item';
  assert.equal(isTextBulleted(plain), false);

  const bulleted = toggleBulletedListText(plain);
  assert.equal(bulleted.isBulleted, true);
  assert.equal(bulleted.nextText, '• First item\n\n• Second item');
  assert.equal(isTextBulleted(bulleted.nextText), true);

  const unbulleted = toggleBulletedListText(bulleted.nextText);
  assert.equal(unbulleted.isBulleted, false);
  assert.equal(unbulleted.nextText, 'First item\n\nSecond item');
});

test('cycleTextCapitalization cycles normal -> uppercase -> lowercase -> normal preserving original casing', () => {
  const textObj = makeMockTextObj('Scribe Studio');
  assert.equal(getTextCaseMode(textObj), 'normal');

  const step1 = cycleTextCapitalization(textObj);
  assert.equal(step1.mode, 'uppercase');
  assert.equal(step1.nextText, 'SCRIBE STUDIO');
  (textObj as any).text = step1.nextText;

  const step2 = cycleTextCapitalization(textObj);
  assert.equal(step2.mode, 'lowercase');
  assert.equal(step2.nextText, 'scribe studio');
  (textObj as any).text = step2.nextText;

  const step3 = cycleTextCapitalization(textObj);
  assert.equal(step3.mode, 'normal');
  assert.equal(step3.nextText, 'Scribe Studio');
});

test('applyTextOutline and readTextOutlineState handle solid, dashed, dotted, double/glow, and off states', () => {
  const textObj = makeMockTextObj('Outline');

  applyTextOutline(textObj, {
    enabled: true,
    color: '#ff0055',
    width: 4,
    type: 'dashed',
  });
  let state = readTextOutlineState(textObj);
  assert.equal(state.enabled, true);
  assert.equal(state.color, '#ff0055');
  assert.equal(state.width, 4);
  assert.equal(state.type, 'dashed');
  assert.ok(Array.isArray(textObj.strokeDashArray));

  applyTextOutline(textObj, {
    enabled: true,
    color: '#ccff00',
    width: 6,
    type: 'double',
  });
  state = readTextOutlineState(textObj);
  assert.equal(state.type, 'double');
  assert.equal((textObj as any).__scribeOutlineGlow, true);
  assert.ok((textObj as any).shadow);

  applyTextOutline(textObj, {
    enabled: false,
    color: '#ccff00',
    width: 6,
    type: 'double',
  });
  state = readTextOutlineState(textObj);
  assert.equal(state.enabled, false);
  assert.equal(textObj.strokeWidth, 0);
  assert.equal((textObj as any).__scribeOutlineGlow, false);
});
