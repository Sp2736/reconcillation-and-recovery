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
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (record) {
      setTimeout(() => setIsVisible(true), 50);
      setActiveStep(record.outcome ? 4 : 3); // auto-select the latest step
    } else {
      setIsVisible(false);
    }
  }, [record]);

  if (!record) return null;

  const steps = [
    { label: "Input", content: <div className="font-mono text-sm whitespace-pre-wrap text-[var(--color-neu-text)]">{JSON.stringify(record.inputData, null, 2)}</div> },
    { label: "Reasoning", content: <p className="text-base text-[var(--color-neu-text)] leading-relaxed">{record.reasoning}</p> },
    { label: "Policy", content: (
      <div className="flex items-center space-x-6">
        <div className={`w-14 h-8 rounded-full flex items-center p-1 cursor-pointer transition-colors ${
          ["RESOLVED", "PASSED", "RECOVERED"].includes(record.policyCheck.status) ? "neu-gradient-bg" : "neu-inset bg-gray-300"
        }`}>
          <div className="w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform" style={{ transform: ["RESOLVED", "PASSED", "RECOVERED"].includes(record.policyCheck.status) ? "translateX(24px)" : "translateX(0)" }} />
        </div>
        <div className={`font-bold tracking-widest uppercase flex items-center space-x-2 ${
          ["RESOLVED", "PASSED", "RECOVERED"].includes(record.policyCheck.status) ? "text-[#4C9A6B]" : "text-[#C0564F]"
        }`}>
          <span className={`w-2 h-2 rounded-full ${["RESOLVED", "PASSED", "RECOVERED"].includes(record.policyCheck.status) ? "bg-[#4C9A6B]" : "bg-[#C0564F]"}`}></span>
          <span>{record.policyCheck.text}</span>
        </div>
      </div>
    )},
    { label: "Action", content: <div className="font-mono text-base text-[var(--color-neu-text)] p-4 rounded-xl neu-inset">&gt; {record.action}</div> },
    { label: "Outcome", content: <div className="font-mono text-base text-[var(--color-neu-text)]">{record.outcome || "Pending..."}</div> }
  ];

  return (
    <div className={`absolute md:relative inset-0 w-full h-full z-20 p-4 md:p-6 transition-transform duration-300 transform ${isVisible ? 'translate-x-0' : 'translate-x-[110%] md:translate-x-0'}`}>
      <div className="h-full w-full neu-panel flex flex-col p-6 md:p-8 overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-200/50">
          <div className="flex flex-col">
            <span className="text-xs text-[var(--color-neu-muted)] tracking-widest uppercase font-bold mb-1">Evidence Trail</span>
            <span className="font-mono text-xl font-bold text-[var(--color-neu-text)]">{record.id}</span>
          </div>
          <button 
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="w-12 h-12 rounded-full neu-pill flex items-center justify-center text-[var(--color-neu-muted)] hover:text-[var(--color-neu-text)] transition-colors active:neu-inset"
          >
            ✕
          </button>
        </div>

        {/* Horizontal Stepped Timeline */}
        <div className="relative mb-12 flex justify-between items-center px-2">
          {/* Track line */}
          <div className="absolute left-6 right-6 top-1/2 h-1.5 neu-inset transform -translate-y-1/2 z-0"></div>
          
          {steps.map((step, idx) => {
            const isActive = idx === activeStep;
            const isPast = idx < activeStep;
            const isAvailable = idx <= (record.outcome ? 4 : 3);
            
            return (
              <div 
                key={step.label} 
                className={`relative z-10 flex flex-col items-center cursor-pointer transition-all ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-1'}`}
                onClick={() => isAvailable && setActiveStep(idx)}
              >
                <div className={`w-6 h-6 rounded-full mb-3 flex items-center justify-center transition-all duration-300 ${
                  isActive ? 'neu-gradient-bg scale-125 shadow-lg' : isPast ? 'bg-[var(--color-neu-accent-start)]' : 'neu-inset'
                }`}>
                  {isActive && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-bold transition-colors ${
                  isActive ? 'text-[var(--color-neu-text)]' : 'text-[var(--color-neu-muted)]'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Active Step Content */}
        <div className="flex-grow flex flex-col relative">
          <div className="neu-inset p-6 md:p-8 rounded-2xl min-h-[250px]">
            <span className="text-xs uppercase tracking-widest text-[var(--color-neu-muted)] font-bold mb-4 block">
              {steps[activeStep].label} Detail
            </span>
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {steps[activeStep].content}
            </div>
          </div>
        </div>

        {/* Final Stamp Container */}
        <div className="mt-8 flex justify-center pb-4 relative items-center">
          <Stamp status={record.policyCheck.status} />
        </div>
      </div>
    </div>
  );
}
