import { useState, useEffect } from 'react';
import { excelToJSON, loadDefaultExcel } from '../utils/excelUtils';

function FileUploader({ onDataLoaded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Fetch last updated time
    fetch('./last-updated.json')
      .then(response => response.json())
      .then(data => setLastUpdated(data['last_updated_at']))
      .catch(err => console.error('Failed to load last updated time:', err));
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    
    try {
      // Get JSON format for processing
      const json = await excelToJSON(file);
      
      setFileName(file.name);
      onDataLoaded({ json, fileName: file.name });
    } catch (err) {
      setError('Error processing file: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDefault = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use relative path that works with Vite's base configuration
      const { json } = await loadDefaultExcel('./built-in-data.xlsx');
      
      setFileName('built-in-data.xlsx (default)');
      onDataLoaded({ json, fileName: 'built-in-data.xlsx' });
    } catch (err) {
      setError('Error loading default file: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-uploader">
      <h2>Load Class Timetable</h2>
      
      <p>
        This app needs an Excel class timetable file from HKU intranet to function.
        You can either use the built-in timetable (which we try to keep updated) or download the latest timetable and upload it here.
        Check out <a href="https://youtu.be/h2U6nSto7d4">the video</a> to see how to download.
      </p>

      <div className="upload-section">
        <button 
          onClick={handleLoadDefault} 
          disabled={loading}
          className="default-button"
        >
          {loading ? 'Loading...' : 'Use Built-in Timetable'}
        </button>
        
        {lastUpdated && (
          <div className="last-updated-info">
            Last updated: {lastUpdated}
          </div>
        )}
        
        <div className="divider">OR</div>
        
        <div className="file-input-wrapper">
          <label htmlFor="file-upload" className="file-label">
            Upload Your Own XLSX File
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            disabled={loading}
          />
        </div>
      </div>

      {fileName && (
        <div className="success-message">
          ✓ Loaded: {fileName}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-spinner">
          Processing...
        </div>
      )}
    </div>
  );
}

export default FileUploader;
