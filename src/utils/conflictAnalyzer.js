import { hasTimeConflict, minutesToTime, timeToMinutes } from './courseParser.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun'
};

const MAX_REPORTED_ISSUES = 12;
const MAX_CORE_SEARCHES = 350;

const getTerms = (availableTerms) => {
  const term1 = availableTerms?.[0] || 'Semester 1';
  const term2 = availableTerms?.[1] || availableTerms?.[0] || 'Semester 2';
  return [term1, term2].filter((term, index, terms) => terms.indexOf(term) === index);
};

const blockoutAppliesToTerm = (blockout, term, terms) => {
  const appliesTo = blockout.applyTo || 'both';
  if (appliesTo === 'both') return true;
  if (appliesTo === 'sem1') return term === terms[0];
  if (appliesTo === 'sem2') return term === terms[1];
  return false;
};

const getBlockoutConflict = (sessions, blockout) => {
  const blockoutStart = timeToMinutes(blockout.startTime);
  const blockoutEnd = timeToMinutes(blockout.endTime);
  if (blockoutStart === null || blockoutEnd === null) return null;

  for (const session of sessions) {
    if (!session.days?.[blockout.day]?.trim()) continue;

    const sessionStart = timeToMinutes(session.startTime);
    const sessionEnd = timeToMinutes(session.endTime);
    if (sessionStart === null || sessionEnd === null) continue;

    if (sessionStart < blockoutEnd && blockoutStart < sessionEnd) {
      return {
        day: blockout.day,
        start: Math.max(sessionStart, blockoutStart),
        end: Math.min(sessionEnd, blockoutEnd)
      };
    }
  }

  return null;
};

const getSessionConflict = (sessionsA, sessionsB) => {
  for (const sessionA of sessionsA) {
    for (const sessionB of sessionsB) {
      if (!hasTimeConflict(sessionA, sessionB)) continue;

      const startA = timeToMinutes(sessionA.startTime);
      const endA = timeToMinutes(sessionA.endTime);
      const startB = timeToMinutes(sessionB.startTime);
      const endB = timeToMinutes(sessionB.endTime);

      for (const day of DAYS) {
        if (sessionA.days?.[day]?.trim() && sessionB.days?.[day]?.trim()) {
          return {
            day,
            start: Math.max(startA, startB),
            end: Math.min(endA, endB)
          };
        }
      }
    }
  }

  return null;
};

const buildCourseEntries = (selectedCourses, groupedData, availableTerms) => {
  const terms = getTerms(availableTerms);

  return selectedCourses.map((course) => {
    const options = [];
    const selectedSections = Array.isArray(course.selectedSections) ? course.selectedSections : [];

    terms.forEach((term) => {
      const group = groupedData[`${course.courseCode}-${term}`];
      if (!group) return;

      selectedSections.forEach((section) => {
        const sessions = group.sections[section];
        if (!sessions) return;

        options.push({
          courseCode: course.courseCode,
          term,
          section,
          sessions
        });
      });
    });

    return {
      id: `course:${course.courseCode}`,
      kind: 'course',
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      selectedSections,
      options
    };
  });
};

const buildBlockoutEntries = (blockouts) => blockouts.map((blockout, index) => ({
  id: `blockout:${blockout.id || index}`,
  kind: 'blockout',
  key: blockout.id ?? index,
  index,
  ...blockout
}));

/**
 * Fast feasibility check used only for diagnostics. Unlike generateSchedules,
 * it stops as soon as it finds one valid assignment.
 */
