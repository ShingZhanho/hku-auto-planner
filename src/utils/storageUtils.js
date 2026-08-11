/**
 * Utility functions for persisting course selections and related preferences.
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

const stableSerialize = (value) => {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) {
    const values = value.map(stableSerialize).sort();
    return `[${values.join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => (
      `${JSON.stringify(key)}:${stableSerialize(value[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
};

/**
 * Creates a lazy, cached course fingerprint lookup. No course is serialized or
 * hashed until a restored or selected course requests its fingerprint.
 */
export const createCourseHashGetter = (groupedData) => {
  const cache = new Map();

  return (courseCode) => {
    if (cache.has(courseCode)) return cache.get(courseCode);

    const courseGroups = Object.entries(groupedData)
      .filter(([, course]) => course.courseCode === courseCode)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

    if (courseGroups.length === 0) {
      cache.set(courseCode, null);
      return null;
    }

    const hash = hashString(stableSerialize(courseGroups));
    cache.set(courseCode, hash);
    return hash;
  };
};

const SHANGHAI_WARNING_KEY = 'hku_planner_shanghai_warning';
const PARTIAL_WEEK_NOTICE_KEY = 'hku_planner_partial_week_notice';

export const loadShanghaiWarningAcknowledgement = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SHANGHAI_WARNING_KEY) || 'null');
    return Boolean(saved?.acknowledged);
  } catch {
    localStorage.removeItem(SHANGHAI_WARNING_KEY);
    return false;
  }
};

export const saveShanghaiWarningAcknowledgement = () => {
  try {
    localStorage.setItem(SHANGHAI_WARNING_KEY, JSON.stringify({
      acknowledged: true
    }));
  } catch {
    // The warning still appears for the current session if storage is unavailable.
  }
};

export const clearShanghaiWarningAcknowledgement = () => {
  localStorage.removeItem(SHANGHAI_WARNING_KEY);
};

export const loadPartialWeekNoticeAcknowledgement = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(PARTIAL_WEEK_NOTICE_KEY) || 'null');
    return Boolean(saved?.acknowledged);
  } catch {
    localStorage.removeItem(PARTIAL_WEEK_NOTICE_KEY);
    return false;
  }
};

export const savePartialWeekNoticeAcknowledgement = () => {
  try {
    localStorage.setItem(PARTIAL_WEEK_NOTICE_KEY, JSON.stringify({
      acknowledged: true
    }));
  } catch {
    // The notice still appears for the current session if storage is unavailable.
  }
};

/**
 * Delete a cookie
 */
const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

/**
 * Save the cart with fingerprints for selected courses only.
 */
export const saveShoppingCart = (selectedCourses, blockouts, getCourseHash) => {
  try {
    const courseHashes = {};
    selectedCourses.forEach((course) => {
      courseHashes[course.courseCode] = getCourseHash(course.courseCode);
    });

    const cartData = {
      version: 2,
      selectedCourses,
      blockouts,
      courseHashes,
      timestamp: Date.now()
    };
    
    // Store full cart data in localStorage (much larger limit than cookies)
    localStorage.setItem('hku_planner_cart', JSON.stringify(cartData));
    
    if (import.meta.env?.DEV) {
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
 * Restore unchanged courses and report every saved course whose fingerprint no
 * longer matches. Legacy carts are retained and receive fingerprints on save.
 */
export const loadShoppingCart = (getCourseHash) => {
  try {
    const cartJson = localStorage.getItem('hku_planner_cart');
    if (!cartJson) {
      return null;
    }
    
    const cartData = JSON.parse(cartJson);
    const savedCourses = Array.isArray(cartData.selectedCourses) ? cartData.selectedCourses : [];
    const savedHashes = cartData.courseHashes || {};
    const removedCourses = [];
    const selectedCourses = [];

    savedCourses.forEach((course) => {
      const currentHash = getCourseHash(course.courseCode);
      const savedHash = savedHashes[course.courseCode];
      const courseWasRemoved = !currentHash;
      const courseChanged = Boolean(savedHash && currentHash && savedHash !== currentHash);

      if (courseWasRemoved || courseChanged) {
        removedCourses.push({
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          reason: courseWasRemoved ? 'no longer available' : 'timetable details changed'
        });
      } else {
        // Legacy carts without courseHashes are retained and migrated on save.
        selectedCourses.push(course);
      }
    });
    
    if (import.meta.env?.DEV) {
      console.log('Shopping cart loaded from localStorage:', {
        courses: selectedCourses.length,
        removedCourses: removedCourses.length,
        blockouts: cartData.blockouts?.length || 0,
        age: Math.round((Date.now() - cartData.timestamp) / (1000 * 60 * 60 * 24)) + ' days'
      });
    }
    
    return {
      selectedCourses,
      blockouts: cartData.blockouts || [],
      removedCourses,
      databaseChanged: removedCourses.length > 0
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
  
  if (import.meta.env?.DEV) {
    console.log('Shopping cart cleared from storage');
  }
};
