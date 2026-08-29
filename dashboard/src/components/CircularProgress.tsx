import React, { useEffect, useState, memo } from "react";

interface CircularProgressProps {
  value: number; // 0 to 1
  label?: string;
  isPercent?: boolean;
}

export const CircularProgress = memo(function CircularProgress({ value, label, isPercent = false }: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Add a tiny delay to allow initial render, then animate
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const strokeDashoffset = circumference - animatedValue * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width="100" height="100" className="transform -rotate-90 drop-shadow-sm">
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="var(--color-neu-bg)"
          strokeWidth="10"
        />
        {/* Inset shadow effect on track (simulated with a thin inner stroke) */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="rgba(163, 177, 198, 0.3)"
          strokeWidth="10"
          className="neu-inset-circle"
        />
        
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="neuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-neu-accent-start)" />
            <stop offset="100%" stopColor="var(--color-neu-accent-end)" />
          </linearGradient>
        </defs>

        {/* Progress Fill */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="url(#neuGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      
      {/* Center Text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-bold text-[var(--color-neu-text)] text-lg leading-tight">
          {isPercent ? `${Math.round(animatedValue * 100)}%` : Math.round(animatedValue * 100)}
        </span>
      </div>
      
      {label && (
        <span className="mt-2 text-xs uppercase tracking-widest text-[var(--color-neu-muted)] font-bold">
          {label}
        </span>
      )}
    </div>
  );
});
