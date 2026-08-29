"""
Reconciliation Stage 3: LLM investigator for whatever Stage 1+2 could not
resolve deterministically. Given an unmatched settlement row plus a small
set of candidate context (nearby payments, refunds, orders), asks Claude to
produce a structured hypothesis with a confidence score. Confidence below
the threshold is force-set to UNRESOLVED — the model is never allowed to
auto-resolve something it isn't confident about.

Uses an OpenAI-compatible chat completions endpoint, so it works with
either OpenRouter or Groq (or anything else OpenAI-compatible) without
code changes — just set the right env vars.

OpenRouter:
    export LLM_PROVIDER=openrouter
    export OPENROUTER_API_KEY=sk-or-...
    export LLM_MODEL=anthropic/claude-sonnet-4.5   # or any model slug OpenRouter lists

Groq:
    export LLM_PROVIDER=groq
    export GROQ_API_KEY=gsk_...
    export LLM_MODEL=llama-3.3-70b-versatile        # or another Groq-hosted model

Usage:
    python reconcile_stage3_llm.py --data ./out --confidence-threshold 0.6
"""
import argparse
import json
import os
from datetime import datetime, timedelta
from pathlib import Path

from openai import OpenAI

PROVIDER_CONFIG = {
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "api_key_env": "OPENROUTER_API_KEY",
        "default_model": "anthropic/claude-sonnet-4.5",
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "default_model": "llama-3.3-70b-versatile",
    },
}


def build_client_and_model():
    provider = os.environ.get("LLM_PROVIDER", "groq").lower()
    if provider not in PROVIDER_CONFIG:
        raise ValueError(
            f"LLM_PROVIDER must be one of {list(PROVIDER_CONFIG)}, got {provider!r}"
        )
    cfg = PROVIDER_CONFIG[provider]
    api_key = os.environ.get(cfg["api_key_env"])
    if not api_key:
        raise RuntimeError(
            f"Set {cfg['api_key_env']} in the environment (provider={provider})"
        )
    model = os.environ.get("LLM_MODEL", cfg["default_model"])
    client = OpenAI(api_key=api_key, base_url=cfg["base_url"], timeout=10.0, max_retries=1)
    return client, model

CONFIDENCE_THRESHOLD_DEFAULT = 0.6

SYSTEM_PROMPT = """You are a financial reconciliation investigator. You will be given
one unmatched settlement record plus nearby candidate records (payments, refunds,
orders) that might explain the mismatch. Common real causes: partial refund reduced
the net settlement, a gateway fee recalculation, a duplicate bank record, a payment
made outside the tracked system (orphaned settlement), or a webhook that silently
failed to update order status.

Respond with ONLY a JSON object, no markdown fences, no preamble:
{
  "hypothesis": "<one sentence>",
  "evidence": ["<specific record ids/fields you're citing>"],
  "confidence": <float 0.0-1.0>,
  "recommended_action": "<one sentence, or 'none' if no action needed>"
}

Be conservative with confidence. If the candidate evidence doesn't clearly explain
the mismatch, confidence should be low (below 0.5) — do not guess."""


def find_candidates(settlement, payments, refunds, orders, window_days=5):
    settled_at = datetime.fromisoformat(settlement["settled_at"])
    candidates = {"payments": [], "refunds": [], "orders": []}

    for p in payments:
        ts = datetime.fromisoformat(p["captured_at"]) if p.get("captured_at") else None
        if ts and abs((settled_at - ts).days) <= window_days:
            if abs(p["amount"] - settlement["amount"]) <= p["amount"] * 0.5:
                candidates["payments"].append(p)
    for r in refunds:
        if r["payment_id"] == settlement["payment_id"]:
            candidates["refunds"].append(r)
    relevant_order_ids = {p["order_id"] for p in payments if p["payment_id"] == settlement["payment_id"]}
    candidates["orders"] = [o for o in orders if o.get("order_id") in relevant_order_ids]
    return candidates


def _extract_json(text: str) -> dict:
    """Models on OpenRouter/Groq are less reliable than Claude at emitting
    bare JSON — some wrap it in ```json fences despite instructions. Strip
    fences before parsing, and fail loudly into a flagged record rather
    than silently guessing."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"hypothesis": "parse_error", "evidence": [], "confidence": 0.0,
                "recommended_action": "manual review — model output was not valid JSON"}


def investigate_one(client, model, settlement, candidates):
    user_content = json.dumps({
        "unmatched_settlement": settlement,
        "candidate_payments": candidates["payments"][:5],
        "candidate_refunds": candidates["refunds"][:5],
        "candidate_orders": candidates["orders"][:3],
    }, indent=2)

    resp = client.chat.completions.create(
        model=model,
        max_tokens=500,
        temperature=0.0,  # this is a judgment task, not a creative one — keep it deterministic
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
    )
    text = resp.choices[0].message.content or ""
    return _extract_json(text)


def run(data_dir: Path, confidence_threshold: float):
    with open(data_dir / "stage2_unmatched.json") as f:
        unmatched = json.load(f)
    with open(data_dir / "payments.json") as f:
        payments = json.load(f)
    with open(data_dir / "refunds.json") as f:
        refunds = json.load(f)
    with open(data_dir / "orders.json") as f:
        orders = json.load(f)

    client, model = build_client_and_model()
    print(f"Using provider={os.environ.get('LLM_PROVIDER', 'groq')} model={model}")
    results = {}

    for i, s in enumerate(unmatched):
        print(f"Processing record {i+1}/{len(unmatched)} (ID: {s['settlement_id']})", flush=True)
        candidates = find_candidates(s, payments, refunds, orders)
        try:
            verdict = investigate_one(client, model, s, candidates)
            confidence = float(verdict.get("confidence", 0.0))
        except Exception as e:
            print(f"Error on {s['settlement_id']}: {e}", flush=True)
            verdict = {"hypothesis": f"Error: {str(e)}"}
            confidence = 0.0
        status = "RESOLVED" if confidence >= confidence_threshold else "UNRESOLVED"
        results[s["settlement_id"]] = {
            "stage": 3,
            "status": status,
            "confidence": confidence,
            "hypothesis": verdict.get("hypothesis"),
            "evidence": verdict.get("evidence"),
            "recommended_action": verdict.get("recommended_action"),
        }

    resolved = sum(1 for v in results.values() if v["status"] == "RESOLVED")
    print(f"Stage 3 processed: {len(results)}")
    print(f"Stage 3 resolved (confidence >= {confidence_threshold}): {resolved}")
    print(f"Stage 3 still unresolved (escalated to human): {len(results) - resolved}")

    with open(data_dir / "stage3_results.json", "w") as f:
        json.dump(results, f, indent=2)

    return results


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=str, default="./out")
    ap.add_argument("--confidence-threshold", type=float, default=CONFIDENCE_THRESHOLD_DEFAULT)
    args = ap.parse_args()
    run(Path(args.data), args.confidence_threshold)
