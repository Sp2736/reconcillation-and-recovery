const API_BASE = "http://localhost:8000";

export async function fetchReconciliationMetrics() {
  const res = await fetch(`${API_BASE}/metrics/reconciliation`);
  if (!res.ok) throw new Error("Failed to fetch reconciliation metrics");
  return res.json();
}

export async function fetchRecoverySummary() {
  const res = await fetch(`${API_BASE}/recovery/summary`);
  if (!res.ok) throw new Error("Failed to fetch recovery summary");
  return res.json();
}

export async function fetchRecoveryQueue(limit = 50) {
  const res = await fetch(`${API_BASE}/recovery/queue?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch recovery queue");
  return res.json();
}

export async function fetchResolvedReconciliation() {
  const res = await fetch(`${API_BASE}/reconciliation/resolved`);
  if (!res.ok) throw new Error("Failed to fetch resolved reconciliation records");
  return res.json();
}

export async function fetchUnresolvedReconciliation() {
  const res = await fetch(`${API_BASE}/reconciliation/unresolved`);
  if (!res.ok) throw new Error("Failed to fetch unresolved reconciliation records");
  return res.json();
}

export async function fetchAuditTrail() {
  const res = await fetch(`${API_BASE}/audit-trail`);
  if (!res.ok) throw new Error("Failed to fetch audit trail");
  return res.json();
}
