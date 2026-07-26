export const isShanghaiSubclass = (courseCode, section) => (
  /^COMP/i.test(String(courseCode || '').trim())
  && /SH$/i.test(String(section || '').trim())
);

export const formatSubclass = (courseCode, section) => (
  `${section}${isShanghaiSubclass(courseCode, section) ? ' ⚠️' : ''}`
);
