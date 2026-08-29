# Data Engineering Logic Brief — Reconciliation + Recovery Pipelines

Read this as the reasoning a principal data engineer would hand to a team
before anyone writes a line of code: why the data is shaped this way, why
the matching logic is staged the way it is, and where the actual rigor in
this project lives. The existing Python files already implement a first
pass of this — this document is the deeper logic, the edge cases they
don't yet cover, and the standard a judge's technical follow-up question
should be answered against.

The single governing principle for all of it: **every number you show
must be reproducible from a file in the repo, and every claim of
"resolved" must be falsifiable against a ground truth you generated
yourself.** If a judge asks "how do you know your precision number is
real," the honest answer must be "because I injected the errors myself
and logged the answer key before running any matching logic on it" — not
"I checked a few by hand and they looked right."

---

## 1. Why synthetic-with-injected-ground-truth beats real anonymized data here

A tempting shortcut is to find a public Kaggle transactions dataset and
run reconciliation logic against it. Don't. The reason is subtle but
important: **you cannot compute precision/recall on real data unless you
already know which rows are actually mismatched — and if you knew that,
you wouldn't need the pipeline.** Public transaction datasets don't come
with a "this settlement should have matched this payment" answer key,
because that pairing *is* the reconciliation problem — nobody has solved
it for you to borrow the answer.

Synthetic generation with a chaos injector solves this cleanly: you
create the mismatches, so you know with certainty which ones exist,
which stage should catch them, and what the "correct" resolution is. This
is the actual reason the ground-truth file is the most valuable artifact
in the repo — more valuable than the matching code itself, because it's
what makes every downstream number falsifiable instead of asserted.

## 2. Data model design principles (why five tables, not one flat file)

Real settlement data is messy specifically *because* it's the join output
of independent systems that don't share a transaction ID scheme end to
end — your bank, your payment gateway, and your own order system each
have their own reference numbers, and reconciliation's entire job is
bridging that gap. A flat, pre-joined table would erase the exact problem
you're claiming to solve. Five separate tables, each with its own key
space and only a soft (sometimes broken) foreign-key relationship to the
others, is what makes Stage 1's "exact match" meaningfully harder than
Stage 2's "fuzzy match," which is meaningfully harder than Stage 3's
"reasoning required."

Design the relationships with these three properties, in order of
importance:
1. **Referential integrity is common, not universal.** Most settlements
   cleanly reference a real payment_id. The exceptions (orphaned,
   duplicated, split) should be a deliberately controlled minority — this
   is what makes your "94% auto-matched" number credible instead of
   suspicious. A dataset where 40% of rows are broken doesn't look like a
   real payments system; it looks like a demo built to make Stage 3 look
   necessary.
2. **Time is a first-class dimension, not metadata.** Settlement delay,
   refund timing, and retry timing all need realistic distributions
   (T+1/T+2 with a long tail to T+5, not a uniform random spread) because
   your matching logic's date-window tolerance is only defensible if
   you can point to what "normal" timing looks like in your own data.
3. **Amounts should carry real financial arithmetic, not random noise.**
   Gateway fees, GST-on-fees, partial refunds, and rounding should all be
   computed the way a real payment processor computes them (percentage
   fee + tax on the fee, rounded to 2 decimal places at each step, not
   rounded once at the end) — because that's exactly where genuine
   rounding-drift bugs come from in production, and injecting fake drift
   on top of already-correct arithmetic is what makes the "rounding
   drift" chaos type a believable simulation of a real bug rather than an
   arbitrary random offset.

## 3. Chaos injection: designing errors that are honest tests, not gimmes

The existing six chaos types (rounding drift, split settlement, duplicate
settlement, orphaned settlement, delayed settlement, silent webhook
failure) are a good start. A more rigorous version adds three more axes
that a real reconciliation system actually has to survive:

- **Currency/precision edge cases:** a settlement amount computed with a
  different rounding rule than the payment amount (round-half-up vs
  round-half-even) — these produce mismatches under ₹0.01 that a naive
  "exact match" would wrongly reject, and are a real, well-known class of
  reconciliation bug. Include a handful of these specifically to pressure-
  test your tolerance thresholds.
