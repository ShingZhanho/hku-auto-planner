import { useState, useMemo, useEffect } from 'react';
import OverloadModal from '../OverloadModal';
import './MobileCourseSelector.css';

function MobileCourseSelector({ coursesData, selectedCourses, onCourseSelect, searchTerm, onSearchChange, overloadEnabled = false, maxPerSemester = 6, setMaxPerSemester = () => {}, setOverloadEnabled = () => {} }) {
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [showOverloadModal, setShowOverloadModal] = useState(false);

  const MAX_TOTAL_COURSES = 12;
  const MAX_PER_SEMESTER = maxPerSemester;

  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const search = searchTerm.toLowerCase();
    return coursesData.courses.filter(course => 
      course?.courseCode?.toLowerCase().includes(search)
    );
  }, [coursesData.courses, searchTerm]);

  // Auto-expand when only one course matches
  useMemo(() => {
    if (filteredCourses.length === 1) {
      setExpandedCourse(filteredCourses[0].courseCode);
    } else if (filteredCourses.length === 0) {
      setExpandedCourse(null);
    }
  }, [filteredCourses]);

  const handleCourseClick = (courseCode) => {
    setExpandedCourse(expandedCourse === courseCode ? null : courseCode);
  };

  const handleSectionSelection = (course, section, mode, term = null) => {
    const existingCourse = selectedCourses.find(c => c.courseCode === course.courseCode);
    // Total cap (only enforce when overload is disabled)
    if (!existingCourse && !overloadEnabled && selectedCourses.length >= MAX_TOTAL_COURSES) {
      alert(`You can select at most ${MAX_TOTAL_COURSES} courses.`);
      return;
    }

    const computeTermCounts = (coursesList) => {
      const counts = {};
      coursesList.forEach(c => {
        const termsWithSelection = new Set();
        (c.selectedSections || []).forEach(sec => {
          for (const t of c.terms || []) {
            const groupKey = `${c.courseCode}-${t}`;
            if (coursesData.grouped[groupKey] && coursesData.grouped[groupKey].sections[sec]) {
              termsWithSelection.add(t);
            }
          }
        });
        termsWithSelection.forEach(t => {
          counts[t] = (counts[t] || 0) + 1;
        });
      });
      return counts;
    };

    const determineAffectedTermsForCourse = (targetCourse, selectedSecs) => {
      const affected = new Set();
      (selectedSecs || []).forEach(sec => {
        for (const t of targetCourse.terms || []) {
          const groupKey = `${targetCourse.courseCode}-${t}`;
          if (coursesData.grouped[groupKey] && coursesData.grouped[groupKey].sections[sec]) {
            affected.add(t);
          }
        }
      });
      return Array.from(affected);
    };

    const currentCounts = computeTermCounts(selectedCourses);

    if (mode === 'any') {
      // Toggle all sections
      const allSections = course.sections || [];
      const targetTerms = determineAffectedTermsForCourse(course, allSections);

      if (!overloadEnabled) {
        const projected = { ...currentCounts };
        targetTerms.forEach(t => {
          projected[t] = (projected[t] || 0) + (existingCourse && (existingCourse.selectedSections || []).length > 0 ? 0 : 1);
        });
        for (const t of targetTerms) {
          if ((projected[t] || 0) > MAX_PER_SEMESTER) {
            alert(`Cannot select this course: selecting subclasses would exceed ${MAX_PER_SEMESTER} courses in ${t}. Enable overload to allow more.`);
            return;
          }
        }
      }

      if (existingCourse && Array.isArray(existingCourse.selectedSections) && 
          existingCourse.selectedSections.length === course.sections.length) {
        // Deselect all - remove the course
        onCourseSelect(course, []);
      } else {
        // Select all sections
        onCourseSelect(course, course.sections);
      }
    } else if (mode === 'term') {
      // Toggle all sections for a specific term
      const groupKey = `${course.courseCode}-${term}`;
      const termSections = coursesData.grouped[groupKey] 
        ? Object.keys(coursesData.grouped[groupKey].sections)
        : [];
      
      if (termSections.length === 0) return;
      if (!overloadEnabled && !existingCourse) {
        const projected = { ...currentCounts };
        projected[term] = (projected[term] || 0) + 1;
        if (projected[term] > MAX_PER_SEMESTER) {
          alert(`Cannot select these subclasses: selecting would exceed ${MAX_PER_SEMESTER} courses in ${term}. Enable overload to allow more.`);
          return;
        }
      }
      if (existingCourse) {
        const currentSections = Array.isArray(existingCourse.selectedSections) 
          ? existingCourse.selectedSections 
          : [];
        
        const allTermSelected = termSections.every(s => currentSections.includes(s));
        
        if (allTermSelected) {
          // Deselect all term sections
          const newSections = currentSections.filter(s => !termSections.includes(s));
          onCourseSelect(course, newSections);
        } else {
          // Select all term sections
          const newSections = [...new Set([...currentSections, ...termSections])];
          onCourseSelect(course, newSections);
        }
      } else {
        // First selection - select all term sections
        onCourseSelect(course, termSections);
      }
    } else {
      // Toggle specific section
      let newSections;
      if (existingCourse) {
        const currentSections = Array.isArray(existingCourse.selectedSections) 
          ? existingCourse.selectedSections 
          : [];
        
        if (currentSections.includes(section)) {
          newSections = currentSections.filter(s => s !== section);
        } else {
          newSections = [...currentSections, section];
        }
      } else {
        let sectionTerm = null;
        for (const t of course.terms || []) {
          const groupKey = `${course.courseCode}-${t}`;
          if (coursesData.grouped[groupKey] && coursesData.grouped[groupKey].sections[section]) {
            sectionTerm = t;
            break;
          }
        }
        if (!overloadEnabled && sectionTerm) {
          const projected = { ...currentCounts };
          projected[sectionTerm] = (projected[sectionTerm] || 0) + 1;
          if (projected[sectionTerm] > MAX_PER_SEMESTER) {
            alert(`Cannot select this subclass: selecting would exceed ${MAX_PER_SEMESTER} courses in ${sectionTerm}. Enable overload to allow more.`);
            return;
          }
        }
        newSections = [section];
      }
      
      onCourseSelect(course, newSections);
    }
  };

  const isSectionSelected = (courseCode, sectionName) => {
    const course = selectedCourses.find(c => c.courseCode === courseCode);
    if (!course) return false;
    if (!Array.isArray(course.selectedSections)) return false;
    return course.selectedSections.includes(sectionName);
  };

  return (
    <div className="mobile-course-selector">
      <div className="mobile-search-box">
        <input
          type="text"
          placeholder="Search by course code..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="mobile-search-input"
        />
        <div className="mobile-overload-container">
          <button
            className="mobile-overload-btn"
            onClick={() => setShowOverloadModal(true)}
          >
            Overload Options
          </button>
        </div>
      </div>

      <div className="mobile-courses-list">
        {filteredCourses.length === 0 ? (
          <div className="mobile-empty-state">
            <p>{!searchTerm.trim() ? 'Enter a course code to search' : 'No courses found'}</p>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const isExpanded = expandedCourse === course.courseCode;
            const selectedCourse = selectedCourses.find(c => c.courseCode === course.courseCode);
            const selectedCount = selectedCourse?.selectedSections?.length || 0;

            return (
              <div key={course.courseCode} className="mobile-course-card">
                <div 
                  className="mobile-course-header"
                  onClick={() => handleCourseClick(course.courseCode)}
                >
                  <div className="mobile-course-info">
                    <h3 className="mobile-course-code">{course.courseCode}</h3>
                    <p className="mobile-course-title">{course.courseTitle}</p>
                    <p className="mobile-course-meta">
                      {course.sectionCount} subclass(es) · {course.terms.join(', ')}
                      {selectedCount > 0 && (
                        <span className="mobile-selected-badge">
                          {selectedCount} selected
                        </span>
                      )}
                    </p>
                  </div>
                  <button className="mobile-expand-btn" aria-label="Expand course">
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mobile-sections-container">
                    {/* All Subclasses Toggle */}
                    <button
                      className={`mobile-toggle-btn mobile-toggle-all ${
                        selectedCourse && Array.isArray(selectedCourse.selectedSections) && 
                        selectedCourse.selectedSections.length === course.sections.length 
                          ? 'active' : ''
                      }`}
                      onClick={() => handleSectionSelection(course, null, 'any')}
                    >
                      All Subclasses
                    </button>

                    {/* By Term */}
                    {course.terms.map(term => {
                      const groupKey = `${course.courseCode}-${term}`;
                      const termSections = coursesData.grouped[groupKey] 
                        ? Object.keys(coursesData.grouped[groupKey].sections)
                        : [];
                      
                      if (termSections.length === 0) return null;
                      
                      const currentSections = selectedCourse?.selectedSections || [];
                      const allTermSelected = termSections.every(s => currentSections.includes(s));
                      
                      return (
                        <div key={term} className="mobile-term-group">
                          <div className="mobile-term-header">
                            <span className="mobile-term-label">{term}</span>
                            <button
                              className={`mobile-toggle-btn mobile-toggle-term ${allTermSelected ? 'active' : ''}`}
                              onClick={() => handleSectionSelection(course, null, 'term', term)}
                            >
                              All {term}
                            </button>
                          </div>
                          
                          <div className="mobile-sections-list">
                            {termSections.map(section => {
                              const sectionData = coursesData.grouped[groupKey].sections[section];
                              const instructors = sectionData 
                                ? [...new Set(sectionData.map(s => s.instructor).filter(i => i))]
                                : [];
                              const isSelected = isSectionSelected(course.courseCode, section);
                              
                              return (
                                <div 
                                  key={section}
                                  className={`mobile-section-item ${isSelected ? 'selected' : ''}`}
                                  onClick={() => handleSectionSelection(course, section, 'specific')}
                                >
                                  <div className="mobile-section-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  <div className="mobile-section-info">
                                    <h4 className="mobile-section-name">Subclass {section}</h4>
                                    {instructors.length > 0 && (
                                      <p className="mobile-section-instructor">
                                        {instructors.join(', ')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {showOverloadModal && (
        <OverloadModal
          isOpen={showOverloadModal}
          onClose={() => setShowOverloadModal(false)}
          overloadEnabled={overloadEnabled}
          setOverloadEnabled={setOverloadEnabled}
          maxPerSemester={maxPerSemester}
          setMaxPerSemester={setMaxPerSemester}
          selectedCourses={selectedCourses}
        />
      )}
    </div>
  );
}

export default MobileCourseSelector;
