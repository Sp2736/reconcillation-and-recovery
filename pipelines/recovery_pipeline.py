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
# cost_inr is the real-world cost of executing that action once (support
# time, messaging cost, retry infra cost) — expected value must net this
# out, or the queue can rank a ₹40 recovery with a ₹50 cost above a
# genuinely better use of the same effort.
INTERVENTION_POLICY = {
    "transient": {"action": "auto_retry", "delay_minutes": 30, "base_recovery_p": 0.80, "cost_inr": 2.0},
    "structural": {"action": "request_update", "delay_minutes": 0, "base_recovery_p": 0.55, "cost_inr": 8.0},
    "behavioral": {"action": "scheduled_retry_salary_cycle", "delay_minutes": 0, "base_recovery_p": 0.62, "cost_inr": 8.0},
}
ESCALATION_COST_INR = 45.0  # human review time — the real reason escalation isn't the default

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


def select_intervention(category: str, retry_count: int, amount: float, recovery_probability: float):
    if retry_count > MAX_AUTOMATED_RETRIES:
        return {"action": "escalate_to_human", "reason": "exceeded max automated retries",
                "cost_inr": ESCALATION_COST_INR}
    if amount > HUMAN_APPROVAL_THRESHOLD_AMOUNT:
        return {"action": "escalate_to_human", "reason": "amount above auto-approval threshold",
                "cost_inr": ESCALATION_COST_INR}

    policy = INTERVENTION_POLICY[category]
    cost = policy["cost_inr"]
    gross_expected = amount * recovery_probability
    if gross_expected <= cost:
        # the intervention costs more than it's expected to recover — this
        # is a real, defensible "do nothing" decision, not a missed case
        return {"action": "no_action_uneconomical",
                "reason": f"expected recovery ₹{gross_expected:.2f} does not exceed "
                          f"intervention cost ₹{cost:.2f}",
                "cost_inr": 0.0}

    return {"action": policy["action"], "delay_minutes": policy["delay_minutes"], "cost_inr": cost}


def build_queue(failed_payments, subscriptions, orders):
    items = []
    orders_by_id = {o["order_id"]: o for o in orders}

    for p in failed_payments:
        category = classify_root_cause(p["failure_reason"])
        retry_count = 0  # first-touch failures from the payments table
        prob = estimate_recovery_probability(category, retry_count)
        order = orders_by_id.get(p["order_id"])
        customer_id = order["customer_id"] if order else f"unknown_{p['payment_id']}"
        intervention = select_intervention(category, retry_count, p["amount"], prob)
        expected_value = round(p["amount"] * prob - intervention.get("cost_inr", 0.0), 2)
        items.append({
            "source": "payment", "record_id": p["payment_id"], "customer_id": customer_id,
            "amount": p["amount"], "failure_reason": p["failure_reason"],
            "category": category, "recovery_probability": prob,
            "intervention": intervention, "expected_value": expected_value,
        })

    for s in subscriptions:
        if s["last_charge_status"] != "failed":
            continue
        category = classify_root_cause(s["failure_reason"])
        # subscription failed-charge amount isn't in this synthetic table;
        # assume a representative recurring amount for expected-value ranking
        assumed_amount = 999.0
        if s["mandate_status"] == "revoked":
            intervention = {"action": "escalate_to_human", "reason": "mandate revoked",
                             "cost_inr": ESCALATION_COST_INR}
            prob = 0.05
        else:
            prob = estimate_recovery_probability(category, s["retry_count"])
            intervention = select_intervention(category, s["retry_count"], assumed_amount, prob)
        expected_value = round(assumed_amount * prob - intervention.get("cost_inr", 0.0), 2)
        items.append({
            "source": "subscription", "record_id": s["subscription_id"],
            "customer_id": s["customer_id"],
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
    total_intervention_cost = 0.0
    escalated = 0
    executed = 0
    skipped_uneconomical = 0

    for item in queue:
        total_at_risk += item["amount"]
        action = item["intervention"]["action"]
        customer_id = item.get("customer_id", item["record_id"])  # fallback for safety

        if action == "escalate_to_human":
            escalated += 1
            total_intervention_cost += item["intervention"].get("cost_inr", 0.0)
            audit.append({
                "record_id": item["record_id"], "customer_id": customer_id,
                "action": "escalate_to_human",
                "policy_check": "stopping_rule_triggered", "outcome": "pending_human_review",
            })
            continue

        if action == "no_action_uneconomical":
            skipped_uneconomical += 1
            audit.append({
                "record_id": item["record_id"], "customer_id": customer_id,
                "action": "no_action_uneconomical",
                "policy_check": "expected_value_negative",
                "outcome": "skipped", "reason": item["intervention"]["reason"],
            })
            continue

        # rate-limit outbound messages per CUSTOMER, not per record — a
        # customer with three failed payments in one batch must still only
        # get one message in the window, or the stopping rule is a no-op
        sent_so_far = messages_sent.get(customer_id, 0)
        if action in ("request_update", "scheduled_retry_salary_cycle") and \
                sent_so_far >= MAX_MESSAGES_PER_CUSTOMER_48H:
            audit.append({
                "record_id": item["record_id"], "customer_id": customer_id,
                "action": action,
                "policy_check": "rate_limit_blocked", "outcome": "skipped",
            })
            continue

        messages_sent[customer_id] = sent_so_far + 1
        executed += 1
        total_intervention_cost += item["intervention"].get("cost_inr", 0.0)
        # simulate outcome probabilistically using the estimated recovery probability
        import random
        recovered = random.random() < item["recovery_probability"]
        if recovered:
            total_recovered += item["amount"]
        audit.append({
            "record_id": item["record_id"], "customer_id": customer_id,
            "action": action,
            "policy_check": "passed", "outcome": "recovered" if recovered else "not_recovered",
            "amount": item["amount"],
        })

    net_recovered = round(total_recovered - total_intervention_cost, 2)
    return {
        "total_at_risk": round(total_at_risk, 2),
        "total_recovered_simulated": round(total_recovered, 2),
        "total_intervention_cost": round(total_intervention_cost, 2),
        "net_recovered_after_cost": net_recovered,
        "recovery_rate_simulated": round(total_recovered / total_at_risk, 4) if total_at_risk else 0,
        "interventions_executed": executed,
        "escalated_to_human": escalated,
        "skipped_uneconomical": skipped_uneconomical,
    }, audit


def run(data_dir: Path):
    with open(data_dir / "payments.json") as f:
        payments = json.load(f)
    with open(data_dir / "subscriptions.json") as f:
        subscriptions = json.load(f)
    with open(data_dir / "orders.json") as f:
        orders = json.load(f)

    failed_payments = [p for p in payments if p["status"] == "failed"]
    queue = build_queue(failed_payments, subscriptions, orders)
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
