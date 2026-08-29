import React, { useState, useEffect } from "react";
import { StampStatus } from "./Stamp";

export interface AuditRecord {
  pipeline: string;
  record_id: string;
  status: StampStatus;
  input_summary: string;
  action: string;
}

interface AuditTrailFooterProps {
  records: AuditRecord[];
}

export function AuditTrailFooter({ records }: AuditTrailFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  const filteredRecords = records.filter(r => {
    if (filter !== "ALL" && r.pipeline.toUpperCase() !== filter) return false;
    if (searchTerm && !r.record_id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* Expanded Modal Overlay */}
      <div 
        className={`fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsExpanded(false)}
      >
        <div 
          className={`absolute bottom-0 left-0 right-0 h-[75vh] bg-[var(--color-neu-surface)] shadow-[0_-10px_40px_rgba(163,177,198,0.3)] rounded-t-[32px] flex flex-col transition-transform duration-300 transform ${
            isExpanded ? "translate-y-0" : "translate-y-full"
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 md:p-8 border-b border-gray-200/50 space-y-4 md:space-y-0">
            <div className="flex items-center space-x-8 w-full md:w-auto justify-between md:justify-start">
              <span className="font-bold uppercase tracking-widest text-lg text-[var(--color-neu-text)]">
                System Audit Log
              </span>
              
              <div className="flex space-x-3 hidden sm:flex">
                {["ALL", "RECONCILIATION", "RECOVERY"].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-5 py-2 rounded-full font-mono text-xs transition-all duration-200 ${
                      filter === f 
                        ? "neu-inset text-[var(--color-neu-accent-start)] font-bold" 
                        : "neu-pill text-[var(--color-neu-muted)] hover:text-[var(--color-neu-text)]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Mobile Close Button (shows next to title) */}
              <button 
                onClick={() => setIsExpanded(false)}
                className="md:hidden w-10 h-10 rounded-full neu-pill flex items-center justify-center text-[var(--color-neu-muted)] hover:text-[var(--color-neu-text)] transition-colors active:neu-inset"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center space-x-4 md:space-x-6 w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Search ID..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="neu-inset px-5 py-2.5 rounded-xl font-mono text-sm outline-none text-[var(--color-neu-text)] placeholder-[var(--color-neu-muted)] flex-grow md:w-64"
              />
              {/* Desktop Close Button */}
              <button 
                onClick={() => setIsExpanded(false)}
                className="hidden md:flex w-12 h-12 rounded-full neu-pill items-center justify-center text-[var(--color-neu-muted)] hover:text-[var(--color-neu-text)] transition-colors active:neu-inset"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-grow overflow-y-auto p-4 md:p-8">
            
            {/* Mobile & Tablet View: Cards */}
            <div className="lg:hidden space-y-4">
              {filteredRecords.length === 0 ? (
                <div className="text-center text-[var(--color-neu-muted)] py-8 font-mono text-sm">No records found.</div>
              ) : (
                filteredRecords.map((r, i) => (
                  <div key={i} className="neu-panel p-5 flex flex-col space-y-3 font-mono text-sm transition-all hover:neu-inset">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200/50">
                      <span className="font-bold text-[var(--color-neu-text)] truncate max-w-[150px] sm:max-w-xs">{r.record_id}</span>
                      <span className="text-[10px] text-[var(--color-neu-muted)]">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--color-neu-muted)] uppercase tracking-widest font-bold">Pipeline</span>
                      <span className="font-bold text-[var(--color-neu-text)]">{r.pipeline}</span>
                    </div>
                    <div className="flex flex-col text-xs">
                      <span className="text-[var(--color-neu-muted)] uppercase tracking-widest font-bold mb-1">Input / Hypothesis</span>
                      <span className="text-[var(--color-neu-text)] leading-relaxed">{r.input_summary}</span>
                    </div>
                    <div className="flex flex-col text-xs pb-2 border-b border-gray-200/50">
                      <span className="text-[var(--color-neu-muted)] uppercase tracking-widest font-bold mb-1">Action</span>
                      <span className="text-[var(--color-neu-text)]">{r.action}</span>
                    </div>
                    <div className="flex justify-end pt-1">
                      <span className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold inline-flex items-center space-x-1.5 ${
                        ["RESOLVED", "RECOVERED", "PASSED"].includes(r.status) 
                          ? "text-[#4C9A6B] bg-[#8FBFA0]/20" 
                          : "text-[#C0564F] bg-[#D9A0A0]/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${["RESOLVED", "RECOVERED", "PASSED"].includes(r.status) ? 'bg-[#4C9A6B]' : 'bg-[#C0564F]'}`}></span>
                        <span>{r.status}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden lg:block neu-panel overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200/50 text-[var(--color-neu-muted)] uppercase tracking-widest text-xs">
                    <th className="py-4 px-6 font-bold">Timestamp</th>
                    <th className="py-4 px-6 font-bold">Pipeline</th>
                    <th className="py-4 px-6 font-bold">Record ID</th>
                    <th className="py-4 px-6 font-bold">Input / Hypothesis</th>
                    <th className="py-4 px-6 font-bold">Action</th>
                    <th className="py-4 px-6 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-[var(--color-neu-muted)] py-8">No records found.</td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100/50 hover:bg-[var(--color-neu-bg)] transition-colors group">
                        <td className="py-4 px-6 text-[var(--color-neu-muted)]">{new Date().toLocaleTimeString()}</td>
                        <td className="py-4 px-6 text-[var(--color-neu-text)]">{r.pipeline}</td>
                        <td className="py-4 px-6 font-bold text-[var(--color-neu-text)]">{r.record_id}</td>
                        <td className="py-4 px-6 text-[var(--color-neu-muted)] truncate max-w-[200px] xl:max-w-xs">{r.input_summary}</td>
                        <td className="py-4 px-6 text-[var(--color-neu-text)]">{r.action}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold inline-flex items-center space-x-1.5 ${
                            ["RESOLVED", "RECOVERED", "PASSED"].includes(r.status) 
                              ? "text-[#4C9A6B] bg-[#8FBFA0]/20" 
                              : "text-[#C0564F] bg-[#D9A0A0]/20"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${["RESOLVED", "RECOVERED", "PASSED"].includes(r.status) ? 'bg-[#4C9A6B]' : 'bg-[#C0564F]'}`}></span>
                            <span>{r.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsed Ticker Bar */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-14 bg-[var(--color-neu-surface)] rounded-t-3xl shadow-[0_-8px_20px_rgba(163,177,198,0.25)] border-t border-white/60 z-30 cursor-pointer flex items-center px-6 transition-colors hover:bg-white/80"
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center space-x-4 w-full">
          <span className="font-bold uppercase tracking-widest text-xs neu-gradient-text flex-shrink-0">
            Live Audit
          </span>
          <div className="h-4 w-px bg-gray-300 mx-2"></div>
          
          <div className="flex-grow overflow-hidden relative h-full flex items-center">
            {records.length > 0 ? (
              <div className="animate-ticker whitespace-nowrap font-mono text-xs text-[var(--color-neu-muted)] flex space-x-8">
                {records.slice(0, 10).map((r, i) => (
                  <span key={i}>
                    <span className="opacity-50 mr-2">{new Date().toLocaleTimeString()}</span>
                    <span className="font-bold mr-2 text-[var(--color-neu-text)]">{r.record_id}</span>
                    <span className={["RESOLVED", "RECOVERED", "PASSED"].includes(r.status) ? "text-[#4C9A6B]" : "text-[#C0564F]"}>
                      [{r.status}]
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="font-mono text-xs text-[var(--color-neu-muted)]">Awaiting system events...</span>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center space-x-2 text-[var(--color-neu-muted)]">
            <span className="text-[10px] uppercase tracking-widest font-bold">Expand</span>
            <span className="neu-inset px-2 py-1 rounded-md text-[10px] font-mono font-bold">Cmd+J</span>
          </div>
        </div>
      </div>
    </>
  );
}
