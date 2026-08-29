"""
Synthetic dataset generator for the reconciliation + revenue recovery agent.

Generates orders, payments, settlements, refunds, and subscriptions with
realistic volume, then runs a chaos injector that deliberately corrupts a
configurable fraction of rows (rounding drift, split settlements, duplicate
settlements, orphaned settlements, delayed settlements, silent webhook
failures). Ground truth of every injected issue is logged separately so
precision/recall can be computed against a real answer key instead of eyeballed.

Usage:
    python generate.py --n-orders 3000 --seed 42 --out ./out
"""
import argparse
import json
import random
import string
import uuid
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
from pathlib import Path

PAYMENT_METHODS = ["upi", "card", "netbanking", "emi", "wallet"]
FAILURE_REASONS = [
    "insufficient_funds", "bank_timeout", "card_expired",
    "risk_block", "issuer_decline", "network_error",
]


def rid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def rand_bank_ref() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=14))


@dataclass
class Order:
    order_id: str
    customer_id: str
    amount: float
    currency: str
    created_at: str
    status: str
    product_ids: list = field(default_factory=list)


@dataclass
class Payment:
    payment_id: str
    order_id: str
    method: str
    amount: float
    status: str
    failure_reason: str
    gateway_fee: float
    created_at: str
    captured_at: str


@dataclass
class Settlement:
    settlement_id: str
    payment_id: str
    bank_ref: str
    amount: float
    settled_at: str
    batch_id: str


@dataclass
class Refund:
    refund_id: str
    payment_id: str
    amount: float
    status: str
    created_at: str


@dataclass
class Subscription:
    subscription_id: str
    customer_id: str
    mandate_status: str
    billing_cycle: str
    last_charge_status: str
    failure_reason: str
    retry_count: int
    next_retry_at: str


