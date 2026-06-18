import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Detectar Safari
const isSafari = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
  const webkit = !!ua.match(/WebKit/i);
  const iOSSafari = iOS && webkit && !ua.match(/CriOS/i);
  const desktopSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return iOSSafari || desktopSafari;
};

export default function GlassCard({ 
  children, 
  className = '', 
  hover = true,
  delay = 0,
  intensity = 'medium' // light, medium, strong
}) {
  const [isAppleDevice, setIsAppleDevice] = useState(false);

  useEffect(() => {
    setIsAppleDevice(isSafari());
  }, []);

  const intensityClasses = {
    light: '10px 10px 26px rgba(0,0,0,0.42), -6px -6px 16px rgba(255,255,255,0.014)',
    medium: '14px 14px 34px rgba(0,0,0,0.52), -7px -7px 18px rgba(255,255,255,0.016)',
    strong: '18px 18px 42px rgba(0,0,0,0.62), -8px -8px 22px rgba(255,255,255,0.018)',
  };

  const surfaceShadow = intensityClasses[intensity] || intensityClasses.medium;

  // Configurações otimizadas para Safari
  const motionProps = isAppleDevice ? {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3, delay }
  } : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { 
      duration: 0.5, 
      delay,
      type: "spring",
      stiffness: 100
    }
  };

  const hoverProps = hover && !isAppleDevice ? {
    whileHover: { 
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  } : {};

  return (
    <motion.div
      {...motionProps}
      {...hoverProps}
      className={`relative rounded-[22px] bg-[#101314] transition-all duration-300 ${className}`}
      style={{
        boxShadow: surfaceShadow,
        ...(isAppleDevice ? {
        WebkitTransform: 'translateZ(0)',
        WebkitBackfaceVisibility: 'hidden',
        WebkitPerspective: 1000
      } : {})
      }}
    >
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