const canSchedule = (courses, blockouts, terms, maxPerSemester, { ignoreTime = false } = {}) => {
  if (courses.length === 0) return true;

  const usableOptions = new Map();
  for (const course of courses) {
    const options = course.options.filter((option) => !blockouts.some((blockout) => (
      blockoutAppliesToTerm(blockout, option.term, terms)
      && getBlockoutConflict(option.sessions, blockout)
    )));

    if (options.length === 0) return false;
    usableOptions.set(course.id, options);
  }

  const orderedCourses = [...courses].sort((a, b) => (
    usableOptions.get(a.id).length - usableOptions.get(b.id).length
  ));
  const selectedOptions = [];
  const termCounts = new Map();

  const search = (index) => {
    if (index === orderedCourses.length) return true;

    const course = orderedCourses[index];
    for (const option of usableOptions.get(course.id)) {
      if ((termCounts.get(option.term) || 0) >= maxPerSemester) continue;

      const clashes = !ignoreTime && selectedOptions.some((selected) => (
        selected.term === option.term
        && getSessionConflict(selected.sessions, option.sessions)
      ));
      if (clashes) continue;

      selectedOptions.push(option);
      termCounts.set(option.term, (termCounts.get(option.term) || 0) + 1);

      if (search(index + 1)) return true;

      selectedOptions.pop();
      termCounts.set(option.term, termCounts.get(option.term) - 1);
    }

    return false;
  };

  return search(0);
};

const isSubset = (candidate, target) => candidate.every((id) => target.includes(id));

const collectTimeClashes = (courses) => {
  const clashes = [];
  let total = 0;

  for (let i = 0; i < courses.length - 1; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      for (const optionA of courses[i].options) {
        for (const optionB of courses[j].options) {
          if (optionA.term !== optionB.term) continue;
          const conflict = getSessionConflict(optionA.sessions, optionB.sessions);
          if (!conflict) continue;

          total++;
          if (clashes.length < 6) {
            clashes.push({
              courseA: courses[i].courseCode,
              sectionA: optionA.section,
              courseB: courses[j].courseCode,
              sectionB: optionB.section,
              term: optionA.term,
              ...conflict
            });
          }
        }
      }
    }
  }

  return { clashes, total };
};

const collectBlockoutClashes = (courses, blockouts, terms) => {
  const clashes = [];
  let total = 0;

  for (const course of courses) {
    for (const option of course.options) {
      for (const blockout of blockouts) {
        if (!blockoutAppliesToTerm(blockout, option.term, terms)) continue;
        const conflict = getBlockoutConflict(option.sessions, blockout);
        if (!conflict) continue;

        total++;
        if (clashes.length < 6) {
          clashes.push({
            courseCode: course.courseCode,
            section: option.section,
            term: option.term,
            blockoutName: blockout.name || 'Blockout',
            ...conflict
          });
        }
      }
    }
  }

  return { clashes, total };
};

const getCapacityEvidenceList = (courses, terms, maxPerSemester) => {
  const forcedByTerm = terms.map((term) => ({
    term,
    courses: courses
      .filter((course) => {
        const optionTerms = [...new Set(course.options.map((option) => option.term))];
        return optionTerms.length === 1 && optionTerms[0] === term;
      })
      .map((course) => course.courseCode)
  }));

  const overloadedTerms = forcedByTerm.filter((entry) => entry.courses.length > maxPerSemester);
  if (overloadedTerms.length > 0) return overloadedTerms;

  return courses.length > maxPerSemester * terms.length
    ? [{ term: 'the available semesters', courses: courses.map((course) => course.courseCode) }]
    : [];
};

const getCapacityEvidence = (courses, terms, maxPerSemester) => (
  getCapacityEvidenceList(courses, terms, maxPerSemester)[0] || null
);

const formatOverlap = ({ day, start, end }) => (
  `${DAY_LABELS[day] || day} ${minutesToTime(start)}–${minutesToTime(end)}`
);

const makeActions = (type, courses, blockouts) => {
  const actions = [];

  if (type === 'capacity' || type === 'combined') {
    actions.push({ type: 'open_overload', label: 'Review semester limit' });
  }

  courses.slice(0, 2).forEach((course) => {
    actions.push({
      type: 'edit_sections',
      courseCode: course.courseCode,
      label: `Edit ${course.courseCode} subclasses`
    });
  });

  if (blockouts.length > 0) {
    actions.unshift({
      type: 'edit_blockout',
      blockoutKey: blockouts[0].key,
      label: `Edit ${blockouts[0].name || 'blockout'}`
    });
  }

  return actions.slice(0, 3);
};

