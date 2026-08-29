# Frontend Design Brief — Reconciliation + Recovery Dashboard

Read this as a design lead's brief to their own studio, not a spec sheet.
Every choice below is justified against what this specific product is: a
tool whose entire value proposition is "trust our AI's financial
decisions," being demoed to judges who see a dozen fintech dashboards a
day. The design's job is to make trust *legible at a glance*, not to look
impressive in a screenshot.

---

## 0. Ground the brief before designing

**Subject:** a finance-ops control room. Two agents (reconciliation
investigator, recovery autopilot) making bounded decisions about money,
and a human auditor who needs to verify those decisions fast.

**Audience:** a judge or evaluator, cold, with ~90 seconds of attention
per project before deciding whether to lean in. They are pattern-matching
against generic "AI dashboard" wrappers all day — cards, gradients, a
chatbot icon. The one thing they cannot pattern-match past is *evidence
they can personally verify is real*.

**The page's single job:** let someone click on any decision the system
made and see, in under 3 seconds, exactly why it made that decision —
without reading a paragraph of prose first.

Everything below is designed against that job, not against "looks
professional."

---

## 1. Why the obvious defaults are wrong here

Reject, explicitly:
- **Warm cream + terracotta + serif display.** Reads as a lifestyle/consumer
  product. This is a control-room tool. Wrong register entirely.
- **Near-black + single neon accent.** This is the *default* look for "AI
  agent dashboard" right now — every buildathon submission will have one.
  It signals "I asked an LLM to design a dark-mode dashboard," which is
  the exact impression to avoid when the whole pitch is "we are more
  rigorous than the average submission."
- **Broadsheet hairlines + zero-radius + dense columns.** Closer, but a
  newspaper metaphor undersells the sense that *money is actually moving*
  — this needs to feel more like a ledger you can put your hand on, not
  something you read.

## 2. The actual design direction: the Ledger

Take the aesthetic of a **physical audit ledger / bank stamp book**,
translated into a fast, modern interface. Real financial-ops software
(the good kind — think old-world private banking, not fintech-startup
gradients) uses paper, ink, and stamps as its visual vocabulary because
those objects *are* the concept of "verified." Lean into that literally,
but keep the execution crisp and modern — no skeuomorphic textures, no
fake paper grain. Borrow the *logic* of ledgers and stamps (sequential
records, an unambiguous mark of status, a visible trail), not their
literal look.

### Color — 5 named hex values
| role | hex | use |
|---|---|---|
| `--paper` | `#F7F6F2` | base background — warm but neutral, not cream/cliché-terracotta warm |
| `--ink` | `#1A1F2B` | primary text, near-black with a blue undertone (not pure black) |
| `--ledger-blue` | `#2B4C7E` | structural accent — headers, dividers, the "this is a record" color |
| `--stamp-green` | `#1F6E4A` | RESOLVED / recovered / passed states — an actual ink-stamp green, desaturated, not a UI-success neon green |
| `--stamp-red` | `#8C2E23` | UNRESOLVED / escalated / blocked states — oxblood ink-stamp red, not alarm red |

Use `--stamp-green` and `--stamp-red` **only** for verdicts (resolved vs
unresolved, recovered vs not, passed vs blocked). Nowhere else. This
scarcity is what makes the stamp motif read as meaningful rather than
decorative — if half the UI is tinted green, the eye stops trusting it.

### Typography — 3 roles, deliberately mismatched from the cliché serif-display pairing
- **Display (headers, section titles):** a condensed grotesk with real
  personality at large sizes — something like *Archivo Expanded* or
  *Fjalla One* — used only for section labels and the audit-trail
  headline. Never for body copy.
- **Body:** a plain, humanist sans built for dense reading at small
  sizes — *Inter* or *IBM Plex Sans*. This is a working tool; the body
  text needs to disappear into legibility, not perform character.
  Deliberately *not* pairing it with a serif — a serif+sans pair is the
  default "editorial" move, and this isn't an editorial page.
- **Data/mono (every number, every ID, every timestamp):** *IBM Plex Mono*
  or *JetBrains Mono*, tabular figures on. Every ₹ amount, every
  confidence score, every record ID renders in mono. This is the single
  highest-leverage typography decision on the page: it makes numbers feel
  audited rather than typeset, and it gives every number the same visual
  weight regardless of which panel it's in.

