import React, { useState, useEffect } from 'react';
import './OverloadModal.css';

function OverloadModal({ isOpen, onClose, overloadEnabled, setOverloadEnabled, maxPerSemester, setMaxPerSemester, selectedCourses = [] }) {
  const [localEnabled, setLocalEnabled] = useState(false);
  const [localValue, setLocalValue] = useState('7');
  const [error, setError] = useState('');
  const courseCount = selectedCourses.length;
  const MAX_TOTAL_COURSES = 12;

  useEffect(() => {
    if (isOpen) {
      // Sync with props whenever modal opens
      console.log('OverloadModal sync - overloadEnabled:', overloadEnabled, 'maxPerSemester:', maxPerSemester);
      setLocalEnabled(overloadEnabled);
      setLocalValue(String(maxPerSemester > 6 ? maxPerSemester : 7));
      setError('');
    }
  }, [isOpen, overloadEnabled, maxPerSemester]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (localEnabled) {
      const parsed = parseInt(localValue, 10);
      if (isNaN(parsed) || !(parsed > 6 && parsed < 12)) {
        setError('Please enter an integer between 7 and 11.');
        return;
      }
      setMaxPerSemester(parsed);
    } else {
      // Check if user has more than 12 courses
      if (courseCount > MAX_TOTAL_COURSES) {
        setError(`Cannot disable overload: you have ${courseCount} courses selected. Please remove ${courseCount - MAX_TOTAL_COURSES} course(s) first.`);
        return;
      }
      // When overload is disabled, reset to default value
      setMaxPerSemester(6);
    }
    setOverloadEnabled(localEnabled);
    onClose();
  };

  return (
    <div className="overload-modal-backdrop" onClick={onClose}>
      <div className="overload-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="overload-modal-title">Overload Options</h3>
        <div className="overload-modal-body">
          <label className="overload-row">
            <input 
              type="checkbox" 
              checked={localEnabled} 
              onChange={(e) => {
                const newValue = e.target.checked;
                setLocalEnabled(newValue);
                // Clear error when enabling, or show warning when disabling with too many courses
                if (newValue) {
                  setError('');
                } else if (courseCount > MAX_TOTAL_COURSES) {
                  setError(`Cannot disable overload: you have ${courseCount} courses selected. Please remove ${courseCount - MAX_TOTAL_COURSES} course(s) first.`);
                } else {
                  setError('');
                }
              }} 
            />
            <span className="overload-checkbox-label">Enable Overload</span>
          </label>

          <label className="overload-row">
            <span className="overload-label">Max per semester</span>
            <input
              className="overload-input"
              type="number"
              min={7}
              max={11}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              disabled={!localEnabled}
            />
          </label>
          {error && <div className="overload-error">{error}</div>}
        </div>

        <div className="overload-modal-actions">
          <button className="overload-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="overload-btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default OverloadModal;
