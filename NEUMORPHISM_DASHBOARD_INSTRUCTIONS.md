# Neumorphic Dashboard Build Instructions — Reconciliation + Recovery

This replaces the earlier claymorphism direction (`CLAYMORPHISM_DESIGN_INSTRUCTIONS.md`,
now superseded) with neumorphism, styled after the reference mockup
provided (soft-UI login/dashboard kit: light blue-grey background, dual-
shadow raised panels, a blue gradient accent, circular progress rings,
pill toggles, a horizontal timeline). Paste this whole document into
Gemini as the build+design instruction. It's split into two phases on
purpose — **build the dashboard structurally first, get it working
against real data, and only then apply the neumorphic visual system.**
Doing both at once means every visual bug and every data bug look
identical, and you can't tell which one you're debugging.

---

## PHASE 1 — Structural, industry-grade, responsive dashboard (no visual style yet)

Build this in plain Tailwind defaults first — flat cards, default
borders, no shadows-as-style. The goal of this phase is a dashboard that
is *correct and complete*, not one that looks good yet.

### 1.1 Information architecture

This is a two-pipeline finance-ops tool. The dashboard's job: let someone
scan overall health in one glance, drill into any individual decision the
system made, and inspect the full history. Structure as:

- **Top-level summary** — the four hero metrics (₹ at risk, ₹ recovered,
  match rate, unresolved count), sourced live from `/metrics/reconciliation`
  and `/recovery/summary`.
- **Two-pipeline switcher** — a tab or segmented control between
  "Reconciliation" and "Recovery" views, since they're different record
  types with different columns (settlement records vs. failed-payment/
  subscription records).
- **Record list** — sourced from `/reconciliation/resolved`,
  `/reconciliation/unresolved`, and `/recovery/queue` depending on active
  tab and filter. Sortable, filterable by status.
- **Detail/evidence panel** — opens on row click. Renders the full
  decision trail: input record → reasoning or matching rule →
  policy check → action → outcome. This is the single most important
  screen in the whole product (per the earlier design brief's core job:
  "prove the decision is correct in under 3 seconds") — don't let this
  phase treat it as an afterthought just because it isn't styled yet.
- **Audit trail** — sourced from `/audit-trail`, a full combined log,
  filterable by pipeline and status, with export.

### 1.2 Responsive breakpoints — build mobile-first, not desktop-then-shrink

Define three real breakpoints and design each one as its own layout, not
a squeeze of the desktop layout:

- **Mobile (< 640px):** single column. Hero metrics stack as 2×2 grid,
  not 4-in-a-row. Record list is full-width; tapping a row navigates to a
  full-screen detail view (not a side panel — there's no room for a
  side panel at this width) with a clear back affordance. Audit trail
  becomes a separate scrollable tab/section, not a footer strip (a fixed
  footer strip eats too much vertical space on a small viewport).
- **Tablet (640–1024px):** two-column layout becomes viable — record
  list and detail panel can sit side by side once there's enough width,
  but test this threshold don't assume it works at 640px exactly; 768px+
  is more realistic for a two-column split to not feel cramped.
- **Desktop (1024px+):** full layout as originally conceived — hero
  metrics in one row, record list (~55%) + evidence panel (~45%) side by
  side, audit trail as a collapsible footer strip.

At every breakpoint, re-check: does the evidence panel's five-stage
trail (input → reasoning → policy → action → outcome) still read as a
clear top-to-bottom sequence, or does it get cramped into something
illegible? If a breakpoint makes that sequence hard to follow, that
breakpoint's layout is wrong regardless of how it looks — legibility of
the decision trail is the actual product; adjust the layout, not the
content.

### 1.3 Component inventory (build all of these, flat/unstyled first)

- Four metric tiles (count-up capable, but functionally correct with
  static numbers first)
- Tab/segment switcher (Reconciliation / Recovery)
- Filter/sort control bar above the record list
- Record list row (must show: record ID, amount, status, confidence or
  recovery-probability score)
- Evidence/detail panel with the five-stage trail
- Status badge/indicator component (resolved / unresolved / escalated /
  passed / blocked) — reusable across record list and evidence panel
