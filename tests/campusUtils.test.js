import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSubclass, isShanghaiSubclass } from '../src/utils/campusUtils.js';

test('identifies COMP subclasses ending in SH regardless of case', () => {
  assert.equal(isShanghaiSubclass('COMP1110', '1ASH'), true);
  assert.equal(isShanghaiSubclass('comp2121', '2sh'), true);
});

test('does not identify non-COMP or non-SH subclasses', () => {
  assert.equal(isShanghaiSubclass('MATH1111', '1ASH'), false);
  assert.equal(isShanghaiSubclass('COMP1110', '1A'), false);
});

test('adds the warning marker only to Shanghai subclasses', () => {
  assert.equal(formatSubclass('COMP1110', '1ASH'), '1ASH ⚠️');
  assert.equal(formatSubclass('COMP1110', '1A'), '1A');
});
