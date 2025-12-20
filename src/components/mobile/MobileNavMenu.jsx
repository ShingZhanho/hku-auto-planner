import ThemeToggle from '../ThemeToggle';
import './MobileNavMenu.css';

function MobileNavMenu({ isOpen, onClose, view, onViewChange, hasData, hasSolutions }) {
  return (
    <>
      {isOpen && <div className="mobile-menu-overlay" onClick={onClose} />}
      
      <div className={`mobile-nav-menu ${isOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <h2>Menu</h2>
          <button 
            className="mobile-menu-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        
        <nav className="mobile-menu-nav">
          <button 
            className={`mobile-menu-item ${view === 'upload' ? 'active' : ''}`}
            onClick={() => onViewChange('upload')}
          >
            <span className="menu-icon">📁</span>
            <span>Load Data</span>
          </button>
          
          <button 
            className={`mobile-menu-item ${view === 'select' ? 'active' : ''} ${!hasData ? 'disabled' : ''}`}
            onClick={() => hasData && onViewChange('select')}
            disabled={!hasData}
          >
            <span className="menu-icon">📚</span>
            <span>Select Courses</span>
          </button>
          
          <button 
            className={`mobile-menu-item ${view === 'solutions' ? 'active' : ''} ${!hasSolutions ? 'disabled' : ''}`}
            onClick={() => hasSolutions && onViewChange('solutions')}
            disabled={!hasSolutions}
          >
            <span className="menu-icon">📋</span>
            <span>View Plans</span>
          </button>
          
          <button 
            className={`mobile-menu-item ${view === 'calendar' ? 'active' : ''} ${!hasSolutions ? 'disabled' : ''}`}
            onClick={() => hasSolutions && onViewChange('calendar')}
            disabled={!hasSolutions}
          >
            <span className="menu-icon">📅</span>
            <span>Calendar</span>
          </button>
        </nav>
        
        <div className="mobile-menu-footer">
          <div className="menu-footer-links">
            <a 
              href="https://github.com/ShingZhanho/hku-auto-planner#readme" 
              target="_blank" 
              rel="noopener noreferrer"
              className="menu-footer-link"
            >
              How to Use
            </a>
            <a 
              href="https://github.com/ShingZhanho/hku-auto-planner" 
              target="_blank" 
              rel="noopener noreferrer"
              className="menu-footer-link"
            >
              GitHub
            </a>
          </div>
          <div className="menu-footer-theme">
            <ThemeToggle />
          </div>
          <p className="menu-footer-text">HKU Course Planner</p>
          <p className="menu-footer-version">Version 1.0 BETA</p>
        </div>
      </div>
    </>
  );
}

export default MobileNavMenu;
