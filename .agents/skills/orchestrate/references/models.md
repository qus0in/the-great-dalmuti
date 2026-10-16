# Model capability tiers (general)
Re-tier from observed results (failed briefs, review findings). Durable findings -> codify.

- frontier (Claude Opus/Sonnet, GPT-5.x, Gemini Pro): design, complex/cross-cutting code, final peer review.
- fast mainstream (Gemini Flash, Claude Haiku, *-mini): instruction following, verification, tests, integration checks, mechanical edits.
- free/preview/unknown: drafts, docs, isolated low-risk units; output always reviewed by a different, preferably stronger, model.
- Unit sizing: all tiers sized for ~10 min; frontier handles broader architectural reasoning, fast mainstream handles bounded single-purpose edits/checks, free/preview handles small drafts.
- Provider fragility: free/preview endpoints can vanish mid-task (retry loops). If a worker emits provider/endpoint errors for ~5 min, reassign its unit; do not wait indefinitely.
- high/max reasoning effort: review, debugging. low effort: mechanical work.
- reviewer should differ in model family from author when possible.
- free/preview models: struggle with stateful shell scripts that depend on real CLI semantics (e.g. herdr status/wait) — avoid assigning them such units or pair with a real-path reviewer; fake/stub/dry-run tests are not sufficient evidence (reviewers must verify the real path's inputs and behavior).