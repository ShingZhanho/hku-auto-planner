import { useState, useEffect } from 'react'
import './App.css'
import FileUploader from './components/FileUploader'
import CourseSelector from './components/CourseSelector'
import LoadingSpinner from './components/LoadingSpinner'
import SolutionsList from './components/SolutionsList'
import WeeklyTimetable from './components/WeeklyTimetable'
import { processCoursesData, generateSchedules } from './utils/courseParser'

function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [courseData, setCourseData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [solutions, setSolutions] = useState(null);
  const [selectedSem1Index, setSelectedSem1Index] = useState(null);
  const [selectedSem2Index, setSelectedSem2Index] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1024;
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDataLoaded = (data) => {
    setCourseData(data);
    
    console.log('Raw data sample:', data.json.slice(0, 3));
    
    // Process the data
    const processed = processCoursesData(data.json);
    setProcessedData(processed);
    
    console.log('Course data loaded and processed');
    console.log('Total courses:', processed.totalCourses);
    console.log('Total sessions:', processed.totalSessions);
    console.log('Sample courses:', processed.courses.slice(0, 10));
    console.log('All course codes:', processed.courses.map(c => c.courseCode));
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
        
        const result = generateSchedules(selectedCourses, processedData.grouped);
        
        console.log(`Generated ${result.schedules.length} possible schedules`);
        console.log(`Semester 1 plans: ${result.semesterPlans.sem1.length}`);
        console.log(`Semester 2 plans: ${result.semesterPlans.sem2.length}`);
        
        if (result.schedules.length === 0) {
          setErrorMessage(
            'No possible schedule found with the selected courses and subclasses. ' +
            'Please try selecting more subclasses or changing your course selection.'
          );
          setSolutions(null);
        } else {
          setSolutions(result);
          setSelectedSem1Index(result.semesterPlans.sem1.length > 0 ? 0 : null);
          setSelectedSem2Index(result.semesterPlans.sem2.length > 0 ? 0 : null);
          setErrorMessage('');
        }
      } catch (error) {
        console.error('Error generating schedules:', error);
        setErrorMessage('An error occurred while generating schedules. Please try again.');
        setSolutions(null);
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  const handleBackToSearch = () => {
    setSolutions(null);
    setSelectedSem1Index(null);
    setSelectedSem2Index(null);
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
    console.log('Debug courses loaded:', coursesWithSections.map(c => c.courseCode));
  };

  return (
    <div className="App">
      {isMobile ? (
        <div className="mobile-block">
          <div className="mobile-block-content">
            <h1>📱 Desktop Only</h1>
            <p>This application is only available on desktop devices.</p>
            <p>Please visit this site on a computer with a screen width of at least 1024px.</p>
          </div>
        </div>
      ) : (
        <>
      <header className="App-header">
        <div className="header-content">
          <h1>HKU Course Planner</h1>
          <a 
            href="https://github.com/ShingZhanho/hku-auto-planner#readme" 
            target="_blank" 
            rel="noopener noreferrer"
            className="readme-link"
          >
            📖 How to Use
          </a>
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
              sem1Plans={solutions.semesterPlans.sem1}
              sem2Plans={solutions.semesterPlans.sem2}
              selectedSem1Index={selectedSem1Index}
              selectedSem2Index={selectedSem2Index}
              onSelectSem1={setSelectedSem1Index}
              onSelectSem2={setSelectedSem2Index}
            />
            <WeeklyTimetable 
              schedule={[
                ...(selectedSem1Index !== null ? solutions.semesterPlans.sem1[selectedSem1Index] : []),
                ...(selectedSem2Index !== null ? solutions.semesterPlans.sem2[selectedSem2Index] : [])
              ]}
              availableSemesters={[
                ...(solutions.semesterPlans.sem1.length > 0 ? ['2025-26 Sem 1'] : []),
                ...(solutions.semesterPlans.sem2.length > 0 ? ['2025-26 Sem 2'] : [])
              ]}
            />
          </div>
        )}
      </main>

      {processedData && !solutions && (
        <footer className="App-footer">
          <button className="debug-button" onClick={loadDebugCourses}>
            Load Debug Courses
          </button>
          <button className="solve-button" onClick={handleSolve}>
            Solve
          </button>
        </footer>
      )}

      {solutions && (
        <footer className="App-footer">
          <button className="back-button" onClick={handleBackToSearch}>
            ← Back to Search
          </button>
        </footer>
      )}

      {isLoading && <LoadingSpinner />}
        </>
      )}
    </div>
  )
}

export default App
