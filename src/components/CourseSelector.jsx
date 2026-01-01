import { useState, useMemo, useEffect } from 'react';
import './CourseSelector.css';
import OverloadModal from './OverloadModal';

function CourseSelector({ coursesData, selectedCourses, onCourseSelect, onCourseRemove, blockouts = [], onRemoveBlockout, onEditBlockout, onClearAll, onClearAllCourses, onClearAllBlockouts, searchTerm = '', onSearchTermChange, overloadEnabled = false, maxPerSemester = 6, setMaxPerSemester = () => {}, setOverloadEnabled = () => {}, isOverloadModalOpen = false, setIsOverloadModalOpen = () => {} }) {
  const [expandedCourse, setExpandedCourse] = useState(null);

  const MAX_TOTAL_COURSES = 12;
  const MAX_PER_SEMESTER = overloadEnabled ? maxPerSemester : 6;

  // Memoize filtered courses to avoid recalculating on every render
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const searchLower = searchTerm.toLowerCase();
    return coursesData.courses.filter(course => 
      course.courseCode.toLowerCase().includes(searchLower)
    );
  }, [searchTerm, coursesData.courses]);

  // Auto-expand when only one course matches
  useEffect(() => {
    if (filteredCourses.length === 1) {
      setExpandedCourse(filteredCourses[0]);
    }
  }, [filteredCourses]);

  const handleCourseClick = (course) => {
    if (expandedCourse?.courseCode === course.courseCode) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(course);
    }
  };

  const handleSectionSelection = (course, section, mode, term = null) => {
    const isSelectedCourse = selectedCourses.find(c => c.courseCode === course.courseCode);
    
    // Check total courses cap first (only when overload is disabled)
    if (!isSelectedCourse && !overloadEnabled && selectedCourses.length >= MAX_TOTAL_COURSES) {
      alert(`You can select at most ${MAX_TOTAL_COURSES} courses.`);
      return;
    }

    // Helper: count courses per term based on selectedSections
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

    // Determine terms that would be affected by this selection action
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
        // If enabling all would push any term over the per-sem limit, block
        const projected = { ...currentCounts };
        targetTerms.forEach(t => {
          projected[t] = (projected[t] || 0) + (isSelectedCourse && (isSelectedCourse.selectedSections || []).length > 0 ? 0 : 1);
        });
        for (const t of targetTerms) {
          if ((projected[t] || 0) > MAX_PER_SEMESTER) {
            alert(`Cannot select this course: selecting subclasses would exceed ${MAX_PER_SEMESTER} courses in ${t}. Enable overload to allow more.`);
            return;
          }
        }
      }

      if (isSelectedCourse && isSelectedCourse.selectedSections.length === course.sections.length) {
        // If all are selected, deselect all
        onCourseRemove(course.courseCode);
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
      // Check per-sem limit for this term
      if (!overloadEnabled && !isSelectedCourse) {
        const projected = { ...currentCounts };
        projected[term] = (projected[term] || 0) + 1;
        if (projected[term] > MAX_PER_SEMESTER) {
          alert(`Cannot select these subclasses: selecting would exceed ${MAX_PER_SEMESTER} courses in ${term}. Enable overload to allow more.`);
          return;
        }
      }

      if (isSelectedCourse) {
        const currentSections = Array.isArray(isSelectedCourse.selectedSections) 
          ? isSelectedCourse.selectedSections 
          : [];
        
        // Check if all term sections are selected
        const allTermSelected = termSections.every(s => currentSections.includes(s));
        
        if (allTermSelected) {
          // Deselect all term sections
          const newSections = currentSections.filter(s => !termSections.includes(s));
          if (newSections.length === 0) {
            onCourseRemove(course.courseCode);
          } else {
            onCourseSelect(course, newSections);
          }
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
      if (isSelectedCourse) {
        const currentSections = Array.isArray(isSelectedCourse.selectedSections) 
          ? isSelectedCourse.selectedSections 
          : [];
        
        if (currentSections.includes(section)) {
          // Remove this section
          newSections = currentSections.filter(s => s !== section);
          if (newSections.length === 0) {
            onCourseRemove(course.courseCode);
            return;
          }
        } else {
          // Add this section
          newSections = [...currentSections, section];
        }
      } else {
        // First selection
        // Check which term this section belongs to
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

  const isSelected = (courseCode) => {
    return selectedCourses.find(c => c.courseCode === courseCode);
  };

  const isSectionSelected = (courseCode, section) => {
    const selected = selectedCourses.find(c => c.courseCode === courseCode);
    if (!selected) return false;
    if (!Array.isArray(selected.selectedSections)) return false;
    return selected.selectedSections.includes(section);
  };

  const handleToggleSection = (courseCode, section) => {
    const course = selectedCourses.find(c => c.courseCode === courseCode);
    if (!course) return;

    const currentSections = Array.isArray(course.selectedSections) 
      ? course.selectedSections 
      : [];

    let newSections;
    if (currentSections.includes(section)) {
      newSections = currentSections.filter(s => s !== section);
      if (newSections.length === 0) {
        onCourseRemove(courseCode);
        return;
      }
    } else {
      newSections = [...currentSections, section];
    }

    const fullCourse = coursesData.courses.find(c => c.courseCode === courseCode);
    onCourseSelect(fullCourse, newSections);
  };

  // Memoize sorted cart courses
  const sortedCartCourses = useMemo(() => {
    return [...selectedCourses].sort((a, b) => a.courseCode.localeCompare(b.courseCode));
  }, [selectedCourses]);

  return (
    <div className="course-selector">
      <div className="left-panel">
        <div className="selector-header">
          <h2>Search Courses</h2>
          <p className="info-text">
            {coursesData.totalCourses} courses available · {selectedCourses.length}{!overloadEnabled && `/${MAX_TOTAL_COURSES}`} selected
          </p>
          <input
            type="text"
            placeholder="Search by course code (e.g., COMP1234, ECON)..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="courses-list">
        {filteredCourses.map(course => {
          const selected = isSelected(course.courseCode);
          const isExpanded = expandedCourse?.courseCode === course.courseCode;

          return (
            <div
              key={course.courseCode}
              className={`course-item ${selected ? 'selected' : ''}`}
            >
              <div
                className="course-header"
                onClick={() => handleCourseClick(course)}
              >
                <div className="course-main-info">
                  <div className="course-code-row">
                    <span className="course-code">{course.courseCode}</span>
                    {course.classTime && (
                      <span className="cc-time-badge">{course.classTime}</span>
                    )}
                  </div>
                  <span className="course-title">{course.courseTitle}</span>
                </div>
                <div className="course-meta">
                  <span className="course-dept">{course.offerDept}</span>
                  <span className="section-count">{course.sectionCount} subclass(es)</span>
                  <span className="course-term" style={{color: '#2196F3', fontSize: '0.85rem'}}>
                    {course.terms.join(', ')}
                  </span>
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="course-details">
                  <div className="section-selector">
                    <h4>Select Subclasses (can choose multiple):</h4>
                    <div className="section-options">
                      <div className="section-group">
                        <button
                          className={`section-btn ${selected && Array.isArray(selected.selectedSections) && selected.selectedSections.length === course.sections.length ? 'active' : ''}`}
                          onClick={() => handleSectionSelection(course, null, 'any')}
                        >
                          All Subclasses
                        </button>
                      </div>
                      
                      {course.terms.map(term => {
                        // Get sections for this term
                        const groupKey = `${course.courseCode}-${term}`;
                        const termSections = coursesData.grouped[groupKey] 
                          ? Object.keys(coursesData.grouped[groupKey].sections)
                          : [];
                        
                        if (termSections.length === 0) return null;
                        
                        // Check if all term sections are selected
                        const currentSections = selected?.selectedSections || [];
                        const allTermSelected = termSections.every(s => currentSections.includes(s));
                        
                        return (
                          <div key={term} className="section-group">
                            <div className="section-group-header">
                              {term}
                              <button
                                className={`section-btn-small ${allTermSelected ? 'active' : ''}`}
                                onClick={() => handleSectionSelection(course, null, 'term', term)}
                                title={`Toggle all ${term} subclasses`}
                              >
                                All {term}
                              </button>
                            </div>
                            {termSections.map(section => {
                              const sectionData = coursesData.grouped[groupKey].sections[section];
                              const instructors = sectionData 
                                ? [...new Set(sectionData.map(s => s.instructor).filter(i => i))]
                                : [];
                              
                              return (
                                <button
                                  key={section}
                                  className={`section-btn ${isSectionSelected(course.courseCode, section) ? 'active' : ''}`}
                                  onClick={() => handleSectionSelection(course, section, 'specific')}
                                >
                                  <div className="section-btn-content">
                                    <span className="section-name">Subclass {section}</span>
                                    {instructors.length > 0 && (
                                      <span className="section-instructor">{instructors.join(', ')}</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="no-results">
            {!searchTerm.trim() 
              ? 'Enter a course code to search'
              : `No courses found matching "${searchTerm}"`
            }
          </div>
        )}
        </div>
      </div>

      <div className="right-panel">
        <div className="shopping-cart">
        <div className="cart-header">
          <div>
            <h2>Shopping Cart</h2>
            <p className="cart-count">{selectedCourses.length} course(s) selected</p>
          </div>
          {(selectedCourses.length > 0 || blockouts.length > 0) && (() => {
            const hasBothTypes = selectedCourses.length > 0 && blockouts.length > 0;
            
            if (hasBothTypes) {
              // Show all three buttons when both types exist
              return (
                <div className="cart-clear-buttons">
                  <button
                    onClick={() => {
                      const totalItems = selectedCourses.length + blockouts.length;
                      if (window.confirm(`Remove all ${totalItems} item(s) from cart?`)) {
                        onClearAll();
                      }
                    }}
                    className="cart-clear-btn"
                    title="Clear everything"
                  >
                    Clear All
                  </button>
                  <div className="cart-clear-secondary">
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove all ${selectedCourses.length} course(s)?`)) {
                          onClearAllCourses();
                        }
                      }}
                      className="cart-clear-btn-secondary"
                      title="Clear all courses"
                    >
                      Clear Courses
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove all ${blockouts.length} blockout(s)?`)) {
                          onClearAllBlockouts();
                        }
                      }}
                      className="cart-clear-btn-secondary"
                      title="Clear all blockouts"
                    >
                      Clear Blockouts
                    </button>
                  </div>
                </div>
              );
            } else {
              // Show only one primary button when only one type exists
              return (
                <button
                  onClick={() => {
                    if (selectedCourses.length > 0) {
                      if (window.confirm(`Remove all ${selectedCourses.length} course(s)?`)) {
                        onClearAllCourses();
                      }
                    } else {
                      if (window.confirm(`Remove all ${blockouts.length} blockout(s)?`)) {
                        onClearAllBlockouts();
                      }
                    }
                  }}
                  className="cart-clear-btn"
                  title={selectedCourses.length > 0 ? "Clear all courses" : "Clear all blockouts"}
                >
                  Clear All
                </button>
              );
            }
          })()}
        </div>

        <div className="cart-content">
          {/* Display blockouts first */}
          {blockouts.map(blockout => {
            // Default to 'both' for backwards compatibility
            const applyTo = blockout.applyTo || 'both';
            const applyToDisplay = applyTo === 'both' 
              ? 'Both Semesters' 
              : applyTo === 'sem1' 
                ? 'Semester 1' 
                : 'Semester 2';
            
            return (
              <div key={blockout.id} className="cart-item cart-blockout-item">
                <div className="cart-item-header">
                  <div className="cart-course-info">
                    <div className="cart-course-code" style={{ color: '#7c3aed' }}>{blockout.name}</div>
                    <div className="cart-course-term" style={{ fontSize: '0.85rem' }}>
                      {blockout.day.charAt(0).toUpperCase() + blockout.day.slice(1)} · {blockout.startTime} - {blockout.endTime} · {applyToDisplay}
                    </div>
                  </div>
                  <div className="cart-item-actions">
                    <button
                      onClick={() => onEditBlockout(blockout)}
                      className="cart-edit-btn"
                      title="Edit blockout"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onRemoveBlockout(blockout.id)}
                      className="cart-delete-btn"
                      title="Remove blockout"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {selectedCourses.length === 0 && blockouts.length === 0 ? (
            <div className="cart-empty">
              No courses selected yet.<br />
              Search and select courses to add them here.
            </div>
          ) : (
            sortedCartCourses.map(course => {
              // Group sections by the term they belong to
              const sectionsByTerm = {};
              const allSections = course.sections || [];
              
              // Group sections by the term they belong to
              allSections.forEach(section => {
                // Try each term the course is offered in
                let foundTerm = null;
                for (const term of course.terms || []) {
                  const groupKey = `${course.courseCode}-${term}`;
                  if (coursesData.grouped[groupKey]?.sections[section]) {
                    foundTerm = term;
                    break;
                  }
                }
                
                if (!foundTerm) {
                  console.warn(`Section ${section} not found for ${course.courseCode} in any term`);
                  foundTerm = course.terms?.[0] || 'Unknown';
                }
                
                if (!sectionsByTerm[foundTerm]) {
                  sectionsByTerm[foundTerm] = [];
                }
                sectionsByTerm[foundTerm].push(section);
              });

              return (
                <div key={course.courseCode} className="cart-item">
                  <div className="cart-item-header">
                    <div className="cart-course-info">
                      <div className="cart-course-code-row">
                        <div className="cart-course-code">{course.courseCode}</div>
                        {course.classTime && (
                          <div className="cc-time-badge cart-badge">
                            {course.classTime.split('; ').map((time, idx) => (
                              <div key={idx}>{time}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="cart-course-term">{course.courseTitle}</div>
                    </div>
                    <button
                      onClick={() => onCourseRemove(course.courseCode)}
                      className="cart-delete-btn"
                      title="Remove course"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="cart-sections">
                    {Object.entries(sectionsByTerm).map(([term, sections]) => (
                      <div key={term}>
                        <div className="cart-semester-header">
                          {term}
                        </div>
                        {sections.map(section => {
                          const groupKey = `${course.courseCode}-${term}`;
                          const sectionData = coursesData.grouped[groupKey]?.sections[section];
                          const instructors = sectionData 
                            ? [...new Set(sectionData.map(s => s.instructor).filter(i => i))]
                            : [];
                          const isChecked = course.selectedSections?.includes(section);

                          return (
                            <div key={section} className="cart-section-row">
                              <input
                                type="checkbox"
                                id={`${course.courseCode}-${section}`}
                                checked={isChecked}
                                onChange={() => handleToggleSection(course.courseCode, section)}
                                className="cart-section-checkbox"
                              />
                              <label 
                                htmlFor={`${course.courseCode}-${section}`}
                                className="cart-section-label"
                              >
                                <span className="cart-section-name">Subclass {section}</span>
                                {instructors.length > 0 && (
                                  <span className="cart-section-instructor">{instructors.join(', ')}</span>
                                )}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
    {isOverloadModalOpen && (
      <OverloadModal
        isOpen={isOverloadModalOpen}
        onClose={() => setIsOverloadModalOpen(false)}
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

export default CourseSelector;