- Audit trail table (filterable, exportable)
- Empty states for: no unresolved records, no recovery queue items, audit
  trail with zero entries
- Loading states for each data-fetching component (skeleton or spinner —
  doesn't matter which yet, just needs to exist so the layout doesn't
  jump when real data arrives)

### 1.4 Data wiring

Build a single typed API client module (whatever the Next.js project's
convention is) with one function per backend endpoint
(`/metrics/reconciliation`, `/recovery/summary`, `/recovery/queue`,
`/reconciliation/resolved`, `/reconciliation/unresolved`,
`/audit-trail`). Every component reads through this client, never a raw
inline `fetch` scattered per-component — this is what makes it
"industry-grade" rather than a prototype: a single seam to point at when
the backend contract changes, not five different places to update.

### 1.5 Accessibility floor (non-negotiable, check before moving to Phase 2)

- Every status badge/indicator must carry a text label, not just a
  color — this matters even more once neumorphism's naturally low-
  contrast palette is applied in Phase 2 (see §2.6).
- Full keyboard navigation: tab order through record list → row →
  detail panel must be logical, with visible focus states.
- All interactive elements reachable and operable at 375px viewport
  width with touch targets at least 44×44px.

**Do not proceed to Phase 2 until Phase 1 is functionally complete and
tested against the real running backend at all three breakpoints.**

---

## PHASE 2 — Neumorphic visual system

### 2.0 What the reference image tells us, and the one risk to manage

The reference mockup is a clean, well-executed neumorphic (soft-UI)
kit: a cool light-grey background, panels that look gently pressed out
of the same material via soft dual-directional shadows, a single blue-
to-indigo gradient reserved for primary actions and key data
(the "Sign Up" button, the "Add Friend" icon, the circular progress
ring, the toggle, the timeline dots), and everything else rendered in
soft greys with no other color competing for attention.

**The one real risk with neumorphism, stated plainly:** it is
notoriously *low-contrast* by construction — elements are distinguished
by shadow and subtle tone shift rather than by strong color or border
contrast, which is exactly what makes it look elegant and exactly what
makes it a known accessibility risk for anything communicating a
status (like "resolved" vs "unresolved") that a user needs to
distinguish quickly and reliably. This dashboard's entire premise is
proving decisions are correct at a glance — so unlike a login screen or
a generic content app (where neumorphism is usually applied), this build
cannot let the verdict indicators fall into pure soft-grey
indistinguishability. Section 2.6 below is not optional polish — treat
it as a hard constraint on top of the aesthetic, the same way the
claymorphism doc treated verdict-color scarcity as non-negotiable.

### 2.1 Color tokens (derived from the reference image)

| token | hex | use |
|---|---|---|
| `--neu-bg` | `#E4E9F0` | page background — the "material" everything is pressed out of |
| `--neu-surface` | `#EDF1F6` | raised panel fill, very slightly lighter than bg |
| `--neu-text` | `#3E4756` | primary text, soft charcoal-blue-grey, never pure black |
| `--neu-muted` | `#8D97A8` | secondary text, placeholder text, captions |
| `--neu-accent-start` | `#3E7BFA` | gradient start — primary buttons, active states, key numeric highlights |
| `--neu-accent-end` | `#6E5AF0` | gradient end — pairs with accent-start at ~135deg for the signature blue-indigo gradient seen on the reference's buttons/rings/toggle |

### 2.2 Shadow recipe (the neumorphism mechanism itself)

**Raised panels** (metric tiles, record-list container, evidence panel,
cards):
```
background: var(--neu-surface);
border-radius: 20px;
box-shadow:
  -10px -10px 20px rgba(255, 255, 255, 0.8),
   10px  10px 20px rgba(163, 177, 198, 0.45);
```

