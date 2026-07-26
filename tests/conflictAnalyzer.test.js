import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeIncompatibilities } from '../src/utils/conflictAnalyzer.js';

const TERMS = ['2026-27 Sem 1', '2026-27 Sem 2'];

const session = (day, startTime, endTime) => ({
  days: {
    mon: day === 'mon' ? 'Y' : '',
    tue: day === 'tue' ? 'Y' : '',
    wed: day === 'wed' ? 'Y' : '',
    thu: day === 'thu' ? 'Y' : '',
    fri: day === 'fri' ? 'Y' : '',
    sat: '',
    sun: ''
  },
  startTime,
  endTime
});

const course = (courseCode, selectedSections) => ({
  courseCode,
  courseTitle: `${courseCode} title`,
  selectedSections
});

const group = (courseCode, term, sections) => ({
  [`${courseCode}-${term}`]: {
    courseCode,
    term,
    sections
  }
});

const analyze = (selectedCourses, groupedData, blockouts = [], maxPerSemester = 6) => (
  analyzeIncompatibilities({
    selectedCourses,
    groupedData,
    availableTerms: TERMS,
    blockouts,
    maxPerSemester
  })
);

test('reports a minimal two-course subclass clash', () => {
  const groupedData = {
    ...group('COMP1000', TERMS[0], { A1: [session('mon', '09:00', '10:00')] }),
    ...group('MATH1000', TERMS[0], { B1: [session('mon', '09:30', '10:30')] })
  };

  const report = analyze([
    course('COMP1000', ['A1']),
    course('MATH1000', ['B1'])
  ], groupedData);

  assert.equal(report.issues.length, 1);
  assert.equal(report.issues[0].type, 'time');
  assert.deepEqual(report.issues[0].courses.map((item) => item.courseCode), ['COMP1000', 'MATH1000']);
  assert.match(report.issues[0].details[0], /Mon 09:30–10:00/);
});

test('does not report courses when one selected subclass pairing works', () => {
  const groupedData = {
    ...group('COMP1000', TERMS[0], {
      A1: [session('mon', '09:00', '10:00')],
      A2: [session('tue', '09:00', '10:00')]
    }),
    ...group('MATH1000', TERMS[0], { B1: [session('mon', '09:30', '10:30')] })
  };

  const report = analyze([
    course('COMP1000', ['A1', 'A2']),
    course('MATH1000', ['B1'])
  ], groupedData);

  assert.equal(report.issues.length, 0);
});

test('groups blockouts that collectively eliminate every subclass option', () => {
  const groupedData = {
    ...group('ECON1000', TERMS[0], {
      A1: [session('mon', '09:00', '10:00')],
      A2: [session('tue', '11:00', '12:00')]
    })
  };
  const blockouts = [
    { id: 'morning', name: 'Morning work', day: 'mon', startTime: '09:00', endTime: '10:00', applyTo: 'sem1' },
    { id: 'lunch', name: 'Lunch work', day: 'tue', startTime: '11:00', endTime: '12:00', applyTo: 'sem1' }
  ];

  const report = analyze([course('ECON1000', ['A1', 'A2'])], groupedData, blockouts);

  assert.equal(report.issues.length, 1);
  assert.equal(report.issues[0].type, 'blockout');
  assert.equal(report.issues[0].blockouts.length, 2);
});

test('reports the seven forced courses that exceed a semester limit of six', () => {
  const selectedCourses = [];
  const groupedData = {};

  for (let index = 1; index <= 7; index++) {
    const code = `COURSE${index}`;
    selectedCourses.push(course(code, ['A']));
    Object.assign(groupedData, group(code, TERMS[0], { A: [session('', '09:00', '10:00')] }));
  }

  const report = analyze(selectedCourses, groupedData);

  assert.equal(report.issues.length, 1);
  assert.equal(report.issues[0].type, 'capacity');
  assert.equal(report.issues[0].courses.length, 7);
  assert.match(report.issues[0].summary, /Sem 1/);
  assert.ok(report.issues[0].actions.some((action) => action.type === 'open_overload'));
});

test('keeps an independent capacity issue visible alongside a smaller time clash', () => {
  const selectedCourses = [];
  const groupedData = {};

  for (let index = 1; index <= 7; index++) {
    const code = `COURSE${index}`;
    const classSession = index <= 2
      ? session('mon', '09:00', '10:00')
      : session('', '09:00', '10:00');
    selectedCourses.push(course(code, ['A']));
    Object.assign(groupedData, group(code, TERMS[0], { A: [classSession] }));
  }

  const report = analyze(selectedCourses, groupedData);

  assert.ok(report.issues.some((issue) => issue.type === 'time'));
  assert.ok(report.issues.some((issue) => issue.type === 'capacity'));
});

test('reports an unavailable saved subclass as a single invalid selection', () => {
  const groupedData = {
    ...group('COMP1000', TERMS[0], { A1: [session('mon', '09:00', '10:00')] })
  };

  const report = analyze([course('COMP1000', ['OLD_SECTION'])], groupedData);

  assert.equal(report.issues.length, 1);
  assert.equal(report.issues[0].type, 'invalid');
  assert.equal(report.issues[0].courses[0].courseCode, 'COMP1000');
});
