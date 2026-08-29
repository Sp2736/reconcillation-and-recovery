"""
Validation checks before you trust a metrics run enough to cite it on
camera. Implements two of the four checks from the data-engineering
brief's §7 as runnable code (the other two — hand-tracing 5-10 records,
and re-running compute_metrics.py fresh right before recording — are
manual habits, not automatable, and stay manual).

1. Two-seed stability: regenerate the dataset at a different seed with
   identical parameters, run Stage 1+2 (deterministic, no API cost) on
   both, and confirm the auto-match rate doesn't swing wildly between
   seeds. A big swing means the chaos-rate/volume balance needs
   adjusting before the numbers are trustworthy.

2. Adversarial case: hand-construct one settlement designed to fool the
   Stage 2 fuzzy matcher — two unrelated payments whose amounts happen
   to sum to a plausible settlement value by coincidence — and confirm
   the matcher does NOT wrongly resolve it. This is the single check
   most likely to catch a false-resolution bug before a judge does.

Usage:
    python validate.py --out-dir ./validation_run
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from data_generation.generate import Generator
from pipelines.reconcile_stage1_2 import stage1_exact_match, stage2_fuzzy_match


def run_two_seed_check(out_dir: Path, n_orders: int = 1500, chaos_rate: float = 0.12):
    print("=" * 60)
    print("CHECK 1: two-seed stability")
    print("=" * 60)

    results = {}
    for seed in (42, 777):
        gen = Generator(n_orders=n_orders, n_subscriptions=300, seed=seed,
                         base_date=__import__("datetime").datetime(2026, 8, 29))
        gen.generate_core()
        gen.generate_subscriptions()
        gen.inject_chaos(rate=chaos_rate)

        settlements = [s.__dict__ for s in gen.settlements]
        payments = [p.__dict__ for p in gen.payments]

        matched1, unmatched1 = stage1_exact_match(payments, settlements)
        matched2, unmatched2 = stage2_fuzzy_match(unmatched1, payments)

        total = len(settlements)
        auto_matched_pct = (len(matched1) + len(matched2)) / total if total else 0
        results[seed] = {
            "total_settlements": total,
            "auto_matched_pct": round(auto_matched_pct, 4),
            "chaos_issues_injected": len(gen.ground_truth),
        }
        print(f"  seed={seed}: total={total}, auto_matched={auto_matched_pct:.1%}, "
              f"chaos_injected={len(gen.ground_truth)}")

    swing = abs(results[42]["auto_matched_pct"] - results[777]["auto_matched_pct"])
    print(f"\n  swing between seeds: {swing:.1%}")
    if swing > 0.05:
        print("  [WARN] WARNING: >5 point swing between seeds. Auto-match rate is not "
              "stable at this volume/chaos-rate combination — increase --n-orders "
              "before citing a single-seed number as representative.")
    else:
        print("  [PASS] Stable within 5 points across seeds at this volume.")

    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "two_seed_check.json", "w") as f:
        json.dump(results, f, indent=2)

    return results, swing


def run_adversarial_check(out_dir: Path):
    print("\n" + "=" * 60)
    print("CHECK 2: hand-crafted adversarial case")
    print("=" * 60)

    # two unrelated payments that happen to sum to a plausible settlement
    # amount by pure coincidence — a naive "do amounts sum to expected net
    # within tolerance" fuzzy matcher could wrongly treat this as a split
    # settlement match
    payment_a = {
        "payment_id": "pay_adversarial_a", "order_id": "order_adv_a",
        "amount": 4300.00, "gateway_fee": 172.00, "status": "captured",
        "captured_at": "2026-08-01T10:00:00", "method": "upi", "failure_reason": "",
    }
    payment_b = {
        "payment_id": "pay_adversarial_b", "order_id": "order_adv_b",
        "amount": 1900.00, "gateway_fee": 76.00, "status": "captured",
        "captured_at": "2026-08-01T10:05:00", "method": "card", "failure_reason": "",
    }
    # a genuine unrelated settlement whose payment_id doesn't exist in our
    # payment set at all (simulating a payment made fully outside the
    # tracked system) — its amount happens to equal (4300-172)+(1900-76) net
    coincidental_target = round((4300 - 172) + (1900 - 76), 2)
    adversarial_settlement = {
        "settlement_id": "stlm_adversarial", "payment_id": "pay_nonexistent",
        "bank_ref": "COINCIDENCE01", "amount": coincidental_target,
        "settled_at": "2026-08-02T09:00:00", "batch_id": "batch_adversarial",
    }

    payments = [payment_a, payment_b]
    settlements = [adversarial_settlement]

    matched1, unmatched1 = stage1_exact_match(payments, settlements)
    matched2, unmatched2 = stage2_fuzzy_match(unmatched1, payments)

    result = {
        "expected": "UNRESOLVED — settlement.payment_id does not exist; a "
        "coincidental amount match must not be treated as a real match",
        "actual_stage1_matched": list(matched1.keys()),
        "actual_stage2_matched": list(matched2.keys()),
        "passed": adversarial_settlement["settlement_id"] not in matched1
                  and adversarial_settlement["settlement_id"] not in matched2,
    }

    print(f"  {result['expected']}")
    if result["passed"]:
        print("  [PASS] PASSED: adversarial settlement correctly left unmatched — "
              "the matcher does not group settlements by amount coincidence "
              "alone, only by shared payment_id.")
    else:
        print("  [FAIL] FAILED: the fuzzy matcher wrongly resolved a settlement with "
              "no real payment_id link, purely because the amounts happened to "
              "sum correctly. This is exactly the false-resolution failure mode "
              "the false-resolution-rate metric exists to catch — fix "
              "reconcile_stage1_2.py's grouping logic before trusting your "
              "precision number.")

    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "adversarial_check.json", "w") as f:
        json.dump(result, f, indent=2)

    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", type=str, default="./validation_run")
    ap.add_argument("--n-orders", type=int, default=1500)
    args = ap.parse_args()

    out_dir = Path(args.out_dir)
    _, swing = run_two_seed_check(out_dir, n_orders=args.n_orders)
    adversarial_result = run_adversarial_check(out_dir)

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    ok = swing <= 0.05 and adversarial_result["passed"]
    print("[PASS] All checks passed — safe to trust a metrics run at this configuration."
          if ok else
          "[FAIL] One or more checks failed — do not cite metrics numbers until fixed.")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
