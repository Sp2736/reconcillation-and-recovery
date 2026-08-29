# Claymorphism Design Instructions — Reconciliation + Recovery Dashboard

This is a handoff document for an AI frontend builder (Gemini Pro /
Antigravity), not code. It replaces the earlier "Ledger/Stamp" direction
(`FRONTEND_DESIGN_INSTRUCTIONS.md`) with a claymorphism treatment. Read
§0 before building anything — claymorphism has a real credibility risk
for a finance-trust tool if applied naively, and this doc exists to show
how to get the style without losing the thing that actually mattered in
the original brief: fast, legible proof that an AI decision is correct.

Paste this whole file into Gemini Pro / Antigravity as the design
instruction, alongside the existing `app/main.py` API contract so it
knows what data it's rendering.

---

## 0. The honest tension, stated up front, and how this doc resolves it

Claymorphism's whole visual language — soft inflated shapes, pastel
colors, diffused dual-directional shadows that make elements look like
they're made of clay or pressed rubber — reads as playful and consumer-
facing by default. That's the opposite instinct from the earlier
ledger/stamp brief, which was built around the idea that a finance-ops
trust tool needs to look rigorous, not delightful.

The resolution isn't "don't use claymorphism" — it's this: **use
claymorphism for structure and depth, and keep everything from the
earlier brief that governs meaning** (verdict colors used only for
verdicts, mono typography for every number, the evidence-panel
information hierarchy, the restraint around motion). Claymorphism is
being adopted here as a *surface treatment* — how panels, buttons, and
cards physically look and feel — not as a replacement for the underlying
information design. If you find the clay treatment fighting the "prove
this fast" job (e.g., soft shadows making a verdict harder to read, or
pastel colors diluting the meaning of the stamp colors), the information
hierarchy wins every time. Say so explicitly to the builder: *when in
doubt, legibility of the decision beats fidelity to the clay aesthetic.*

---

## 1. What claymorphism actually is (for the builder's reference)

Claymorphism is a UI style where every element looks like it's molded
from soft, matte clay or rubber — rounded, slightly puffy, sitting
somewhat raised off the background, lit from a consistent light source.
The visual signature is achieved through a specific combination:

1. **Large border radius** — much larger than typical flat/material
   design (16–32px on cards, fully rounded/pill on small controls).
2. **Dual shadows in opposite directions** — one lighter shadow on the
   side facing the "light source" (typically top-left) and one darker
   shadow on the opposite side (bottom-right), which is what actually
   creates the illusion of a soft raised/embossed surface rather than a
   flat card with a single drop shadow.
3. **Low-saturation, mid-lightness solid fills** — no gradients, no
   images-as-texture. The color itself (not a texture) needs to read as
   "matte, soft material."
4. **No hard edges anywhere** — every icon, button, and input shares the
   same rounded, soft language. A single sharp-cornered element breaks
   the illusion for the whole page.
5. **Inset ("pressed-in") variants** for indented elements like input
   fields — the shadow direction reverses (dark shadow top-left, light
   shadow bottom-right) to suggest a carved-in groove rather than a
   raised bump.

### Reference reading (send the builder to look at these before building)
- Search "claymorphism UI design" on Dribbble and Behance — this is
  where the style is most extensively catalogued with real shadow-value
  examples; look specifically for **fintech/dashboard** claymorphism
  examples rather than mobile-app or landing-page examples, since the
  data-density constraints are different.
- The original claymorphism generator/reference tool by Alex Bogdanovski
  (search "claymorphism generator CSS") is useful for getting exact
  shadow-value starting points — treat its defaults as a starting point,
  not a final answer, since its defaults skew toward soft consumer UI
  rather than dense financial data.
- Look at **Duolingo's** UI (not exactly claymorphism, but the same
  family of soft-rounded, dual-shadow, playful-but-structured visual
  language) as a reference for how a "soft" aesthetic can still support
  serious information density and clear state (correct/incorrect) — this
  is the closest real-world precedent for "soft style, still needs to
  communicate right/wrong clearly," which is exactly this dashboard's
  problem.

---

## 2. Design tokens (concrete values, not vibes)

### Base surface color
Claymorphism needs one consistent base color that all clay shapes
"grow out of." Use a soft, warm off-white/light-grey rather than pure
white — pure white makes claymorphism's dual shadows nearly invisible
and kills the effect.

| token | hex | use |
|---|---|---|
| `--clay-base` | `#EAEEF2` | page background — everything else is "molded" out of this |
| `--clay-surface` | `#F4F7FA` | raised card/panel fill — slightly lighter than base, this is what "pops up" |
| `--clay-ink` | `#3A4454` | primary text — soft charcoal-blue, never pure black (pure black is too sharp/flat for this style) |
| `--clay-muted` | `#8A94A6` | secondary text, captions, IDs |

### Verdict colors (carried over from the ledger brief, adapted to clay saturation)
Keep these **desaturated enough to look like matte clay**, not like flat
UI-alert colors — a too-saturated green/red will look like a sticker
pasted onto a clay surface rather than clay that's actually that color.

