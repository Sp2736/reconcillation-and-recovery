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
        className={`fixed inset-0 bg-[var(--color-clay-base)]/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsExpanded(false)}
      >
        <div 
          className={`absolute bottom-0 left-0 right-0 h-[75vh] clay-card !rounded-b-none !rounded-t-[32px] flex flex-col transition-transform duration-300 transform ${
            isExpanded ? "translate-y-0" : "translate-y-full"
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b-2 border-[var(--color-clay-base)]">
            <div className="flex items-center space-x-6">
              <span className="font-display font-bold uppercase tracking-widest text-lg text-[var(--color-clay-ink)]">
                System Audit Log
              </span>
              
              <div className="flex space-x-2">
                {["ALL", "RECONCILIATION", "RECOVERY"].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-full font-mono text-xs transition-colors ${
                      filter === f 
                        ? "clay-inset font-bold text-[var(--color-clay-accent)]" 
                        : "text-[var(--color-clay-muted)] hover:text-[var(--color-clay-ink)] hover:clay-inset"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <input 
                type="text" 
                placeholder="Search ID..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="clay-inset px-4 py-2 font-mono text-sm outline-none text-[var(--color-clay-ink)] placeholder-[var(--color-clay-muted)] w-64"
              />
              <button 
                onClick={() => setIsExpanded(false)}
                className="w-10 h-10 rounded-full clay-pill flex items-center justify-center text-[var(--color-clay-muted)] hover:text-[var(--color-clay-ink)] active:clay-inset"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-grow overflow-y-auto p-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--color-clay-base)] text-[var(--color-clay-muted)] font-display uppercase tracking-widest text-xs">
                  <th className="pb-3 px-4 font-normal">Timestamp</th>
                  <th className="pb-3 px-4 font-normal">Pipeline</th>
                  <th className="pb-3 px-4 font-normal">Record ID</th>
                  <th className="pb-3 px-4 font-normal">Input / Hypothesis</th>
                  <th className="pb-3 px-4 font-normal">Action</th>
                  <th className="pb-3 px-4 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {filteredRecords.map((r, i) => (
                  <tr key={i} className="border-b border-[var(--color-clay-base)] hover:bg-black/[0.02] transition-colors group">
                    <td className="py-4 px-4 text-[var(--color-clay-muted)]">{new Date().toLocaleTimeString()}</td>
                    <td className="py-4 px-4 text-[var(--color-clay-ink)]">{r.pipeline}</td>
                    <td className="py-4 px-4 font-bold text-[var(--color-clay-ink)]">{r.record_id}</td>
                    <td className="py-4 px-4 text-[var(--color-clay-muted)] truncate max-w-xs">{r.input_summary}</td>
                    <td className="py-4 px-4 text-[var(--color-clay-ink)]">{r.action}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        ["RESOLVED", "RECOVERED", "PASSED"].includes(r.status) 
                          ? "text-[var(--color-clay-green)] bg-[var(--color-clay-green)]/10" 
                          : "text-[var(--color-clay-red)] bg-[var(--color-clay-red)]/10"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Collapsed Ticker Bar */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-12 bg-[var(--color-clay-surface)] rounded-t-3xl shadow-[0_-8px_16px_rgba(163,177,198,0.2)] border-t border-white/50 z-30 cursor-pointer flex items-center px-6 transition-colors hover:bg-white/50"
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center space-x-4 w-full">
          <span className="font-display font-bold uppercase tracking-widest text-xs text-[var(--color-clay-accent)] flex-shrink-0">
            Live Audit
          </span>
          <div className="h-4 w-px bg-[var(--color-clay-base)] mx-2"></div>
          
          <div className="flex-grow overflow-hidden relative h-full flex items-center">
            {records.length > 0 ? (
              <div className="animate-ticker whitespace-nowrap font-mono text-xs text-[var(--color-clay-muted)] flex space-x-8">
                {records.slice(0, 10).map((r, i) => (
                  <span key={i}>
                    <span className="opacity-50 mr-2">{new Date().toLocaleTimeString()}</span>
                    <span className="font-bold mr-2 text-[var(--color-clay-ink)]">{r.record_id}</span>
                    <span className={["RESOLVED", "RECOVERED", "PASSED"].includes(r.status) ? "text-[var(--color-clay-green)]" : "text-[var(--color-clay-red)]"}>
                      [{r.status}]
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="font-mono text-xs text-[var(--color-clay-muted)]">Awaiting system events...</span>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center space-x-2 text-[var(--color-clay-muted)]">
            <span className="font-display text-[10px] uppercase tracking-widest">Expand</span>
            <span className="clay-inset px-1.5 py-0.5 rounded text-[10px] font-mono">Cmd+J</span>
          </div>
        </div>
      </div>
    </>
  );
}
