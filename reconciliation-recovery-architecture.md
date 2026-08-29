# Reconciliation + Revenue Recovery Agent — Architecture Spec

One shared synthetic dataset powers two demoable loops: a Finance Controller
reconciliation agent (Track 04) and a Revenue Recovery autopilot (Track 03).
Same data generator, two pipelines, two metrics tables, one pitch video.

---

## 1. Data model (synthetic, domain-realistic)

Generate five linked tables. Volume target: 2,000–5,000 transactions so your
"50+ record batch" requirement is trivially exceeded and your metrics are
statistically meaningful, not cherry-picked.

### `orders`
| field | type | notes |
|---|---|---|
| order_id | string | primary key |
| customer_id | string | FK |
| amount | decimal | gross order value |
| currency | string | INR |
| created_at | datetime | |
| status | enum | created / paid / failed / refunded / partially_refunded |
| product_ids | array | |

### `payments` (Razorpay-shaped)
| field | type | notes |
|---|---|---|
| payment_id | string | |
| order_id | string | FK |
| method | enum | upi / card / netbanking / emi / wallet |
| amount | decimal | |
| status | enum | captured / failed / pending / refunded |
| failure_reason | enum/null | insufficient_funds / bank_timeout / card_expired / risk_block / issuer_decline / network_error |
| gateway_fee | decimal | 2%+GST typical |
| created_at | datetime | |
| captured_at | datetime/null | |

### `settlements` (bank-side, the messy one)
| field | type | notes |
|---|---|---|
| settlement_id | string | |
| payment_id | string | FK, sometimes null (unmatched) |
| bank_ref | string | sometimes malformed/truncated — inject this |
| amount | decimal | net of fees — inject rounding drift ±₹0.50–3 |
| settled_at | datetime | T+1/T+2, inject occasional T+5 delays |
| batch_id | string | multiple payments can roll into one settlement batch — inject this deliberately |

### `refunds`
| field | type | notes |
|---|---|---|
| refund_id | string | |
| payment_id | string | FK |
| amount | decimal | full or partial |
| status | enum | processed / pending |
| created_at | datetime | |

### `subscriptions` (for the recovery side — SIP/mandate-style recurring)
| field | type | notes |
|---|---|---|
| subscription_id | string | |
| customer_id | string | |
| mandate_status | enum | active / expired / revoked |
| billing_cycle | enum | monthly / weekly |
| last_charge_status | enum | success / failed |
| failure_reason | enum | mirrors payments.failure_reason |
| retry_count | int | |
| next_retry_at | datetime/null | |

### Deliberately-injected messiness (this is what makes the metrics credible)
Build a `chaos_injector.py` that, on generation, randomly applies to a
configurable % of rows:
- rounding drift (gateway fee miscalculated by a few paise)
- split settlements (one payment settled across 2 batches)
- duplicate settlement records (same bank_ref twice)
- orphaned settlements (bank_ref with no matching payment_id — simulates a
  payment made outside your system, e.g. direct bank transfer)
- delayed settlements (T+5 instead of T+1)
- silently-failed webhooks (payment captured but order status never updated)
- currency/amount mismatches under ₹5 (tax rounding)

Log the injected ground truth separately (`ground_truth.json`) — this is how
you compute *precision/recall* instead of just eyeballing your own output.
This single file is your entire "honest metrics" defense in the demo.

---

## 2. Pipeline A — Reconciliation Investigator (Track 04)

```
orders + payments + settlements + refunds
              │
              ▼
   ┌─────────────────────┐
   │ Stage 1: Deterministic│   exact match on payment_id + amount + date window
   │ matcher (rules)       │   → handles ~70-80% of clean rows, fast, free
   └─────────────────────┘
              │ unmatched rows
              ▼
   ┌─────────────────────┐
   │ Stage 2: Fuzzy matcher│   amount-within-tolerance, date-window, bank_ref
   │ (rules + heuristics)  │   substring match, batch-id grouping
   └─────────────────────┘
              │ still unmatched
              ▼
   ┌─────────────────────┐
   │ Stage 3: LLM investigator│  given the unmatched row + nearby candidate
   │ (reasoning over evidence)│  rows, produce a hypothesis + confidence +
   └─────────────────────┘        human-readable explanation
              │
              ▼
   ┌─────────────────────┐
   │ Classify: RESOLVED    │   auto-accept if confidence > threshold
   │ or UNRESOLVED          │   else → exception queue for human review
   └─────────────────────┘
```

**Why three stages, not "just call an LLM on everything":** this is the
actual technical story for your pitch. Deterministic matching first is
cheaper, faster, and more trustworthy — LLM reasoning is reserved for the
genuinely ambiguous 10-20%, which is also where the "investigation" demo
value lives (rounding fee, split settlement, delayed settlement are each a
one-paragraph LLM explanation citing the specific evidence rows).

**LLM investigator prompt shape** (Stage 3): give it the unmatched
settlement/payment row, up to 5 candidate near-matches (by amount ±5%, date
±3 days, same customer), and ask for structured JSON output:
```json
{
  "hypothesis": "partial refund reduced settlement amount",
  "evidence": ["refund_id R123 for ₹153 on same payment_id"],
  "confidence": 0.91,
  "status": "RESOLVED",
  "recommended_action": "none — this is expected"
}
```
Confidence < 0.6 → force `UNRESOLVED`, never let the model auto-resolve
something it isn't sure about. That threshold discipline is exactly what
"honest exception list" means to a judge.

