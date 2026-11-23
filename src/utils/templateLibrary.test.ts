import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILT_IN_STARTER_TEMPLATES,
  loadTemplateLibrary,
  importScribeTextAsTemplate,
  saveProjectAsLibraryTemplate,
  toggleStarTemplate,
  deleteTemplateFromLibrary,
  sortAndFilterTemplates,
  countHiddenStarterTemplates,
  SyncStorageLike,
} from './templateLibrary.ts';
import {
  buildScribeFilename,
  createScribePackage,
  parseScribePackage,
} from './scribePackage.ts';
import { ProjectRecord } from '../types/index.ts';

function createMemoryStorage(): SyncStorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

test('default template library has zero built-in or placeholder starter templates', () => {
  assert.equal(BUILT_IN_STARTER_TEMPLATES.length, 0);
});

test('buildScribeFilename produces safe deterministic .scribe filenames', () => {
  assert.equal(buildScribeFilename('My Promo Poster 2026!'), 'my_promo_poster_2026.scribe');
  assert.equal(buildScribeFilename('   '), 'scribe_design.scribe');
});

test('parseScribePackage rejects invalid fabricJson or empty input', () => {
  const badFabric = JSON.stringify({
    magic: 'SCRIBE_DESIGN_PROJECT',
    project: {
      id: 'p_bad',
      name: 'Bad',
      fabricJson: 'not-valid-json',
    },
  });
  assert.throws(() => parseScribePackage(badFabric), /fabricJson is not valid JSON/);
  assert.throws(() => parseScribePackage('   '), /empty/);
});

test('templateLibrary starts empty and supports persistent import, save, star sorting, filtering, and delete', async () => {
  const storage = createMemoryStorage();

  // 1. Default library starts completely empty
  const initial = await loadTemplateLibrary(storage);
  assert.equal(initial.length, 0);
  assert.equal(countHiddenStarterTemplates(storage), 0);

  // 2. Import valid .scribe file
  const incomingPkg = createScribePackage({
    id: 'proj_ext_1',
    name: 'External Campaign .scribe',
    width: 1080,
    height: 1080,
    unit: 'px',
    dpi: 72,
    fabricJson: JSON.stringify({
      version: '6.0.0',
      background: '#111827',
      objects: [{ type: 'textbox', text: 'HELLO' }],
    }),
    thumbnail: '',
    createdAt: 1730000010000,
    updatedAt: 1730000010000,
    isFavorite: false,
    type: 'graphic',
  });

  const { template: imported } = await importScribeTextAsTemplate(
    JSON.stringify(incomingPkg),
    storage
  );
  assert.equal(imported.isBuiltIn, false);
  assert.equal(imported.name, 'External Campaign .scribe');

  // 3. Save current canvas snapshot directly to library
  const saved = await saveProjectAsLibraryTemplate(
    {
      id: 'proj_live_2',
      name: 'Live Canvas Copy',
      width: 1200,
      height: 630,
      unit: 'px',
      dpi: 72,
      fabricJson: JSON.stringify({ version: '6.0.0', objects: [] }),
      thumbnail: '',
      createdAt: 1730000020000,
      updatedAt: 1730000020000,
      isFavorite: false,
      type: 'graphic',
    },
    storage
  );
  assert.equal(saved.isBuiltIn, false);

  // 4. Star the imported template and verify it pins first
  const starredState = await toggleStarTemplate(imported.id, storage);
  assert.equal(starredState, true);

  const afterStar = await loadTemplateLibrary(storage);
  assert.equal(afterStar.length, 2);

  const sortedAll = sortAndFilterTemplates(afterStar, { filter: 'all', searchQuery: '' });
  assert.equal(sortedAll[0].id, imported.id);
  assert.equal(sortedAll[0].isStarred, true);

  const onlyStarred = sortAndFilterTemplates(afterStar, { filter: 'starred' });
  assert.equal(onlyStarred.length, 1);
  assert.equal(onlyStarred[0].id, imported.id);

  // 5. Delete templates cleanly
  await deleteTemplateFromLibrary(imported, storage);
  const afterOneDelete = await loadTemplateLibrary(storage);
  assert.equal(afterOneDelete.some((t) => t.id === imported.id), false);
  assert.equal(afterOneDelete.length, 1);

  await deleteTemplateFromLibrary(saved, storage);
  const afterAllDeleted = await loadTemplateLibrary(storage);
  assert.equal(afterAllDeleted.length, 0);
});

test('saveTemplateLocallyAndDownload saves template to local library and returns clean .scribe filename', async () => {
  const { saveTemplateLocallyAndDownload } = await import('./templateLibrary.ts');
  const storage = createMemoryStorage();

  const { record, filename } = await saveTemplateLocallyAndDownload(
    {
      id: 'proj_share_1',
      name: 'Poster Launch!',
      width: 1080,
      height: 1350,
      unit: 'px',
      dpi: 72,
      fabricJson: JSON.stringify({ version: '6.0.0', background: '#ffffff', objects: [] }),
      thumbnail: '',
      createdAt: 1730000030000,
      updatedAt: 1730000030000,
      isFavorite: false,
      type: 'graphic',
    },
    [],
    [],
    { storage, triggerDownload: false }
  );

  assert.equal(filename, 'poster_launch.scribe');
  assert.equal(record.name, 'Poster Launch!');
  const stored = await loadTemplateLibrary(storage);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, record.id);
});
