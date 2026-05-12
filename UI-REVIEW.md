# UI Review — PatSellsFLHomes
**Date:** 2026-05-12
**Overall Score:** 20/24

| Pillar | Score |
|--------|-------|
| Copywriting | 3/4 |
| Visuals | 3/4 |
| Color | 4/4 |
| Typography | 4/4 |
| Spacing | 3/4 |
| Experience Design | 3/4 |

---

## Top Fixes

1. **Form backend** — `action="mailto:..."` on the valuation form is broken UX. Replace with Formspree/Netlify Forms.
2. **Advisor headshot** — `.advisor-photo` shows "PM" initials placeholder. Add real photo.
3. **Social proof** — No testimonials, stats, or client quotes. High-stakes trust gap for real estate.
4. **H1 value proposition** — `<h1>Pat Magno</h1>` conveys nothing to a new visitor. Pair with a tagline or restructure.
5. **Florida license number** — Required by FL real estate advertising law. Missing from footer.

---

## Pillar Details

### Copywriting — 3/4

**Strengths**
- Brand voice is distinctive: "calm advice, refined preparation, and a confident read on the coastal market"
- Section kickers, eyebrow text, and 4-step process are tight and purposeful
- Valuation section CTA copy is specific and actionable

**Issues**
- H1 is the agent's name with no value proposition
- About H2 ("Local guidance for one of life's most personal moves") is generic — most realtors say this
- Quick panel "Method" row reads as marketing copy in a data-table context — tonally mismatched
- Zero social proof: no testimonials, transaction count, or years of experience

---

### Visuals — 3/4

**Strengths**
- Hero video double-buffer crossfade (2 DOM `<video>` elements cycling 3 playlist clips) is well-engineered
- Scroll drift parallax on lifestyle cards and feature image adds refinement
- Image reveal (clip-path + scale + opacity) is polished
- Lucide icons are clean and appropriate

**Issues**
- Advisor photo is the "PM" initials placeholder — the single biggest trust gap on the site
- All 3 lifestyle images are aerial city/coastline shots — no interiors, street life, or community detail; "lifestyle" section lacks lifestyle variety

---

### Color — 4/4

**Strengths**
- `--brass: #b89458` used with discipline: progress bar, kickers, process numbers, service links — never decorative
- `--evergreen: #183b34` for hover states reads as trustworthy and upscale
- Dark sections (process, footer, valuation) use correct white-opacity hierarchy
- Selection highlight using brass at 0.28 opacity is a polished detail
- Header transparent→paper transition is smooth and purposeful

**Issues**
- None significant. `#f3f5f1` service section background vs `--paper: #fbfaf6` body is a very minor inconsistency.

---

### Typography — 4/4

**Strengths**
- Cormorant Garamond + Manrope pairing creates clear luxury/editorial vs. utility contrast
- `clamp()` scaling on H1 and H2 is well-calibrated across breakpoints
- `text-wrap: balance` on H2 is a thoughtful detail
- Uppercase letter-spacing on labels is consistent (0.10–0.15em)
- Body `line-height: 1.65` is comfortable

**Issues**
- Lifestyle card H3 uses `font-family: var(--display)` (Cormorant); service card H3 does not — minor inconsistency
- `line-height: 0.95` on H1/H2 could clip descenders at large sizes if any title wraps — monitor

---

### Spacing — 3/4

**Strengths**
- Section padding uses `clamp(82px, 11vw, 136px)` — fluid and proportional
- Grid gaps use `clamp()` throughout — scales well
- `gap: 1px` with background color for grid dividers is clean

**Issues**
- `intro-grid` second column has `minmax(320px, 0.92fr)` — between ~700–980px viewport, this column hits its 320px minimum before the single-column breakpoint, creating an unbalanced layout. Test at ~740px.
- `quick-panel` stays 2-column at 680–980px with `min-height: 126px` — the "Market" cell text can overflow this fixed height at certain widths
- `valuation-section` has `margin-bottom: clamp(82px, 11vw, 136px)` on top of its own section padding — may create double-spacing below it on desktop

---

### Experience Design — 3/4

**Strengths**
- Skip link present and functional
- `aria-expanded` toggled correctly on mobile nav toggle
- `aria-label` updated dynamically ("Open navigation" / "Close navigation")
- Mobile nav closes on link click
- Scroll reveal uses IntersectionObserver with staggered delays — not overdone
- `prefers-reduced-motion` respected throughout
- Passive scroll listener — performance correct
- Timeline progress bar in process section is an engaging detail
- `document.documentElement.classList.add("js")` pattern for progressive enhancement is correct

**Issues**
- **Valuation form uses `mailto:` action** — broken on most devices; no success/error state UI exists
- Clicking outside the open mobile nav does not close it — common expected pattern, notably absent
- No form submission feedback state (success message, error handling) in the HTML — needed regardless of backend
- Footer missing copyright year and FL license number