**Metrics table to show:**
| metric | value |
|---|---|
| Total records processed | 3,412 |
| Auto-matched (Stage 1+2) | 2,780 (81.4%) |
| LLM-resolved (Stage 3) | 512 (15.0%) |
| Unresolved / escalated | 120 (3.5%) |
| Precision on injected-chaos subset | 94.2% |
| Recall on injected-chaos subset | 89.7% |
| False-resolution rate (resolved-but-wrong) | 1.1% |

That false-resolution rate is your most important number — it's the one
that proves you didn't just make the LLM say "resolved" to everything.

---

## 3. Pipeline B — Revenue Recovery Autopilot (Track 03)

Runs on `payments.status = failed` and `subscriptions.last_charge_status =
failed`.

```
failed payment / failed mandate charge
              │
              ▼
   ┌─────────────────────┐
   │ Root-cause classifier │  failure_reason → category:
   │                        │  transient (bank_timeout, network_error)
   │                        │  vs. structural (card_expired, mandate_revoked)
   │                        │  vs. behavioral (insufficient_funds)
   └─────────────────────┘
              │
              ▼
   ┌─────────────────────┐
   │ Recovery-probability   │  simple model: P(recover) as a function of
   │ estimator               │  failure category + retry_count + days-since +
   │                          │  customer history (repeat successes)
   └─────────────────────┘
              │
              ▼
   ┌─────────────────────┐
   │ Intervention selector │  policy table, NOT free-form LLM decision:
   │                        │  transient → auto-retry in 15-60 min
   │                        │  card_expired → request card update (email/SMS)
   │                        │  insufficient_funds → retry next salary-cycle
   │                          window (heuristic: 1st/25th of month)
   │                        │  repeated failures (>3) → escalate to human
   └─────────────────────┘
              │
              ▼
   ┌─────────────────────┐
   │ Priority queue ranked │  expected_value = amount × P(recover) −
   │ by expected value      │  intervention_cost
   └─────────────────────┘
              │
              ▼
        Execute (simulated) → observe outcome → log to audit trail
```

**Stopping rules (this is the "bar" Razorpay names explicitly):**
- max 3 automated retries per payment
- no more than 1 outbound message per customer per 48h
- mandatory escalation after retry_count > 3 or subscription flagged
  `mandate_revoked`
- no action >₹X (configurable) without a human-approval flag

**Metrics table to show:**
| metric | value |
|---|---|
| Failed payments in batch | 1,240 |
| Total amount at risk | ₹18.6L |
| Interventions executed (simulated) | 1,104 |
| Predicted recovery rate | 71.3% |
| Simulated ₹ recovered | ₹9.8L |
| Escalated to human (stopping rule triggered) | 62 |
| Messages sent (rate-limit respected) | 890 |

---

## 4. Shared audit trail (both pipelines log to this — your "explainability" evidence)

Single append-only table:
```
timestamp | pipeline | record_id | input_summary | reasoning | policy_check | action | outcome
```
Render this as a filterable table in your demo UI — judges reading "show
the audit trail" literally want to click a row and see input → reasoning →
policy gate → action. This one screen does more for your pitch than any
architecture diagram.

---

## 5. Suggested stack (fast to build, matches what you already know)

- **Backend**: FastAPI (Python) — data generation, both pipelines, audit log API. You already have NestJS/FastAPI experience from FinIQ/flyer-personalizer.
- **DB**: SQLite or Postgres — 5 tables above, trivial to stand up.
- **LLM calls**: Anthropic API (Claude) for Stage 3 investigator + root-cause reasoning — structured JSON output, low temperature, cite evidence row IDs.
- **Frontend**: a single dashboard — reconciliation exception queue + recovery priority queue + audit trail viewer. Next.js, reuse patterns from FinIQ's report/export UI work.
- **Repo**: public, with a `data_generation/`, `pipelines/`, `dashboard/`, and a top-level `METRICS.md` that's just the two tables above, computed live from `ground_truth.json` — not typed by hand.

---

## 6. Build order (so nothing is a Frankenstein 36 hours before deadline)

1. Data generator + chaos injector + `ground_truth.json` (do this first — everything else depends on it, and it's the least glamorous so it's tempting to skip/rush)
2. Reconciliation Stage 1+2 (deterministic/fuzzy) — get a real match-rate number before touching any LLM
3. Reconciliation Stage 3 (LLM investigator) — layer on top, re-measure
4. Recovery root-cause + priority queue — reuses same data/audit infra
5. Audit trail dashboard — last, but budget real time for it since it's your single best demo screen
6. Metrics computed from `ground_truth.json` programmatically, dropped into `METRICS.md` and read on-camera in the pitch — never state a number you can't point to in the repo

---

## 7. What to say on camera (5-minute pitch structure)

1. (30s) The problem: reconciliation and recovery are still manual, and "AI reconciliation" demos are usually one cherry-picked match.
2. (30s) Your dataset: X records, with deliberately injected real-world messiness — name 3 chaos types.
3. (90s) Reconciliation pipeline walkthrough — show one unresolved-then-investigated exception live.
4. (90s) Recovery pipeline walkthrough — show the priority queue and one stopping-rule trigger live.
5. (60s) The metrics table, read straight from `METRICS.md`, plus the false-resolution rate as your "we're not lying to you" number.
6. (30s) Repo structure + what you'd build next with more time (real merchant pilot).
