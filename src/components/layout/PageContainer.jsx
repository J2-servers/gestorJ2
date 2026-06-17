import React from "react";

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

export default function PageContainer({ children, maxWidth = "7xl", className = "" }) {
  const maxWidthClass = maxWidthClasses[maxWidth] || maxWidthClasses["7xl"];

  return (
    <div className={`app-page-shell min-h-screen bg-black px-3 py-4 pb-28 sm:px-4 lg:p-8 lg:pb-8 ${className}`}>
      <div className={`${maxWidthClass} mx-auto w-full min-w-0 space-y-4 sm:space-y-6`}>
        {children}
      </div>
    </div>
  );
}
