import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ResponsiveRouter({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [lastResize, setLastResize] = useState(Date.now());

  useEffect(() => {
    const checkScreenSize = () => {
      const isMobile = window.innerWidth < 1024 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isOnMobilePage = location.pathname === '/mobile';
      const isOnDesktopPage = location.pathname === '/';

      // Navigate if on wrong version for current screen size
      if (isMobile && isOnDesktopPage) {
        navigate('/mobile', { replace: true });
      } else if (!isMobile && isOnMobilePage) {
        navigate('/', { replace: true });
      }
    };

    // Check on mount
    checkScreenSize();

    // Debounced resize handler
    const handleResize = () => {
      const now = Date.now();
      if (now - lastResize > 300) {
        setLastResize(now);
        checkScreenSize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate, location, lastResize]);

  return children;
}
