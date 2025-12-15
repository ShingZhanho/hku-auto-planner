import './SolutionsList.css';

function SolutionsList({ plans, selectedIndex, onSelectPlan }) {
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
    
    // Strip year prefix from term names for display
    const displayTerm1 = term1 ? term1.replace(/^\d{4}-\d{2}\s*/, '') : 'Semester 1';
    const displayTerm2 = term2 ? term2.replace(/^\d{4}-\d{2}\s*/, '') : 'Semester 2';
    
    return (
      <div
        key={index}
        className={`solution-card ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelectPlan(index)}
      >
        <div className="plan-card-header">
          <h3>Plan {index + 1}</h3>
          <span className="plan-course-count">{planData.sem1Count}+{planData.sem2Count} courses</span>
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

  return (
    <div className="solutions-list">
      <div className="solutions-header">
        <h2>Possible Plans ({plans.length})</h2>
      </div>
      
      <div className="solutions-content">
        {plans.map((planData, index) => 
          renderPlanCard(planData, index, selectedIndex === index)
        )}
      </div>
    </div>
  );
}

export default SolutionsList;
