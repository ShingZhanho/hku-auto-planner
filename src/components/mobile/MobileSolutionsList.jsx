import './MobileSolutionsList.css';

function MobileSolutionsList({ plans, selectedIndex, onPlanSelect }) {
  // Calculate day-offs for a semester
  const calculateDayOffs = (courses) => {
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const daysWithCourses = new Set();
    
    courses.forEach(course => {
      if (course.sessions && Array.isArray(course.sessions)) {
        course.sessions.forEach(session => {
          weekdays.forEach(day => {
            if (session.days && session.days[day]) {
              const dayValue = session.days[day].trim().toUpperCase();
              if (dayValue !== '') {
                daysWithCourses.add(day);
              }
            }
          });
        });
      }
    });
    
    return weekdays.length - daysWithCourses.size;
  };

  const hasValidSessions = (course) => {
    if (!course.sessions || course.sessions.length === 0) return false;
    
    return course.sessions.some(session => {
      const hasValidTimes = session.startTime && session.endTime && 
                           (typeof session.startTime !== 'string' || session.startTime.trim() !== '') && 
                           (typeof session.endTime !== 'string' || session.endTime.trim() !== '');
      return hasValidTimes;
    });
  };

  return (
    <div className="mobile-solutions-list">
      <div className="mobile-solutions-header">
        <h2>Available Plans</h2>
        <p className="mobile-solutions-count">{plans.length} plan{plans.length !== 1 ? 's' : ''} found</p>
      </div>

      <div className="mobile-plans-list">
        {plans.map((plan, index) => {
          const allTerms = new Set(plan.courses.map(c => c.term));
          const termArray = Array.from(allTerms).sort();
          const term1 = termArray[0];
          const term2 = termArray[1];
          
          const sem1Courses = plan.courses
            .filter(c => c.term === term1)
            .sort((a, b) => a.courseCode.localeCompare(b.courseCode));
          const sem2Courses = term2 ? plan.courses
            .filter(c => c.term === term2)
            .sort((a, b) => a.courseCode.localeCompare(b.courseCode)) : [];
          
          const sem1DayOffs = calculateDayOffs(sem1Courses);
          const sem2DayOffs = calculateDayOffs(sem2Courses);
          
          const displayTerm1 = term1 ? term1.replace(/^\d{4}-\d{2}\s*/, '') : 'Semester 1';
          const displayTerm2 = term2 ? term2.replace(/^\d{4}-\d{2}\s*/, '') : 'Semester 2';

          const hasCoursesWithoutLectures = [...sem1Courses, ...sem2Courses].some(c => !hasValidSessions(c));

          return (
            <div 
              key={index}
              className="mobile-plan-card"
              onClick={() => onPlanSelect(index)}
            >
              <div className="mobile-plan-header">
                <h3>Plan {index + 1}</h3>
                <div className="mobile-plan-meta">
                  <span>{plan.sem1Count}+{plan.sem2Count} courses</span>
                  <span>•</span>
                  <span className="mobile-plan-dayoffs">{sem1DayOffs}+{sem2DayOffs} day-offs</span>
                </div>
              </div>

              <div className="mobile-plan-semesters">
                {sem1Courses.length > 0 && (
                  <div className="mobile-semester-section">
                    <h4 className="mobile-semester-title">{displayTerm1}</h4>
                    <div className="mobile-semester-courses">
                      {sem1Courses.map((course, idx) => (
                        <div key={idx} className="mobile-course-tag">
                          <strong>{course.courseCode}{!hasValidSessions(course) ? '*' : ''}</strong>
                          <span>{course.section}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sem2Courses.length > 0 && (
                  <div className="mobile-semester-section">
                    <h4 className="mobile-semester-title">{displayTerm2}</h4>
                    <div className="mobile-semester-courses">
                      {sem2Courses.map((course, idx) => (
                        <div key={idx} className="mobile-course-tag">
                          <strong>{course.courseCode}{!hasValidSessions(course) ? '*' : ''}</strong>
                          <span>{course.section}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {hasCoursesWithoutLectures && (
                <p className="mobile-no-lectures-note">* No scheduled lectures</p>
              )}

              <div className="mobile-plan-action">
                <span className="mobile-view-calendar">View Calendar →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MobileSolutionsList;