const describeCore = (coreIds, atomMap, terms, maxPerSemester) => {
  const atoms = coreIds.map((id) => atomMap.get(id));
  const courses = atoms.filter((atom) => atom.kind === 'course');
  const blockouts = atoms.filter((atom) => atom.kind === 'blockout');
  const unlimitedMaximum = Math.max(maxPerSemester, courses.length);

  const feasibleWithoutBlockouts = canSchedule(courses, [], terms, maxPerSemester);
  const feasibleWithoutCapacity = canSchedule(courses, blockouts, terms, unlimitedMaximum);
  const feasibleWithoutCourseClashes = canSchedule(
    courses,
    blockouts,
    terms,
    maxPerSemester,
    { ignoreTime: true }
  );

  const needsBlockoutConstraint = blockouts.length > 0 && feasibleWithoutBlockouts;
  const needsCapacityConstraint = feasibleWithoutCapacity;
  const needsTimeConstraint = feasibleWithoutCourseClashes;
  const necessaryReasons = [needsBlockoutConstraint, needsCapacityConstraint, needsTimeConstraint]
    .filter(Boolean).length;

  let type = 'combined';
  if (necessaryReasons === 1) {
    if (needsBlockoutConstraint) type = 'blockout';
    if (needsCapacityConstraint) type = 'capacity';
    if (needsTimeConstraint) type = 'time';
  } else if (blockouts.length > 0 && courses.length === 1) {
    type = 'blockout';
  }

  const timeEvidence = collectTimeClashes(courses);
  const blockoutEvidence = collectBlockoutClashes(courses, blockouts, terms);
  const capacityEvidence = getCapacityEvidence(courses, terms, maxPerSemester);

  if (type === 'combined') {
    if (blockouts.length > 0 && timeEvidence.total === 0 && !capacityEvidence) type = 'blockout';
    else if (blockouts.length === 0 && capacityEvidence && timeEvidence.total === 0) type = 'capacity';
    else if (blockouts.length === 0 && timeEvidence.total > 0 && !capacityEvidence) type = 'time';
  }

  const details = [];
  timeEvidence.clashes.forEach((clash) => {
    details.push(
      `${clash.courseA} ${clash.sectionA} and ${clash.courseB} ${clash.sectionB}: `
      + `${formatOverlap(clash)} (${clash.term})`
    );
  });
  blockoutEvidence.clashes.forEach((clash) => {
    details.push(
      `${clash.courseCode} ${clash.section} and “${clash.blockoutName}”: `
      + `${formatOverlap(clash)} (${clash.term})`
    );
  });
  if (capacityEvidence) {
    details.push(
      `${capacityEvidence.courses.length} course(s) must fit in ${capacityEvidence.term}; `
      + `the current limit is ${maxPerSemester}.`
    );
  }

  const hiddenEvidence = Math.max(
    0,
    timeEvidence.total + blockoutEvidence.total - timeEvidence.clashes.length - blockoutEvidence.clashes.length
  );

  const summaries = {
    time: courses.length === 2
      ? 'No selected subclass pairing lets these courses coexist.'
      : 'These courses cannot all fit together with the selected subclasses.',
    blockout: courses.length === 1
      ? 'Every usable subclass option is blocked by the listed blockout time(s).'
      : 'The selected courses cannot all fit around the listed blockout time(s).',
    capacity: capacityEvidence
      ? `Too many selected courses must be placed in ${capacityEvidence.term}.`
      : 'The courses cannot be distributed within the current semester limit.',
    combined: 'These selections become incompatible when the timetable constraints are applied together.'
  };

  const suggestions = [];
  if (type === 'time' || type === 'combined') {
    suggestions.push(`Select additional subclasses for ${courses.map((course) => course.courseCode).join(' or ')}.`);
  }
  if (type === 'blockout' || blockouts.length > 0) {
    suggestions.push('Edit or remove the conflicting blockout time.');
  }
  if (type === 'capacity' || capacityEvidence) {
    suggestions.push('Increase the maximum courses per semester, or select subclasses offered in another semester.');
  }
  if (courses.length > 1) {
    suggestions.push('Remove one course from this group.');
  }

  return {
    id: coreIds.slice().sort().join('|'),
    type,
    title: {
      time: 'Subclass clash',
      blockout: 'Blockout clash',
      capacity: 'Semester capacity',
      combined: 'Combined constraints'
    }[type],
    summary: summaries[type],
    courses: courses.map((course) => ({
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      selectedSections: course.selectedSections,
      terms: [...new Set(course.options.map((option) => option.term))]
    })),
    blockouts: blockouts.map((blockout) => ({
      key: blockout.key,
      name: blockout.name || 'Blockout',
      day: blockout.day,
      startTime: blockout.startTime,
      endTime: blockout.endTime,
      applyTo: blockout.applyTo || 'both'
    })),
    details,
    hiddenEvidence,
    suggestions: [...new Set(suggestions)],
    actions: makeActions(type, courses, blockouts)
  };
};

