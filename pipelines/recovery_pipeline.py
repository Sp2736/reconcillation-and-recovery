"""
Revenue Recovery Autopilot.

Runs on failed payments + failed subscription charges. Classifies root
cause, estimates recovery probability, selects an intervention from a fixed
policy table (never a free-form LLM decision on money actions), ranks by
expected value, and simulates execution against stopping rules. Everything
appends to a shared audit trail with the reconciliation pipeline.

Usage:
    python recovery_pipeline.py --data ./out
"""
import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path

TRANSIENT_REASONS = {"bank_timeout", "network_error"}
STRUCTURAL_REASONS = {"card_expired", "issuer_decline"}
BEHAVIORAL_REASONS = {"insufficient_funds", "risk_block"}

# fixed policy table — intervention selection is NEVER a free-form LLM call
INTERVENTION_POLICY = {
    "transient": {"action": "auto_retry", "delay_minutes": 30, "base_recovery_p": 0.80},
    "structural": {"action": "request_update", "delay_minutes": 0, "base_recovery_p": 0.55},
    "behavioral": {"action": "scheduled_retry_salary_cycle", "delay_minutes": 0, "base_recovery_p": 0.62},
}

MAX_AUTOMATED_RETRIES = 3
MAX_MESSAGES_PER_CUSTOMER_48H = 1
HUMAN_APPROVAL_THRESHOLD_AMOUNT = 50000  # ₹


def classify_root_cause(reason: str) -> str:
    if reason in TRANSIENT_REASONS:
        return "transient"
    if reason in STRUCTURAL_REASONS:
        return "structural"
    return "behavioral"


def estimate_recovery_probability(category: str, retry_count: int) -> float:
    base = INTERVENTION_POLICY[category]["base_recovery_p"]
    # probability decays with each prior retry attempt
    decayed = base * (0.75 ** retry_count)
    return round(max(0.02, min(0.97, decayed)), 4)


def select_intervention(category: str, retry_count: int, amount: float):
    if retry_count > MAX_AUTOMATED_RETRIES:
        return {"action": "escalate_to_human", "reason": "exceeded max automated retries"}
    if amount > HUMAN_APPROVAL_THRESHOLD_AMOUNT:
        return {"action": "escalate_to_human", "reason": "amount above auto-approval threshold"}
    policy = INTERVENTION_POLICY[category]
    return {"action": policy["action"], "delay_minutes": policy["delay_minutes"]}


def build_queue(failed_payments, subscriptions):
    items = []

    for p in failed_payments:
        category = classify_root_cause(p["failure_reason"])
        retry_count = 0  # first-touch failures from the payments table
        prob = estimate_recovery_probability(category, retry_count)
        intervention = select_intervention(category, retry_count, p["amount"])
        expected_value = round(p["amount"] * prob, 2)
        items.append({
            "source": "payment", "record_id": p["payment_id"],
            "amount": p["amount"], "failure_reason": p["failure_reason"],
            "category": category, "recovery_probability": prob,
            "intervention": intervention, "expected_value": expected_value,
        })

    for s in subscriptions:
        if s["last_charge_status"] != "failed":
            continue
        category = classify_root_cause(s["failure_reason"])
        if s["mandate_status"] == "revoked":
            intervention = {"action": "escalate_to_human", "reason": "mandate revoked"}
            prob = 0.05
        else:
            prob = estimate_recovery_probability(category, s["retry_count"])
            intervention = select_intervention(category, s["retry_count"], amount=0)
        # subscription failed-charge amount isn't in this synthetic table;
        # assume a representative recurring amount for expected-value ranking
        assumed_amount = 999.0
        expected_value = round(assumed_amount * prob, 2)
        items.append({
            "source": "subscription", "record_id": s["subscription_id"],
            "amount": assumed_amount, "failure_reason": s["failure_reason"],
            "category": category, "recovery_probability": prob,
            "intervention": intervention, "expected_value": expected_value,
        })

    items.sort(key=lambda x: x["expected_value"], reverse=True)
    return items


def simulate_execution(queue):
    """Apply stopping rules and simulate outcomes; append to audit trail."""
    audit = []
    messages_sent = {}
    total_at_risk = 0.0
    total_recovered = 0.0
    escalated = 0
    executed = 0

    for item in queue:
        total_at_risk += item["amount"]
        action = item["intervention"]["action"]

        if action == "escalate_to_human":
            escalated += 1
            audit.append({
                "record_id": item["record_id"], "action": "escalate_to_human",
                "policy_check": "stopping_rule_triggered", "outcome": "pending_human_review",
            })
            continue

        # rate-limit outbound messages per customer (record_id stands in for
        # customer in this simplified simulation; production would key on
        # actual customer_id)
        sent_so_far = messages_sent.get(item["record_id"], 0)
        if action in ("request_update", "scheduled_retry_salary_cycle") and \
                sent_so_far >= MAX_MESSAGES_PER_CUSTOMER_48H:
            audit.append({
                "record_id": item["record_id"], "action": action,
                "policy_check": "rate_limit_blocked", "outcome": "skipped",
            })
            continue

        messages_sent[item["record_id"]] = sent_so_far + 1
        executed += 1
        # simulate outcome probabilistically using the estimated recovery probability
        import random
        recovered = random.random() < item["recovery_probability"]
        if recovered:
            total_recovered += item["amount"]
        audit.append({
            "record_id": item["record_id"], "action": action,
            "policy_check": "passed", "outcome": "recovered" if recovered else "not_recovered",
            "amount": item["amount"],
        })

    return {
        "total_at_risk": round(total_at_risk, 2),
        "total_recovered_simulated": round(total_recovered, 2),
        "recovery_rate_simulated": round(total_recovered / total_at_risk, 4) if total_at_risk else 0,
        "interventions_executed": executed,
        "escalated_to_human": escalated,
    }, audit


def run(data_dir: Path):
    with open(data_dir / "payments.json") as f:
        payments = json.load(f)
    with open(data_dir / "subscriptions.json") as f:
        subscriptions = json.load(f)

    failed_payments = [p for p in payments if p["status"] == "failed"]
    queue = build_queue(failed_payments, subscriptions)
    summary, audit = simulate_execution(queue)

    print(json.dumps(summary, indent=2))

    with open(data_dir / "recovery_queue.json", "w") as f:
        json.dump(queue, f, indent=2)
    with open(data_dir / "recovery_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    with open(data_dir / "recovery_audit_trail.json", "w") as f:
        json.dump(audit, f, indent=2)

    return summary


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=str, default="./out")
    args = ap.parse_args()
    run(Path(args.data))
