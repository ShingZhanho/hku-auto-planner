import './DataUpdateNotice.css';

function DataUpdateNotice({ removedCourses, variant = 'desktop', onClose }) {
  if (!removedCourses?.length) return null;

  return (
    <div className={`data-update-backdrop data-update-backdrop-${variant}`}>
      <section
        className={`data-update-dialog data-update-dialog-${variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="data-update-title"
      >
        <span className="data-update-icon" aria-hidden="true">↻</span>
        <div>
          <span className="data-update-eyebrow">Timetable updated</span>
          <h2 id="data-update-title">Some saved courses were removed</h2>
          <p>
            Their timetable information changed, so their saved subclass choices may no longer be valid.
            Unchanged courses and blockout times are still in your cart.
          </p>
          <ul className="data-update-course-list">
            {removedCourses.map((course) => (
              <li key={course.courseCode}>
                <strong>{course.courseCode}</strong>
                {course.courseTitle && <span>{course.courseTitle}</span>}
                <small>{course.reason}</small>
              </li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={onClose} autoFocus>Review selections</button>
      </section>
    </div>
  );
}

export default DataUpdateNotice;