const describeInvalidCourse = (course) => ({
  id: `invalid:${course.courseCode}`,
  type: 'invalid',
  title: 'Unavailable subclass selection',
  summary: `None of the selected subclasses for ${course.courseCode} exist in an available semester.`,
  courses: [{
    courseCode: course.courseCode,
    courseTitle: course.courseTitle,
    selectedSections: course.selectedSections,
    terms: []
  }],
  blockouts: [],
  details: [],
  hiddenEvidence: 0,
  suggestions: [
    `Re-select subclasses for ${course.courseCode}.`,
    'If the timetable file changed, remove and add the course again.'
  ],
  actions: [{
    type: 'edit_sections',
    courseCode: course.courseCode,
    label: `Edit ${course.courseCode} subclasses`
  }]
});

const describeCapacityIssue = (evidence, courses, maxPerSemester, terms) => {
  const affectedCourses = evidence.courses
    .map((courseCode) => courses.find((course) => course.courseCode === courseCode))
    .filter(Boolean);
  const spansAllTerms = evidence.term === 'the available semesters';
  const availableSlots = spansAllTerms ? maxPerSemester * terms.length : maxPerSemester;

  return {
    id: `capacity:${evidence.term}:${evidence.courses.slice().sort().join('|')}`,
    type: 'capacity',
    title: 'Semester capacity',
    summary: `Too many selected courses must be placed in ${evidence.term}.`,
    courses: affectedCourses.map((course) => ({
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      selectedSections: course.selectedSections,
      terms: [...new Set(course.options.map((option) => option.term))]
    })),
    blockouts: [],
    details: [spansAllTerms
      ? `${affectedCourses.length} course(s) must fit across ${terms.length} semester(s); `
        + `the current total capacity is ${availableSlots}.`
      : `${affectedCourses.length} course(s) must fit in ${evidence.term}; the current limit is ${maxPerSemester}.`
    ],
    hiddenEvidence: 0,
    suggestions: [
      'Increase the maximum courses per semester, or select subclasses offered in another semester.',
      `Remove at least ${Math.max(1, affectedCourses.length - availableSlots)} course(s) `
        + `${spansAllTerms ? 'from the selection' : 'from this semester'}.`
    ],
    actions: [
      { type: 'open_overload', label: 'Review semester limit' },
      ...affectedCourses.slice(0, 2).map((course) => ({
        type: 'edit_sections',
        courseCode: course.courseCode,
        label: `Edit ${course.courseCode} subclasses`
      }))
    ]
  };
};

/**
 * Explain why a set of selected courses has no valid schedule.
 *
 * Conflict groups are inclusion-minimal: removing any course or blockout from
 * a reported group makes that group feasible under the current settings.
 */
