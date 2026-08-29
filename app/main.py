"""
FastAPI app serving pipeline outputs to the dashboard frontend.

Run the pipelines first (see README), then:
    uvicorn app.main:app --reload --port 8000
"""
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

DATA_DIR = Path(__file__).parent.parent / "data_generation" / "out"

app = FastAPI(title="Reconciliation + Revenue Recovery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for anything beyond the demo
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_json(name: str):
    path = DATA_DIR / name
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"{name} not found — run the pipelines first")
    with open(path) as f:
        return json.load(f)


@app.get("/metrics/reconciliation")
def reconciliation_metrics():
    return load_json("metrics.json")


@app.get("/reconciliation/unresolved")
def reconciliation_unresolved():
    stage3 = load_json("stage3_results.json")
    return {k: v for k, v in stage3.items() if v["status"] == "UNRESOLVED"}


@app.get("/reconciliation/resolved")
def reconciliation_resolved():
    stage12 = load_json("stage1_2_results.json")["matched"]
    stage3 = load_json("stage3_results.json")
    resolved = {k: v for k, v in stage12.items() if v["status"] == "RESOLVED"}
    resolved.update({k: v for k, v in stage3.items() if v["status"] == "RESOLVED"})
    return resolved


@app.get("/recovery/summary")
def recovery_summary():
    return load_json("recovery_summary.json")


@app.get("/recovery/queue")
def recovery_queue(limit: int = 50):
    return load_json("recovery_queue.json")[:limit]


@app.get("/audit-trail")
def audit_trail():
    """Combined audit trail: reconciliation stage3 decisions + recovery
    executions, in one feed for the dashboard's audit trail viewer."""
    stage3 = load_json("stage3_results.json")
    recon_entries = [
        {"pipeline": "reconciliation", "record_id": rid, **v}
        for rid, v in stage3.items()
    ]
    recovery_entries = [
        {"pipeline": "recovery", **entry}
        for entry in load_json("recovery_audit_trail.json")
    ]
    return recon_entries + recovery_entries


@app.get("/health")
def health():
    return {"status": "ok"}
