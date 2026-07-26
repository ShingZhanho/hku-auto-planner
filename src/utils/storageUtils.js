/**
 * Utility functions for storing and retrieving user data in cookies
 */

/**
 * Simple hash function for strings
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
};

/**
 * Hash the course data to detect changes
 */
export const hashCourseData = (jsonData) => {
  // Create a stable string representation of the data
  const dataString = JSON.stringify(jsonData.map(row => {
    // Sort keys to ensure consistent ordering
    const sortedRow = {};
    Object.keys(row).sort().forEach(key => {
      sortedRow[key] = row[key];
    });
    return sortedRow;
  }));
  
  return hashString(dataString);
};

const SHANGHAI_WARNING_KEY = 'hku_planner_shanghai_warning';

export const loadShanghaiWarningAcknowledgement = (currentDataHash) => {
  try {
    const saved = JSON.parse(localStorage.getItem(SHANGHAI_WARNING_KEY) || 'null');
    return Boolean(saved?.acknowledged && saved.dataHash === currentDataHash);
  } catch {
    localStorage.removeItem(SHANGHAI_WARNING_KEY);
    return false;
  }
};

export const saveShanghaiWarningAcknowledgement = (dataHash) => {
  try {
    localStorage.setItem(SHANGHAI_WARNING_KEY, JSON.stringify({
      dataHash,
      acknowledged: true
    }));
  } catch {
    // The warning still appears for the current session if storage is unavailable.
  }
};

export const clearShanghaiWarningAcknowledgement = () => {
  localStorage.removeItem(SHANGHAI_WARNING_KEY);
};

/**
 * Set a cookie
 */
const setCookie = (name, value, days = 365) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
};

/**
 * Get a cookie value
 */
const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

/**
 * Delete a cookie
 */
const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

/**
 * Save shopping cart to localStorage (with cookie fallback for hash)
 * Using localStorage to avoid 4KB cookie size limit
 */
export const saveShoppingCart = (dataHash, selectedCourses, blockouts) => {
  try {
    const cartData = {
      dataHash,
      selectedCourses,
      blockouts,
      timestamp: Date.now()
    };
    
    // Store hash in cookie for quick access
    setCookie('hku_planner_hash', dataHash);
    
    // Store full cart data in localStorage (much larger limit than cookies)
    localStorage.setItem('hku_planner_cart', JSON.stringify(cartData));
    
    if (import.meta.env.DEV) {
      const dataSize = JSON.stringify(cartData).length;
      console.log('Shopping cart saved to localStorage', {
        courses: selectedCourses.length,
        blockouts: blockouts.length,
        dataSize: `${(dataSize / 1024).toFixed(2)} KB`
      });
    }
  } catch (error) {
    console.error('Error saving shopping cart:', error);
    // Storage quota may be exceeded or localStorage disabled
    console.warn('Your course selections may not persist between sessions. This can happen if your browser storage is full or disabled.');
  }
};

/**
 * Load shopping cart from localStorage (with cookie fallback for hash check)
 */
export const loadShoppingCart = (currentDataHash) => {
  try {
    const savedHash = getCookie('hku_planner_hash');
    
    // If hash doesn't match, clear old data
    if (!savedHash || savedHash !== currentDataHash) {
      if (import.meta.env.DEV) {
        console.log('Data hash mismatch or not found, clearing old cart data');
      }
      clearShoppingCart();
      return null;
    }
    
    // Load from localStorage instead of cookies
    const cartJson = localStorage.getItem('hku_planner_cart');
    if (!cartJson) {
      return null;
    }
    
    const cartData = JSON.parse(cartJson);
    
    // Verify hash in cart data matches
    if (cartData.dataHash !== currentDataHash) {
      if (import.meta.env.DEV) {
        console.log('Cart data hash mismatch, clearing');
      }
      clearShoppingCart();
      return null;
    }
    
    if (import.meta.env.DEV) {
      console.log('Shopping cart loaded from localStorage:', {
        courses: cartData.selectedCourses.length,
        blockouts: cartData.blockouts.length,
        age: Math.round((Date.now() - cartData.timestamp) / (1000 * 60 * 60 * 24)) + ' days'
      });
    }
    
    return {
      selectedCourses: cartData.selectedCourses || [],
      blockouts: cartData.blockouts || []
    };
  } catch (error) {
    console.error('Error loading shopping cart:', error);
    console.warn('Could not restore your previous course selections. The saved data may be corrupted and has been cleared.');
    clearShoppingCart();
    return null;
  }
};

/**
 * Clear shopping cart from localStorage and cookies
 */
export const clearShoppingCart = () => {
  deleteCookie('hku_planner_hash');
  deleteCookie('hku_planner_cart'); // Clean up old cookie data if it exists
  localStorage.removeItem('hku_planner_cart');
  clearShanghaiWarningAcknowledgement();
  
  if (import.meta.env.DEV) {
    console.log('Shopping cart cleared from storage');
  }
};