- **Reused bank references across unrelated settlements** (not duplicates
  of the same settlement — genuinely different settlements that
  coincidentally share a truncated bank_ref prefix, because banks
  sometimes truncate references at a fixed character length). This tests
  whether your Stage 2 fuzzy matcher over-trusts partial reference-string
  matches — a very realistic false-positive trap.
- **Cross-period settlements** (a payment from month N settling in month
  N+1, crossing a reporting-period boundary). This tests whether your
  date-window logic accidentally treats a legitimate late settlement as
  unmatched when in production it would appear in the following period's
  reconciliation run instead — a distinction worth explicitly modeling
  rather than papering over with a wider tolerance window.

For every chaos type, the design rule is: **the corruption must be a
plausible mechanism, not an arbitrary corruption of a field.** "Randomly
change 5% of amounts by a random amount" is not a chaos type — it's noise,
and noise doesn't test anything specific. Every chaos type above has a
one-sentence real-world cause. If you can't state the cause, don't
include it as its own labeled category — it'll just blur your precision
number without teaching you (or the judge) anything about which failure
mode your system actually handles.

**Rate discipline:** keep the total injected-chaos rate in the 10–15%
range of settlement records. Below that, your held-out test set is too
small for the precision/recall numbers to be statistically meaningful at
your data volume (see §5). Above that, your dataset stops resembling a
real payments system and starts looking artificially adversarial, which
undermines the "honest metrics on realistic data" claim that's the whole
point of this build.

## 4. Matching pipeline logic: what each stage is actually for

The three-stage design isn't just "cheap first, expensive last" — each
stage should be answering a genuinely different question:

- **Stage 1 (deterministic) answers:** "does this settlement reference a
  payment that exists, at an amount and time consistent with normal
  processing?" This should be pure boolean logic, no thresholds to tune
  beyond a tight date window — if you find yourself loosening Stage 1's
  tolerance to catch more rows, that logic belongs in Stage 2, not Stage 1.
  Keeping Stage 1 strict is what makes its ~80%+ resolution rate
  meaningful: it's the floor of "unambiguously correct," not "probably
  fine."
- **Stage 2 (fuzzy/heuristic) answers:** "is there a *structural* reason
  — split, rounding, delay — that a strict match failed, which I can
  verify with arithmetic rather than judgment?" Every Stage 2 rule should
  be justifiable with a sentence like "if grouped by payment_id, do the
  amounts sum to the expected net within tolerance" — i.e., still fully
  deterministic once you allow grouping, not a confidence score or a
  model call. If a rule requires "does this seem right," it belongs in
  Stage 3.
- **Stage 3 (LLM investigation) answers:** "given the remaining
  ambiguous cases, what's the most plausible explanation given nearby
  evidence, and how confident should a human be in that explanation?"
  This is the only stage that should ever produce a confidence score,
  because it's the only stage making a genuinely uncertain judgment
  rather than executing arithmetic.

This division matters for your pitch defense: if a judge asks "why not
just send everything to the LLM," the answer is that doing so would
collapse the meaningful distinction between "this is definitely fine"
and "this required reasoning" — and would make your false-resolution
rate much harder to keep low, since LLMs are more likely to produce a
plausible-sounding but wrong explanation when given a clean case that
didn't actually need explaining.

## 5. Statistical rigor: what your metrics can and can't claim

Be precise about what your precision/recall numbers actually measure.
They are computed **only against the subset of records where you
injected known chaos** — this is correct and necessary (§1), but it means
your recall number specifically answers "of the errors I know exist, how
many did the pipeline catch," not "of all possible errors in a real
system, how many would this catch." State this distinction explicitly in
the pitch rather than letting the number imply more than it proves — a
judge who's done real ML work will respect the precision of the claim
more than the size of the number.

Two more rigor points worth building in:
- **Compute a confidence interval, not just a point estimate**, on your
  precision/recall given your chaos-subset sample size — at ~120-150
  injected-issue records (from a ~12% rate on ~1,000-3,000 settlements),
  a binomial confidence interval will be wide enough to be worth
  showing honestly ("precision 91% ± 5%, n=134") rather than a bare
  percentage that implies more certainty than the sample size supports.
