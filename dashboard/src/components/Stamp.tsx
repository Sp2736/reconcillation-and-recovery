import React, { useEffect, useState } from "react";

export type StampStatus = "RESOLVED" | "UNRESOLVED" | "RECOVERED" | "PASSED" | "ESCALATED" | "BLOCKED";

interface StampProps {
  status: StampStatus;
}

export function Stamp({ status }: StampProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(false);
    // Add a tiny delay to ensure the animation restarts if the status/record changes
    const timer = setTimeout(() => setIsAnimating(true), 50);
    return () => clearTimeout(timer);
  }, [status]);

  const isPositive = ["RESOLVED", "RECOVERED", "PASSED"].includes(status);
  const colorClass = isPositive ? "text-[var(--color-clay-green)] bg-[var(--color-clay-green)]/10" : "text-[var(--color-clay-red)] bg-[var(--color-clay-red)]/10";
  
  if (!isAnimating) return null;

  return (
    <div className={`clay-pill flex items-center justify-center px-10 py-4 ${colorClass} stamp-clay-animation`}>
      <span className="font-display font-bold uppercase tracking-widest text-2xl">
        {status}
      </span>
    </div>
  );
}
