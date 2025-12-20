import { useState } from 'react';
import BlockoutModal from '../BlockoutModal';
import './MobileCartMenu.css';

function MobileCartMenu({ 
  isOpen, 
  onClose, 
  selectedCourses, 
  blockouts,
  onCourseRemove,
  onAddBlockout,
  onRemoveBlockout,
  onCourseEdit
}) {
  const [isBlockoutModalOpen, setIsBlockoutModalOpen] = useState(false);
  const [editingBlockout, setEditingBlockout] = useState(null);

  const handleAddBlockout = (blockout) => {
    if (editingBlockout !== null) {
      // Handle edit if needed
      onRemoveBlockout(editingBlockout);
    }
    onAddBlockout(blockout);
    setEditingBlockout(null);
    setIsBlockoutModalOpen(false);
  };

  const handleEditBlockout = (index) => {
    setEditingBlockout(index);
    setIsBlockoutModalOpen(true);
  };

  const handleDeleteBlockout = (index) => {
    onRemoveBlockout(index);
  };

  return (
    <>
      {isOpen && <div className="mobile-menu-overlay" onClick={onClose} />}
      
      <div className={`mobile-cart-menu ${isOpen ? 'open' : ''}`}>
        <div className="mobile-cart-header">
          <h2>Shopping Cart</h2>
          <button 
            className="mobile-menu-close"
            onClick={onClose}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>
        
        <div className="mobile-cart-content">
          {/* Selected Courses */}
          <section className="cart-section">
            <h3 className="cart-section-title">
              Selected Courses ({selectedCourses.length})
            </h3>
            
            {selectedCourses.length === 0 ? (
              <p className="cart-empty-message">No courses selected yet</p>
            ) : (
              <div className="cart-courses-list">
                {[...selectedCourses]
                  .sort((a, b) => a.courseCode.localeCompare(b.courseCode))
                  .map((course, index) => (
                  <div key={index} className="cart-course-item">
                    <div className="cart-course-info">
                      <h4 className="cart-course-code">{course.courseCode}</h4>
                      {course.courseTitle && (
                        <p className="cart-course-title">{course.courseTitle}</p>
                      )}
                      <p className="cart-course-sections">
                        {course.selectedSections?.length || 0} subclass(es) selected
                      </p>
                    </div>
                    <div className="cart-course-actions">
                      <button 
                        className="cart-edit-btn"
                        onClick={() => onCourseEdit && onCourseEdit(course.courseCode)}
                        aria-label="Edit course"
                      >
                        ✎
                      </button>
                      <button 
                        className="cart-remove-btn"
                        onClick={() => onCourseRemove(course.courseCode)}
                        aria-label="Remove course"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Blockout Times */}
          <section className="cart-section">
            <div className="cart-section-header">
              <h3 className="cart-section-title">
                Blockout Times ({blockouts.length})
              </h3>
              <button 
                className="cart-add-blockout-btn"
                onClick={() => {
                  setEditingBlockout(null);
                  setIsBlockoutModalOpen(true);
                }}
              >
                + Add
              </button>
            </div>
            
            {blockouts.length === 0 ? (
              <p className="cart-empty-message">No blockout times set</p>
            ) : (
              <div className="cart-blockouts-list">
                {blockouts.map((blockout, index) => {
                  // Convert day code to full name
                  const dayNames = {
                    mon: 'Monday',
                    tue: 'Tuesday',
                    wed: 'Wednesday',
                    thu: 'Thursday',
                    fri: 'Friday',
                    sat: 'Saturday',
                    sun: 'Sunday'
                  };
                  
                  const dayName = dayNames[blockout.day] || blockout.day;
                  
                  // Convert applyTo to display text
                  const semesterText = blockout.applyTo === 'both' ? 'Both Semesters' :
                                      blockout.applyTo === 'sem1' ? 'Semester 1' :
                                      blockout.applyTo === 'sem2' ? 'Semester 2' : 
                                      blockout.applyTo;
                  
                  return (
                    <div key={index} className="cart-blockout-item">
                      <div className="cart-blockout-info">
                        <p className="cart-blockout-name">{blockout.name}</p>
                        <p className="cart-blockout-details">
                          {semesterText} • {dayName}
                        </p>
                        <p className="cart-blockout-time">
                          {blockout.startTime} - {blockout.endTime}
                        </p>
                      </div>
                      <div className="cart-blockout-actions">
                        <button 
                          className="cart-edit-btn"
                          onClick={() => handleEditBlockout(index)}
                          aria-label="Edit blockout"
                        >
                          ✎
                        </button>
                        <button 
                          className="cart-remove-btn"
                          onClick={() => handleDeleteBlockout(index)}
                          aria-label="Remove blockout"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Blockout Modal */}
      {isBlockoutModalOpen && (
        <BlockoutModal
          isOpen={isBlockoutModalOpen}
          onClose={() => {
            setIsBlockoutModalOpen(false);
            setEditingBlockout(null);
          }}
          onAdd={handleAddBlockout}
          editBlockout={editingBlockout !== null ? blockouts[editingBlockout] : null}
        />
      )}
    </>
  );
}

export default MobileCartMenu;
