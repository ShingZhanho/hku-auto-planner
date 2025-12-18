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

  // Filter schedule by selected semester and only include courses with valid sessions
  const semesterSchedule = useMemo(() => {
    return schedule.filter(course => {
      if (course.term !== selectedSemester) return false;
      if (!course.sessions || course.sessions.length === 0) return false;
      
      // Check if at least one session has valid times
      const hasValidSession = course.sessions.some(session => {
        const hasValidTimes = session.startTime && session.endTime && 
                             (typeof session.startTime !== 'string' || session.startTime.trim() !== '') && 
                             (typeof session.endTime !== 'string' || session.endTime.trim() !== '');
        return hasValidTimes;
      });
      
      return hasValidSession;
    });
  }, [schedule, selectedSemester]);

  const { weeks, dateRange } = useMemo(() => {
    const range = getScheduleDateRange(semesterSchedule);
    const weekList = getWeekNumbers(range.minDate, range.maxDate);
    return { weeks: weekList, dateRange: range };
  }, [semesterSchedule]);

  const currentWeek = weeks[currentWeekIndex];

  // Auto-select first week with classes when semester changes
  useEffect(() => {
    if (!semesterSchedule || semesterSchedule.length === 0 || !weeks || weeks.length === 0) {
      return;
    }

    // Find first week that has any sessions
    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];
      let hasClasses = false;
      
      for (const course of semesterSchedule) {
        if (!course.sessions) continue;
        
        for (const session of course.sessions) {
          // Check if session has valid times
          const hasValidTimes = session.startTime && session.endTime && 
                               (typeof session.startTime !== 'string' || session.startTime.trim() !== '') && 
                               (typeof session.endTime !== 'string' || session.endTime.trim() !== '');
          
          if (hasValidTimes && isSessionInWeek(session, week.startDate, week.endDate)) {
            hasClasses = true;
            break;
          }
        }
        
        if (hasClasses) break;
      }
      
      if (hasClasses) {
        setCurrentWeekIndex(i);
        if (import.meta.env.DEV) {
          console.log('Auto-selected week with classes:', i + 1);
        }
        return;
      }
    }
  }, [semesterSchedule, weeks, selectedSemester]);

  // Get sessions for current week
  const weekSessions = useMemo(() => {
    if (!currentWeek) return [];
    
    const sessions = [];
    
    semesterSchedule.forEach(course => {
      if (!course.sessions) return;
      
      course.sessions.forEach(session => {
        // Skip sessions without valid dates or times (check for empty strings too)
        const hasValidDates = session.startDate && session.endDate && 
                             (typeof session.startDate !== 'string' || session.startDate.trim() !== '') && 
                             (typeof session.endDate !== 'string' || session.endDate.trim() !== '');
        const hasValidTimes = session.startTime && session.endTime && 
                             (typeof session.startTime !== 'string' || session.startTime.trim() !== '') && 
                             (typeof session.endTime !== 'string' || session.endTime.trim() !== '');
        
        if (!hasValidDates || !hasValidTimes) {
          return;
        }
        
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
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    // Check all sessions for earliest and latest times
    weekSessions.forEach(session => {
      if (session.startTime && session.endTime) {
        const start = timeToMinutes(session.startTime);
        const end = timeToMinutes(session.endTime);
        if (start < minTime) minTime = start;
        if (end > maxTime) maxTime = end;
      }
    });
    
    // Check blockouts
    blockouts.forEach(blockout => {
      if (blockout.startTime && blockout.endTime) {
        const start = timeToMinutes(blockout.startTime);
        const end = timeToMinutes(blockout.endTime);
        if (start < minTime) minTime = start;
        if (end > maxTime) maxTime = end;
      }
    });
    
    // If no valid times found, use default range 08:00-19:00
    if (!isFinite(minTime) || !isFinite(maxTime)) {
      minTime = 8 * 60;
      maxTime = 19 * 60;
    } else {
      // Round to nearest hour and add 1 hour padding
      minTime = Math.floor(minTime / 60) * 60 - 60;
      maxTime = Math.ceil(maxTime / 60) * 60 + 60;
      
      // Ensure bounds are within 0 to 24 hours
      if (minTime < 0) minTime = 0;
      if (maxTime > 24 * 60) maxTime = 24 * 60;
    }
    
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
