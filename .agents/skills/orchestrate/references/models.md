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
## Context commands before dispatch

New unit uses the fresh command; `--continue` or `--replace` uses compact. Require 3 consecutive idle/done checks after reset; fail before sending the brief on reset errors/timeouts. Unknown kinds warn once and skip reset.

| Agent | Fresh | Continue | Evidence |
| --- | --- | --- | --- |
| codex | `/compact` | `/compact` | [Official commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli); observed CLI v0.163.0 |
| opencode | `/new` | `/compact` | [Official TUI](https://opencode.ai/docs/tui/); observed v2.0.32 `/new` and empty-session `/compact` returning idle; API-backed compaction not verified |
| claude | `/clear` | `/compact` | [Official commands](https://code.claude.com/docs/en/commands); no live pane tested |
| agy | `/clear` (alias `/new`, TUI only) | `/compact` | [CLI reference](https://antigravity.google/docs/cli/reference/), [changelog v1.3.5](https://antigravity.google/docs/changelog/); local agy 1.4.2 `CHANGELOG.md:55`; print mode refuses `/clear` |

Post-reset wait defaults to 60 seconds (`DISPATCH_RESET_TIMEOUT`), with the existing 5-second check interval (`DISPATCH_WAIT_INTERVAL`). Visible reset errors, running compaction, or pending OpenCode command input abort dispatch. Codex `/clear` reset the observed model/effort from Luna max to Sol medium; use `/compact` for both fresh and continued units. AGY model retention after `/clear` has indirect evidence only (official `/model` persistence, global `settings.json` model, no model setter in the clear path); direct TUI observation is unverified, and the global value may differ from the pane's current model, so keep the post-reset model comparison.

Before reset and after the 3 idle checks, compare model/effort with the same footer extraction as `workers.sh --model`; changed values abort before the brief with both values on stderr. If either value is unknown (`?`), warn once and proceed. The shared parser currently recognizes AGY, OpenCode (current `Build`/`Build auto` box footer and the existing `… OpenCode` form), and Codex footers; Claude is not recognized yet, so Claude comparisons warn as unknown.