| token | hex | use |
|---|---|---|
| `--clay-green` | `#8FBFA0` | RESOLVED / recovered / passed — muted sage, not neon success-green |
| `--clay-red` | `#D9A0A0` | UNRESOLVED / escalated / blocked — muted dusty rose, not alarm red |
| `--clay-amber` | `#E3C58C` | low-confidence / pending / rate-limited — for the "not yet decided" middle state, which the earlier brief didn't need but claymorphism's soft palette handles well |

Same scarcity rule as before: these three colors appear **only** on
verdict elements (stamps, status badges, progress bars showing
confidence). If the builder starts using `--clay-green` as a generic
"positive" accent color elsewhere (a button, a link), stop it — the
verdict colors need to stay meaningfully rare.

### Accent color (for interactive/structural elements — tabs, active states, links)
| token | hex | use |
|---|---|---|
| `--clay-accent` | `#6E8FB5` | dusty periwinkle-blue — active tab underline, selected row border, primary button fill |

### Shadow recipe (the actual claymorphism mechanism — give the builder exact values)

**Raised elements** (cards, buttons, the record-list rows, the evidence
panel container):
```
box-shadow:
  -8px -8px 16px rgba(255, 255, 255, 0.7),   /* light shadow, top-left */
   8px  8px 16px rgba(163, 177, 198, 0.5);   /* dark shadow, bottom-right */
border-radius: 24px;
background: var(--clay-surface);
```

**Inset/pressed elements** (search inputs, filter dropdowns, anything
that should look "carved in" rather than "popped out"):
```
box-shadow:
  inset -6px -6px 12px rgba(255, 255, 255, 0.6),
  inset  6px  6px 12px rgba(163, 177, 198, 0.5);
border-radius: 20px;
background: var(--clay-base);
```

**Small controls** (tabs, chips, the confidence-score pill):
```
box-shadow:
  -4px -4px 8px rgba(255, 255, 255, 0.6),
   4px  4px 8px rgba(163, 177, 198, 0.4);
border-radius: 999px; /* fully pill-shaped for small controls */
```

Tell the builder explicitly: **shadow direction must stay consistent
across the whole page** (light always top-left, dark always bottom-
right) — a single element with reversed shadow direction (outside of the
deliberate inset variant) breaks the illusion that everything shares one
light source.

### Typography (unchanged reasoning from the ledger brief, adjusted weight)
- **Body/UI text:** a rounded-terminal humanist sans — *Nunito*, *Quicksand*,
  or *Varela Round* pair naturally with claymorphism's soft geometry far
  better than a sharp grotesk would (a sharp-cornered typeface visually
  fights rounded clay shapes). Use medium weight for labels, semi-bold
  for section headers.
- **Data/mono (numbers, IDs, timestamps):** keep this from the earlier
  brief unchanged — *IBM Plex Mono* or *JetBrains Mono*, tabular
  figures. This is the one place claymorphism's "everything is soft and
  rounded" instinct should NOT extend — numbers still need to look
  measured and precise, not squishy. A mono typeface inside a soft clay
  pill (e.g., a confidence score in a rounded chip) is exactly the right
  combination: soft container, precise content.

---

## 3. Component-by-component instructions

### 3.1 Ledger header / top metrics strip
Render the four hero numbers (at risk / recovered / match rate /
unresolved) as four individual clay "buttons" — raised, pill-cornered
(32px radius), each on its own `--clay-surface` panel with the standard
raised-shadow recipe. Do **not** put them in one continuous bar — the
whole point of claymorphism is individually molded objects, so four
separate clay tiles (with visible gaps of ~16-20px between them) will
read as more authentically "clay" than one long strip.

Numbers still count up on load (keep this from the earlier brief) — the
count-up plus a very subtle "settle" bounce (translateY 2px down then
back, 150ms, ease-out) on the final digit landing reinforces the
"squishy material settling into place" feel without overdoing it.

### 3.2 Record list (reconciliation / recovery queue)
Each row becomes its own small clay card rather than a flat table row —
raised shadow, 16-20px radius, enough padding that it reads as an object
you could press. On hover, the row should very slightly "depress" —
transition to the inset/pressed shadow recipe over 120ms — simulating
someone's finger pressing into soft clay. This is claymorphism's most
natural and expected interaction, and it directly replaces the earlier
brief's flat left-border hover treatment.

The status stamp (§3.4 below) sits as a small rounded badge on the
right edge of each row, using the verdict colors.

### 3.3 Evidence panel
Give this the largest, most prominent clay-panel treatment on the page —
biggest radius (28-32px), most pronounced shadow depth, since it's the
single most important panel on the page (per the original brief's job:
"prove the decision fast"). Structure the internal content (input record
→ reasoning → policy check → action → outcome) exactly as the ledger
brief specified — claymorphism changes the container's material, not the
information sequence inside it.

