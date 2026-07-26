import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldSkipPartialFirstWeek } from '../src/utils/calendarUtils.js';

const base = {
  selectedSemester: '2026-27 Sem 1',
  firstSemester: '2026-27 Sem 1',
  weekCount: 12
};

test('skips an incomplete first week when semester one begins after Monday', () => {
  assert.equal(shouldSkipPartialFirstWeek({
    ...base,
    semesterStart: new Date(2026, 8, 1)
  }), true);
});

test('keeps week one when semester one starts on Monday', () => {
  assert.equal(shouldSkipPartialFirstWeek({
    ...base,
    semesterStart: new Date(2026, 7, 31)
  }), false);
});

test('never skips the partial first week for semester two', () => {
  assert.equal(shouldSkipPartialFirstWeek({
    ...base,
    selectedSemester: '2026-27 Sem 2',
    semesterStart: new Date(2027, 0, 12)
  }), false);
});
