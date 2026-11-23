import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  slugifyText,
  utf8ToBase64,
  base64ToUtf8,
  buildTemplateFilePath,
  createCommunityTemplatePayload,
  publishTemplateToGitHub,
  DEFAULT_GITHUB_CONFIG,
} from './githubTemplateSync';
import { ProjectRecord } from '../types';

describe('githubTemplateSync utility tests', () => {
  const dummyProject: ProjectRecord = {
    id: 'proj_test_123',
    name: 'Cyberpunk Banner',
    width: 1200,
    height: 630,
    unit: 'px',
    dpi: 72,
    fabricJson: JSON.stringify({
      version: '6.0.0',
      objects: [{ type: 'rect', width: 200, height: 100, fill: '#ff0055' }],
    }),
    thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    isFavorite: false,
    type: 'graphic',
  };

  test('slugifyText cleans characters and normalizes text', () => {
    assert.strictEqual(slugifyText('Hello World! 2026'), 'hello-world-2026');
    assert.strictEqual(slugifyText('Café & Crème brûlée'), 'cafe-creme-brulee');
    assert.strictEqual(slugifyText('---test__slug---'), 'test__slug');
  });

  test('utf8ToBase64 and base64ToUtf8 roundtrip preserves emojis and unicode', () => {
    const original = 'Scribe Design 🚀✨ • 高精度デザイン • 100% Client-Side!';
    const b64 = utf8ToBase64(original);
    const decoded = base64ToUtf8(b64);
    assert.strictEqual(decoded, original);
  });

  test('buildTemplateFilePath generates designated /templates/community/ path', () => {
    const path = buildTemplateFilePath('judgeblake', 'Retro Poster', 1700000000);
    assert.strictEqual(path, 'templates/community/judgeblake_retro-poster_1700000000.json');
  });

  test('createCommunityTemplatePayload validates required fields', () => {
    assert.throws(() => {
      createCommunityTemplatePayload({
        project: dummyProject,
        name: '',
        author: 'Creator',
        description: 'Test description',
      });
    }, /Template name is required/);

    assert.throws(() => {
      createCommunityTemplatePayload({
        project: dummyProject,
        name: 'My Template',
        author: '   ',
        description: 'Test description',
      });
    }, /Author name or handle is required/);
  });

  test('createCommunityTemplatePayload formats correct schema', () => {
    const payload = createCommunityTemplatePayload({
      project: dummyProject,
      name: 'Cyberpunk Banner',
      author: 'Blake',
      authorHandle: 'blake_dev',
      description: 'Futuristic social media header with neon accents',
      category: 'Social Media',
      tags: ['cyberpunk', 'neon', 'header'],
    });

    assert.strictEqual(payload.version, '1.0.0');
    assert.strictEqual(payload.name, 'Cyberpunk Banner');
    assert.strictEqual(payload.author, 'Blake');
    assert.strictEqual(payload.authorHandle, 'blake_dev');
    assert.strictEqual(payload.canvas.width, 1200);
    assert.strictEqual(payload.canvas.height, 630);
    assert.strictEqual(payload.scribePackage.magic, 'SCRIBE_DESIGN_PROJECT');
    assert.strictEqual(payload.projectData.embeddedAssetsCount, 0);
  });

  test('publishTemplateToGitHub succeeds in simulated demo mode without live token', async () => {
    const payload = createCommunityTemplatePayload({
      project: dummyProject,
      name: 'Simulated Template',
      author: 'LuqaDesigner',
      description: 'Demo template test',
    });

    const result = await publishTemplateToGitHub(
      payload,
      DEFAULT_GITHUB_CONFIG,
      { isDemoMode: true }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.isSimulated, true);
    assert.ok(result.commitSha);
    assert.ok(result.commitUrl?.includes('github.com/scribe-studio/community-templates/commit/'));
    assert.ok(result.filePath.startsWith('templates/community/'));
  });

  test('publishTemplateToGitHub throws if no token provided in non-demo mode', async () => {
    const payload = createCommunityTemplatePayload({
      project: dummyProject,
      name: 'Live Template',
      author: 'Tester',
      description: 'Should throw without token',
    });

    await assert.rejects(
      async () => {
        await publishTemplateToGitHub(payload, {
          ...DEFAULT_GITHUB_CONFIG,
          token: '',
        });
      },
      /GitHub Personal Access Token is required/
    );
  });
});
