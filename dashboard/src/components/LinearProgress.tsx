import React, { useEffect, useState, memo } from "react";

interface LinearProgressProps {
  value: number; // 0 to 1
}

export const LinearProgress = memo(function LinearProgress({ value }: LinearProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="w-full h-3 neu-inset rounded-full mt-2 relative overflow-hidden flex items-center p-0.5">
      <div 
        className="h-full rounded-full neu-gradient-bg transition-all duration-700 ease-out"
        style={{ width: `${animatedValue * 100}%` }}
      />
      {/* Draggable-looking handle representation (just visual, not actually draggable) */}
      <div 
        className="absolute h-4 w-4 bg-white rounded-full shadow-md transition-all duration-700 ease-out flex items-center justify-center border border-gray-100"
        style={{ left: `calc(${animatedValue * 100}% - 8px)` }}
      >
        <div className="w-1.5 h-1.5 bg-[var(--color-neu-accent-start)] rounded-full opacity-50" />
      </div>
    </div>
  );
});
