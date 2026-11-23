import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getProjectLayout } from './projectLayout';

describe('Project Layout & Dynamic Aspect Ratio', () => {
  it('correctly identifies horizontal landscape projects and assigns horizontal span', () => {
    const layout16x9 = getProjectLayout(1920, 1080);
    assert.equal(layout16x9.orientation, 'horizontal');
    assert.equal(layout16x9.badge, 'Landscape');
    assert.ok(layout16x9.gridSpanClass.includes('card-span-2'));
    assert.ok(layout16x9.previewAspectClass.includes('aspect-[16/9]'));

    const banner = getProjectLayout(1200, 630);
    assert.equal(banner.orientation, 'horizontal');
  });

  it('correctly identifies vertical portrait projects and assigns vertical layout', () => {
    const story = getProjectLayout(1080, 1920);
    assert.equal(story.orientation, 'vertical');
    assert.equal(story.badge, 'Portrait');
    assert.ok(story.previewAspectClass.includes('aspect-[9/16]'));

    const portrait = getProjectLayout(1080, 1350);
    assert.equal(portrait.orientation, 'vertical');
  });

  it('correctly identifies square projects and assigns square layout', () => {
    const square = getProjectLayout(1080, 1080);
    assert.equal(square.orientation, 'square');
    assert.equal(square.badge, 'Square');
    assert.ok(square.previewAspectClass.includes('aspect-square'));
  });

  it('handles fallback or zero dimensions gracefully', () => {
    const fallback = getProjectLayout(0, 0);
    assert.equal(fallback.orientation, 'square');
  });
});
