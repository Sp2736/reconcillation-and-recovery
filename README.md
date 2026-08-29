# Reconciliation + Revenue Recovery Agent

Companion code for `reconciliation-recovery-architecture.md`. Two pipelines
sharing one synthetic dataset: a Finance Controller reconciliation
investigator, and a Revenue Recovery autopilot.

## Setup

```bash
pip install -r requirements.txt --break-system-packages
export ANTHROPIC_API_KEY=your_key_here   # needed only for stage 3
```

## Run order

```bash
# 1. Generate the synthetic dataset + chaos + ground truth
python data_generation/generate.py --n-orders 3000 --n-subscriptions 800 \
    --chaos-rate 0.12 --seed 42 --out ./data_generation/out

# 2. Reconciliation Stage 1 + 2 (deterministic + fuzzy) — get a real
#    match-rate number before touching any LLM
python pipelines/reconcile_stage1_2.py --data ./data_generation/out

# 3. Reconciliation Stage 3 (LLM investigator on what's left)
python pipelines/reconcile_stage3_llm.py --data ./data_generation/out \
    --confidence-threshold 0.6

# 4. Recovery pipeline (independent of 2/3, reuses the same dataset)
python pipelines/recovery_pipeline.py --data ./data_generation/out

# 5. Compute the metrics table from ground_truth.json — never hand-type
#    a number in METRICS.md
python pipelines/compute_metrics.py --data ./data_generation/out

# 6. Serve results to the dashboard
uvicorn app.main:app --reload --port 8000
```

## What each file is for

| file | purpose |
|---|---|
| `data_generation/generate.py` | builds orders/payments/settlements/refunds/subscriptions + injects logged chaos |
| `pipelines/reconcile_stage1_2.py` | deterministic then fuzzy matching — cheap, fast, ~80%+ of rows |
| `pipelines/reconcile_stage3_llm.py` | LLM investigates the genuinely ambiguous remainder, confidence-gated |
| `pipelines/recovery_pipeline.py` | root-cause classification, recovery-probability estimate, policy-based intervention, expected-value ranked queue, stopping rules |
| `pipelines/compute_metrics.py` | precision/recall/false-resolution rate against `ground_truth.json` |
| `app/main.py` | FastAPI serving all of the above to a dashboard |

## Notes for the pitch

- `METRICS.md` and `data_generation/out/metrics.json` are generated, not
  hand-written — read the numbers on camera straight from the file.
- The false-resolution rate is the single most important number: it's what
  proves Stage 3 isn't rubber-stamping "RESOLVED" on things it shouldn't.
- The recovery pipeline's intervention selection comes from a fixed policy
  table (`INTERVENTION_POLICY` in `recovery_pipeline.py`), never a
  free-form LLM decision on what to do with money — that's the "bounded
  and gated" requirement from the brief.
- `/audit-trail` is the single best demo screen — every decision traces
  input → reasoning/policy → action → outcome.
