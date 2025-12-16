import { useState, useMemo, useEffect, memo } from 'react';
import { getScheduleDateRange, getWeekNumbers, isSessionInWeek, timeToMinutes, formatTime } from '../utils/courseParser';
import './WeeklyTimetable.css';

function WeeklyTimetable({ schedule, availableSemesters = [], blockouts = [], onExportClick }) {
  // Count courses per semester
  const semesterCounts = useMemo(() => {
    const counts = {};
    availableSemesters.forEach(sem => {
      counts[sem] = schedule.filter(course => course.term === sem).length;
    });
    return counts;
  }, [schedule, availableSemesters]);
  
  // Find first semester with courses
  const firstAvailableSemester = useMemo(() => {
    return availableSemesters.find(sem => semesterCounts[sem] > 0) || availableSemesters[0] || 'Semester 1';
  }, [availableSemesters, semesterCounts]);
  
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [selectedSemester, setSelectedSemester] = useState(firstAvailableSemester);
  
  // Auto-switch to available semester if current selection has no courses
  useEffect(() => {
    if (semesterCounts[selectedSemester] === 0) {
      const availableSem = availableSemesters.find(sem => semesterCounts[sem] > 0);
      if (availableSem) {
        setSelectedSemester(availableSem);
        setCurrentWeekIndex(0);
      }
    }
  }, [schedule, selectedSemester, availableSemesters, semesterCounts]);

  // Filter schedule by selected semester
  const semesterSchedule = useMemo(() => {
    return schedule.filter(course => course.term === selectedSemester);
  }, [schedule, selectedSemester]);

  const { weeks, dateRange } = useMemo(() => {
    const range = getScheduleDateRange(semesterSchedule);
    const weekList = getWeekNumbers(range.minDate, range.maxDate);
    return { weeks: weekList, dateRange: range };
  }, [semesterSchedule]);

  const currentWeek = weeks[currentWeekIndex];

  // Get sessions for current week
  const weekSessions = useMemo(() => {
    if (!currentWeek) return [];
    
    const sessions = [];
    semesterSchedule.forEach(course => {
      course.sessions.forEach(session => {
        if (isSessionInWeek(session, currentWeek.startDate, currentWeek.endDate)) {
          sessions.push({
            ...session,
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            section: course.section,
            term: course.term
          });
        }
      });
    });
    return sessions;
  }, [semesterSchedule, currentWeek]);

  // Build timetable grid
  const timetableData = useMemo(() => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Calculate dynamic time range based on actual sessions and blockouts
    let minTime = 8 * 60; // Default to 08:00
    let maxTime = 19 * 60; // Default to 19:00
    
    // Check all sessions for earliest and latest times
    weekSessions.forEach(session => {
      const start = timeToMinutes(session.startTime);
      const end = timeToMinutes(session.endTime);
      if (start < minTime) minTime = start;
      if (end > maxTime) maxTime = end;
    });
    
    // Check blockouts
    blockouts.forEach(blockout => {
      const start = timeToMinutes(blockout.startTime);
      const end = timeToMinutes(blockout.endTime);
      if (start < minTime) minTime = start;
      if (end > maxTime) maxTime = end;
    });
    
    // Round to nearest hour and add padding
    minTime = Math.floor(minTime / 60) * 60;
    maxTime = Math.ceil(maxTime / 60) * 60;
    
    const hours = [];
    for (let h = minTime; h < maxTime; h += 60) {
      hours.push(h);
    }
    
    // Group sessions by day
    const byDay = {};
    days.forEach(day => {
      byDay[day] = weekSessions.filter(s => s.days && s.days[day] && s.days[day].trim() !== '');
    });

    if (import.meta.env.DEV) {
      console.log('Sessions grouped by day:', byDay);
      console.log('Time range:', { minTime, maxTime, hours });
    }    return { days, dayLabels, hours, byDay, minTime, maxTime };
  }, [weekSessions, blockouts]);

  const formatTimeLabel = (minutes) => {
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:00`;
  };

  const formatDateRange = (week) => {
    const start = week.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = week.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  const goToPreviousWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };

  const goToNextWeek = () => {
    if (currentWeekIndex < weeks.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };

  if (!currentWeek) {
    return (
      <div className="weekly-timetable">
        <div className="timetable-header">
          <h2>Weekly Timetable</h2>
          <p>No schedule data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weekly-timetable">
      <div className="timetable-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Weekly Timetable</h2>
          <div className="semester-selector">
            {availableSemesters.map((semester, index) => {
                const isDisabled = semesterCounts[semester] === 0;
                return (
                  <button
                    key={semester}
                    className={`semester-btn ${selectedSemester === semester ? 'active' : ''}`}
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedSemester(semester);
                        setCurrentWeekIndex(0);
                      }
                    }}
                    disabled={isDisabled}
                    style={{
                      padding: '0.5rem 1rem',
                      marginLeft: index > 0 ? '0.5rem' : '0'
                    }}
                  >
                    {semester.replace(/^\d{4}-\d{2}\s*/, '')}
                  </button>
                );
              })}
          </div>
        </div>
        
        <div className="week-navigation">
          <button 
            onClick={goToPreviousWeek} 
            disabled={currentWeekIndex === 0}
            className="nav-button"
          >
            ← Previous
          </button>
          <span className="week-info">
            Week {currentWeek.weekNumber} of {weeks.length}
            <br />
            <span className="date-range">{formatDateRange(currentWeek)}</span>
          </span>
          <button 
            onClick={goToNextWeek} 
            disabled={currentWeekIndex === weeks.length - 1}
            className="nav-button"
          >
            Next →
          </button>
        </div>
        
        <div className="day-headers-grid">
          <div className="day-header-spacer"></div>
          {timetableData.dayLabels.map((label, idx) => (
            <div key={idx} className="day-header">{label}</div>
          ))}
        </div>
      </div>

      <div className="timetable-grid">
          <div className="time-column">
            {timetableData.hours.map(hour => (
              <div key={hour} className="time-slot">
                {formatTimeLabel(hour)}
              </div>
            ))}
          </div>

          {timetableData.days.map((day, dayIndex) => {
            const totalHeight = timetableData.hours.length * 60; // 60px per hour slot
            
            // Filter blockouts for this day and selected semester
            const dayBlockouts = blockouts.filter(b => {
              if (b.day !== day) return false;
              // Check if blockout applies to selected semester
              if (b.applyTo === 'both') return true;
              const semNum = selectedSemester.toLowerCase().replace(/.*sem /, 'sem');
              return b.applyTo === semNum;
            });
            
            return (
              <div key={day} className="day-column">
                <div className="day-slots" style={{ height: `${totalHeight}px` }}>
                  {/* Render blockouts */}
                  {dayBlockouts.map((blockout, idx) => {
                    const start = timeToMinutes(blockout.startTime);
                    const end = timeToMinutes(blockout.endTime);
                    
                    const top = ((start - timetableData.minTime) / 60) * 60; // 60px per hour
                    const height = ((end - start) / 60) * 60;

                    return (
                      <div
                        key={`blockout-${idx}`}
                        className="session-block blockout-block"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          zIndex: 0
                        }}
                      >
                        <div className="session-code">{blockout.name}</div>
                        <div className="session-time">
                          {blockout.startTime} - {blockout.endTime}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Render course sessions */}
                  {timetableData.byDay[day].map((session, idx) => {
                    const start = timeToMinutes(session.startTime);
                    const end = timeToMinutes(session.endTime);
                    
                    // Round to nearest 30 minutes
                    const roundToNearest30 = (minutes) => Math.round(minutes / 30) * 30;
                    const roundedStart = roundToNearest30(start);
                    const roundedEnd = roundToNearest30(end);
                    
                    const top = ((roundedStart - timetableData.minTime) / 60) * 60; // 60px per hour
                    const height = ((roundedEnd - roundedStart) / 60) * 60;

                    return (
                      <div
                        key={idx}
                        className="session-block"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`
                        }}
                      >
                        <div className="session-code">{session.courseCode}</div>
                        <div className="session-section">{session.section} · {session.venue}</div>
                        <div className="session-time">
                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
}

// Custom comparison function - only re-render if schedule courses change
const arePropsEqual = (prevProps, nextProps) => {
  // Check if schedule length is different
  if (prevProps.schedule.length !== nextProps.schedule.length) {
    return false;
  }
  
  // Check if blockouts changed
  if (prevProps.blockouts.length !== nextProps.blockouts.length) {
    return false;
  }
  
  // Deep compare schedule course codes and sections
  for (let i = 0; i < prevProps.schedule.length; i++) {
    const prev = prevProps.schedule[i];
    const next = nextProps.schedule[i];
    if (prev.courseCode !== next.courseCode || prev.section !== next.section) {
      return false;
    }
  }
  
  return true;
};

export default memo(WeeklyTimetable, arePropsEqual);
