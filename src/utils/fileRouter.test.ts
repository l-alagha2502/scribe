import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCEPTED_FILES_UPLOAD_TYPES,
  classifyUploadedFile,
  deriveCustomFontFamilyName,
  formatFileSizeShort,
  parseCustomFontFormat,
} from './fileRouter.ts';

test('ACCEPTED_FILES_UPLOAD_TYPES supports images, audio, and font formats', () => {
  for (const token of [
    'image/*',
    'audio/*',
    '.mp3',
    '.wav',
    '.ogg',
    '.m4a',
    '.ttf',
    '.otf',
    '.woff',
    '.woff2',
  ]) {
    assert.ok(ACCEPTED_FILES_UPLOAD_TYPES.includes(token), `Missing ${token}`);
  }
});

test('classifyUploadedFile routes fonts, audio, images, and unsupported files properly', () => {
  assert.equal(classifyUploadedFile({ name: 'EditorialDisplay.ttf', type: '' }), 'font');
  assert.equal(classifyUploadedFile({ name: 'Display.WOFF2', type: 'font/woff2' }), 'font');
  assert.equal(classifyUploadedFile({ name: 'Mono.otf', type: 'application/octet-stream' }), 'font');
  assert.equal(classifyUploadedFile({ name: 'Body.woff', type: '' }), 'font');

  assert.equal(classifyUploadedFile({ name: 'beat.mp3', type: 'audio/mpeg' }), 'audio');
  assert.equal(classifyUploadedFile({ name: 'intro.wav', type: '' }), 'audio');
  assert.equal(classifyUploadedFile({ name: 'voice.m4a', type: 'audio/mp4' }), 'audio');
  assert.equal(classifyUploadedFile({ name: 'pad.ogg', type: '' }), 'audio');

  assert.equal(classifyUploadedFile({ name: 'hero.png', type: 'image/png' }), 'image');
  assert.equal(classifyUploadedFile({ name: 'photo.webp', type: '' }), 'image');
  assert.equal(classifyUploadedFile({ name: 'icon.svg', type: 'image/svg+xml' }), 'image');

  assert.equal(classifyUploadedFile({ name: 'notes.txt', type: 'text/plain' }), 'unsupported');
  assert.equal(classifyUploadedFile({ name: 'archive.zip', type: 'application/zip' }), 'unsupported');
});

test('parseCustomFontFormat and deriveCustomFontFamilyName normalize names & formats', () => {
  assert.equal(parseCustomFontFormat('test.otf'), 'opentype');
  assert.equal(parseCustomFontFormat('test.woff'), 'woff');
  assert.equal(parseCustomFontFormat('test.woff2'), 'woff2');
  assert.equal(parseCustomFontFormat('test.ttf'), 'truetype');

  assert.equal(deriveCustomFontFamilyName('Scribe-Headline.woff2'), 'Scribe-Headline');
  assert.equal(deriveCustomFontFamilyName('.ttf'), 'Custom Font');
});

test('formatFileSizeShort formats byte counts cleanly', () => {
  assert.equal(formatFileSizeShort(512), '512 B');
  assert.equal(formatFileSizeShort(2048), '2 KB');
  assert.equal(formatFileSizeShort(1572864), '1.5 MB');
  assert.equal(formatFileSizeShort(0), '');
});
