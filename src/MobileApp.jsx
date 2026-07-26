import { useState, useEffect, useMemo } from 'react'
import './MobileApp.css'
import FileUploader from './components/FileUploader'
import LoadingSpinner from './components/LoadingSpinner'
import MobileCourseSelector from './components/mobile/MobileCourseSelector'
import MobileSolutionsList from './components/mobile/MobileSolutionsList'
import MobileCalendar from './components/mobile/MobileCalendar'
import MobileNavMenu from './components/mobile/MobileNavMenu'
import MobileCartMenu from './components/mobile/MobileCartMenu'
import CalendarExportModal from './components/CalendarExportModal'
import IncompatibilityDialog from './components/IncompatibilityDialog'
import OverloadModal from './components/OverloadModal'
import { processCoursesData, generateSchedules } from './utils/courseParser'
import { analyzeIncompatibilities } from './utils/conflictAnalyzer'
import { hashCourseData, saveShoppingCart, loadShoppingCart } from './utils/storageUtils'

function MobileApp() {
  const [view, setView] = useState('upload'); // upload, select, solutions, calendar
  const [courseData, setCourseData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [solutions, setSolutions] = useState(null);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [conflictReport, setConflictReport] = useState(null);
  const [blockouts, setBlockouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataHash, setDataHash] = useState(null);
  
  // Initialize overload settings from localStorage synchronously
  const [overloadEnabled, setOverloadEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('hku_planner_overload');
      console.log('[MobileApp] Initializing overload from localStorage:', stored);
      return stored === 'true';
    } catch (e) {
      return false;
    }
  });
  
  const [maxPerSemester, setMaxPerSemester] = useState(() => {
    try {
      const stored = localStorage.getItem('hku_planner_max_per_semester');
      console.log('[MobileApp] Initializing maxPerSemester from localStorage:', stored);
      if (stored !== null) {
        const v = parseInt(stored, 10);
        if (!isNaN(v) && v >= 6 && v < 12) {
          return v;
        }
      }
      return 6;
    } catch (e) {
      return 6;
    }
  });
  
  // Menu states
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [isCartMenuOpen, setIsCartMenuOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isConflictOverloadModalOpen, setIsConflictOverloadModalOpen] = useState(false);

  // Auto-dismiss error messages after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const selectedPlanSchedule = useMemo(() => {
    return selectedPlanIndex !== null && solutions ? solutions.plans[selectedPlanIndex].courses : [];
  }, [selectedPlanIndex, solutions]);

  useEffect(() => {
    if (dataHash && processedData) {
      saveShoppingCart(dataHash, selectedCourses, blockouts);
    }
  }, [selectedCourses, blockouts, dataHash, processedData]);

  // Persist overload preference to localStorage
  useEffect(() => {
    try {
      console.log('[MobileApp] Saving overload to localStorage:', overloadEnabled);
      localStorage.setItem('hku_planner_overload', overloadEnabled ? 'true' : 'false');
    } catch (e) {
      // ignore
    }
  }, [overloadEnabled]);

  // Persist max per semester to localStorage
  useEffect(() => {
    try {
      console.log('[MobileApp] Saving maxPerSemester to localStorage:', maxPerSemester);
      localStorage.setItem('hku_planner_max_per_semester', String(maxPerSemester));
    } catch (e) {}
  }, [maxPerSemester]);

  // Ensure when overload is enabled the maxPerSemester is in valid range
  useEffect(() => {
    if (overloadEnabled) {
      if (!(maxPerSemester > 6 && maxPerSemester < 12)) {
        setMaxPerSemester(7);
      }
    }
  }, [overloadEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('hku_planner_max_per_semester', String(maxPerSemester));
    } catch (e) {}
  }, [maxPerSemester]);

  const handleDataLoaded = (data) => {
    setCourseData(data);
    const hash = hashCourseData(data.json);
    setDataHash(hash);
    
    const processed = processCoursesData(data.json);
    setProcessedData(processed);
    
    const savedCart = loadShoppingCart(hash);
    if (savedCart) {
      setSelectedCourses(savedCart.selectedCourses);
      setBlockouts(savedCart.blockouts);
    }
    
    setView('select');
  };

  const handleCourseSelect = (course, selectedSections) => {
    setSelectedCourses(prev => {
      const filtered = prev.filter(c => c.courseCode !== course.courseCode);
      // Only add the course if it has selected sections
      if (selectedSections && selectedSections.length > 0) {
        return [...filtered, { ...course, selectedSections }];
      }
      return filtered;
    });
    setConflictReport(null);
    setErrorMessage('');
  };

  const handleCourseRemove = (courseCode) => {
    setSelectedCourses(prev => prev.filter(c => c.courseCode !== courseCode));
    setConflictReport(null);
    setErrorMessage('');
  };

  const handleAddBlockout = (blockout) => {
    setBlockouts(prev => [...prev, blockout]);
    setConflictReport(null);
    setErrorMessage('');
  };

  const handleRemoveBlockout = (blockoutKey) => {
    setBlockouts(prev => prev.filter((blockout, index) => (
      typeof blockoutKey === 'number'
        ? index !== blockoutKey
        : blockout.id !== blockoutKey
    )));
    setConflictReport(null);
    setErrorMessage('');
  };

  const handleCourseEdit = (courseCode) => {
    setSearchTerm(courseCode);
    setIsCartMenuOpen(false);
  };

  const showIncompatibilityReport = () => {
    const report = analyzeIncompatibilities({
      selectedCourses,
      groupedData: processedData.grouped,
      availableTerms: processedData.availableTerms,
      blockouts,
      maxPerSemester: overloadEnabled ? maxPerSemester : 6
    });

    if (report.issues.length === 0) return false;
    setConflictReport(report);
    setErrorMessage('');
    return true;
  };

  const handleGeneratePlans = () => {
    if (selectedCourses.length === 0) {
      setErrorMessage('Please select at least one course.');
      return;
    }

    // Validate overload settings
    if (overloadEnabled && !(maxPerSemester > 6 && maxPerSemester < 12)) {
      setErrorMessage('When overload is enabled, "Max per semester" must be an integer between 7 and 11.');
      return;
    }

    // Check per-semester feasibility
    const numTerms = processedData?.availableTerms?.length || 2;
    const perSemesterLimit = overloadEnabled ? maxPerSemester : 6;
    const allowedTotalByPerSem = perSemesterLimit * numTerms;
    if (selectedCourses.length > allowedTotalByPerSem) {
      if (!showIncompatibilityReport()) {
        setErrorMessage(
          `Your selection exceeds the configured limit of ${perSemesterLimit} course(s) per semester ` +
          `(${allowedTotalByPerSem} across ${numTerms} semesters).`
        );
      }
      return;
    }

    // Check if all courses have at least one section selected
    const coursesWithoutSections = selectedCourses.filter(c => !c.selectedSections || c.selectedSections.length === 0);
    if (coursesWithoutSections.length > 0) {
      setErrorMessage(`Please select at least one subclass for: ${coursesWithoutSections.map(c => c.courseCode).join(', ')}.`);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setConflictReport(null);
    
    setTimeout(() => {
      try {
        const schedules = generateSchedules(
          selectedCourses, 
          processedData.grouped, 
          processedData.availableTerms, 
          blockouts,
          overloadEnabled ? maxPerSemester : 6
        );
        
        if (schedules.plans.length === 0) {
          if (!showIncompatibilityReport()) {
            setErrorMessage('No possible schedule was found, but no specific incompatibility could be isolated.');
          }
          setSolutions(null);
        } else {
          setSolutions(schedules);
          setSelectedPlanIndex(0);
          setView('solutions');
        }
      } catch (error) {
        console.error('Error generating schedules:', error);
        if (!showIncompatibilityReport()) {
          setErrorMessage(error.message || 'An unexpected error occurred while generating schedules. Please try adjusting your course selection or settings.');
        }
        setSolutions(null);
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  const handlePlanSelect = (index) => {
    setSelectedPlanIndex(index);
    setView('calendar');
  };

  const handleBackToSelect = () => {
    setView('select');
    setSolutions(null);
    setSelectedPlanIndex(null);
  };

  const handleBackToSolutions = () => {
    setView('solutions');
  };

  return (
    <div className="mobile-app">
      {/* Top Bar */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <button 
            className="mobile-menu-btn"
            onClick={() => setIsNavMenuOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          
          <h1 className="mobile-title">
            HKU Course Planner <span className="beta-badge">BETA</span>
          </h1>
          
          {view === 'select' && (
            <button 
              className="mobile-cart-btn"
              onClick={() => setIsCartMenuOpen(true)}
              aria-label="Shopping cart"
            >
              🛒
              {selectedCourses.length > 0 && (
                <span className="cart-badge cart-badge-courses">{selectedCourses.length}</span>
              )}
              {blockouts.length > 0 && (
                <span className="cart-badge cart-badge-blockouts">{blockouts.length}</span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Navigation Menu (Left) */}
      <MobileNavMenu 
        isOpen={isNavMenuOpen}
        onClose={() => setIsNavMenuOpen(false)}
        view={view}
        onViewChange={(newView) => {
          setView(newView);
          setIsNavMenuOpen(false);
        }}
        hasData={!!processedData}
        hasSolutions={!!solutions}
      />

      {/* Cart Menu (Right) */}
      <MobileCartMenu 
        isOpen={isCartMenuOpen}
        onClose={() => setIsCartMenuOpen(false)}
        selectedCourses={selectedCourses}
        blockouts={blockouts}
        onCourseRemove={handleCourseRemove}
        onCourseEdit={handleCourseEdit}
        onAddBlockout={handleAddBlockout}
        onRemoveBlockout={handleRemoveBlockout}
      />

      {/* Main Content */}
      <main className="mobile-content">
        {isLoading && <LoadingSpinner />}
        
        {!isLoading && view === 'upload' && (
          <div className="mobile-upload-view">
            <FileUploader onDataLoaded={handleDataLoaded} />
          </div>
        )}

        {!isLoading && view === 'select' && processedData && (
            <MobileCourseSelector 
            coursesData={processedData}
            selectedCourses={selectedCourses}
              overloadEnabled={overloadEnabled}
              maxPerSemester={maxPerSemester}
              setMaxPerSemester={setMaxPerSemester}
              setOverloadEnabled={setOverloadEnabled}
                onCourseSelect={handleCourseSelect}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        )}

        {!isLoading && view === 'solutions' && solutions && (
          <MobileSolutionsList 
            plans={solutions.plans}
            selectedIndex={selectedPlanIndex}
            onPlanSelect={handlePlanSelect}
          />
        )}

        {!isLoading && view === 'calendar' && solutions && selectedPlanIndex !== null && (
          <MobileCalendar 
            schedule={selectedPlanSchedule}
            blockouts={blockouts}
            onExport={() => setIsExportModalOpen(true)}
          />
        )}

        {errorMessage && (
          <div className="mobile-error-message">
            {errorMessage}
          </div>
        )}
      </main>

      {/* Bottom Bar */}
      <footer className="mobile-footer">
        {view === 'upload' && (
          <button 
            className="mobile-action-btn"
            onClick={() => window.open('https://github.com/ShingZhanho/hku-auto-planner#readme', '_blank')}
          >
            How to Use
          </button>
        )}
        
        {view === 'select' && (
          <button 
            className="mobile-action-btn"
            onClick={handleGeneratePlans}
            disabled={selectedCourses.length === 0}
          >
            {selectedCourses.length === 0
              ? 'Select a Course to Begin'
              : `Generate Plans (${selectedCourses.length} courses)`}
          </button>
        )}
        
        {view === 'solutions' && (
          <button 
            className="mobile-action-btn"
            onClick={handleBackToSelect}
          >
            Back to Course Selection
          </button>
        )}
        
        {view === 'calendar' && (
          <button 
            className="mobile-action-btn"
            onClick={handleBackToSolutions}
          >
            Back to Plans
          </button>
        )}  
      </footer>

      <CalendarExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        schedule={selectedPlanIndex !== null && solutions ? solutions.plans[selectedPlanIndex].courses : []}
        availableSemesters={solutions?.availableTerms || []}
        blockouts={blockouts}
      />

      <OverloadModal
        isOpen={isConflictOverloadModalOpen}
        onClose={() => setIsConflictOverloadModalOpen(false)}
        overloadEnabled={overloadEnabled}
        setOverloadEnabled={setOverloadEnabled}
        maxPerSemester={maxPerSemester}
        setMaxPerSemester={setMaxPerSemester}
        selectedCourses={selectedCourses}
      />

      <IncompatibilityDialog
        report={conflictReport}
        variant="mobile"
        onClose={() => setConflictReport(null)}
        onEditCourse={(courseCode) => {
          setConflictReport(null);
          setView('select');
          setSearchTerm(courseCode);
        }}
        onEditBlockout={() => {
          setConflictReport(null);
          setIsCartMenuOpen(true);
        }}
        onOpenOverload={() => {
          setConflictReport(null);
          setIsConflictOverloadModalOpen(true);
        }}
      />
    </div>
  );
}

export default MobileApp;