Each of the five stages inside the panel can be its own small nested
inset "carved" section (using the inset shadow recipe) within the larger
raised outer panel — this creates a satisfying visual nesting ("a soft
raised card containing carved-in sections") that's a very natural and
well-regarded claymorphism pattern for grouped information.

### 3.4 The stamp element, reinterpreted for clay
The original ledger brief's signature moment was a rubber-stamp mark
thumping down. In claymorphism, reinterpret this as **a small clay chip
popping up and softly bouncing into place** rather than a flat ink stamp
— this fits the material metaphor better (clay doesn't get "stamped," it
gets molded/pressed). Sequence:
1. Chip scales from 0% → 110% opacity 0→1, 100ms, ease-out (the clay
   "emerges")
2. Overshoot settle: 110% → 100% with a soft bounce-ease, 120ms (one
   single soft bounce, not a spring with multiple oscillations — multiple
   bounces will look cartoonish and undermine trust)
3. Shadow fades in last, 60ms after the shape settles, so the shadow
   reads as "it has now landed and has weight," not part of the entrance

This keeps the same *purpose* as the original stamp (visually mark that
a decision has been finalized) while genuinely belonging to the clay
material language instead of looking like an ink-stamp graphic pasted
onto a soft-shadow UI.

### 3.5 Buttons and controls
Primary buttons: `--clay-accent` fill, raised shadow recipe, white or
`--clay-surface` text, pill-shaped. On press (`:active`), switch
immediately (no transition delay, ~40ms) to the inset shadow recipe —
this is the single most important interaction in claymorphism to get
right, since "a button that visibly depresses when pressed" is the core
promise of the whole style. If buttons don't visibly invert their
shadow on click, the entire claymorphism treatment reads as cosmetic
rather than tactile, which defeats the point of choosing this style.

Tabs (Reconciliation / Recovery switcher): render as a single pill-
shaped inset "track" (inset shadow recipe) containing a smaller raised
pill (raised shadow recipe) that slides between the two positions — this
"soft toggle track with a solid slider" pattern is one of claymorphism's
best-known and most legible interactions, and reads immediately as
"switch between these two things" without needing a label to explain it.

### 3.6 Audit trail footer strip
Keep this from the ledger brief structurally (collapsed ticker /
expandable full table), but render the collapsed strip as a single long,
shallow clay bar (large radius on just the top two corners, since it's
docked to the bottom of the viewport) rather than a flat `--clay-ink`
bar — the color and shadow language should stay consistent with the rest
of the clay page rather than becoming a dark contrast bar like in the
original brief. Use `--clay-muted` text on `--clay-surface` for this
strip so the docked panel still feels molded from the same material.

---

## 4. What NOT to let the clay treatment do

- **Do not let clay softness reduce the contrast/legibility of verdict
  colors.** If `--clay-green` and `--clay-red` on `--clay-surface`
  don't hit at least a 3:1 contrast ratio against the background,
  darken/desaturate them further rather than accepting a low-contrast
  "pretty" version — a barely-distinguishable pastel green vs red is a
  real accessibility and trust failure for a finance tool specifically.
- **Do not apply large border-radius to data-dense tables** if the
  record list ends up needing many visible rows at once (e.g., 20+ rows
  on screen for a live demo scroll) — very large radius on many small,
  tightly-packed rows starts to look like a UI bug (rows visually
  bleeding into rounded corners) rather than intentional style. If this
  happens, tell the builder to reduce row radius specifically (12-14px)
  while keeping larger radius (24-32px) on the bigger container panels —
  radius doesn't need to be uniform across every scale of element, just
  consistent within a given scale.
- **Do not add drop-in gradients, glassmorphism blur, or neumorphic
  glass layering on top of the clay shadows** — mixing claymorphism with
  another currently-trendy style (glassmorphism especially) muddies both
  and is a common mistake AI frontend builders make when told to "make
  it modern" on top of a specific style instruction. Claymorphism should
  be the only stylistic system on the page.
- **Do not let the mono data typeface inherit the rounded-font's
  softness** — this was flagged in §2 but restate it directly to the
  builder: numbers must stay in a precise mono typeface even inside the
  softest clay chip. This is the detail most likely to get lost if the
  builder over-applies "make everything round and soft" literally to
  every text element.

---

## 5. One-paragraph brief to literally paste to Gemini Pro / Antigravity

"Build this dashboard in a claymorphism style: soft, rounded (16-32px
radius depending on element scale), matte low-saturation colors, and
dual-direction diffused shadows (light top-left, dark bottom-right) that
make every panel/button/chip look raised off the page like molded clay,
with an inset/reversed-shadow variant for anything that should look
pressed-in (inputs, hover/active states). Use the exact color tokens and
shadow CSS values in this document — don't substitute your own defaults.
Keep the mono/tabular typeface for all numbers and IDs even inside soft
clay containers; only the UI chrome and body text should use the rounded
humanist font. Verdict colors (green/red/amber) may ONLY be used on
status elements, never as general accents. Buttons must visibly switch
to the inset shadow on `:active` with near-zero transition delay — that
tactile press is the most important interaction to get right. Do not
add glassmorphism, blur, or gradient effects on top of this — claymorphism
is the only style system in play."
