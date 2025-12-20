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
import { processCoursesData, generateSchedules } from './utils/courseParser'
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
  const [blockouts, setBlockouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataHash, setDataHash] = useState(null);
  
  // Menu states
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [isCartMenuOpen, setIsCartMenuOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
  };

  const handleCourseRemove = (courseCode) => {
    setSelectedCourses(prev => prev.filter(c => c.courseCode !== courseCode));
  };

  const handleAddBlockout = (blockout) => {
    setBlockouts(prev => [...prev, blockout]);
  };

  const handleRemoveBlockout = (index) => {
    setBlockouts(prev => prev.filter((_, i) => i !== index));
  };

  const handleCourseEdit = (courseCode) => {
    setSearchTerm(courseCode);
    setIsCartMenuOpen(false);
  };

  const handleGeneratePlans = () => {
    if (selectedCourses.length === 0) {
      setErrorMessage('Please select at least one course');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    
    setTimeout(() => {
      try {
        const schedules = generateSchedules(
          selectedCourses, 
          processedData.grouped, 
          processedData.availableTerms, 
          blockouts
        );
        
        if (schedules.plans.length === 0) {
          setErrorMessage('No valid schedules found. Try removing some constraints or courses.');
          setSolutions(null);
        } else {
          setSolutions(schedules);
          setSelectedPlanIndex(0);
          setView('solutions');
        }
      } catch (error) {
        setErrorMessage(error.message || 'An error occurred while generating schedules');
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
        
        {view === 'select' && selectedCourses.length > 0 && (
          <button 
            className="mobile-action-btn"
            onClick={handleGeneratePlans}
          >
            Generate Plans ({selectedCourses.length} courses)
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
    </div>
  );
}

export default MobileApp;
