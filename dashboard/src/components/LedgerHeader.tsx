"use client";
import React, { useEffect, useState } from "react";

interface LedgerHeaderProps {
  atRisk: number;
  recovered: number;
  matchRate: number;
  unresolvedCount: number;
}

function AnimatedNumber({ value, isCurrency = false, isPercent = false }: { value: number; isCurrency?: boolean; isPercent?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 800; // ms
    const steps = 60;
    const stepTime = duration / steps;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  let formatted = displayValue.toLocaleString("en-IN", {
    maximumFractionDigits: 1,
  });

  if (isCurrency) {
    // If it's a large amount, we can format as "L" for Lakhs or just standard locale string
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
    <header className="sticky top-0 z-10 py-6 px-4 sm:px-6 lg:px-8 bg-[var(--color-clay-base)] pointer-events-none">
      <div className="max-w-7xl mx-auto flex flex-wrap gap-4 justify-between pointer-events-auto">
        <div className="clay-card flex flex-col p-4 px-6 flex-1 min-w-[200px]">
          <span className="font-mono text-3xl font-medium text-[var(--color-clay-ink)]">
            <AnimatedNumber value={atRisk} isCurrency />
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--color-clay-muted)] mt-1 font-display font-semibold">
            At Risk
          </span>
        </div>

        <div className="clay-card flex flex-col p-4 px-6 flex-1 min-w-[200px]">
          <span className="font-mono text-3xl font-medium text-[var(--color-clay-ink)]">
            <AnimatedNumber value={recovered} isCurrency />
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--color-clay-muted)] mt-1 font-display font-semibold">
            Recovered
          </span>
        </div>

        <div className="clay-card flex flex-col p-4 px-6 flex-1 min-w-[200px]">
          <span className="font-mono text-3xl font-medium text-[var(--color-clay-ink)]">
            <AnimatedNumber value={matchRate} isPercent />
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--color-clay-muted)] mt-1 font-display font-semibold">
            Match Rate
          </span>
        </div>

        <div className="clay-card flex flex-col p-4 px-6 flex-1 min-w-[200px]">
          <span className="font-mono text-3xl font-medium text-[var(--color-clay-ink)]">
            <AnimatedNumber value={unresolvedCount} />
          </span>
          <span className="text-xs uppercase tracking-widest text-[var(--color-clay-muted)] mt-1 font-display font-semibold">
            Unresolved
          </span>
        </div>
      </div>
    </header>
  );
}