- **Track the false-resolution rate as its own headline metric**, not a
  buried sub-number (this is already planned in the architecture doc —
  reinforce it here): it is the single number that most directly answers
  "can I trust this system's RESOLVED verdicts," which is the actual
  question a finance controller cares about. A system with 95% recall but
  a 15% false-resolution rate is worse than one with 80% recall and a 2%
  false-resolution rate, because false resolutions are the failure mode
  that actually loses a business money silently.

## 6. Recovery pipeline logic: why the policy table must stay fixed

The recovery pipeline's most important design decision is one you've
already made correctly: intervention selection comes from a fixed lookup
table, not a free-form LLM call. Extend that discipline further:

- **The recovery-probability model should be simple and inspectable**,
  not a black-box learned model, for this build. A transparent formula
  (base rate by failure category, decayed by retry count) is more
  defensible in a live Q&A than a trained classifier you can't fully
  explain in the room — "here is the exact formula and here is why" beats
  "our model learned this" when you have five minutes and no ML
  infrastructure story to back it up.
- **Every stopping rule needs a stated business reason**, not just a
  hardcoded number. "Max 3 automated retries" should be justifiable as
  "beyond this, recovery probability decays below the cost of the
  intervention" — tie the constant back to the expected-value formula
  itself so the stopping rule is a logical consequence of the model, not
  an arbitrary safety knob. Wherever a rule looks like a magic number,
  either derive it from the recovery-probability formula or replace it
  with a comment/paragraph explaining what real-world constraint it
  stands in for (e.g., a 48-hour message rate-limit stands in for actual
  RBI/consent-based communication norms around payment reminders).
- **Expected value must subtract intervention cost, not just multiply
  amount by probability.** A ₹50 outbound WhatsApp-and-support-time cost
  against a ₹40 subscription failure is a net-negative intervention even
  at high recovery probability — make sure the ranking logic would
  actually deprioritize or skip these, and use at least one such example
  in your demo data so the audit trail can show a genuinely reasoned
  "not worth intervening" decision instead of only ever showing
  successful bounded interventions.

## 7. Validation strategy before you trust any number enough to say it on camera

Before computing your final metrics table for the pitch:
1. **Unit-check the generator itself** — for a small fixed seed, manually
   trace 5–10 individual records end to end (order → payment → settlement
   → chaos injection → expected resolution) and confirm by hand that the
   ground truth label is actually correct for each. This catches logic
   bugs in the injector before they silently inflate or deflate your
   metrics.
2. **Run the full pipeline at two different seeds** and confirm the
   metrics are stable within the confidence interval from §5 — if
   precision swings by 20+ points between seeds at the same chaos rate,
   your sample size or chaos-type balance needs adjusting before you can
   trust a single run's number for the pitch.
3. **Deliberately construct one adversarial record by hand** — something
   designed to fool Stage 2 into a false match (e.g., two unrelated
   payments that happen to sum to a plausible settlement amount by
   coincidence) — and confirm your false-resolution tracking actually
   catches it. This is the single best insurance against presenting a
   flattering-but-wrong metrics table without realizing it.
4. **Re-run compute_metrics.py from a clean checkout** right before
   recording the pitch, and read the number from the freshly generated
   file on camera — not from memory of an earlier run. This is a cheap
   habit that prevents the single most embarrassing failure mode: citing
   a number that no longer matches what's actually in the repo.

## 8. Scaling notes (for the "what would you do with more time" close)

If asked how this would extend beyond the buildathon's synthetic batch:
- Real deployment would need the matching keyed on genuinely
  probabilistic record linkage (e.g., a Fellegi-Sunter style scoring
  model across multiple weak-identifier fields) rather than the fixed-
  tolerance rules used here, because real bank data has far messier
  reference-string conventions than this synthetic set models.
- The chaos-injection ground truth approach doesn't transfer directly to
  production — production validation would instead rely on a sampled
  human-reviewed audit of the pipeline's UNRESOLVED and low-confidence
  RESOLVED buckets, since you can no longer inject and know the answer
  key. Say this explicitly if asked — it shows you understand the
  difference between a buildathon validation strategy and a production
  one, rather than implying the synthetic approach was meant to be the
  permanent answer.
