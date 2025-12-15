import { useState, useMemo } from 'react';
import './CourseSelector.css';

function CourseSelector({ coursesData, selectedCourses, onCourseSelect, onCourseRemove, blockouts = [], onRemoveBlockout }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCourse, setExpandedCourse] = useState(null);

  const MAX_COURSES = 12;

  // Memoize filtered courses to avoid recalculating on every render
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return coursesData.courses;
    const searchLower = searchTerm.toLowerCase();
    return coursesData.courses.filter(course => 
      course.courseCode.toLowerCase().includes(searchLower)
    );
  }, [searchTerm, coursesData.courses]);

  const handleCourseClick = (course) => {
    if (expandedCourse?.courseCode === course.courseCode) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(course);
    }
  };

  const handleSectionSelection = (course, section, mode) => {
    const isSelectedCourse = selectedCourses.find(c => c.courseCode === course.courseCode);
    
    // Check if adding a new course would exceed the limit
    if (!isSelectedCourse && selectedCourses.length >= MAX_COURSES) {
      alert(`You can select at most ${MAX_COURSES} courses.`);
      return;
    }
    
    if (mode === 'any') {
      // Select all sections (let system choose)
      onCourseSelect(course, course.sections);
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
            {coursesData.totalCourses} courses available · {selectedCourses.length}/{MAX_COURSES} selected
          </p>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search by course code (e.g., COMP1234, ECON)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
                  <span className="course-code">{course.courseCode}</span>
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
                        
                        return (
                          <div key={term} className="section-group">
                            <div className="section-group-header">{term}</div>
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
            No courses found matching "{searchTerm}"
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
          {selectedCourses.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`Remove all ${selectedCourses.length} courses from cart?`)) {
                  selectedCourses.forEach(course => onCourseRemove(course.courseCode));
                }
              }}
              className="cart-clear-btn"
              title="Clear all courses"
            >
              Clear All
            </button>
          )}
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
                  <button
                    onClick={() => onRemoveBlockout(blockout.id)}
                    className="cart-delete-btn"
                    title="Remove blockout"
                  >
                    Remove
                  </button>
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
                      <div className="cart-course-code">{course.courseCode}</div>
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
                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem', fontWeight: 'bold' }}>
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
    </div>
  );
}

export default CourseSelector;
