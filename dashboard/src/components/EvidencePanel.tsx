import React, { useEffect, useState } from "react";
import { Stamp, StampStatus } from "./Stamp";

export interface EvidenceRecord {
  id: string;
  type: "reconciliation" | "recovery";
  inputData: any;
  reasoning: string;
  policyCheck: {
    status: StampStatus;
    text: string;
  };
  action: string;
  outcome?: string;
}

interface EvidencePanelProps {
  record: EvidenceRecord | null;
  onClose: () => void;
}

export function EvidencePanel({ record, onClose }: EvidencePanelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (record) {
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [record]);

  if (!record) return null;

  const isRecon = record.type === "reconciliation";
  const statusColor = record.policyCheck.status === "RESOLVED" || record.policyCheck.status === "PASSED" || record.policyCheck.status === "RECOVERED"
    ? "text-[var(--color-clay-green)]"
    : "text-[var(--color-clay-red)]";

  return (
    <div className={`absolute right-4 top-4 bottom-4 w-full md:w-[45%] max-w-xl z-20 transition-transform duration-300 transform ${isVisible ? 'translate-x-0' : 'translate-x-[110%]'}`}>
      <div className="h-full w-full clay-card flex flex-col shadow-2xl p-6 overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b-2 border-[var(--color-clay-base)] pb-4">
          <div className="flex flex-col">
            <span className="font-mono text-sm text-[var(--color-clay-muted)] tracking-widest uppercase">Evidence Trail</span>
            <span className="font-mono text-xl font-bold text-[var(--color-clay-ink)]">{record.id}</span>
          </div>
          <button 
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="w-10 h-10 rounded-full clay-pill flex items-center justify-center text-[var(--color-clay-muted)] hover:text-[var(--color-clay-ink)] transition-colors active:clay-inset"
          >
            ✕
          </button>
        </div>

        {/* Trail Stages */}
        <div className="flex flex-col space-y-6 flex-grow">
          
          <div className="clay-inset p-5 flex flex-col relative">
            <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full clay-pill flex items-center justify-center font-mono text-xs font-bold text-[var(--color-clay-muted)] bg-[var(--color-clay-surface)]">1</span>
            <span className="text-xs uppercase tracking-widest text-[var(--color-clay-muted)] font-display font-bold mb-2">Input Context</span>
            <div className="font-mono text-sm whitespace-pre-wrap text-[var(--color-clay-ink)] break-words">
              {JSON.stringify(record.inputData, null, 2)}
            </div>
          </div>

          <div className="clay-inset p-5 flex flex-col relative">
            <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full clay-pill flex items-center justify-center font-mono text-xs font-bold text-[var(--color-clay-muted)] bg-[var(--color-clay-surface)]">2</span>
            <span className="text-xs uppercase tracking-widest text-[var(--color-clay-muted)] font-display font-bold mb-2">AI Reasoning / Hypothesis</span>
            <p className="font-body text-base text-[var(--color-clay-ink)]">
              {record.reasoning}
            </p>
          </div>

          <div className="clay-inset p-5 flex flex-col relative">
            <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full clay-pill flex items-center justify-center font-mono text-xs font-bold text-[var(--color-clay-muted)] bg-[var(--color-clay-surface)]">3</span>
            <span className="text-xs uppercase tracking-widest text-[var(--color-clay-muted)] font-display font-bold mb-2">Policy Gate</span>
            <div className={`font-mono text-lg font-bold ${statusColor}`}>
              {record.policyCheck.text}
            </div>
          </div>

          <div className="clay-inset p-5 flex flex-col relative">
            <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full clay-pill flex items-center justify-center font-mono text-xs font-bold text-[var(--color-clay-muted)] bg-[var(--color-clay-surface)]">4</span>
            <span className="text-xs uppercase tracking-widest text-[var(--color-clay-muted)] font-display font-bold mb-2">System Action</span>
            <div className="font-mono text-base text-[var(--color-clay-ink)] p-3 rounded-lg border border-[var(--color-clay-base)] bg-white/40">
              &gt; {record.action}
            </div>
          </div>

          {record.outcome && (
            <div className="clay-inset p-5 flex flex-col relative">
              <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full clay-pill flex items-center justify-center font-mono text-xs font-bold text-[var(--color-clay-muted)] bg-[var(--color-clay-surface)]">5</span>
              <span className="text-xs uppercase tracking-widest text-[var(--color-clay-muted)] font-display font-bold mb-2">Outcome</span>
              <div className="font-mono text-base text-[var(--color-clay-ink)]">
                {record.outcome}
              </div>
            </div>
          )}

        </div>

        {/* Final Stamp Container */}
        <div className="mt-8 flex justify-center pb-8 relative h-32 items-center">
          <Stamp status={record.policyCheck.status} />
        </div>
      </div>
    </div>
  );
}
