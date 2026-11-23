import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LEFT_DRAWER_WIDTH,
  MIN_LEFT_DRAWER_WIDTH,
  MAX_LEFT_DRAWER_WIDTH,
  clampDrawerWidth,
} from './drawerLayout.ts';

test('clampDrawerWidth enforces sensible min/max bounds and finite numbers', () => {
  assert.equal(clampDrawerWidth(320), 320);
  assert.equal(clampDrawerWidth(120), MIN_LEFT_DRAWER_WIDTH);
  assert.equal(clampDrawerWidth(960), MAX_LEFT_DRAWER_WIDTH);
  assert.equal(clampDrawerWidth(355.7), 356);
  assert.equal(clampDrawerWidth(Number.NaN), DEFAULT_LEFT_DRAWER_WIDTH);
  assert.equal(clampDrawerWidth(Number.POSITIVE_INFINITY), DEFAULT_LEFT_DRAWER_WIDTH);
});
