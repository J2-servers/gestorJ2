import React from "react";

export default function PageContainer({ children, maxWidth = "7xl", className = "" }) {
  return (
    <div className={`min-h-screen bg-black p-4 lg:p-8 pb-24 lg:pb-8 ${className}`}>
      <div className={`max-w-${maxWidth} mx-auto space-y-6`}>
        {children}
      </div>
    </div>
  );
}