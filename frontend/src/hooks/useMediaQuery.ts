import { useState, useEffect } from 'react';

/**
 * Hook for responsive design using CSS media queries
 * 
 * @param query - CSS media query string
 * @returns boolean indicating if the media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);
    
    // Create event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add listener
    mediaQuery.addEventListener('change', handleChange);
    
    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
};

export default useMediaQuery;