**Inset/pressed elements** (search input, filter dropdown, the "carved-
in" look on progress-track backgrounds):
```
background: var(--neu-bg);
border-radius: 16px;
box-shadow:
  inset -8px -8px 16px rgba(255, 255, 255, 0.7),
  inset  8px  8px 16px rgba(163, 177, 198, 0.5);
```

**Small circular/pill controls** (icon buttons, the toggle, small
badges) — same recipe as raised panels, scaled down (`-6px -6px 12px` /
`6px 6px 12px`), radius scales to fully round for icon-only controls.

Consistent light source across the whole page: light shadow always
top-left, dark shadow always bottom-right, exactly as the reference
image shows on every element. A single element breaking this direction
(other than deliberate inset variants) is the most common neumorphism
implementation mistake — flag it if you see it.

### 2.3 Typography

- **UI/body text:** a clean geometric or humanist sans that reads
  neutral and modern next to soft shadows — *Poppins*, *Manrope*, or
  *Inter* all match the reference image's typeface energy (the mockup's
  labels read like a geometric sans, e.g. "Login", "Sign Up", "Add
  Friend"). Medium weight for labels, semi-bold for headers, avoid
  anything with strong personality that competes with the soft surface.
- **Data/numbers:** unlike the claymorphism doc's stricter mono-
  everywhere rule, the reference image itself uses a clean sans even for
  large numeric callouts ("$4891.22", "75%", "2201") with tabular-style
  alignment rather than true monospace — follow that: use the same UI
  sans for numbers but with `font-variant-numeric: tabular-nums` so
  columns of numbers still align cleanly. Reserve true monospace only
  for raw IDs (record IDs, transaction refs) where a technical/precise
  feel is specifically wanted — this mirrors the reference's own
  restraint (it doesn't use mono anywhere, because a consumer-facing
  soft-UI kit doesn't need to signal "technical precision" the way this
  finance tool sometimes does for IDs specifically).

### 2.4 Signature components, mapped from the reference image to this dashboard

The reference image includes several component patterns that map
directly onto real needs in this dashboard — use them as literal
component specs, not just mood inspiration:

- **Circular progress ring** (the "75%" donut in the reference) → use
  this exact pattern for **match rate** and **recovery rate** on the
  hero metrics row, and for **confidence score** inside the evidence
  panel. Gradient stroke (accent-start → accent-end), soft grey track
  behind it, percentage centered in mono/tabular numerals.
- **Linear gradient progress bar with draggable-looking handle** (the
  "71%" bar) → use for showing **recovery probability** inline in the
  record list row (a compact horizontal version), where a full ring
  would be too large for a table row.
- **Toggle switch** (the "ON" toggle) → use for **policy check
  pass/fail** in the evidence panel — but per §2.6, do not rely on the
  toggle's position alone; pair it with an explicit "PASSED" / "BLOCKED"
  text label next to it, since the reference image's toggle only needs
  to communicate "on/off" for a settings context, while this dashboard's
  toggle-equivalent needs to communicate a financial policy decision
  that must be unambiguous.
- **Horizontal stepped timeline** (the "2019–2022" timeline) → use this
  directly for the **evidence panel's five-stage trail** (input →
  reasoning → policy check → action → outcome). Render each stage as a
  timeline node exactly like the reference's year-markers, with the
  currently-relevant/most-recent stage highlighted in the gradient color
  the way "2019" is highlighted in the reference. This is a genuinely
  good structural match — the reference's timeline is literally "a
  sequence of stages, one of which is emphasized," which is exactly the
  evidence trail's shape.
- **Small raised icon-tile buttons** (Home / Calendar / Notification /
  Settings row) → use this pattern for the **Reconciliation / Recovery
  tab switcher** and for small utility actions (export, filter, refresh)
  in the dashboard's top utility bar.
- **Stat card with icon + trend arrow** (the "Last 7 days +22.12" card
  with the sparkline) → use this pattern for each of the **four hero
  metrics**, replacing the flat count-up tiles from Phase 1 with a
  small embedded sparkline showing the metric's trend across the batch
  (e.g., cumulative ₹ recovered over the processing run, cumulative
  match rate as records were processed) — this is a nice-to-have
  enhancement over the claymorphism version specifically because the
  reference image demonstrates it works well in this exact visual
  system.
