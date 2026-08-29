"""
Computes the metrics table for METRICS.md directly from ground_truth.json —
never type these numbers by hand in the pitch deck.

Usage:
    python compute_metrics.py --data ./out
"""
import argparse
import json
import math
from pathlib import Path


def wilson_confidence_interval(successes: int, n: int, z: float = 1.96):
    """95% Wilson score interval — more reliable than a normal approximation
    at the sample sizes this project actually has (n~100-150), where a
    naive ±1.96*sqrt(p(1-p)/n) interval can overshoot past 0 or 1."""
    if n == 0:
        return (float("nan"), float("nan"))
    p = successes / n
    denom = 1 + z**2 / n
    centre = p + z**2 / (2 * n)
    adj = z * math.sqrt((p * (1 - p) / n) + (z**2 / (4 * n**2)))
    lower = (centre - adj) / denom
    upper = (centre + adj) / denom
    return (round(max(0.0, lower), 4), round(min(1.0, upper), 4))


def run(data_dir: Path):
    with open(data_dir / "ground_truth.json") as f:
        ground_truth = json.load(f)
    with open(data_dir / "settlements.json") as f:
        settlements = json.load(f)
    with open(data_dir / "stage1_2_results.json") as f:
        stage12 = json.load(f)["matched"]

    stage3_path = data_dir / "stage3_results.json"
    stage3 = json.load(open(stage3_path)) if stage3_path.exists() else {}

    total = len(settlements)
    final_status = {}
    for sid in [s["settlement_id"] for s in settlements]:
        if sid in stage12:
            final_status[sid] = stage12[sid]["status"]
        elif sid in stage3:
            final_status[sid] = stage3[sid]["status"]
        else:
            final_status[sid] = "UNRESOLVED"  # never reached stage 3, e.g. no API key run

    auto_matched = sum(1 for v in stage12.values() if v["status"] == "RESOLVED")
    llm_resolved = sum(1 for v in stage3.values() if v["status"] == "RESOLVED")
    unresolved = sum(1 for v in final_status.values() if v == "UNRESOLVED")

    # precision/recall only computable on the subset with injected ground truth
    chaos_ids = set(ground_truth.keys())
    tp = fp = fn = tn = 0
    false_resolutions = 0
    for sid in chaos_ids:
        expected = ground_truth[sid]["correct_status"]
        actual = final_status.get(sid, "UNRESOLVED")
        if expected == "RESOLVED" and actual == "RESOLVED":
            tp += 1
        elif expected == "RESOLVED" and actual == "UNRESOLVED":
            fn += 1
        elif expected == "UNRESOLVED" and actual == "RESOLVED":
            fp += 1
            false_resolutions += 1  # this is the "lied about matching" case
        elif expected == "UNRESOLVED" and actual == "UNRESOLVED":
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) else float("nan")
    recall = tp / (tp + fn) if (tp + fn) else float("nan")
    false_resolution_rate = false_resolutions / len(chaos_ids) if chaos_ids else float("nan")

    precision_ci = wilson_confidence_interval(tp, tp + fp) if (tp + fp) else (float("nan"), float("nan"))
    recall_ci = wilson_confidence_interval(tp, tp + fn) if (tp + fn) else (float("nan"), float("nan"))

    metrics = {
        "total_settlement_records": total,
        "auto_matched_stage_1_2": auto_matched,
        "auto_matched_pct": round(auto_matched / total, 4),
        "llm_resolved_stage_3": llm_resolved,
        "llm_resolved_pct": round(llm_resolved / total, 4) if total else 0,
        "unresolved_escalated": unresolved,
        "unresolved_pct": round(unresolved / total, 4) if total else 0,
        "chaos_subset_size": len(chaos_ids),
        "precision_on_chaos_subset": round(precision, 4),
        "precision_95pct_ci": precision_ci,
        "recall_on_chaos_subset": round(recall, 4),
        "recall_95pct_ci": recall_ci,
        "false_resolution_rate": round(false_resolution_rate, 4),
    }

    print(json.dumps(metrics, indent=2))
    with open(data_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    md_lines = ["# Reconciliation Metrics\n", "| metric | value |", "|---|---|"]
    for k, v in metrics.items():
        display = f"{v[0]}–{v[1]}" if isinstance(v, tuple) else v
        md_lines.append(f"| {k.replace('_', ' ')} | {display} |")
    with open(data_dir / "METRICS.md", "w") as f:
        f.write("\n".join(md_lines) + "\n")

    return metrics


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=str, default="./out")
    args = ap.parse_args()
    run(Path(args.data))
