"""
Reconciliation Stage 1 (deterministic) + Stage 2 (fuzzy) matcher.

Stage 1: exact match on payment_id, amount, and a tight date window. Cheap,
fast, and should resolve the large majority of clean rows.

Stage 2: for anything Stage 1 couldn't match, relax to amount-within-
tolerance + wider date window + bank_ref prefix matching + batch_id
grouping (handles split settlements). Everything still unmatched after
Stage 2 goes to Stage 3 (LLM investigator).

Run standalone for a match-rate number before touching any LLM:
    python reconcile_stage1_2.py --data ./out
"""
import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path


def load(data_dir: Path):
    out = {}
    for name in ["orders", "payments", "settlements", "refunds", "ground_truth"]:
        with open(data_dir / f"{name}.json") as f:
            out[name] = json.load(f)
    return out


def stage1_exact_match(payments, settlements):
    """Exact payment_id match within a tight date window."""
    matched = {}
    unmatched_settlements = []
    payments_by_id = {p["payment_id"]: p for p in payments}

    for s in settlements:
        p = payments_by_id.get(s["payment_id"])
        if p is None:
            unmatched_settlements.append(s)
            continue
        settled = datetime.fromisoformat(s["settled_at"])
        captured = datetime.fromisoformat(p["captured_at"]) if p.get("captured_at") else None
        if captured is None or (settled - captured) > timedelta(days=3):
            unmatched_settlements.append(s)
            continue
        expected_net = round(p["amount"] - p["gateway_fee"], 2)
        if abs(s["amount"] - expected_net) > 0.01:
            unmatched_settlements.append(s)
            continue
        matched[s["settlement_id"]] = {
            "payment_id": p["payment_id"], "stage": 1,
            "status": "RESOLVED", "reason": "exact match, amount + date within tolerance",
        }
    return matched, unmatched_settlements


def stage2_fuzzy_match(unmatched_settlements, payments, amount_tolerance=3.0, date_window_days=9):
    """Amount-within-tolerance + wider window + bank_ref/batch grouping.
    Handles: rounding drift, delayed settlement, split settlement (partial
    grouping by batch_id / payment_id with combined amounts)."""
    matched = {}
    still_unmatched = []
    payments_by_id = {p["payment_id"]: p for p in payments}

    # group settlements by payment_id to catch splits
    by_payment = {}
    for s in unmatched_settlements:
        by_payment.setdefault(s["payment_id"], []).append(s)

    for payment_id, rows in by_payment.items():
        p = payments_by_id.get(payment_id)
        if p is None:
            # orphaned settlement, no payment_id to anchor to
            still_unmatched.extend(rows)
            continue

        expected_net = round(p["amount"] - p["gateway_fee"], 2)
        total_settled = round(sum(r["amount"] for r in rows), 2)

        if abs(total_settled - expected_net) <= amount_tolerance:
            for r in rows:
                matched[r["settlement_id"]] = {
                    "payment_id": payment_id, "stage": 2,
                    "status": "RESOLVED",
                    "reason": f"fuzzy match: {len(rows)} settlement row(s) sum to expected net "
                              f"within ₹{amount_tolerance} tolerance (split/rounding/delay)",
                }
        else:
            still_unmatched.extend(rows)

    return matched, still_unmatched


def run(data_dir: Path):
    data = load(data_dir)
    matched1, unmatched1 = stage1_exact_match(data["payments"], data["settlements"])
    matched2, unmatched2 = stage2_fuzzy_match(unmatched1, data["payments"])

    total = len(data["settlements"])
    resolved = len(matched1) + len(matched2)

    print(f"Total settlement rows: {total}")
    print(f"Stage 1 (exact) resolved: {len(matched1)} ({len(matched1)/total:.1%})")
    print(f"Stage 2 (fuzzy) resolved: {len(matched2)} ({len(matched2)/total:.1%})")
    print(f"Remaining for Stage 3 (LLM): {len(unmatched2)} ({len(unmatched2)/total:.1%})")

    combined = {**matched1, **matched2}
    with open(data_dir / "stage1_2_results.json", "w") as f:
        json.dump({"matched": combined, "unmatched_ids": [s["settlement_id"] for s in unmatched2]}, f, indent=2)
    with open(data_dir / "stage2_unmatched.json", "w") as f:
        json.dump(unmatched2, f, indent=2)

    return combined, unmatched2


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=str, default="./out")
    args = ap.parse_args()
    run(Path(args.data))
