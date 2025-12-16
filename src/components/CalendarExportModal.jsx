import { useState, useRef } from 'react';
import { timeToMinutes } from '../utils/courseParser';
import './CalendarExportModal.css';

const FIELD_PLACEHOLDERS = [
  { key: '%COURSE_CODE%', label: 'Course Code', description: 'e.g., COMP1234' },
  { key: '%COURSE_NAME%', label: 'Course Name', description: 'Full course title' },
  { key: '%LOCATION%', label: 'Location', description: 'Room/building' },
  { key: '%DEPARTMENT%', label: 'Department', description: 'Offering department' },
  { key: '%SUBCLASS%', label: 'Subclass', description: 'Section number' },
  { key: '%INSTRUCTOR%', label: 'Instructor', description: 'Instructor name' },
];

function CalendarExportModal({ isOpen, onClose, schedule, availableSemesters, blockouts }) {
  const nameInputRef = useRef(null);
  const descTextareaRef = useRef(null);
  
  const [selectedSemesters, setSelectedSemesters] = useState(availableSemesters.reduce((acc, sem) => {
    acc[sem] = true;
    return acc;
  }, {}));
  const [includeBlockouts, setIncludeBlockouts] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [roundToHalfHour, setRoundToHalfHour] = useState(false);
  const [eventName, setEventName] = useState('%COURSE_CODE%');
  const [eventDescription, setEventDescription] = useState('Title: %COURSE_NAME%\nInstructor: %INSTRUCTOR%');
  const [nameCaretPos, setNameCaretPos] = useState(0);
  const [descCaretPos, setDescCaretPos] = useState(0);

  if (!isOpen) return null;

  // Calculate which semesters have courses
  const semesterCounts = availableSemesters.reduce((acc, sem) => {
    acc[sem] = schedule.filter(course => course.term === sem).length;
    return acc;
  }, {});

  const replacePlaceholders = (template, session, course) => {
    return template
      .replace(/%COURSE_CODE%/g, course?.courseCode || '')
      .replace(/%COURSE_NAME%/g, course?.courseTitle || '')
      .replace(/%LOCATION%/g, includeLocation ? (session.venue || '') : '')
      .replace(/%DEPARTMENT%/g, course?.offerDept || '')
      .replace(/%SUBCLASS%/g, course?.section || '')
      .replace(/%INSTRUCTOR%/g, session.instructor || '');
  };

  // Check if at least one semester is selected
  const hasSelectedSemester = Object.values(selectedSemesters).some(val => val);

  // Get a sample course for preview
  const sampleCourse = schedule.length > 0 ? schedule[0] : null;
  const sampleSession = sampleCourse?.sessions?.[0] || null;

  // Generate preview with actual data
  const previewTitle = sampleCourse && sampleSession 
    ? replacePlaceholders(eventName, sampleSession, sampleCourse)
    : eventName;
  const previewDescription = sampleCourse && sampleSession
    ? replacePlaceholders(eventDescription, sampleSession, sampleCourse)
    : eventDescription;

  const handleSemesterToggle = (semester) => {
    setSelectedSemesters(prev => ({
      ...prev,
      [semester]: !prev[semester]
    }));
  };

  const insertPlaceholder = (placeholder, field) => {
    if (field === 'name') {
      const newValue = eventName.slice(0, nameCaretPos) + placeholder + eventName.slice(nameCaretPos);
      const newCaretPos = nameCaretPos + placeholder.length;
      setEventName(newValue);
      setNameCaretPos(newCaretPos);
      
      // Focus input and set cursor position after state updates
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
          nameInputRef.current.setSelectionRange(newCaretPos, newCaretPos);
        }
      }, 0);
    } else {
      const newValue = eventDescription.slice(0, descCaretPos) + placeholder + eventDescription.slice(descCaretPos);
      const newCaretPos = descCaretPos + placeholder.length;
      setEventDescription(newValue);
      setDescCaretPos(newCaretPos);
      
      // Focus textarea and set cursor position after state updates
      setTimeout(() => {
        if (descTextareaRef.current) {
          descTextareaRef.current.focus();
          descTextareaRef.current.setSelectionRange(newCaretPos, newCaretPos);
        }
      }, 0);
    }
  };

  const handleNameChange = (e) => {
    setEventName(e.target.value);
    setNameCaretPos(e.target.selectionStart);
  };

  const handleDescChange = (e) => {
    setEventDescription(e.target.value);
    setDescCaretPos(e.target.selectionStart);
  };

  const handleExport = () => {
    try {
      const icsContent = generateICS();
      downloadICS(icsContent);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export calendar. Please check the console for details.');
    }
  };

  const roundTime = (minutes) => {
    if (!roundToHalfHour) return minutes;
    return Math.round(minutes / 30) * 30;
  };

  const parseDate = (dateString) => {
    // If it's already a Date object, return a copy
    if (dateString instanceof Date) {
      if (isNaN(dateString.getTime())) {
        console.error('Invalid Date object received:', dateString);
        throw new Error('Invalid Date object');
      }
      return new Date(dateString.getTime());
    }
    
    if (!dateString) {
      console.error('Date string is empty or undefined');
      throw new Error('Date string is empty or undefined');
    }
    
    // Try parsing the date string - handle formats like "DD/MM/YYYY" or "YYYY-MM-DD"
    if (typeof dateString === 'string') {
      const parts = dateString.includes('/') ? dateString.split('/') : dateString.split('-');
      if (parts.length === 3) {
        // Check if it's DD/MM/YYYY or YYYY-MM-DD
        if (parts[0].length === 4) {
          // YYYY-MM-DD format
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          if (isNaN(d.getTime())) {
            throw new Error(`Invalid date: ${dateString}`);
          }
          return d;
        } else {
          // DD/MM/YYYY format
          const d = new Date(parts[2], parts[1] - 1, parts[0]);
          if (isNaN(d.getTime())) {
            throw new Error(`Invalid date: ${dateString}`);
          }
          return d;
        }
      }
    }
    
    // Fallback to default Date constructor
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      console.error('Failed to parse date:', dateString);
      throw new Error(`Invalid date: ${dateString}`);
    }
    return d;
  };

  const formatICSDate = (date, timeMinutes) => {
    let d;
    if (date instanceof Date) {
      d = new Date(date.getTime());
    } else {
      d = parseDate(date);
    }
    
    if (isNaN(d.getTime())) {
      console.error('Invalid date encountered:', { date, type: typeof date, timeMinutes });
      throw new RangeError(`Invalid date: ${date}`);
    }
    
    d.setHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);
    
    if (isNaN(d.getTime())) {
      console.error('Invalid date after setHours:', { date, timeMinutes });
      throw new RangeError(`Invalid date after setting time`);
    }
    
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const generateICS = () => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HKU Auto Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    // Filter courses by selected semesters
    const filteredSchedule = schedule.filter(course => selectedSemesters[course.term]);

    // Add course events
    filteredSchedule.forEach(course => {
      if (!course.sessions || !Array.isArray(course.sessions)) {
        console.warn('Course has no sessions:', course);
        return;
      }
      
      course.sessions.forEach((session, idx) => {
        if (!session.days) {
          console.warn('Session has no days:', session);
          return;
        }
        
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const sessionDays = days.filter(day => session.days[day]);

        sessionDays.forEach(day => {
          // Generate recurring events for each day
          const startTime = roundTime(timeToMinutes(session.startTime));
          const endTime = roundTime(timeToMinutes(session.endTime));
          
          const eventSummary = replacePlaceholders(eventName, session, course);
          const eventDesc = replacePlaceholders(eventDescription, session, course);
          
          const startDate = parseDate(session.startDate);
          const endDate = parseDate(session.endDate);
          
          // Find the first occurrence of this day
          const dayIndex = days.indexOf(day);
          const firstOccurrence = new Date(startDate);
          while (firstOccurrence.getDay() !== (dayIndex + 1) % 7) {
            firstOccurrence.setDate(firstOccurrence.getDate() + 1);
          }

          const uid = `${course.courseCode}-${course.section}-${day}-${idx}@hku-planner`;
          
          lines.push('BEGIN:VEVENT');
          lines.push(`UID:${uid}`);
          lines.push(`DTSTART:${formatICSDate(firstOccurrence, startTime)}`);
          lines.push(`DTEND:${formatICSDate(firstOccurrence, endTime)}`);
          lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${formatICSDate(endDate, endTime)}`);
          lines.push(`SUMMARY:${eventSummary.replace(/\n/g, '\\n')}`);
          lines.push(`DESCRIPTION:${eventDesc.replace(/\n/g, '\\n')}`);
          if (includeLocation && session.venue) {
            lines.push(`LOCATION:${session.venue}`);
          }
          lines.push('END:VEVENT');
        });
      });
    });

    // Add blockout events if enabled
    if (includeBlockouts) {
      blockouts.forEach((blockout, idx) => {
        // Check if blockout applies to selected semesters
        const applies = blockout.applyTo === 'both' || 
                       availableSemesters.some(sem => 
                         selectedSemesters[sem] && 
                         (blockout.applyTo === sem.toLowerCase().replace(/.*sem /, 'sem'))
                       );
        
        if (!applies) return;

        const startTime = roundTime(timeToMinutes(blockout.startTime));
        const endTime = roundTime(timeToMinutes(blockout.endTime));

        // Use first selected semester's schedule for date range
        const firstSem = availableSemesters.find(sem => selectedSemesters[sem]);
        const semSchedule = schedule.filter(c => c.term === firstSem);
        
        if (semSchedule.length > 0) {
          const firstSession = semSchedule[0].sessions[0];
          const startDate = parseDate(firstSession.startDate);
          const endDate = parseDate(firstSession.endDate);
          
          const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(blockout.day);
          const firstOccurrence = new Date(startDate);
          while (firstOccurrence.getDay() !== (dayIndex + 1) % 7) {
            firstOccurrence.setDate(firstOccurrence.getDate() + 1);
          }

          const uid = `blockout-${idx}@hku-planner`;
          
          lines.push('BEGIN:VEVENT');
          lines.push(`UID:${uid}`);
          lines.push(`DTSTART:${formatICSDate(firstOccurrence, startTime)}`);
          lines.push(`DTEND:${formatICSDate(firstOccurrence, endTime)}`);
          lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${formatICSDate(endDate, endTime)}`);
          lines.push(`SUMMARY:${blockout.name || 'Blockout'}`);
          lines.push('END:VEVENT');
        }
      });
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  const downloadICS = (content) => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hku-timetable.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-modal-overlay">
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal-header">
          <h2>Export to Calendar</h2>
        </div>

        <div className="export-modal-body">
          {/* Semester Selection */}
          <div className="export-section">
            <h3>Select Semesters</h3>
            <div className="semester-checkboxes semester-grid">
              {availableSemesters.map(semester => {
                const hasCourses = semesterCounts[semester] > 0;
                return (
                  <label key={semester} className={`checkbox-label ${!hasCourses ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedSemesters[semester] || false}
                      onChange={() => handleSemesterToggle(semester)}
                      disabled={!hasCourses}
                    />
                    <span>{semester} {!hasCourses ? '(empty)' : ''}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="export-section">
            <h3>Export Options</h3>
            <div className="options-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeBlockouts}
                  onChange={(e) => setIncludeBlockouts(e.target.checked)}
                />
                <span>Include blockout times</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeLocation}
                  onChange={(e) => setIncludeLocation(e.target.checked)}
                />
                <span>Include locations</span>
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={roundToHalfHour}
                onChange={(e) => setRoundToHalfHour(e.target.checked)}
              />
              <span>Round times to nearest 30 minutes</span>
            </label>
          </div>

          {/* Event Name Customization */}
          <div className="export-section">
            <h3>Event Title Template</h3>
            <input
              ref={nameInputRef}
              type="text"
              className="template-input"
              value={eventName}
              onChange={handleNameChange}
              onSelect={(e) => setNameCaretPos(e.target.selectionStart)}
              placeholder="Enter event title template"
            />
            <div className="placeholder-buttons">
              {FIELD_PLACEHOLDERS.map(field => (
                <button
                  key={field.key}
                  className="placeholder-btn"
                  onClick={() => insertPlaceholder(field.key, 'name')}
                  title={field.description}
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event Description Customization */}
          <div className="export-section">
            <h3>Event Description Template</h3>
            <textarea
              ref={descTextareaRef}
              className="template-textarea"
              value={eventDescription}
              onChange={handleDescChange}
              onSelect={(e) => setDescCaretPos(e.target.selectionStart)}
              placeholder="Enter event description template"
              rows={4}
            />
            <div className="placeholder-buttons">
              {FIELD_PLACEHOLDERS.map(field => (
                <button
                  key={field.key}
                  className="placeholder-btn"
                  onClick={() => insertPlaceholder(field.key, 'desc')}
                  title={field.description}
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="export-section preview-section">
            <h3>Preview</h3>
            <div className="preview-box">
              <div className="preview-label">Title:</div>
              <div className="preview-text">{previewTitle || '(empty)'}</div>
              <div className="preview-label">Description:</div>
              <div className="preview-text preview-multiline">{previewDescription || '(empty)'}</div>
            </div>
          </div>
        </div>

        <div className="export-modal-footer">
          <button className="export-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="export-btn-export" 
            onClick={handleExport}
            disabled={!hasSelectedSemester}
          >
            Export Calendar
          </button>
        </div>
      </div>
    </div>
  );
}

export default CalendarExportModal;
