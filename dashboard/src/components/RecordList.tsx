import React, { useState } from "react";
import { StampStatus } from "./Stamp";

export interface RecordItem {
  id: string;
  amount: number;
  status: StampStatus;
  confidence?: number; // 0 to 1
  expectedValue?: number;
}

interface RecordListProps {
  activeTab: "reconciliation" | "recovery";
  onTabChange: (tab: "reconciliation" | "recovery") => void;
  records: RecordItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RecordList({ activeTab, onTabChange, records, selectedId, onSelect }: RecordListProps) {
  return (
    <div className="w-full md:w-[55%] h-full flex flex-col p-6 pl-8">
      {/* Tabs as an inset track */}
      <div className="clay-inset p-1.5 flex mb-6 relative self-start">
        <div className="flex relative z-10 w-full">
          <button
            className={`px-6 py-2 rounded-full font-display uppercase tracking-widest text-sm font-bold transition-colors ${
              activeTab === "reconciliation" 
                ? "text-[var(--color-clay-accent)]" 
                : "text-[var(--color-clay-muted)] hover:text-[var(--color-clay-ink)]"
            }`}
            onClick={() => onTabChange("reconciliation")}
          >
            Reconciliation
          </button>
          <button
            className={`px-6 py-2 rounded-full font-display uppercase tracking-widest text-sm font-bold transition-colors ${
              activeTab === "recovery" 
                ? "text-[var(--color-clay-accent)]" 
                : "text-[var(--color-clay-muted)] hover:text-[var(--color-clay-ink)]"
            }`}
            onClick={() => onTabChange("recovery")}
          >
            Recovery
          </button>
        </div>
        
        {/* Animated pill slider */}
        <div 
          className="absolute top-1.5 bottom-1.5 w-1/2 clay-pill transition-all duration-300 ease-in-out"
          style={{ left: activeTab === "reconciliation" ? "6px" : "calc(50% - 6px)" }}
        />
      </div>
      
      <div className="pb-4">
        <span className="text-[10px] font-mono text-[var(--color-clay-muted)] uppercase">
          {activeTab === "reconciliation" ? "Sorted by unresolved first, then confidence" : "Sorted by expected value"}
        </span>
      </div>

      <div className="flex-grow overflow-y-auto space-y-4 pr-4 pb-12">
        {records.map((r, idx) => {
          const isSelected = selectedId === r.id;
          const isPositive = ["RESOLVED", "RECOVERED", "PASSED"].includes(r.status);
          const isWarning = ["UNRESOLVED", "ESCALATED", "BLOCKED"].includes(r.status);
          
          let statusColorClass = "text-[var(--color-clay-amber)] bg-[var(--color-clay-amber)]/20";
          if (isPositive) statusColorClass = "text-[var(--color-clay-green)] bg-[var(--color-clay-green)]/20";
          if (isWarning) statusColorClass = "text-[var(--color-clay-red)] bg-[var(--color-clay-red)]/20";

          const recordId = String(r.id || "N/A");
          
          return (
            <div
              key={`${recordId}-${idx}`}
              onClick={() => onSelect(r.id)}
              className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-all duration-120 border-2 border-transparent ${
                isSelected 
                  ? "clay-inset border-[var(--color-clay-base)]" 
                  : "clay-card hover:clay-inset"
              }`}
            >
              <div className="flex items-center space-x-4">
                <span className="font-mono text-[var(--color-clay-ink)]">{recordId.length > 12 ? recordId.substring(0, 12) + "..." : recordId}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-mono font-bold ${statusColorClass}`}>
                  {r.status}
                </span>
              </div>
              
              <div className="flex flex-col items-end w-32">
                <span className="font-mono text-sm text-[var(--color-clay-ink)]">
                  ₹{r.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                
                {(r.confidence !== undefined || r.expectedValue !== undefined) && (
                  <div className="w-full h-1.5 clay-inset mt-2 relative overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-[var(--color-clay-accent)] rounded-full opacity-80"
                      style={{ 
                        width: r.confidence !== undefined 
                          ? `${r.confidence * 100}%` 
                          : `${Math.min(100, ((r.expectedValue || 0) / r.amount) * 100)}%` 
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {records.length === 0 && (
          <div className="px-6 py-8 text-sm font-mono text-[var(--color-clay-muted)]">
            No unresolved records in this batch
          </div>
        )}
      </div>
    </div>
  );
}
