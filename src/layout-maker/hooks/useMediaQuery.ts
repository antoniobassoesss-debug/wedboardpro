/**
 * useMediaQuery Hook
 *
 * Custom hook for detecting screen size breakpoints.
 */

import { useState, useEffect, useCallback } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface UseMediaQueryReturn {
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  isTouchDevice: boolean;
  breakpoint: Breakpoint;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

const BREAKPOINTS: Record<string, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useResponsive(): UseMediaQueryReturn {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTouchDevice = useMediaQuery('(pointer: coarse)');

  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [height, setHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 768);

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getBreakpoint = useCallback((): Breakpoint => {
    if (width >= (BREAKPOINTS['2xl'] ?? 1536)) return '2xl';
    if (width >= (BREAKPOINTS['xl'] ?? 1280)) return 'xl';
    if (width >= (BREAKPOINTS['lg'] ?? 1024)) return 'lg';
    if (width >= (BREAKPOINTS['md'] ?? 768)) return 'md';
    if (width >= (BREAKPOINTS['sm'] ?? 640)) return 'sm';
    return 'xs';
  }, [width]);

  const orientation = width > height ? 'landscape' : 'portrait';

  return {
    isDesktop,
    isTablet,
    isMobile,
    isTouchDevice,
    breakpoint: getBreakpoint(),
    width,
    height,
    orientation,
  };
}

export { BREAKPOINTS };
export type { Breakpoint };
