import ExcelJS from 'exceljs';

const TIME_HEADERS = new Set(['START TIME', 'END TIME']);
const DATE_HEADERS = new Set(['START DATE', 'END DATE']);
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const formatTimeFromMinutes = (minutes) => {
  const hours = Math.floor(minutes / 60) % 24;
  const remainingMinutes = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
};

export const normalizeExcelCellValue = (value, header) => {
  const normalizedHeader = header.trim();

  if (value instanceof Date) {
    if (TIME_HEADERS.has(normalizedHeader)) {
      return formatTimeFromMinutes(value.getUTCHours() * 60 + value.getUTCMinutes());
    }
    return value;
  }

  if (typeof value === 'number') {
    if (TIME_HEADERS.has(normalizedHeader)) {
      return formatTimeFromMinutes(Math.round(value * 24 * 60));
    }

    if (DATE_HEADERS.has(normalizedHeader)) {
      return new Date(Date.UTC(1899, 11, 30) + value * MILLISECONDS_PER_DAY);
    }
  }

  return value !== null && value !== undefined ? String(value) : '';
};



/**
 * Convert worksheet to JSON format
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to convert
 * @returns {Array} - Array of row objects
 */
const worksheetToJSON = (worksheet) => {
  const rows = [];
  let headers = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row is headers - use text values
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cell.value || '');
      });
    } else {
      // Data rows - access cells directly to get proper values
      const obj = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (!header) return;
        
        let value = cell.value;
        
        // Handle formula cells - use the result value
        if (value && typeof value === 'object' && 'result' in value) {
          value = value.result;
        }
        
        obj[header] = normalizeExcelCellValue(value, header);
      });
      rows.push(obj);
    }
  });
  
  return rows;
};



/**
 * Convert an Excel file to JSON format
 * @param {File} file - The Excel file to convert
 * @param {number} sheetIndex - The sheet index to convert (default: 0)
 * @returns {Promise<Array>} - Array of row objects
 */
export const excelToJSON = async (file, sheetIndex = 0) => {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);
  
  const worksheet = workbook.worksheets[sheetIndex];
  if (!worksheet) {
    throw new Error(`Sheet at index ${sheetIndex} not found`);
  }
  
  return worksheetToJSON(worksheet);
};

/**
 * Load the default Excel file from public folder
 * @param {string} path - Path to the Excel file
 * @returns {Promise<{csv: string, json: Array}>} - Object with CSV and JSON data
 */
export const loadDefaultExcel = async (path) => {
  try {
    const response = await fetch(path);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('File is empty');
    }
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheets found in the file');
    }
    
    const json = worksheetToJSON(worksheet);
    
    return { json };
  } catch (error) {
    console.error('Error loading default Excel file:', error);
    throw error;
  }
};


