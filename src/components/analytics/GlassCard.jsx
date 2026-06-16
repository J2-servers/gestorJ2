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
    light: {
      border: 'border-orange-500/20',
      shadow: 'shadow-[0_0_20px_rgba(251,146,60,0.2)]',
      hoverShadow: 'hover:shadow-[0_0_35px_rgba(251,146,60,0.4)]',
      hoverBorder: 'hover:border-orange-500/40',
    },
    medium: {
      border: 'border-orange-500/30',
      shadow: 'shadow-[0_0_30px_rgba(251,146,60,0.3)]',
      hoverShadow: 'hover:shadow-[0_0_50px_rgba(251,146,60,0.6)]',
      hoverBorder: 'hover:border-orange-500/60',
    },
    strong: {
      border: 'border-orange-500/50',
      shadow: 'shadow-[0_0_40px_rgba(251,146,60,0.5)]',
      hoverShadow: 'hover:shadow-[0_0_60px_rgba(251,146,60,0.8)]',
      hoverBorder: 'hover:border-orange-500',
    },
  };

  const colors = intensityClasses[intensity] || intensityClasses.medium;

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
      className={`
        relative rounded-3xl
        ${isAppleDevice 
          ? 'bg-gradient-to-br from-black/60 to-black/40' 
          : 'backdrop-blur-2xl bg-gradient-to-br from-black/40 to-black/20'
        }
        border-2 ${colors.border} ${colors.shadow}
        ${hover ? `${colors.hoverShadow} ${colors.hoverBorder} transition-all duration-300` : ''}
        ${className}
      `}
      style={isAppleDevice ? {
        WebkitTransform: 'translateZ(0)',
        WebkitBackfaceVisibility: 'hidden',
        WebkitPerspective: 1000
      } : {}}
    >
      {/* Brilho laranja animado - apenas non-Safari */}
      {!isAppleDevice && (
        <motion.div 
          className="absolute inset-0 rounded-3xl overflow-hidden opacity-20"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 0.3 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-orange-600/10 to-transparent" />
        </motion.div>
      )}
      
      {/* Shine effect - simplificado para Safari */}
      {!isAppleDevice && (
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
        </div>
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}