- **Large single-input login-style card** (not directly reused, but
  note the soft, generous internal padding and large border radius on
  the outermost card in the reference — apply that same generosity to
  the **evidence panel container**, which should be the most spacious,
  most premium-feeling panel on the whole dashboard, mirroring how the
  reference treats its most important card (the login form) with the
  most breathing room.

### 2.5 Motion

Keep this restrained, consistent with the earlier design brief's
"one orchestrated moment" principle:
- Circular progress rings and gradient bars animate their fill from 0 to
  final value once on data load (600–800ms, ease-out) — this is the
  hero moment, matching the reference image's implied "live dashboard"
  feel.
- Toggle/policy-check switches snap instantly (no slow slide) when
  state is read from data — these represent a decision that already
  happened, not a live user interaction, so an instant, decisive render
  reinforces "this already occurred," not "something is currently
  toggling."
- Row hover/press: transition to the inset shadow recipe over ~100ms,
  same "soft press" logic as neumorphism generally implies.
- Respect `prefers-reduced-motion`: replace ring/bar fill animations
  with an instant render at final value.

### 2.6 The non-negotiable accessibility fix (read this even if skimming everything else)

Because neumorphism's shadow-only differentiation is genuinely too
low-contrast for financial verdicts, apply this **specific exception to
the "everything is soft grey" aesthetic**:

- Every status indicator (resolved/unresolved/escalated/passed/blocked)
  gets **both** a shadow-based neumorphic shape **and** a small solid-
  fill color dot or text label with a real, checkable contrast ratio
  (minimum 4.5:1 against its background) — green-ish for
  positive/resolved, red-ish for negative/unresolved, using desaturated
  tones that still sit comfortably next to the blue-indigo accent
  gradient without visually competing with it (a muted forest green
  `#4C9A6B`-range and a muted brick red `#C0564F`-range work well
  against the `--neu-bg`/`--neu-surface` tokens above).
- Never use the gradient accent color itself to mean "good" or
  "resolved" — the gradient is reserved for structural/brand emphasis
  (primary actions, active states, key metric highlights), exactly as
  the reference image uses it, and overloading it to also mean
  "verdict: good" would blur its meaning and reintroduce the low-
  contrast problem in a different form.
- Run every status-indicator combination through a contrast checker
  before considering Phase 2 done. This single check is the difference
  between a beautiful neumorphic login-kit aesthetic (which is what the
  reference image is built for) and a beautiful neumorphic aesthetic
  that also successfully does this specific dashboard's job.

---

## 3. One-paragraph brief to paste directly to Gemini

"Build this dashboard in two phases. Phase 1: a fully responsive
(mobile/tablet/desktop breakpoints), functionally complete dashboard
wired to the real FastAPI backend endpoints, using plain unstyled
Tailwind — no shadows, no gradients yet — focused purely on correct
layout, correct data, and full keyboard/touch accessibility. Phase 2,
only after Phase 1 works end to end: apply a neumorphic (soft-UI) visual
system — light cool-grey background (`#E4E9F0`), raised panels using
dual-direction soft shadows (light top-left, dark bottom-right, exact
values in this document), inset/pressed shadows for inputs and hover/
active states, and a single blue-to-indigo gradient (`#3E7BFA` to
`#6E5AF0`) reserved for primary actions, progress rings, progress bars,
and the audit-trail timeline component — modeled directly on the
supplied reference image's login/dashboard kit. Reuse its specific
component patterns: circular progress ring for match/recovery rate and
confidence scores, a horizontal gradient progress bar for inline
recovery-probability display, a toggle for policy pass/fail checks, and
a horizontal stepped timeline for the evidence panel's five-stage
decision trail (input → reasoning → policy check → action → outcome).
Critically: every status/verdict indicator (resolved, unresolved,
escalated, passed, blocked) must include a real solid-color dot or label
with at least 4.5:1 contrast in addition to any soft-shadow treatment —
do not rely on neumorphic shadow alone to communicate a financial
verdict, and never reuse the blue-indigo accent gradient to mean
'positive outcome,' since that gradient is reserved for structural/brand
emphasis only."
