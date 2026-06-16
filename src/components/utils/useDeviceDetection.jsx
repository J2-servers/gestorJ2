import { useState, useEffect } from 'react';

export const useDeviceDetection = () => {
  const [device, setDevice] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    width: 0,
    height: 0,
    orientation: 'portrait',
    os: 'unknown',
    browser: 'unknown'
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Detectar OS
      let os = 'unknown';
      if (/android/.test(userAgent)) os = 'android';
      else if (/iphone|ipad|ipod/.test(userAgent)) os = 'ios';
      else if (/mac/.test(userAgent)) os = 'macos';
      else if (/win/.test(userAgent)) os = 'windows';
      else if (/linux/.test(userAgent)) os = 'linux';
      
      // Detectar Browser
      let browser = 'unknown';
      if (/chrome/.test(userAgent) && !/edg/.test(userAgent)) browser = 'chrome';
      else if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) browser = 'safari';
      else if (/firefox/.test(userAgent)) browser = 'firefox';
      else if (/edg/.test(userAgent)) browser = 'edge';
      
      // Detectar tipo de dispositivo baseado em múltiplos fatores
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const hasSmallScreen = width < 768;
      const hasMediumScreen = width >= 768 && width < 1024;
      
      let isMobile = false;
      let isTablet = false;
      let isDesktop = false;
      
      // Detecção mais precisa
      if (hasSmallScreen) {
        isMobile = true;
      } else if (hasMediumScreen) {
        isTablet = isTouchDevice;
        isDesktop = !isTouchDevice;
      } else {
        isDesktop = true;
      }
      
      // Override baseado no user agent
      if (/mobile/.test(userAgent) && !/(tablet|ipad)/.test(userAgent)) {
        isMobile = true;
        isTablet = false;
        isDesktop = false;
      } else if (/(tablet|ipad)/.test(userAgent)) {
        isMobile = false;
        isTablet = true;
        isDesktop = false;
      }
      
      const orientation = width > height ? 'landscape' : 'portrait';
      
      setDevice({
        isMobile,
        isTablet,
        isDesktop,
        width,
        height,
        orientation,
        os,
        browser
      });
    };

    detectDevice();
    
    const debouncedResize = debounce(detectDevice, 150);
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', detectDevice);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  return device;
};

// Utility debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Breakpoints helper
export const getBreakpoint = (width) => {
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';
  return '2xl';
};

// Adaptive spacing
export const getSpacing = (device) => {
  if (device.isMobile) return {
    container: 'p-2',
    section: 'space-y-2',
    card: 'p-2',
    gap: 'gap-1.5'
  };
  if (device.isTablet) return {
    container: 'p-3',
    section: 'space-y-3',
    card: 'p-3',
    gap: 'gap-2'
  };
  return {
    container: 'p-4',
    section: 'space-y-4',
    card: 'p-4',
    gap: 'gap-3'
  };
};

// Adaptive text sizes
export const getTextSizes = (device) => {
  if (device.isMobile) return {
    hero: 'text-sm',
    title: 'text-sm',
    heading: 'text-xs',
    body: 'text-xs',
    small: 'text-[10px]'
  };
  if (device.isTablet) return {
    hero: 'text-xl',
    title: 'text-lg',
    heading: 'text-base',
    body: 'text-sm',
    small: 'text-xs'
  };
  return {
    hero: 'text-3xl',
    title: 'text-2xl',
    heading: 'text-xl',
    body: 'text-sm',
    small: 'text-xs'
  };
};