### Layout concept
```
┌─────────────────────────────────────────────────────────┐
│  LEDGER HEADER — thin, sticky, always shows live totals   │
│  ₹ at risk · ₹ recovered · match rate · unresolved count  │
├───────────────────────┬───────────────────────────────────┤
│                       │                                   │
│  RECORD LIST          │   EVIDENCE PANEL                  │
│  (reconciliation OR   │   (opens on click, slides in       │
│   recovery queue —    │    from the right — receipt-       │
│   tab to switch)      │    printout reveal, see §4)         │
│                       │                                   │
│  each row:            │   shows: input record → reasoning  │
│  ID · amount · status │   → policy check → action →        │
│  stamp · confidence    │   outcome, as a vertical trail     │
│                       │                                   │
├───────────────────────┴───────────────────────────────────┤
│  AUDIT TRAIL FOOTER STRIP — collapsed by default,          │
│  expands to full-height combined feed of both pipelines    │
└─────────────────────────────────────────────────────────┘
```
One-sentence description: *a ledger you can open.* The list is the book,
the evidence panel is the page you turn to, the footer strip is the full
archive underneath everything.

### Signature element
**The stamp.** When a record resolves — either pipeline, either
direction — a small stamp mark animates onto the row: a circular or
angled rectangular mark in `--stamp-green` or `--stamp-red`, appearing
with a fast, slightly imperfect "thump" (see animation spec below), like
a real rubber stamp hitting paper at a very slight rotation offset (±3°,
randomized per row so they don't look copy-pasted). This is the one
memorable thing on the page. It embodies the brief directly: *this
system doesn't just say "resolved," it stamps it*, and a stamp is a
physical metaphor for "someone/something took responsibility for this
decision" — which is exactly what a bounded, auditable financial agent
needs to communicate. Everything else on the page stays quiet so this
lands.

---

## 3. Page-by-page / panel-by-panel instructions

### 3.1 Ledger header (sticky, ~64px tall)
- Four live numbers, mono, large (28–32px), each with a small caption
  underneath (12px, uppercase, letter-spaced, `--ledger-blue`): "AT RISK",
  "RECOVERED", "MATCH RATE", "UNRESOLVED".
- Numbers should *count up* on page load (0 → final value, ~800ms, eased
  out) — one deliberate animated moment, not a scroll gimmick. This is
  the hero: the thesis of the whole product ("we measure real outcomes")
  stated in four numbers before any explanation text.
- No icons here. No card borders. Just numbers on paper with a single
  1px `--ledger-blue` rule beneath the header. Restraint is the point —
  four huge honest numbers say more than an icon-and-card treatment.

### 3.2 Record list (left ~55% width)
- Two tabs at the top: "Reconciliation" / "Recovery" — plain text tabs,
  underline indicator, no pill/rounded-background tab style (too generic-
  SaaS).
- Each row: monospace record ID (dimmed, `--ink` at 55% opacity) · amount
  (mono, full opacity, right-aligned) · a small stamp icon showing
  current status · confidence or recovery-probability as a thin
  horizontal bar (not a progress-ring — a ring implies "loading", a bar
  implies "measurement").
- Sort control: default sort is "most interesting first" — for
  reconciliation, unresolved-then-lowest-confidence-resolved; for
  recovery, highest expected-value first. State this default in a small
  caption above the list ("sorted by expected value") so it doesn't look
  arbitrary.
- Row hover: a 2px `--ledger-blue` left-border appears, row background
  shifts to `--paper` darkened by ~3% — subtle, not a shadow-lift card
  effect.
- Row click: opens evidence panel (§3.3) and the row gets a persistent
  `--ledger-blue` left-border to show "this is what you're looking at."

### 3.3 Evidence panel (right ~45% width, slides in from right edge, 280ms ease-out)
This is the panel that does the actual persuading. Structure as a
vertical trail, top to bottom, each stage revealed with a 60ms stagger so
the eye reads it as a sequence, not a wall of text appearing at once:

1. **Input record** — the raw settlement/payment/failed-charge row,
   rendered as a small mono key-value table. This grounds the reader in
   "here is the actual data."
2. **Reasoning** — for LLM-investigated records, the model's hypothesis
   and cited evidence, in body type, quoted evidence fields in mono
   inline. For deterministic-stage matches, this is replaced with the
   matching rule that fired ("exact match: payment_id + amount within
   ₹0.01, settled T+1") — make clear to the reader which stage resolved
   this, because "Stage 1 caught this instantly" and "the LLM had to
   reason about this" are both worth surfacing, not hidden behind a
   uniform "AI decided" framing.
3. **Policy check** — a single line, badge-styled but text-only (no
   rounded pill background — just bold mono text in `--stamp-green` or
   `--stamp-red`): "PASSED" / "RATE LIMIT BLOCKED" / "ESCALATED — amount
   exceeds threshold". This is where the "bounded and gated" story lives
   visually — show the constraint that was checked, not just the
   outcome.
4. **Action** — what was actually done (or would be done): "auto-retry
   scheduled +30min" / "no action — resolved" / "flagged for human
   review".
5. **Outcome** (recovery only) — recovered / not recovered, with the
   simulated amount.
6. The stamp (§2 signature element) appears at the bottom of the trail,
   last, after the sequence has been read — it's the seal on the ledger
   page, not the first thing you see.

### 3.4 Audit trail footer strip
- Collapsed state: a thin bar, `--ink` background, mono white text,
  showing a live-scrolling single-line feed of the most recent 3–4
  decisions across both pipelines (like a ticker, but readable, not
  fast-scrolling marquee — advance one entry every ~2.5s, pause on
  hover).
- Expanded state (click to expand, or a keyboard shortcut `⌘/Ctrl+J`):
  full-height table, all decisions, filterable by pipeline/status,
  exportable (a real "Export CSV" text link, not a button — this is a
  utility action, treat it as one).
- This is the single screen to leave open during the live pitch demo —
  design it to look good paused mid-scroll, since that's how it'll
  actually be seen on camera.

---

## 4. Motion — orchestrated, not scattered

Pick **one** orchestrated moment (per the frontend-design principle that
one orchestrated sequence beats several scattered effects) and keep
everything else nearly still:

**The chosen moment: the stamp-down.** When a record resolves (on page
load for pre-computed data, or live if wired to a websocket during the
demo), the stamp animates in three fast beats:
1. Scale from 140% → 100% opacity 0 → 1, 90ms, ease-in (the stamp
   "approaches")
2. A 40ms hold at 100% then an 8ms overshoot to 96% scale (the "impact")
3. A 2px random-direction jitter settle over 60ms (the "off-axis thump" —
   real stamps never land perfectly true)

Total: ~200ms per stamp. When multiple rows resolve at once (page load),
stagger each stamp by 40–70ms (randomized, not a uniform grid-wave) so it
reads as many small independent events, not one synchronized animation —
this reinforces "these are 900 independent decisions," which is the
actual point.

Everything else on the page: **no** hover-lift shadows, **no** gradient
shimmer, **no** parallax, **no** page-load fade-up-from-below on every
element (the single most common tell of AI-generated frontend work).
The evidence panel slide and the tab underline transition are the only
other motion on the page, both under 300ms, both ease-out, no bounce.

Respect `prefers-reduced-motion`: swap the stamp animation for an instant
opacity cross-fade at 0ms scale change, keep everything else identical.

---

## 5. Copy voice

This tool's copy should read like the interface is a careful colleague
reporting facts, not a product trying to delight you.

- Verdicts state facts, not judgments: "Unresolved — human review
  required," not "Uh oh, something's off!"
- Never use exclamation points anywhere in the UI.
- Empty states are informational, not cute: if the reconciliation queue
  has zero unresolved records, say "No unresolved records in this batch"
  — not "All clear! 🎉".
  ("No unresolved records" is also more credible to a judge — an empty
  state that congratulates itself reads as unearned.)
- Every number has a unit and a timeframe visible nearby ("₹8.4L
  recovered, this batch" not a bare "₹8.4L").
- The word "AI" should appear rarely in the UI copy itself — let the
  stamp, the evidence trail, and the policy-check line *demonstrate*
  rigor rather than the copy *claiming* it.

---

## 6. Build discipline (the quality floor, not optional)

- Fully responsive down to a 375px viewport: the two-column record-
  list/evidence-panel layout collapses to a single column with the
  evidence panel becoming a full-height overlay (not a modal with a
  shadow — a same-paper-color overlay with just a close affordance top
  right, to preserve the "same ledger, turned page" feel).
- Visible keyboard focus on every interactive element — a 2px
  `--ledger-blue` outline, offset 2px, never `outline: none` without a
  visible replacement.
- Every stamp/status color pairs with a text label, never color alone —
  colorblind-safe by construction, not by afterthought.
- Numbers never reflow/jump on load — reserve layout space before the
  count-up animation starts so nothing shifts around it.

## 7. Self-critique pass before calling it done

Before shipping, check the built page against the brief's actual job
(§0): pick any three rows in the record list, click each, and time how
long it takes to answer "why did the system decide this?" without
reading a paragraph. If any of the three take longer than ~3 seconds of
reading, the evidence panel hierarchy (§3.3) needs tightening — usually
that means the reasoning text is doing too much work that the policy-
check line or the matching-rule line should be doing instead.

And, per the one-accessory rule: if there's a second animated flourish
anywhere besides the stamp-down, cut it.
