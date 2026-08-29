"use client";
import React, { useEffect, useState } from "react";
import { CircularProgress } from "./CircularProgress";

interface LedgerHeaderProps {
  atRisk: number;
  recovered: number;
  matchRate: number;
  unresolvedCount: number;
}

function AnimatedNumber({ value, isCurrency = false, isPercent = false }: { value: number; isCurrency?: boolean; isPercent?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 800; // ms
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      
      setDisplayValue(value * easeProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [value]);

  let formatted = displayValue.toLocaleString("en-IN", {
    maximumFractionDigits: 1,
  });

  if (isCurrency) {
    if (displayValue >= 100000) {
      formatted = "₹" + (displayValue / 100000).toFixed(2) + "L";
    } else {
      formatted = "₹" + displayValue.toLocaleString("en-IN");
    }
  }
  
  if (isPercent) {
    formatted = formatted + "%";
  }

  return <span>{formatted}</span>;
}

export function LedgerHeader({ atRisk, recovered, matchRate, unresolvedCount }: LedgerHeaderProps) {
  return (
    <header className="sticky top-0 z-10 py-6 px-4 sm:px-6 lg:px-8 pointer-events-none">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 pointer-events-auto">
        <div className="neu-panel flex flex-col p-6 justify-between h-32">
          <span className="font-bold text-2xl md:text-3xl text-[var(--color-neu-text)] leading-none">
            <AnimatedNumber value={atRisk} isCurrency />
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--color-neu-muted)] font-bold">
            At Risk
          </span>
        </div>

        <div className="neu-panel flex flex-col p-6 justify-between h-32">
          <span className="font-bold text-2xl md:text-3xl text-[var(--color-neu-text)] leading-none neu-gradient-text">
            <AnimatedNumber value={recovered} isCurrency />
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--color-neu-muted)] font-bold">
            Recovered
          </span>
        </div>

        <div className="neu-panel flex items-center justify-between p-4 h-32">
          <div className="flex flex-col h-full justify-between py-2">
            <span className="text-xs uppercase tracking-widest text-[var(--color-neu-muted)] font-bold">
              Match Rate
            </span>
            <span className="font-bold text-2xl text-[var(--color-neu-text)]">
              <AnimatedNumber value={matchRate} isPercent />
            </span>
          </div>
          <div className="scale-75 origin-right">
            <CircularProgress value={matchRate / 100} />
          </div>
        </div>

        <div className="neu-panel flex flex-col p-6 justify-between h-32">
          <span className="font-bold text-2xl md:text-3xl text-[var(--color-neu-text)] leading-none">
            <AnimatedNumber value={unresolvedCount} />
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--color-neu-muted)] font-bold">
            Unresolved
          </span>
        </div>
      </div>
    </header>
  );
}
