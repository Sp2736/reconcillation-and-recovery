"use client";
import React, { useEffect, useState, useMemo } from "react";
import { LedgerHeader } from "@/components/LedgerHeader";
import { RecordList, RecordItem } from "@/components/RecordList";
import { EvidencePanel, EvidenceRecord } from "@/components/EvidencePanel";
import { AuditTrailFooter, AuditRecord } from "@/components/AuditTrailFooter";
import { StampStatus } from "@/components/Stamp";

import {
  fetchReconciliationMetrics,
  fetchRecoverySummary,
  fetchRecoveryQueue,
  fetchResolvedReconciliation,
  fetchUnresolvedReconciliation,
  fetchAuditTrail
} from "@/lib/api";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"reconciliation" | "recovery">("reconciliation");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [headerData, setHeaderData] = useState({
    atRisk: 0,
    recovered: 0,
    matchRate: 0,
    unresolvedCount: 0,
  });

  const [reconData, setReconData] = useState<Record<string, any>>({});
  const [reconResolvedData, setReconResolvedData] = useState<Record<string, any>>({});
  const [recoveryQueue, setRecoveryQueue] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditRecord[]>([]);

  useEffect(() => {
    // Fetch all data using API client
    Promise.all([
      fetchReconciliationMetrics().catch(() => ({})),
      fetchRecoverySummary().catch(() => ({})),
      fetchUnresolvedReconciliation().catch(() => ({})),
      fetchResolvedReconciliation().catch(() => ({})),
      fetchRecoveryQueue(50).catch(() => []),
      fetchAuditTrail().catch(() => [])
    ]).then(([reconMetrics, recoverySum, reconUnres, reconRes, recQueue, audit]) => {
      
      setHeaderData({
        atRisk: recoverySum.total_at_risk || 0,
        recovered: recoverySum.simulated_recovered || 0,
        matchRate: (reconMetrics.auto_matched_pct || 0) + (reconMetrics.llm_resolved_pct || 0),
        unresolvedCount: reconMetrics.unresolved_count || Object.keys(reconUnres).length,
      });

      setReconData(reconUnres);
      setReconResolvedData(reconRes);
      setRecoveryQueue(recQueue);
      
      setAuditTrail(Array.isArray(audit) ? audit.map((a: any) => ({
        pipeline: a.pipeline,
        record_id: a.record_id,
        status: a.status as StampStatus,
        input_summary: a.hypothesis || a.failure_reason || "Record processed",
        action: a.action || a.recommended_action || "Processed"
      })) : []);
    });
  }, []);

  const reconList: RecordItem[] = useMemo(() => {
    const unres = Object.entries(reconData)
      .filter(([id]) => id !== "detail")
      .map(([id, val]) => ({
        id,
        amount: val.amount || 0,
        status: (val.status as StampStatus) || "UNRESOLVED",
        confidence: val.confidence
      }));
    const res = Object.entries(reconResolvedData)
      .filter(([id]) => id !== "detail")
      .map(([id, val]) => ({
        id,
        amount: val.amount || 0,
        status: (val.status as StampStatus) || "RESOLVED",
        confidence: val.confidence
      }));
    return [...unres, ...res].sort((a, b) => {
      if (a.status === "UNRESOLVED" && b.status !== "UNRESOLVED") return -1;
      if (b.status === "UNRESOLVED" && a.status !== "UNRESOLVED") return 1;
      return (a.confidence || 0) - (b.confidence || 0);
    });
  }, [reconData, reconResolvedData]);

  const recoveryList: RecordItem[] = useMemo(() => {
    if (!Array.isArray(recoveryQueue)) return [];
    return recoveryQueue.map((item, idx) => ({
      id: item.subscription_id || item.payment_id || item.record_id || `REC-${idx}`,
      amount: item.amount || 0,
      status: (item.outcome === "recovered" ? "RECOVERED" : "UNRESOLVED") as StampStatus,
      expectedValue: item.expected_value
    })).sort((a, b) => (b.expectedValue || 0) - (a.expectedValue || 0));
  }, [recoveryQueue]);

  const activeRecords = activeTab === "reconciliation" ? reconList : recoveryList;

  const getEvidenceRecord = (id: string | null): EvidenceRecord | null => {
    if (!id) return null;
    
    if (activeTab === "reconciliation") {
      const data = reconData[id] || reconResolvedData[id];
      if (!data) return null;
      return {
        id,
        type: "reconciliation",
        inputData: data.input_record || { id, amount: data.amount, bank_ref: data.bank_ref, date: data.date },
        reasoning: data.hypothesis || `Rule fired: ${data.rule_name || "Deterministic Match"}`,
        policyCheck: {
          status: (data.status as StampStatus) || "UNRESOLVED",
          text: data.status === "RESOLVED" ? "CONFIDENCE THRESHOLD PASSED" : "CONFIDENCE TOO LOW / ESCALATED"
        },
        action: data.recommended_action || (data.status === "RESOLVED" ? "Auto-matched" : "Flagged for human review")
      };
    } else {
      const data = recoveryQueue.find(r => r.subscription_id === id || r.payment_id === id);
      if (!data) return null;
      return {
        id,
        type: "recovery",
        inputData: { id, failure: data.failure_reason, category: data.category, retry_count: data.retry_count },
        reasoning: `Failure category: ${data.category}. P(recover): ${(data.p_recover * 100).toFixed(1)}%. Expected value: ₹${data.expected_value}`,
        policyCheck: {
          status: (data.outcome === "recovered" ? "PASSED" : "BLOCKED") as StampStatus,
          text: data.policy_gate || (data.outcome === "recovered" ? "POLICY PASSED" : "MAX RETRIES REACHED")
        },
        action: data.action || "No action",
        outcome: data.outcome === "recovered" ? `Recovered ₹${data.amount}` : "Failed to recover"
      };
    }
  };

  const evidenceRecord = getEvidenceRecord(selectedId);

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--color-neu-bg)] overflow-hidden">
      <LedgerHeader {...headerData} />
      
      <main className="flex-grow flex flex-col md:flex-row relative overflow-hidden">
        {/* Record List View */}
        <div className={`flex-grow h-full overflow-hidden ${selectedId ? 'hidden md:block md:w-1/2 lg:w-[55%]' : 'w-full'}`}>
          <RecordList 
            activeTab={activeTab} 
            onTabChange={(tab) => {
              setActiveTab(tab);
              setSelectedId(null);
            }} 
            records={activeRecords}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        
        {/* Detail/Evidence View (Full screen on mobile if selected, side panel on tablet+) */}
        {selectedId && (
          <div className="absolute inset-0 z-20 bg-[var(--color-neu-bg)] md:relative md:z-auto md:w-1/2 lg:w-[45%] h-full">
            <EvidencePanel 
              record={evidenceRecord} 
              onClose={() => setSelectedId(null)} 
            />
          </div>
        )}
      </main>

      {/* Audit trail footer/section */}
      <div className="lg:block">
         <AuditTrailFooter records={auditTrail} />
      </div>
    </div>
  );
}
