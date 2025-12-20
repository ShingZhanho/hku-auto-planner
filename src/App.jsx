import { useState, useEffect, useMemo } from 'react'
import './App.css'
import FileUploader from './components/FileUploader'
import CourseSelector from './components/CourseSelector'
import LoadingSpinner from './components/LoadingSpinner'
import SolutionsList from './components/SolutionsList'
import WeeklyTimetable from './components/WeeklyTimetable'
import BlockoutModal from './components/BlockoutModal'
import CalendarExportModal from './components/CalendarExportModal'
import ThemeToggle from './components/ThemeToggle'
import { processCoursesData, generateSchedules } from './utils/courseParser'
import { hashCourseData, saveShoppingCart, loadShoppingCart } from './utils/storageUtils'

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [courseData, setCourseData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [solutions, setSolutions] = useState(null);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [blockouts, setBlockouts] = useState([]);
  const [isBlockoutModalOpen, setIsBlockoutModalOpen] = useState(false);
  const [editingBlockout, setEditingBlockout] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataHash, setDataHash] = useState(null);

  // Memoize selected plan schedule to prevent unnecessary re-renders
  const selectedPlanSchedule = useMemo(() => {
    return selectedPlanIndex !== null && solutions ? solutions.plans[selectedPlanIndex].courses : [];
  }, [selectedPlanIndex, solutions]);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save shopping cart to cookies whenever it changes
  useEffect(() => {
    if (dataHash && processedData) {
      saveShoppingCart(dataHash, selectedCourses, blockouts);
    }
  }, [selectedCourses, blockouts, dataHash, processedData]);

  const handleDataLoaded = (data) => {
    setCourseData(data);
    
    if (import.meta.env.DEV) {
      console.log('Raw data loaded:', data.json.length, 'rows');
    }
    
    // Calculate hash of the data
    const hash = hashCourseData(data.json);
    setDataHash(hash);
    
    if (import.meta.env.DEV) {
      console.log('Data hash:', hash);
    }
    
    // Process the data
    const processed = processCoursesData(data.json);
    setProcessedData(processed);
    
    // Try to restore shopping cart from cookies
    const savedCart = loadShoppingCart(hash);
    if (savedCart) {
      setSelectedCourses(savedCart.selectedCourses);
      setBlockouts(savedCart.blockouts);
      
      if (import.meta.env.DEV) {
        console.log('Restored shopping cart:', {
          courses: savedCart.selectedCourses.length,
          blockouts: savedCart.blockouts.length
        });
      }
    }
    
    if (import.meta.env.DEV) {
      console.log('Course data loaded and processed');
      console.log('Total courses:', processed.totalCourses);
      console.log('Total sessions:', processed.totalSessions);
      console.log('Sample courses:', processed.courses.slice(0, 10));
      console.log('All course codes:', processed.courses.map(c => c.courseCode));
    }
  };

  const handleCourseSelect = (course, selectedSections) => {
    setSelectedCourses(prev => {
      // Remove if already exists
      const filtered = prev.filter(c => c.courseCode !== course.courseCode);
      // Add with new sections
      return [...filtered, { ...course, selectedSections }];
    });
    setErrorMessage(''); // Clear error when user makes changes
  };

  const handleCourseRemove = (courseCode) => {
    setSelectedCourses(prev => prev.filter(c => c.courseCode !== courseCode));
    setErrorMessage(''); // Clear error when user makes changes
  };

  const handleAddBlockout = (blockout, isEdit = false) => {
    if (isEdit) {
      // Update existing blockout
      setBlockouts(prev => prev.map(b => b.id === blockout.id ? blockout : b));
    } else {
      // Add new blockout
      setBlockouts(prev => [...prev, blockout]);
    }
    setErrorMessage('');
    setEditingBlockout(null); // Clear editing state
  };

  const handleEditBlockout = (blockout) => {
    setEditingBlockout(blockout);
    setIsBlockoutModalOpen(true);
  };

  const handleCloseBlockoutModal = () => {
    setIsBlockoutModalOpen(false);
    setEditingBlockout(null); // Clear editing state when closing
  };

  const handleRemoveBlockout = (blockoutId) => {
    setBlockouts(prev => prev.filter(b => b.id !== blockoutId));
    setErrorMessage('');
  };

  const handleClearAllCourses = () => {
    setSelectedCourses([]);
    setErrorMessage('');
  };

  const handleClearAllBlockouts = () => {
    setBlockouts([]);
    setErrorMessage('');
  };

  const handleClearAll = () => {
    setSelectedCourses([]);
    setBlockouts([]);
    setErrorMessage('');
  };

  const handleSolve = () => {
    const MAX_COURSES = 12;
    
    if (selectedCourses.length === 0) {
      setErrorMessage('Please select at least one course.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    if (selectedCourses.length > MAX_COURSES) {
      setErrorMessage(`Please select at most ${MAX_COURSES} courses.`);
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    // Check if all courses have at least one section selected
    const coursesWithoutSections = selectedCourses.filter(c => !c.selectedSections || c.selectedSections.length === 0);
    if (coursesWithoutSections.length > 0) {
      setErrorMessage('Please select at least one subclass for each course.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    // Use setTimeout to allow UI to update with loading spinner
    setTimeout(() => {
      try {
        console.log('Selected courses for solving:', selectedCourses);
        console.log('Grouped data sample:', Object.keys(processedData.grouped).slice(0, 3).map(key => ({
          course: key,
          sections: Object.keys(processedData.grouped[key].sections),
          firstSectionSessions: processedData.grouped[key].sections[Object.keys(processedData.grouped[key].sections)[0]]
        })));
        
        const result = generateSchedules(selectedCourses, processedData.grouped, processedData.availableTerms, blockouts);
        
        console.log(`Generated ${result.schedules.length} possible schedules`);
        console.log(`Total plans: ${result.plans.length}`);
        console.log(`Blockouts:`, blockouts);
        
        if (result.schedules.length === 0) {
          setErrorMessage(
            'No possible schedule found with the selected courses and subclasses. ' +
            'Please try selecting more subclasses or changing your course selection.'
          );
          setTimeout(() => setErrorMessage(''), 5000);
          setSolutions(null);
          setSelectedPlanIndex(null);
        } else {
          // Set both solutions and selected index together
          setSolutions(result);
          // Always select the first plan (need to account for sorting in SolutionsList)
          // The SolutionsList component sorts plans, so we need to find which original index
          // will be displayed first. For now, just set to 0 and let SolutionsList handle it.
          // Better: calculate the sorted order here
          const sortedPlans = [...result.plans].map((plan, originalIndex) => ({
            ...plan,
            originalIndex
          })).sort((a, b) => {
            // First priority: balanced distribution
            const diffA = Math.abs(a.sem1Count - a.sem2Count);
            const diffB = Math.abs(b.sem1Count - b.sem2Count);
            if (diffA !== diffB) {
              return diffA - diffB;
            }
            
            // Second priority: more day-offs (calculate it)
            const calculateDayOffs = (courses) => {
              const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
              const daysWithCourses = new Set();
              courses.forEach(course => {
                if (course.sessions && Array.isArray(course.sessions)) {
                  course.sessions.forEach(session => {
                    weekdays.forEach(day => {
                      if (session.days && session.days[day]) {
                        const dayValue = session.days[day].trim().toUpperCase();
                        if (dayValue !== '') {
                          daysWithCourses.add(day);
                        }
                      }
                    });
                  });
                }
              });
              return weekdays.length - daysWithCourses.size;
            };
            
            const allTermsA = new Set(a.courses.map(c => c.term));
            const termArrayA = Array.from(allTermsA).sort();
            const sem1CoursesA = a.courses.filter(c => c.term === termArrayA[0]);
            const sem2CoursesA = termArrayA[1] ? a.courses.filter(c => c.term === termArrayA[1]) : [];
            const dayOffsA = calculateDayOffs(sem1CoursesA) + calculateDayOffs(sem2CoursesA);
            
            const allTermsB = new Set(b.courses.map(c => c.term));
            const termArrayB = Array.from(allTermsB).sort();
            const sem1CoursesB = b.courses.filter(c => c.term === termArrayB[0]);
            const sem2CoursesB = termArrayB[1] ? b.courses.filter(c => c.term === termArrayB[1]) : [];
            const dayOffsB = calculateDayOffs(sem1CoursesB) + calculateDayOffs(sem2CoursesB);
            
            return dayOffsB - dayOffsA;
          });
          
          // Select the first plan in the sorted order
          const firstPlanOriginalIndex = sortedPlans[0].originalIndex;
          if (import.meta.env.DEV) {
            console.log('Setting selected plan index to:', firstPlanOriginalIndex);
            console.log('Total plans available:', result.plans.length);
            console.log('First plan (sorted):', sortedPlans[0]);
          }
          setSelectedPlanIndex(firstPlanOriginalIndex);
          setErrorMessage('');
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error generating schedules:', error);
        }
        setErrorMessage('An error occurred while generating schedules. Please try again.');
        setTimeout(() => setErrorMessage(''), 5000);
        setSolutions(null);
        setSelectedPlanIndex(null);
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  const handleBackToSearch = () => {
    setSolutions(null);
    setSelectedPlanIndex(null);
  };

  const loadDebugCourses = () => {
    if (!processedData) return;
    
    const debugCourseCodes = [
      'FREN2001', 'FREN2002', 'COMP1110', 'COMP2121', 'COMP2119', 
      'COMP2396', 'CCST9064', 'CCHU9094', 'ENGG1310', 'MATH1853'
    ];
    
    const coursesToAdd = debugCourseCodes
      .map(code => processedData.courses.find(c => c.courseCode === code))
      .filter(c => c !== undefined);
    
    const coursesWithSections = coursesToAdd.map(course => ({
      ...course,
      selectedSections: course.sections // Select all sections
    }));
    
    setSelectedCourses(coursesWithSections);
    setErrorMessage('');
    if (import.meta.env.DEV) {
      console.log('Debug courses loaded:', coursesWithSections.map(c => c.courseCode));
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>HKU Course Planner <span className="beta-badge" title="This is a beta version and may contain bugs or incomplete features.">BETA</span></h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <ThemeToggle />
            <a 
              href="https://github.com/ShingZhanho/hku-auto-planner#readme" 
              target="_blank" 
              rel="noopener noreferrer"
              className="readme-link"
            >
              How to Use
            </a>
            <a
              href="https://github.com/ShingZhanho/hku-auto-planner"
              target="_blank" 
              rel="noopener noreferrer"
              className="readme-link"
            >
              GitHub Repo
            </a>
          </div>
        </div>
      </header>

      <main className="App-main">
        {!courseData && <FileUploader onDataLoaded={handleDataLoaded} />}
        
        {processedData && !solutions && (
          <>
            <CourseSelector
              coursesData={processedData}
              selectedCourses={selectedCourses}
              onCourseSelect={handleCourseSelect}
              onCourseRemove={handleCourseRemove}
              blockouts={blockouts}
              onRemoveBlockout={handleRemoveBlockout}
              onEditBlockout={handleEditBlockout}
              onClearAll={handleClearAll}
              onClearAllCourses={handleClearAllCourses}
              onClearAllBlockouts={handleClearAllBlockouts}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
            />
            {errorMessage && (
              <div className="error-message">
                <strong>Error:</strong> {errorMessage}
              </div>
            )}
          </>
        )}

        {solutions && (
          <div className="solutions-view">
            <SolutionsList
              plans={solutions.plans}
              selectedIndex={selectedPlanIndex}
              onSelectPlan={setSelectedPlanIndex}
            />
            <WeeklyTimetable
              schedule={selectedPlanSchedule}
              availableSemesters={solutions.availableTerms || []}
              blockouts={blockouts}
            />
          </div>
        )}
      </main>

      {processedData && !solutions && (
        <footer className="App-footer">
          {import.meta.env.DEV && (
            <button className="debug-button" onClick={loadDebugCourses}>
              Load Debug Courses
            </button>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
            <button className="blockout-button" onClick={() => setIsBlockoutModalOpen(true)}>
              Add Blockout
            </button>
            <button className="solve-button" onClick={handleSolve}>
              Solve
            </button>
          </div>
        </footer>
      )}

      {solutions && (
        <footer className="App-footer">
          <button className="back-button" onClick={handleBackToSearch}>
            ← Back to Search
          </button>
          <button className="export-calendar-btn" onClick={() => setIsExportModalOpen(true)}>
            Export Calendar
          </button>
        </footer>
      )}

      {isLoading && <LoadingSpinner />}
      
      <BlockoutModal
        isOpen={isBlockoutModalOpen}
        onClose={handleCloseBlockoutModal}
        onAdd={handleAddBlockout}
        editBlockout={editingBlockout}
        availableTerms={solutions?.availableTerms || []}
      />

      <CalendarExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        schedule={selectedPlanIndex !== null && solutions ? solutions.plans[selectedPlanIndex].courses : []}
        availableSemesters={solutions?.availableTerms || []}
        blockouts={blockouts}
      />
    </div>
  )
}

export default App
