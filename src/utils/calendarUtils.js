export const shouldSkipPartialFirstWeek = ({
  selectedSemester,
  firstSemester,
  semesterStart,
  weekCount
}) => {
  if (!selectedSemester || selectedSemester !== firstSemester || weekCount < 2 || !semesterStart) {
    return false;
  }

  const start = semesterStart instanceof Date ? semesterStart : new Date(semesterStart);
  return !Number.isNaN(start.getTime()) && start.getDay() !== 1;
};

export const formatSemesterStart = (semesterStart) => {
  const start = semesterStart instanceof Date ? semesterStart : new Date(semesterStart);
  if (Number.isNaN(start.getTime())) return '';

  return start.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
};