export const analyzeIncompatibilities = ({
  selectedCourses,
  groupedData,
  availableTerms = [],
  blockouts = [],
  maxPerSemester = 6
}) => {
  const terms = getTerms(availableTerms);
  const allCourses = buildCourseEntries(selectedCourses, groupedData, availableTerms);
  const allBlockouts = buildBlockoutEntries(blockouts);
  const invalidCourses = allCourses.filter((course) => course.options.length === 0);
  const courses = allCourses.filter((course) => course.options.length > 0);
  const atoms = [...courses, ...allBlockouts];
  const atomMap = new Map(atoms.map((atom) => [atom.id, atom]));
  const feasibilityCache = new Map();
  const visited = new Set();
  let searchCount = 0;
  let truncated = false;
  let cores = [];

  const isInfeasible = (ids) => {
    const key = ids.slice().sort().join('|');
    if (feasibilityCache.has(key)) return !feasibilityCache.get(key);

    const selectedAtoms = ids.map((id) => atomMap.get(id));
    const selectedCourseAtoms = selectedAtoms.filter((atom) => atom.kind === 'course');
    const selectedBlockoutAtoms = selectedAtoms.filter((atom) => atom.kind === 'blockout');
    const feasible = canSchedule(selectedCourseAtoms, selectedBlockoutAtoms, terms, maxPerSemester);
    feasibilityCache.set(key, feasible);
    return !feasible;
  };

  const addCore = (core) => {
    const sortedCore = core.slice().sort();
    if (cores.some((existing) => isSubset(existing, sortedCore))) return;
    cores = cores.filter((existing) => !isSubset(sortedCore, existing));
    cores.push(sortedCore);
    cores.sort((a, b) => a.length - b.length || a.join('|').localeCompare(b.join('|')));
    if (cores.length > MAX_REPORTED_ISSUES) {
      cores = cores.slice(0, MAX_REPORTED_ISSUES);
      truncated = true;
    }
  };

  // Find the most actionable two-item conflicts first.
  for (let i = 0; i < atoms.length - 1; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      if (atoms[i].kind === 'blockout' && atoms[j].kind === 'blockout') continue;
      const pair = [atoms[i].id, atoms[j].id];
      if (isInfeasible(pair)) addCore(pair);
    }
  }

  const minimize = (ids) => {
    let core = [...ids];
    for (const id of ids) {
      const candidate = core.filter((candidateId) => candidateId !== id);
      if (candidate.length > 0 && isInfeasible(candidate)) core = candidate;
    }
    return core;
  };

  const explore = (ids) => {
    if (searchCount >= MAX_CORE_SEARCHES || cores.length >= MAX_REPORTED_ISSUES) {
      truncated = true;
      return;
    }

    const key = ids.slice().sort().join('|');
    if (visited.has(key)) return;
    visited.add(key);
    searchCount++;

    if (ids.length === 0 || !isInfeasible(ids)) return;

    const core = minimize(ids);
    addCore(core);

    // Removing each member lets the search reveal independent or overlapping cores.
    for (const id of core) {
      explore(ids.filter((candidateId) => candidateId !== id));
      if (truncated) return;
    }
  };

  explore(atoms.map((atom) => atom.id));

  // Capacity is useful as its own actionable issue even when a smaller time
  // clash exists among the same courses. Analyze it independently so fixing
  // one clash does not merely reveal a second, previously hidden blocker.
  const capacityIssues = getCapacityEvidenceList(courses, terms, maxPerSemester)
    .map((evidence) => describeCapacityIssue(evidence, courses, maxPerSemester, terms));

  const issues = [
    ...invalidCourses.map(describeInvalidCourse),
    ...cores.map((core) => describeCore(core, atomMap, terms, maxPerSemester)),
    ...capacityIssues
  ];

  // The dedicated capacity issue contains the complete affected set and is
  // clearer than several arbitrary limit+1 minimal cores.
  const capacityIssueIds = new Set(capacityIssues.map((issue) => issue.id));
  const deduplicatedIssues = issues.filter((issue) => (
    issue.type !== 'capacity' || capacityIssues.length === 0 || capacityIssueIds.has(issue.id)
  ));

  const typeOrder = { invalid: 0, time: 1, blockout: 2, capacity: 3, combined: 4 };
  deduplicatedIssues.sort((a, b) => (
    (a.courses.length + a.blockouts.length) - (b.courses.length + b.blockouts.length)
    || typeOrder[a.type] - typeOrder[b.type]
    || a.id.localeCompare(b.id)
  ));

  return {
    issues: deduplicatedIssues.slice(0, MAX_REPORTED_ISSUES),
    truncated: truncated || deduplicatedIssues.length > MAX_REPORTED_ISSUES,
    terms,
    maxPerSemester
  };
};

export const conflictAnalyzerInternals = {
  blockoutAppliesToTerm,
  buildCourseEntries,
  canSchedule,
  getBlockoutConflict,
  getSessionConflict
};
