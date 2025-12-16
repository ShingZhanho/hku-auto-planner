import { useMemo } from 'react';
import './SolutionsList.css';

function SolutionsList({ plans, selectedIndex, onSelectPlan }) {
  // Calculate day-offs for a semester (weekdays with no courses)
  const calculateDayOffs = (courses) => {
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const daysWithCourses = new Set();
    
    courses.forEach(course => {
      // Check all sessions for this course
      if (course.sessions && Array.isArray(course.sessions)) {
        course.sessions.forEach(session => {
          weekdays.forEach(day => {
            if (session.days && session.days[day]) {
              const dayValue = session.days[day].trim().toUpperCase();
              // Check if this day has a class (the value is the day name in uppercase, like "MON", "TUE")
              if (dayValue !== '') {
                daysWithCourses.add(day);
              }
            }
          });
        });
      }
    });
    
    // Only count Mon-Fri as potential day-offs, weekends never count
    return weekdays.length - daysWithCourses.size;
  };

  const renderPlanCard = (planData, index, isSelected) => {
    // Determine term identifiers
    const allTerms = new Set(planData.courses.map(c => c.term));
    const termArray = Array.from(allTerms).sort();
    const term1 = termArray[0];
    const term2 = termArray[1]; // Will be undefined if only one term
    
    // Group courses by semester and sort by course code
    const sem1Courses = planData.courses
      .filter(c => c.term === term1)
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
    const sem2Courses = term2 ? planData.courses
      .filter(c => c.term === term2)
      .sort((a, b) => a.courseCode.localeCompare(b.courseCode)) : [];
    
    // Calculate day-offs for each semester
    const sem1DayOffs = calculateDayOffs(sem1Courses);
    const sem2DayOffs = calculateDayOffs(sem2Courses);
    
    // Strip year prefix from term names for display
    const displayTerm1 = term1 ? term1.replace(/^\d{4}-\d{2}\s*/, '') : 'Semester 1';
    const displayTerm2 = term2 ? term2.replace(/^\d{4}-\d{2}\s*/, '') : 'Semester 2';
    
    return (
      <div
        key={planData.originalIndex !== undefined ? planData.originalIndex : index}
        className={`solution-card ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelectPlan(planData.originalIndex !== undefined ? planData.originalIndex : index)}
      >
        <div className="plan-card-header">
          <h3>Plan {index + 1}</h3>
          <div className="plan-info">
            <span className="plan-course-count">{planData.sem1Count}+{planData.sem2Count} courses</span>
            <span className="plan-info-separator">•</span>
            <span className="plan-day-offs">{sem1DayOffs}+{sem2DayOffs} day-offs</span>
          </div>
        </div>
        <div className="plan-semesters">
          {sem1Courses.length > 0 && (
            <div className="semester-courses">
              <h4>{displayTerm1}</h4>
              <ul>
                {sem1Courses.map((course, idx) => (
                  <li key={idx}>
                    <strong>{course.courseCode}</strong> - {course.section}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sem2Courses.length > 0 && (
            <div className="semester-courses">
              <h4>{displayTerm2}</h4>
              <ul>
                {sem2Courses.map((course, idx) => (
                  <li key={idx}>
                    <strong>{course.courseCode}</strong> - {course.section}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Sort plans by distribution balance first, then by total day-offs
  // Memoize this expensive calculation to prevent recomputation on every render
  const sortedPlans = useMemo(() => {
    return [...plans].map((plan, originalIndex) => ({
      ...plan,
      originalIndex
    })).sort((a, b) => {
      // First priority: balanced distribution (minimize difference between semesters)
      const diffA = Math.abs(a.sem1Count - a.sem2Count);
      const diffB = Math.abs(b.sem1Count - b.sem2Count);
      if (diffA !== diffB) {
        return diffA - diffB;
      }
      
      // Second priority: more day-offs is better
      const allTermsA = new Set(a.courses.map(c => c.term));
      const termArrayA = Array.from(allTermsA).sort();
      const sem1CoursesA = a.courses.filter(c => c.term === termArrayA[0]);
      const sem2CoursesA = termArrayA[1] ? a.courses.filter(c => c.term === termArrayA[1]) : [];
      const dayOffsA = calculateDayOffs(sem1CoursesA) + calculateDayOffs(sem2CoursesA);
      
      const allTermsB = new Set(b.courses.map(c => c.term));
      const termArrayB = Array.from(allTermsB).sort();
      const sem1CoursesB = b.courses.filter(c => c.term === termArrayB[0]);
      const sem2CoursesB = termArrayB[1] ? b.courses.filter(c => c.term === termArrayB[1]) : [];
      const dayOffsB = calculateDayOffs(sem1CoursesB) + calculateDayOffs(sem2CoursesB);
      
      return dayOffsB - dayOffsA; // More day-offs = lower index (better)
    });
  }, [plans]);

  return (
    <div className="solutions-list">
      <div className="solutions-header">
        <h2>Possible Plans ({plans.length})</h2>
      </div>
      
      <div className="solutions-content">
        {sortedPlans.map((planData, displayIndex) => 
          renderPlanCard(planData, displayIndex, selectedIndex === planData.originalIndex)
        )}
      </div>
    </div>
  );
}

export default SolutionsList;
