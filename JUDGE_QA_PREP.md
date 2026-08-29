# Judge Q&A Prep — Reconciliation + Recovery Submission

Read this before recording the pitch and again the night before any live
panel round. The goal isn't memorized answers — it's knowing exactly
where your submission is genuinely strong, where it's genuinely thin, and
never letting a hard question push you into overclaiming. Judges running
an intern filter are testing how you handle "I don't know that yet" as
much as they're testing your metrics table.

**One rule that covers most of this document:** if a question asks about
something outside what you built and measured, say what you'd do and why
you didn't do it yet — never imply you tested something you didn't.

---

## 1. Questions about whether this is "real AI" or just rules

**"Isn't most of your match rate just deterministic rules? Where's the
actual AI?"**

Own this directly instead of getting defensive — it's a deliberate
design choice, not a limitation you're hiding. Say: Stage 1 and 2 resolve
~80–95% of records with pure arithmetic because that's the *correct*
architecture — an LLM call on a case that's provably an exact match adds
cost, latency, and a nonzero hallucination risk for zero benefit. The AI
is concentrated exactly where judgment is actually required: the
remaining ambiguous cases where evidence has to be weighed, not looked
up. If the whole pipeline were LLM calls, you'd be optimizing for "looks
AI-heavy" over "resolves correctly and cheaply," and this program is
explicitly testing operational judgment, not photo-op AI usage.

**"Couldn't a judge just write those same fuzzy-matching rules without any
ML at all?"**

Yes — and that's the point. Stage 1/2 don't need ML to be correct. The
skill being demonstrated there is knowing *which 80% doesn't need AI*,
which is a harder and more valuable judgment call for someone building
production finance infrastructure than reaching for an LLM by default.

---

## 2. Questions about whether your metrics are real

**"How do we know these numbers aren't cherry-picked?"**

Point directly at `ground_truth.json` and `compute_metrics.py`: every
number in `METRICS.md` is computed from an answer key generated *before*
any matching logic runs, on synthetic data with programmatically injected
errors, not hand-picked examples. Offer to regenerate the whole dataset
with a different seed live, on the spot, and recompute — if you're not
confident the number holds up under a fresh seed, that's a real problem
to fix before the panel, not something to talk around.

**"Your dataset is synthetic. Doesn't that mean the numbers don't mean
anything?"**

Be honest and precise here rather than defensive: the numbers mean
exactly what they claim — precision/recall against errors you injected
and know the answer to, on data whose financial mechanics (fee
calculation, settlement timing, refund handling) mirror real processor
behavior. They do *not* claim to represent recall against the full space
of possible real-world reconciliation errors — you don't have access to
that ground truth, and neither does anyone building this without
production data access. This is the correct scientific claim to make
with the evidence you have; overclaiming further than this is the actual
risk, not underclaiming.

**"What's your sample size, and does that number actually mean anything
statistically?"**

Know this cold, don't estimate live: state the exact injected-chaos
count (n) from your `metrics.json`, and be ready to say the rough
binomial confidence interval at that n (at n≈130-150 and precision in the
85-95% range, expect roughly a ±4-6 point interval). If you haven't
computed the actual interval, say "I have a point estimate; I'd want to
compute the confidence interval properly before calling this a rigorous
claim" — that answer reads as more credible than pretending precision to
you don't have.

**"What's your false-resolution rate and why should I care about that
number specifically over precision?"**

This should be your best-prepared answer. False-resolution rate answers
"of the cases that were actually broken, how many did the system
incorrectly mark as fine" — it's the number that measures silent harm.
A finance controller who trusts a wrong "RESOLVED" verdict stops looking
at that transaction; a system that's cautious (flags things unresolved
that were actually fine) costs someone a few minutes of review; a system
that's falsely confident costs someone money they don't know is missing.
State your actual number and say explicitly why you optimized the
confidence threshold to keep this low even at some cost to overall
resolution rate.

---

## 3. Questions that test whether you understand the domain, not just the code

**"Real settlement data doesn't look like this — what's actually different
in production?"**

Have 2-3 concrete answers ready, not a vague "it's more complex":
production bank references follow inconsistent per-bank truncation and
formatting conventions rather than one clean format; multiple currencies
and cross-border FX timing add a whole extra reconciliation axis you
haven't modeled at all; and real settlement batches can span thousands of
payments per batch_id with partial-batch failures, not the mostly 1:1
mapping in your synthetic set. Say which of these you'd tackle first
(probably per-bank reference format handling, since it's the most common
real failure mode) rather than claiming your simulation already covers
production reality.

**"How would this actually integrate with Razorpay's real settlement
APIs?"**

Be honest that you haven't built against Razorpay's real settlement
webhook/API surface — you built against a synthetic approximation of the
data shape you'd expect from public documentation of how RTA/gateway
settlement flows typically work. Name what you'd need to validate that
assumption: real (test-mode) settlement payloads to confirm your schema
assumptions hold, and real webhook delivery patterns to see if "silent
webhook failure" happens the way you modeled it or differently.

**"You said this draws on real finance-ops experience — what specifically
did you do in production that maps to this?"**

