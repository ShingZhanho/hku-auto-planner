import { useState } from 'react'
import './App.css'
import FileUploader from './components/FileUploader'
import CourseSelector from './components/CourseSelector'
import { processCoursesData } from './utils/courseParser'

function App() {
  const [courseData, setCourseData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);

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
  };

  const handleCourseRemove = (courseCode) => {
    setSelectedCourses(prev => prev.filter(c => c.courseCode !== courseCode));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>HKU Course Planner</h1>
        <p>Plan your semester courses automatically</p>
      </header>

      <main className="App-main">
        {!courseData && <FileUploader onDataLoaded={handleDataLoaded} />}
        
        {processedData && (
          <CourseSelector
            coursesData={processedData}
            selectedCourses={selectedCourses}
            onCourseSelect={handleCourseSelect}
            onCourseRemove={handleCourseRemove}
          />
        )}
      </main>

      {processedData && (
        <footer className="App-footer">
          <button className="solve-button">Solve</button>
        </footer>
      )}
    </div>
  )
}

export default App