class Generator:
    def __init__(self, n_orders: int, n_subscriptions: int, seed: int, base_date: datetime):
        random.seed(seed)
        self.n_orders = n_orders
        self.n_subscriptions = n_subscriptions
        self.base_date = base_date
        self.customers = [rid("cust") for _ in range(max(50, n_orders // 6))]
        self.products = [rid("prod") for _ in range(40)]

        self.orders: list[Order] = []
        self.payments: list[Payment] = []
        self.settlements: list[Settlement] = []
        self.refunds: list[Refund] = []
        self.subscriptions: list[Subscription] = []

        # ground truth of every issue deliberately injected, keyed by record id
        self.ground_truth: dict[str, dict] = {}

    def _ts(self, days_back_max=90):
        return self.base_date - timedelta(
            days=random.uniform(0, days_back_max),
            hours=random.uniform(0, 24),
        )

    def generate_core(self):
        for _ in range(self.n_orders):
            created = self._ts()
            amount = round(random.uniform(150, 25000), 2)
            order = Order(
                order_id=rid("order"),
                customer_id=random.choice(self.customers),
                amount=amount,
                currency="INR",
                created_at=created.isoformat(),
                status="paid",
                product_ids=random.sample(self.products, k=random.randint(1, 3)),
            )
            self.orders.append(order)

            # ~88% of payments succeed, rest fail (feeds recovery pipeline)
            success = random.random() < 0.88
            fee = round(amount * 0.02 + amount * 0.02 * 0.18, 2)  # ~2% + 18% GST on fee
            failure_reason = "" if success else random.choice(FAILURE_REASONS)
            payment = Payment(
                payment_id=rid("pay"),
                order_id=order.order_id,
                method=random.choice(PAYMENT_METHODS),
                amount=amount,
                status="captured" if success else "failed",
                failure_reason=failure_reason,
                gateway_fee=fee if success else 0.0,
                created_at=created.isoformat(),
                captured_at=(created + timedelta(seconds=random.randint(2, 120))).isoformat()
                if success else "",
            )
            self.payments.append(payment)
            if not success:
                order.status = "failed"
                continue

            # settlement, normally T+1/T+2
            settle_delay_days = random.choices([1, 2, 5], weights=[70, 25, 5])[0]
            settled_at = created + timedelta(days=settle_delay_days)
            settlement = Settlement(
                settlement_id=rid("stlm"),
                payment_id=payment.payment_id,
                bank_ref=rand_bank_ref(),
                amount=round(amount - fee, 2),
                settled_at=settled_at.isoformat(),
                batch_id=rid("batch"),
            )
            self.settlements.append(settlement)

            # occasional refund (full or partial)
            if random.random() < 0.07:
                partial = random.random() < 0.5
                refund_amount = round(amount * random.uniform(0.2, 0.6), 2) if partial else amount
                self.refunds.append(Refund(
                    refund_id=rid("rfnd"),
                    payment_id=payment.payment_id,
                    amount=refund_amount,
                    status="processed",
                    created_at=(settled_at + timedelta(days=random.randint(1, 10))).isoformat(),
                ))
                order.status = "partially_refunded" if partial else "refunded"

    def generate_subscriptions(self):
        for _ in range(self.n_subscriptions):
            failed = random.random() < 0.22
            reason = random.choice(FAILURE_REASONS) if failed else ""
            retry_count = random.randint(0, 5) if failed else 0
            mandate_status = "active"
            if failed and retry_count > 3:
                mandate_status = random.choice(["active", "revoked"])
            self.subscriptions.append(Subscription(
                subscription_id=rid("sub"),
                customer_id=random.choice(self.customers),
                mandate_status=mandate_status,
                billing_cycle=random.choice(["monthly", "weekly"]),
                last_charge_status="failed" if failed else "success",
                failure_reason=reason,
                retry_count=retry_count,
                next_retry_at=(self.base_date + timedelta(hours=random.randint(1, 72))).isoformat()
                if failed else "",
            ))

    # ---------------- chaos injection ----------------

    def inject_chaos(self, rate: float):
        """Corrupt a fraction of settlement rows in specific, logged ways."""
        settleable = [s for s in self.settlements]
        n_targets = int(len(settleable) * rate)
        targets = random.sample(settleable, k=min(n_targets, len(settleable)))

        chaos_types = [
            "rounding_drift", "split_settlement", "duplicate_settlement",
            "orphaned_settlement", "delayed_settlement", "silent_webhook_failure",
        ]

        for s in targets:
            chaos = random.choice(chaos_types)
            if chaos == "rounding_drift":
                drift = round(random.uniform(0.5, 3.0) * random.choice([-1, 1]), 2)
                s.amount = round(s.amount + drift, 2)
                self.ground_truth[s.settlement_id] = {
                    "issue": "rounding_drift", "expected_diff": drift,
                    "correct_status": "RESOLVED",
                }

            elif chaos == "split_settlement":
                # split this settlement's amount across two settlement rows
                half = round(s.amount / 2, 2)
                s.amount = half
                twin = Settlement(
                    settlement_id=rid("stlm"), payment_id=s.payment_id,
                    bank_ref=s.bank_ref, amount=s.amount - half,
                    settled_at=s.settled_at, batch_id=s.batch_id,
                )
                self.settlements.append(twin)
                self.ground_truth[s.settlement_id] = {
                    "issue": "split_settlement", "twin_id": twin.settlement_id,
                    "correct_status": "RESOLVED",
                }
                self.ground_truth[twin.settlement_id] = {
                    "issue": "split_settlement", "twin_id": s.settlement_id,
                    "correct_status": "RESOLVED",
                }

            elif chaos == "duplicate_settlement":
                dupe = Settlement(**asdict(s))
                dupe.settlement_id = rid("stlm")
                self.settlements.append(dupe)
                self.ground_truth[dupe.settlement_id] = {
                    "issue": "duplicate_settlement", "original_id": s.settlement_id,
                    "correct_status": "UNRESOLVED",  # should be flagged, not silently merged
                }

            elif chaos == "orphaned_settlement":
                s.payment_id = ""  # simulate a payment made outside the tracked system
                s.bank_ref = s.bank_ref[:8]  # truncated ref, harder to match
                self.ground_truth[s.settlement_id] = {
                    "issue": "orphaned_settlement", "correct_status": "UNRESOLVED",
                }

            elif chaos == "delayed_settlement":
                settled = datetime.fromisoformat(s.settled_at)
                s.settled_at = (settled + timedelta(days=random.randint(4, 9))).isoformat()
                self.ground_truth[s.settlement_id] = {
                    "issue": "delayed_settlement", "correct_status": "RESOLVED",
                }

            elif chaos == "silent_webhook_failure":
                order = next((o for o in self.orders
                              if any(p.order_id == o.order_id and p.payment_id == s.payment_id
                                     for p in self.payments)), None)
                if order:
                    order.status = "created"  # payment succeeded but order never updated
                    self.ground_truth[s.settlement_id] = {
                        "issue": "silent_webhook_failure", "order_id": order.order_id,
                        "correct_status": "UNRESOLVED",
                    }

    def to_dict(self):
        return {
            "orders": [asdict(o) for o in self.orders],
            "payments": [asdict(p) for p in self.payments],
            "settlements": [asdict(s) for s in self.settlements],
            "refunds": [asdict(r) for r in self.refunds],
            "subscriptions": [asdict(s) for s in self.subscriptions],
        }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--n-orders", type=int, default=3000)
    ap.add_argument("--n-subscriptions", type=int, default=800)
    ap.add_argument("--chaos-rate", type=float, default=0.12)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", type=str, default="./out")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    gen = Generator(
        n_orders=args.n_orders,
        n_subscriptions=args.n_subscriptions,
        seed=args.seed,
        base_date=datetime(2026, 8, 29),
    )
    gen.generate_core()
    gen.generate_subscriptions()
    gen.inject_chaos(rate=args.chaos_rate)

    data = gen.to_dict()
    for name, rows in data.items():
        with open(out_dir / f"{name}.json", "w") as f:
            json.dump(rows, f, indent=2)

    with open(out_dir / "ground_truth.json", "w") as f:
        json.dump(gen.ground_truth, f, indent=2)

    print(f"Generated {len(gen.orders)} orders, {len(gen.payments)} payments, "
          f"{len(gen.settlements)} settlements, {len(gen.refunds)} refunds, "
          f"{len(gen.subscriptions)} subscriptions.")
    print(f"Injected {len(gen.ground_truth)} chaos issues -> {out_dir/'ground_truth.json'}")


if __name__ == "__main__":
    main()
