# Model capability tiers (general)
Re-tier from observed results (failed briefs, review findings). Durable findings -> codify.

- frontier (Claude Opus/Sonnet, GPT-5.x, Gemini Pro): design, complex/cross-cutting code, final peer review.
- fast mainstream (Gemini Flash, Claude Haiku, *-mini): instruction following, verification, tests, integration checks, mechanical edits.
- free/preview/unknown: drafts, docs, isolated low-risk units; output always reviewed by a different, preferably stronger, model.
- Unit sizing: all tiers sized for ~10 min; frontier handles broader architectural reasoning, fast mainstream handles bounded single-purpose edits/checks, free/preview handles small drafts.
- Calibration (sandboxed workers): verify read-only `gh` access and headless Chrome/CDP startup before assignment; record each result.
- Capability limits: no `gh` fact-checks without `gh` access; no browser E2E/headless captures without Chrome/CDP startup. Orchestrator may attach `gh` output to the brief for offline review.
- Provider fragility: free/preview endpoints can vanish mid-task (retry loops). If a worker emits provider/endpoint errors for ~5 min, reassign its unit; do not wait indefinitely.
- Quota/context budget: do not use tight-quota routes for long units or reruns; when a worker's context usage is high (>=80%), do not assign large units — hand off via `resume.sh` to another worker.
- high/max reasoning effort: review, debugging. low effort: mechanical work.
- reviewer should differ in model family from author when possible.
- free/preview models: avoid stateful logic (shell state, domain state machines) — assign core stateful-logic units to higher tiers (observed: timebox failures on CLI-semantics/stateful-shell fix and domain state machine); fake/stub/dry-run tests are not sufficient evidence (reviewers must verify the real path's inputs and behavior).
- Self-corrupting tool calls: emitting malformed raw tool-call tokens, editing files under a read-only brief, or fabricating source text (e.g. proposal "Before" text absent from the live issue) is class (3) self error — stop it (triage); do not assign reviews or authoring units until re-tiered from clean results.