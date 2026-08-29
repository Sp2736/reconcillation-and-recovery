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
  const colorClass = isPositive ? "text-[#4C9A6B]" : "text-[#C0564F]";
  const dotClass = isPositive ? "bg-[#4C9A6B]" : "bg-[#C0564F]";
  
  if (!isAnimating) return null;

  return (
    <div className={`neu-pill flex items-center justify-center px-10 py-4 space-x-3 transition-transform duration-300 scale-100 hover:scale-105 border border-white/50`}>
      <div className={`w-4 h-4 rounded-full ${dotClass} shadow-sm`}></div>
      <span className={`font-bold uppercase tracking-widest text-2xl ${colorClass}`}>
        {status}
      </span>
    </div>
  );
}
