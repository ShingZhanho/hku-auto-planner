import test from 'node:test';
import assert from 'node:assert/strict';
import { getUniqueCourses } from '../src/utils/courseParser.js';

test('consolidates searchable instructors across semesters and sections', () => {
  const grouped = {
    'COMP1000-2026-27 Sem 1': {
      courseCode: 'COMP1000',
      courseTitle: 'Introduction to Computing',
      offerDept: 'Computer Science',
      term: '2026-27 Sem 1',
      sections: {
        A: [{ instructor: 'Ada Lovelace; Alan Turing', days: {} }]
      }
    },
    'COMP1000-2026-27 Sem 2': {
      courseCode: 'COMP1000',
      courseTitle: 'Introduction to Computing',
      offerDept: 'Computer Science',
      term: '2026-27 Sem 2',
      sections: {
        B: [{ instructor: 'Ada Lovelace; Grace Hopper', days: {} }]
      }
    }
  };

  const [course] = getUniqueCourses(grouped);

  assert.deepEqual(course.terms, ['2026-27 Sem 1', '2026-27 Sem 2']);
  assert.deepEqual(course.instructors, ['Ada Lovelace', 'Alan Turing', 'Grace Hopper']);
});
