---
name: ui-prototype
description: Building or reviewing HTML/CSS prototype screens in dist/. Use when implementing or reviewing hall/play pages, their styles, or design-token compliance.
---
# ui-prototype
Paths relative to repo root. DESIGN.md is the source of truth for file structure, tokens, and constraints.

## Rules
- Read DESIGN.md first; update DESIGN.md when a decision changes.
- Placement: dist/ (until server work redefines it).
- Each page links CSS in order: reset, tokens, base, components, page css.
- No JS; no <style>; no style=; no on*= attributes; no images (<img>/<picture>/<svg image>, no url() images; font url() only in tokens.css).
- Colors and spacing from tokens only: raw hex/rgb/hsl live only in dist/css/tokens.css; spacing via var(--space-*) (8px unit), raw px scale only in tokens.css.
- Motion: use motion tokens; every animation/transition disabled or reduced under prefers-reduced-motion.
- Per-element variation via BEM-ish classes, never inline values.
- Korean text: word-break keep-all (+ overflow-wrap anywhere for long tokens); counts stay with numbers.
- Breakpoints phone 360-599 / tablet 600-1023 / desktop 1024+; hover effects only under (hover:hover) and (pointer:fine); touch targets >=48px.
- Box model: border-box everywhere; padding inside components, gap between siblings; no negative margins; no clipping heights; min-width:0 where text overflows.
- Head essentials: concise meta, Kakao-first OG + Twitter tags, absolute https og:image 1200x630; asset exception is favicon.svg + og.png only.
- Workers run headless/lighthouse verification, never the orchestrator.

## Scripts
- `scripts/check.sh [dist-dir]` — contract lint; prints `ok` and exits 0 when clean, lists `file:line` and exits 1 on violations, exits 2 on usage. Also prints `warn` review hints (clipping containers, negative Hangul tracking, buttons w/o min-height); warnings never fail.
- `scripts/shot.sh [out-dir] [pages...]` — headless Chrome screenshots each page (default dist/*.html) at 390x844, 820x1180, 1180x820, 1440x900 (default out-dir a fresh mktemp -d outside the repo); prints the out-dir; look at the PNGs and fix visual problems before review/report.
- `scripts/a11y.sh [--min N] [pages...]` — serve dist/ over http, run Lighthouse accessibility mobile + desktop per page; prints `<page> <form-factor> <score>` with failing audits; exits 1 below min (default 100).
