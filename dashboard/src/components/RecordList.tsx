import React, { useState } from "react";
import { StampStatus } from "./Stamp";
import { LinearProgress } from "./LinearProgress";

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
    <div className="w-full h-full flex flex-col p-4 md:p-6 bg-[var(--color-neu-bg)]">
      {/* Tabs */}
      <div className="flex space-x-4 mb-6 relative self-start">
        <button
          className={`px-8 py-3 rounded-full font-bold text-sm tracking-wide transition-all duration-200 ${
            activeTab === "reconciliation" 
              ? "neu-inset text-[var(--color-neu-accent-start)]" 
              : "neu-pill text-[var(--color-neu-muted)] hover:text-[var(--color-neu-text)]"
          }`}
          onClick={() => onTabChange("reconciliation")}
        >
          Reconciliation
        </button>
        <button
          className={`px-8 py-3 rounded-full font-bold text-sm tracking-wide transition-all duration-200 ${
            activeTab === "recovery" 
              ? "neu-inset text-[var(--color-neu-accent-start)]" 
              : "neu-pill text-[var(--color-neu-muted)] hover:text-[var(--color-neu-text)]"
          }`}
          onClick={() => onTabChange("recovery")}
        >
          Recovery
        </button>
      </div>
      
      <div className="pb-4">
        <span className="text-[10px] font-mono text-[var(--color-neu-muted)] uppercase">
          {activeTab === "reconciliation" ? "Sorted by unresolved first, then confidence" : "Sorted by expected value"}
        </span>
      </div>

      <div className="flex-grow overflow-y-auto space-y-4 pb-12 pr-4">
        {records.map((r, idx) => {
          const isSelected = selectedId === r.id;
          const isPositive = ["RESOLVED", "RECOVERED", "PASSED"].includes(r.status);
          const isWarning = ["UNRESOLVED", "ESCALATED", "BLOCKED"].includes(r.status);
          
          let statusColorClass = "text-[#B39352] bg-[#E3C58C]/20"; // amber-ish
          if (isPositive) statusColorClass = "text-[#4C9A6B] bg-[#8FBFA0]/20"; // green-ish
          if (isWarning) statusColorClass = "text-[#C0564F] bg-[#D9A0A0]/20"; // red-ish

          const recordId = String(r.id || "N/A");
          
          return (
            <div
              key={`${recordId}-${idx}`}
              onClick={() => onSelect(r.id)}
              className={`animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between p-5 cursor-pointer rounded-2xl transition-all duration-200 border-2 border-transparent ${
                isSelected 
                  ? "neu-inset border-[var(--color-neu-bg)]" 
                  : "neu-panel hover:neu-inset"
              }`}
              style={{ animationDelay: `${Math.min(idx * 50, 500)}ms` }}
            >
              <div className="flex items-center space-x-4 mb-3 sm:mb-0">
                <span className="font-mono font-bold text-[var(--color-neu-text)]">{recordId.length > 12 ? recordId.substring(0, 12) + "..." : recordId}</span>
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold ${statusColorClass} flex items-center space-x-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-[#4C9A6B]' : isWarning ? 'bg-[#C0564F]' : 'bg-[#B39352]'}`}></span>
                  <span>{r.status}</span>
                </span>
              </div>
              
              <div className="flex flex-col sm:items-end w-full sm:w-36">
                <span className="font-bold text-[var(--color-neu-text)]">
                  ₹{r.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                
                {(r.confidence !== undefined || r.expectedValue !== undefined) && (
                  <LinearProgress 
                    value={r.confidence !== undefined ? r.confidence : Math.min(1, (r.expectedValue || 0) / r.amount)} 
                  />
                )}
              </div>
            </div>
          );
        })}
        {records.length === 0 && (
          <div className="p-6 text-sm font-mono text-[var(--color-neu-muted)] text-center neu-inset rounded-2xl">
            No unresolved records in this batch
          </div>
        )}
      </div>
    </div>
  );
}
