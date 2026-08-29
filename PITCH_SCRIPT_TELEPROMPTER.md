# Pitch Script — 5:00 Teleprompter + Clipchamp Cut Sheet

Read this at a natural talking pace, not a rushed read — the timestamps
already assume normal conversational speed (~140 wpm) with room to
breathe. Each block has: **[ON CAMERA]** for you talking to the lens, and
**[SCREEN]** for what to cut to in Clipchamp. Bracketed italics are
delivery notes, not spoken words. Swap any bracketed number for the real
one out of your `metrics.json` right before recording — never speak a
number you haven't just re-verified.

---

### 0:00–0:30 — Cold open, on camera, no intro slide

**[ON CAMERA]**
"Every 'AI reconciliation' demo you've probably seen this week shows one
transaction matching perfectly. That proves nothing. So instead of
building a demo, I built a batch — [X,XXX] real-shaped transactions,
with [XXX] deliberately broken in ways real payment systems actually
break — and I'm going to show you the exact match rate, live, computed
from a file, not from memory."

*[Delivery note: flat, confident, slightly challenging tone — you're
setting up why everyone else's demo is weaker than yours before you've
shown a single screen.]*

**[SCREEN — Clipchamp cut point]**: cut to terminal or repo view showing
the file tree (`data_generation/`, `pipelines/`, `app/`) for ~2 seconds
only — just enough to register "this is a real structured project," not
a walkthrough yet.

---

### 0:30–1:00 — The dataset, on camera

**[ON CAMERA]**
"I generated the dataset myself: orders, payments, settlements, refunds,
subscriptions. Then I ran a chaos injector that deliberately breaks a
chunk of the settlements — rounding drift, split settlements, duplicate
records, payments that never got a settlement match at all. And here's
the important part: I logged the answer key *before* running any
matching logic. So every number I show you next is checked against a
ground truth I know is true, not eyeballed."

**[SCREEN]**: quick cut to `ground_truth.json` scrolling briefly, then to
`METRICS.md` — don't linger, ~3 seconds each, just enough to prove these
are real files.

---

### 1:00–2:30 — Reconciliation pipeline walkthrough

**[ON CAMERA — 1:00–1:15]**
"The matching runs in three stages, cheapest first. Stage one is pure
exact matching — payment ID, amount, date window. Stage two is fuzzy
matching for the structural stuff — rounding, delays, split payments —
still deterministic, just arithmetic, no AI yet."

**[SCREEN — 1:15–1:45]**: full screen recording of the dashboard record
list (or terminal output if the frontend isn't built), showing the
Stage 1+2 resolved count landing. Let the count-up animation play if the
dashboard's built; if not, just show the terminal printout clearly for a
beat.

**[ON CAMERA — 1:45–2:00]**
"That alone resolves [XX]% of the batch. The AI only touches what's
actually ambiguous after that — the last [X]%."

**[SCREEN — 2:00–2:30]**: click into one specific unresolved record in
the evidence panel (or show the Stage 3 JSON output). Let it actually
read on screen — hypothesis, evidence cited, confidence score. This is
your most important visual beat in the whole video — don't rush the cut,
hold on it for a real 15–20 seconds so a viewer can actually read it.

**[ON CAMERA — 2:30, one line over the tail of that screen]**
*(voiceover, not cut back to camera yet)*
"If the model isn't confident, it doesn't get to say resolved — it gets
flagged for a human instead."

---

### 2:30–3:30 — Recovery pipeline walkthrough

**[ON CAMERA — 2:30–2:45]** *(cut back to camera here)*
"Second half — same dataset, different problem. Failed payments and
failed subscription charges. The agent doesn't just retry blindly — it
figures out *why* it failed first."

**[SCREEN — 2:45–3:10]**: recovery queue view, sorted by expected value.
Point out (cursor or on-screen highlight) one row where the intervention
was "escalate to human" and say why live:

**[ON CAMERA — 3:10–3:30]**
"This one gets escalated straight to a person — not because the AI
couldn't figure it out, but because it's above the auto-approval
threshold. That's a hard rule, not a judgment call. No AI decision
touches money without a bounded policy checking it first."

---

### 3:30–4:15 — The numbers, read straight from the file

**[ON CAMERA]**
"Here's the batch, end to end." *(count on fingers or just state
plainly, no dramatics — the numbers should carry the weight, not your
delivery)*
"[X,XXX] settlement records, [XX]% resolved automatically, [X]% resolved
by the AI investigator, [X]% honestly flagged as unresolved. On the
recovery side: [₹X.XL] at risk in this batch, [₹X.XL] recovered in
simulation, [XX] escalated to a human because the stopping rules said so."

*(one beat pause)*

"And the number I actually care about most: false-resolution rate —
[X]%. That's how often the system said 'resolved' on something that
wasn't. That's the number that tells you whether you can trust the
green checkmarks."

**[SCREEN]**: `METRICS.md` on screen, cursor pointing at each number as
you say it, in order, so the viewer can visually track "he's reading
this off the file, not reciting a memorized pitch."

---

### 4:15–4:45 — Repo + what's next

**[ON CAMERA]**
"Full repo's linked below — data generator, both pipelines, the FastAPI
backend, and a README that runs the whole thing end to end from a clean
checkout. Next thing I'd actually build: validate this against real
Razorpay test-mode settlement data, because right now every number you
just saw is against data I generated myself, and I want to know how it
holds up against the real thing."

*(Say this plainly, not defensively — it should read as "here's my next
step," not "here's my disclaimer.")*

---

### 4:45–5:00 — Close

**[ON CAMERA]**
"That's it. Not a chatbot demo — a system that processes a real batch,
shows its work, and tells you honestly what it couldn't figure out.
Thanks for watching."

**[SCREEN]**: hold on camera for the last line, no cutaway — end on your
face, not on a slide. Cut to black or a simple end card with repo link
text only, no music sting needed.

---

## Clipchamp cut-sheet summary (timestamps to drop clips at)

| Time | Visual |
|---|---|
| 0:00–0:30 | On camera |
| 0:30–0:32 | Quick file-tree flash |
| 0:32–1:00 | On camera |
| 1:00–1:15 | On camera |
| 1:15–1:45 | Screen: record list / stage 1+2 output |
| 1:45–2:00 | On camera |
| 2:00–2:30 | Screen: single evidence panel, held static, readable |
| 2:30–2:45 | On camera |
| 2:45–3:10 | Screen: recovery queue, cursor highlight on one row |
| 3:10–3:30 | On camera |
| 3:30–4:15 | Screen: METRICS.md, cursor tracking each number as spoken |
| 4:15–4:45 | On camera |
| 4:45–5:00 | On camera, hold, no cut |

## Recording notes

- Do the on-camera segments in one continuous take if you can — small
  natural pauses are fine and read as more credible than a hyper-polished
  cut-heavy delivery. Save the aggressive cutting for the screen
  segments, not your face.
- Re-run `compute_metrics.py` fresh right before recording and read the
  numbers off the actual output — don't recite from memory, and don't
  use numbers from an earlier draft of this script.
- If a number changes between now and recording (different seed, more
  chaos types added), update every bracketed placeholder in this script
  before you read it — a mismatch between what you say and what's on
  screen is the one mistake that actively costs you credibility.
