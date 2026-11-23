import test from 'node:test';
import assert from 'node:assert/strict';
import { createScribePackage, parseScribePackage } from './scribePackage.ts';
import { ProjectRecord, AssetRecord } from '../types/index.ts';

test('createScribePackage bundles project and metadata with SCRIBE_DESIGN_PROJECT magic', () => {
  const dummyProject: ProjectRecord = {
    id: 'proj_test_123',
    name: 'Cyberpunk Banner',
    width: 1920,
    height: 1080,
    unit: 'px',
    dpi: 72,
    fabricJson: JSON.stringify({
      version: '6.0.0',
      objects: [
        { type: 'rect', width: 1920, height: 1080, fill: '#0a0a0c' },
        { type: 'textbox', text: 'HELLO SCRIBE' },
      ],
    }),
    thumbnail: 'data:image/svg+xml;base64,PHN2Zz4=',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    isFavorite: true,
    type: 'graphic',
  };

  const dummyAsset: AssetRecord = {
    id: 'asset_logo_1',
    name: 'Logo',
    type: 'image',
    url: 'https://cdn.example.com/logo.png',
    createdAt: 1700000000000,
    isFavorite: true,
    category: 'assets',
  };

  const pkg = createScribePackage(dummyProject, [dummyAsset], []);

  assert.equal(pkg.magic, 'SCRIBE_DESIGN_PROJECT');
  assert.equal(pkg.scribeVersion, '2.0.0');
  assert.equal(pkg.ecosystem, 'vastx.app');
  assert.equal(pkg.project.id, 'proj_test_123');
  assert.equal(pkg.meta.layersCount, 2);
  assert.equal(pkg.embeddedAssets.length, 1);
  assert.equal(pkg.embeddedAssets[0].id, 'asset_logo_1');
});

test('parseScribePackage parses valid .scribe json payload', () => {
  const rawPayload = JSON.stringify({
    magic: 'SCRIBE_DESIGN_PROJECT',
    scribeVersion: '2.0.0',
    ecosystem: 'vastx.app',
    timestamp: 1710000000000,
    project: {
      id: 'proj_imported',
      name: 'Imported Poster',
      width: 1080,
      height: 1080,
      unit: 'px',
      dpi: 72,
      fabricJson: '{"version":"6.0.0","objects":[]}',
      thumbnail: '',
      createdAt: 1710000000000,
      updatedAt: 1710000000000,
      isFavorite: false,
      type: 'graphic',
    },
    embeddedAssets: [],
    customFonts: [],
    meta: {
      generator: 'Scribe Design Studio (vastx.app)',
      canvasWidth: 1080,
      canvasHeight: 1080,
      layersCount: 0,
    },
  });

  const result = parseScribePackage(rawPayload);
  assert.equal(result.magic, 'SCRIBE_DESIGN_PROJECT');
  assert.equal(result.project.name, 'Imported Poster');
  assert.equal(result.project.width, 1080);
});

test('parseScribePackage rejects corrupted or non-scribe payload', () => {
  assert.throws(() => {
    parseScribePackage('{"someRandomJson": 123}');
  }, /Invalid \.scribe package/);

  assert.throws(() => {
    parseScribePackage('not-json');
  }, /Invalid file format/);
});
