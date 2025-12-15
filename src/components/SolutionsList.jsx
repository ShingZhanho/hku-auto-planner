import { useMemo, useEffect } from 'react';
import './SolutionsList.css';

function SolutionsList({ sem1Plans, sem2Plans, selectedSem1Index, selectedSem2Index, onSelectSem1, onSelectSem2 }) {
  // Check if a plan has overlapping courses with the selected plan from the other semester
  const hasOverlappingCourses = useMemo(() => {
    return (plan, selectedOtherPlan) => {
      if (!selectedOtherPlan) return false;
      
      const planCourses = new Set(plan.map(c => c.courseCode));
      const selectedCourses = new Set(selectedOtherPlan.map(c => c.courseCode));
      
      for (const course of planCourses) {
        if (selectedCourses.has(course)) {
          return true;
        }
      }
      return false;
    };
  }, []);

  const selectedSem1Plan = selectedSem1Index !== null ? sem1Plans[selectedSem1Index] : null;
  const selectedSem2Plan = selectedSem2Index !== null ? sem2Plans[selectedSem2Index] : null;

  // Auto-select compatible plan when current selection becomes incompatible
  useEffect(() => {
    // Check if current Sem 1 selection is now incompatible with Sem 2 selection
    if (selectedSem1Index !== null && selectedSem2Plan && hasOverlappingCourses(selectedSem1Plan, selectedSem2Plan)) {
      // Find first compatible Sem 1 plan
      const compatibleIndex = sem1Plans.findIndex(plan => !hasOverlappingCourses(plan, selectedSem2Plan));
      if (compatibleIndex !== -1) {
        onSelectSem1(compatibleIndex);
      } else {
        onSelectSem1(null); // No compatible plans found
      }
    }
  }, [selectedSem2Index, selectedSem2Plan]);

  useEffect(() => {
    // Check if current Sem 2 selection is now incompatible with Sem 1 selection
    if (selectedSem2Index !== null && selectedSem1Plan && hasOverlappingCourses(selectedSem2Plan, selectedSem1Plan)) {
      // Find first compatible Sem 2 plan
      const compatibleIndex = sem2Plans.findIndex(plan => !hasOverlappingCourses(plan, selectedSem1Plan));
      if (compatibleIndex !== -1) {
        onSelectSem2(compatibleIndex);
      } else {
        onSelectSem2(null); // No compatible plans found
      }
    }
  }, [selectedSem1Index, selectedSem1Plan]);

  const renderPlanCard = (plan, index, semester, isSelected, onSelect, isDisabled) => (
    <div
      key={index}
      className={`solution-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={() => !isDisabled && onSelect(index)}
    >
      <h3>Plan {index + 1}</h3>
      <ul>
        {plan.map((course, idx) => (
          <li key={idx}>
            <strong>{course.courseCode}</strong> - {course.section}
            <div className="course-title-small">{course.courseTitle}</div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="solutions-list">
      <div className="solutions-header">
        <h2>Possible Plans</h2>
      </div>
      
      <div className="solutions-content-split">
        {sem1Plans.length > 0 && (
          <div className="semester-column">
            <h3 className="semester-column-title">Semester 1 Plans ({sem1Plans.length})</h3>
            <div className="semester-scroll">
              {sem1Plans.map((plan, index) => {
                const isDisabled = hasOverlappingCourses(plan, selectedSem2Plan);
                return renderPlanCard(
                  plan,
                  index,
                  'sem1',
                  selectedSem1Index === index,
                  onSelectSem1,
                  isDisabled
                );
              })}
            </div>
          </div>
        )}
        
        {sem2Plans.length > 0 && (
          <div className="semester-column">
            <h3 className="semester-column-title">Semester 2 Plans ({sem2Plans.length})</h3>
            <div className="semester-scroll">
              {sem2Plans.map((plan, index) => {
                const isDisabled = hasOverlappingCourses(plan, selectedSem1Plan);
                return renderPlanCard(
                  plan,
                  index,
                  'sem2',
                  selectedSem2Index === index,
                  onSelectSem2,
                  isDisabled
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SolutionsList;
