---
name: ui-prototype
description: Building or reviewing HTML/CSS prototype screens in dist/ or 0.3 src/ui/public. Use when implementing or reviewing screens, styles, or design-token compliance.
---
# ui-prototype
Paths relative to repo root. DESIGN.md is the source of truth for file structure, tokens, and constraints. Targets: `dist/` (0.2 prototype, frozen rules) and `src/ui/public/` (0.3 browser screens).

## Rules
- Read DESIGN.md first; update DESIGN.md when a decision changes.
- Placement: dist/ (0.2 prototype) and src/ui/public/ (0.3 screens served by Express).
- Each page links CSS in order: reset, tokens, base, components, page css (minimal error pages like 404 exempt from page css).
- Base constraints: No raw JS; no <style>; no style=; no on*= attributes; no images (<img>/<picture>/<svg image>, no url() images; font url() only in tokens.css).
- 0.3 exceptions (src/ui/public/ only; 0.2 dist/ rules remain unchanged):
  1. Browser module scripts: `<script type="module" src="...">` allowed; all inline `<script>` (including modules) are forbidden.
  2. External brand guidelines fixed styling: fixed brand colors, spacing, and brand logo mark (e.g. `/images/google-g.svg`) allowed only within a rule block or declaration preceded by `/* brand: <URL> */` (e.g. `/* brand: https://... */`); unannotated literals remain violations.
- Colors and spacing from tokens only: raw hex/rgb/hsl live only in tokens.css (except 0.3 brand guidelines); spacing via var(--space-*) (8px unit), raw px scale only in tokens.css.
- Motion: use motion tokens; every animation/transition disabled or reduced under prefers-reduced-motion.
- Per-element variation via BEM-ish classes, never inline values.
- Korean text: word-break keep-all (+ overflow-wrap anywhere for long tokens); counts stay with numbers.
- Breakpoints phone 360-599 / tablet 600-1023 / desktop 1024+; hover effects only under (hover:hover) and (pointer:fine); touch targets >=48px.
- Box model: border-box everywhere; padding inside components, gap between siblings; no negative margins; no clipping heights; min-width:0 where text overflows.
- Head essentials: concise meta, Kakao-first OG + Twitter tags, absolute https og:image 1200x630 (minimal error pages exempt from og meta); only images are the icon set (favicon.ico, favicon.svg, apple-touch-icon.png, icon-192.png, icon-512.png, icon-512-maskable.png) + og.png; head must include manifest link; manifest display "browser" (no install prompt).
- Workers run headless/lighthouse verification, never the orchestrator; only for UI behavior/layout/accessibility changes (mechanical changes reuse valid evidence).
- Hidden states: reset.css must enforce `[hidden] { display: none !important; }`; dynamic visibility criteria require browser render evidence, never fake-DOM attribute checks alone.

## Scripts
- `scripts/check.sh [target-dir]` — contract lint (default: dist/; supports src/ui/public/); prints `ok` and exits 0 when clean, lists `file:line` and exits 1 on violations, exits 2 on usage. Also prints `warn` review hints (clipping containers, negative Hangul tracking, buttons w/o min-height, 0.3 inline modules); warnings never fail.
- `scripts/shot.sh [out-dir] [pages...]` — headless Chrome screenshots each page (default dist/*.html) at 390x844, 360x780, 820x1180, 1180x820, 1440x900 (default out-dir a fresh mktemp -d outside the repo); widths below 500px render through a centered exact-size iframe harness (Chrome clamps layout width) and are center-cropped; prints PNG paths; look at the PNGs and fix visual problems before review/report.
- `scripts/a11y.sh [--min N] [pages...]` — serve each page's directory over http, run Lighthouse accessibility mobile + desktop per page; prints `<page> <form-factor> <score>` with failing audits; exits 1 below min (default 100).
- Checkpoint: `orchestrate/scripts/verify.sh <task> ui` runs `check.sh` on `src/ui/public` once per checkpoint and logs under `tmp/<task>/` (reuse valid passed evidence by policy; never failures).
