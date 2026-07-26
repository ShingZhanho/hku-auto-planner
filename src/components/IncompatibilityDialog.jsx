import { useEffect } from 'react';
import './IncompatibilityDialog.css';

const DAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday'
};

const TYPE_ICONS = {
  invalid: '!',
  time: '↔',
  blockout: '▣',
  capacity: '#',
  combined: '◆'
};

const semesterLabel = (applyTo) => {
  if (applyTo === 'sem1') return 'Semester 1';
  if (applyTo === 'sem2') return 'Semester 2';
  return 'Both semesters';
};

function IncompatibilityDialog({
  report,
  variant = 'desktop',
  onClose,
  onEditCourse,
  onEditBlockout,
  onOpenOverload
}) {
  useEffect(() => {
    if (!report) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [report, onClose]);

  if (!report?.issues?.length) return null;

  const handleAction = (action) => {
    if (action.type === 'edit_sections') onEditCourse?.(action.courseCode);
    if (action.type === 'edit_blockout') onEditBlockout?.(action.blockoutKey);
    if (action.type === 'open_overload') onOpenOverload?.();
  };

  return (
    <div
      className={`incompatibility-backdrop incompatibility-backdrop-${variant}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`incompatibility-dialog incompatibility-dialog-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="incompatibility-title"
      >
        <header className="incompatibility-header">
          <div>
            <span className="incompatibility-eyebrow">No valid plan</span>
            <h2 id="incompatibility-title">Some selections do not fit together</h2>
            <p>
              {report.issues.length} incompatibility {report.issues.length === 1 ? 'group was' : 'groups were'} found
              {' '}with your current subclasses and settings.
            </p>
          </div>
          <button className="incompatibility-close" onClick={onClose} aria-label="Close incompatibility report">
            ×
          </button>
        </header>

        <div className="incompatibility-content">
          {report.issues.map((issue, index) => (
            <article className={`incompatibility-card issue-${issue.type}`} key={issue.id}>
              <div className="incompatibility-card-heading">
                <span className="incompatibility-icon" aria-hidden="true">{TYPE_ICONS[issue.type]}</span>
                <div>
                  <span className="incompatibility-number">Issue {index + 1}</span>
                  <h3>{issue.title}</h3>
                </div>
              </div>

              <p className="incompatibility-summary">{issue.summary}</p>

              <div className="incompatibility-items">
                {issue.courses.map((course) => (
                  <div className="incompatibility-item" key={course.courseCode}>
                    <strong>{course.courseCode}</strong>
                    <span>{course.courseTitle}</span>
                    <small>
                      Selected: {course.selectedSections.length > 0
                        ? course.selectedSections.join(', ')
                        : 'No valid subclasses'}
                    </small>
                  </div>
                ))}
                {issue.blockouts.map((blockout) => (
                  <div className="incompatibility-item incompatibility-blockout" key={String(blockout.key)}>
                    <strong>{blockout.name}</strong>
                    <span>
                      {DAY_LABELS[blockout.day] || blockout.day} · {blockout.startTime}–{blockout.endTime}
                    </span>
                    <small>{semesterLabel(blockout.applyTo)}</small>
                  </div>
                ))}
              </div>

              {issue.details.length > 0 && (
                <details className="incompatibility-evidence" open={variant === 'desktop' && report.issues.length === 1}>
                  <summary>Why this happens</summary>
                  <ul>
                    {issue.details.map((detail, detailIndex) => (
                      <li key={`${issue.id}-detail-${detailIndex}`}>{detail}</li>
                    ))}
                    {issue.hiddenEvidence > 0 && (
                      <li>And {issue.hiddenEvidence} more overlapping option(s).</li>
                    )}
                  </ul>
                </details>
              )}

              <div className="incompatibility-fixes">
                <h4>Possible fixes</h4>
                <ul>
                  {issue.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
                </ul>
              </div>

              {issue.actions.length > 0 && (
                <div className="incompatibility-actions">
                  {issue.actions.map((action) => (
                    <button
                      key={`${issue.id}-${action.type}-${action.courseCode || action.blockoutKey || ''}`}
                      onClick={() => handleAction(action)}
                    >
                      {variant === 'mobile' && action.type === 'edit_blockout'
                        ? 'Review blockouts'
                        : action.label}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}

          {report.truncated && (
            <p className="incompatibility-truncated">
              Showing the most direct conflicts. More may remain after these are resolved.
            </p>
          )}
        </div>

        <footer className="incompatibility-footer">
          <button onClick={onClose}>Back to selections</button>
        </footer>
      </section>
    </div>
  );
}

export default IncompatibilityDialog;
