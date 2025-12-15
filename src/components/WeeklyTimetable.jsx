import { useState, useMemo } from 'react';
import { getScheduleDateRange, getWeekNumbers, isSessionInWeek, timeToMinutes, formatTime } from '../utils/courseParser';
import './WeeklyTimetable.css';

function WeeklyTimetable({ schedule }) {
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  console.log('WeeklyTimetable received schedule:', schedule);

  const { weeks, dateRange } = useMemo(() => {
    const range = getScheduleDateRange(schedule);
    const weekList = getWeekNumbers(range.minDate, range.maxDate);
    return { weeks: weekList, dateRange: range };
  }, [schedule]);

  const currentWeek = weeks[currentWeekIndex];

  // Get sessions for current week
  const weekSessions = useMemo(() => {
    if (!currentWeek) return [];
    
    const sessions = [];
    schedule.forEach(course => {
      course.sessions.forEach(session => {
        if (isSessionInWeek(session, currentWeek.startDate, currentWeek.endDate)) {
          sessions.push({
            ...session,
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            section: course.section
          });
        }
      });
    });
    console.log('Week sessions for week', currentWeek?.weekNumber, ':', sessions);
    return sessions;
  }, [schedule, currentWeek]);

  // Build timetable grid
  const timetableData = useMemo(() => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Find time range
    let minTime = 24 * 60;
    let maxTime = 0;
    
    weekSessions.forEach(session => {
      const start = timeToMinutes(session.startTime);
      const end = timeToMinutes(session.endTime);
      if (start !== null && start < minTime) minTime = start;
      if (end !== null && end > maxTime) maxTime = end;
    });
    
    // Round to nearest hour
    minTime = Math.floor(minTime / 60) * 60;
    maxTime = Math.ceil(maxTime / 60) * 60;
    
    // If no sessions, use default range
    if (minTime === 24 * 60) minTime = 8 * 60;
    if (maxTime === 0) maxTime = 18 * 60;
    
    const hours = [];
    for (let h = minTime; h <= maxTime; h += 60) {
      hours.push(h);
    }
    
    // Group sessions by day
    const byDay = {};
    days.forEach(day => {
      byDay[day] = weekSessions.filter(s => s.days && s.days[day] && s.days[day].trim() !== '');
    });
    
    console.log('Sessions grouped by day:', byDay);
    console.log('Time range:', { minTime, maxTime, hours });
    
    return { days, dayLabels, hours, byDay, minTime, maxTime };
  }, [weekSessions]);

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    return `${hours}:00`;
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
        <h2>Weekly Timetable</h2>
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
      </div>

      <div className="timetable-content">
        <div className="timetable-grid">
          <div className="time-column">
            <div className="time-header"></div>
            {timetableData.hours.map(hour => (
              <div key={hour} className="time-slot">
                {formatTime(hour)}
              </div>
            ))}
          </div>

          {timetableData.days.map((day, dayIndex) => (
            <div key={day} className="day-column">
              <div className="day-header">{timetableData.dayLabels[dayIndex]}</div>
              <div className="day-slots">
                {timetableData.byDay[day].map((session, idx) => {
                  const start = timeToMinutes(session.startTime);
                  const end = timeToMinutes(session.endTime);
                  const top = ((start - timetableData.minTime) / 60) * 60; // 60px per hour
                  const height = ((end - start) / 60) * 60;

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
                      <div className="session-section">{session.section}</div>
                      <div className="session-time">
                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                      </div>
                      <div className="session-venue">{session.venue}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WeeklyTimetable;