Speak concretely from your actual FinIQ work if asked — production
report-export refactors, audit/history table design, and investor auth
debugging (real CORS/migration/token bugs) are legitimate prior exposure
to the *category* of problem (multi-tenant fintech SaaS operations under
real production constraints), even though FinIQ's specific domain is
mutual-fund distribution, not payment-gateway settlement. Say that
distinction explicitly — "adjacent domain, same category of operational
rigor" is an honest and still-strong claim; implying you'd already built
literal payment reconciliation before this buildathon would be an
overclaim a follow-up question would expose.

---

## 4. Questions that probe the recovery pipeline's judgment

**"Why is intervention selection a fixed table instead of letting the AI
decide the best action?"**

This is a strength, not a limitation — say so directly. A free-form LLM
decision about what to do with someone's money is exactly what "every
money action explainable, bounded, and gated" rules out. A fixed policy
table means every intervention is auditable *before* it runs (you can
read the whole decision space in one file) rather than only auditable
after the fact by reading a model's stated reasoning, which might not
faithfully reflect what actually happened.

**"Your recovery probabilities look like made-up numbers — how would you
actually calibrate them?"**

Be straightforward: they're a transparent, simple decay formula chosen
because it's inspectable and defensible in a five-minute pitch, not a
trained model, because you don't have historical recovery-outcome data
to train one on. If you had a real merchant's historical retry/recovery
data, you'd calibrate the base rates and decay curve against actual
outcomes — logistic regression on failure category, retry count, time-
of-month, and prior customer payment history would be the natural next
step. Naming the next step you'd take with real data is a stronger answer
than pretending the current formula is already calibrated.

**"What stops this from just spamming customers with retry messages?"**

Point to the concrete stopping rules: max automated retries, a per-
customer message rate limit within a rolling window, and mandatory
human escalation past a retry threshold or on a revoked mandate. If asked
why those specific numbers, give the honest answer from the logic brief:
they're reasonable illustrative defaults, not tuned against real
complaint-rate or opt-out data you don't have — and say what you'd tune
them against if you did (unsubscribe/complaint rate per channel,
regulatory guidance on payment-reminder frequency).

---

## 5. Questions that test business framing, not just technical build

**"How does this actually make Razorpay money, versus just being a cool
system?"**

Reconnect to the batch numbers directly: state your simulated ₹ at risk,
₹ recovered, and the auto-match percentage, and frame it as time saved
for a finance-ops team (fewer manual reconciliation hours, faster
detection of at-risk revenue) plus direct recovered revenue. Avoid vague
"this saves time and improves efficiency" language — cite the actual
numbers from your run.

**"Which of the four tracks does this actually belong to — you're kind of
straddling two?"**

Answer this confidently rather than hedging: the reconciliation half is
squarely Track 04 (Finance Controller — matching, exception handling,
audit trail); the recovery half is squarely Track 03 (Revenue Recovery —
root cause, intervention, measured money recovered). Say you built both
because they share one dataset and one audit-trail infrastructure, and
that overlap itself demonstrates something true about the domain: revenue
recovery and reconciliation are adjacent finance-ops problems that
naturally share instrumentation in a real company, not two unrelated
feature requests. If forced to pick one track to be judged under, pick
whichever the specific panel seems to be scoring against, and say the
other pipeline is the "if I had one more day" extension.

**"What would you build next with another two weeks?"**

Have a real, prioritized answer, not a vague list: (1) validate the
schema assumptions against real Razorpay test-mode settlement payloads,
(2) calibrate the recovery-probability model against any real historical
retry data you can get access to, (3) add the three additional chaos
types from the data-engineering brief (currency rounding-rule mismatch,
reused truncated bank refs, cross-period settlements) to pressure-test
the matching thresholds further, (4) get one real micro-merchant's
anonymized data to validate the whole pipeline outside synthetic
conditions. Ranking these shows judgment about what actually derisks the
system fastest, which is itself part of what they're evaluating.

---

## 6. The one question to prepare for above all others

**"Walk me through one specific record, live, right now."**

This is the single most likely moment to make or break the demo, and the
one you should rehearse literally, not just conceptually. Have the
dashboard (or the raw JSON if the frontend isn't built yet) open to a
specific record you know well — ideally one that went through all three
reconciliation stages or hit a real stopping rule in recovery — and be
ready to narrate: what the raw data showed, why Stage 1/2 couldn't
resolve it, what evidence Stage 3 cited, what confidence it returned, and
why that crossed (or didn't cross) your threshold. If you can do this
fluently for a record you didn't pre-select — picked live by the judge
from the unresolved queue — that single moment does more to prove the
system is real than the entire metrics table.

---

## 7. Answers you should never give, under any framing

- Never state a metric you can't immediately point to in a generated
  file in the repo.
- Never claim real-user validation you didn't actually do.
- Never imply the fixed policy table or stopping-rule constants were
  calibrated against real data if they were reasonable illustrative
  defaults — say so plainly when asked.
- Never claim the synthetic ground-truth approach would work the same
  way in production — you already have the honest answer to this in §8
  of the data-engineering brief; use it.
- Never let "we ran out of time" become an excuse for a number you
  should have verified — "I'd want to verify that before I'd state it
  confidently" is always the safer answer than a guess stated as fact.
