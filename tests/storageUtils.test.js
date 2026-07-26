import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCourseHashGetter,
  loadShoppingCart,
  saveShoppingCart
} from '../src/utils/storageUtils.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
};

const courseGroup = (courseCode, startTime = '09:00') => ({
  [`${courseCode}-2026-27 Sem 1`]: {
    courseCode,
    courseTitle: `${courseCode} title`,
    term: '2026-27 Sem 1',
    sections: {
      A: [{ startTime, endTime: '10:00', days: { mon: 'MON' } }]
    }
  }
});

test('course hash lookup is cached and scoped to one requested course', () => {
  const grouped = {
    ...courseGroup('COMP1000'),
    ...courseGroup('MATH1000')
  };
  const getHash = createCourseHashGetter(grouped);
  const originalHash = getHash('COMP1000');

  grouped['COMP1000-2026-27 Sem 1'].sections.A[0].startTime = '11:00';

  assert.equal(getHash('COMP1000'), originalHash);
  assert.notEqual(createCourseHashGetter(grouped)('COMP1000'), originalHash);
  assert.equal(getHash('NOT_FOUND'), null);
});

test('restores unchanged courses and reports all changed or removed courses together', () => {
  globalThis.localStorage = createStorage();
  globalThis.document = { cookie: '' };

  const originalGrouped = {
    ...courseGroup('COMP1000'),
    ...courseGroup('MATH1000'),
    ...courseGroup('ECON1000')
  };
  const selectedCourses = ['COMP1000', 'MATH1000', 'ECON1000'].map(courseCode => ({
    courseCode,
    courseTitle: `${courseCode} title`,
    selectedSections: ['A']
  }));
  const blockouts = [{ id: 'work', name: 'Work' }];

  saveShoppingCart(selectedCourses, blockouts, createCourseHashGetter(originalGrouped));

  const updatedGrouped = {
    ...courseGroup('COMP1000'),
    ...courseGroup('MATH1000', '11:00')
  };
  const restored = loadShoppingCart(createCourseHashGetter(updatedGrouped));

  assert.deepEqual(restored.selectedCourses.map(course => course.courseCode), ['COMP1000']);
  assert.deepEqual(restored.removedCourses.map(course => course.courseCode), ['MATH1000', 'ECON1000']);
  assert.deepEqual(restored.blockouts, blockouts);
  assert.equal(restored.databaseChanged, true);
});

test('migrates legacy carts without discarding available courses', () => {
  globalThis.localStorage = createStorage();
  globalThis.document = { cookie: '' };
  localStorage.setItem('hku_planner_cart', JSON.stringify({
    selectedCourses: [{ courseCode: 'COMP1000', selectedSections: ['A'] }],
    blockouts: []
  }));

  const restored = loadShoppingCart(createCourseHashGetter(courseGroup('COMP1000')));

  assert.deepEqual(restored.selectedCourses.map(course => course.courseCode), ['COMP1000']);
  assert.deepEqual(restored.removedCourses, []);
});
