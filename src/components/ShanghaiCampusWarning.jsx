import './ShanghaiCampusWarning.css';
import { formatSubclass } from '../utils/campusUtils';

function ShanghaiCampusWarning({ warning, variant = 'desktop', onClose }) {
  if (!warning) return null;

  return (
    <div className={`shanghai-warning-backdrop shanghai-warning-backdrop-${variant}`}>
      <section
        className={`shanghai-warning-dialog shanghai-warning-dialog-${variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="shanghai-warning-title"
      >
        <span className="shanghai-warning-icon" aria-hidden="true">⚠️</span>
        <div className="shanghai-warning-copy">
          <span className="shanghai-warning-eyebrow">Campus notice</span>
          <h2 id="shanghai-warning-title">Shanghai campus subclass</h2>
          <p>
            {warning.courseCode} {warning.sections.map(section => formatSubclass(warning.courseCode, section)).join(', ')}
            {' '}{warning.sections.length === 1 ? 'takes' : 'take'} place
            {' '}at the Shanghai campus, not the Hong Kong campus.
          </p>
          <p className="shanghai-warning-note">
            Please only keep {warning.sections.length === 1 ? 'this subclass' : 'these subclasses'} selected if you intend
            {' '}to study in Shanghai. The ⚠️ marker will remain visible wherever the subclass appears.
          </p>
        </div>
        <button className="shanghai-warning-confirm" type="button" onClick={onClose} autoFocus>
          I understand
        </button>
      </section>
    </div>
  );
}

export default ShanghaiCampusWarning;
