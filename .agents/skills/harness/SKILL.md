---
name: harness
description: Harvest lessons from reviews, failures, and corrections, then dispatch them as skill/rule/doc/script updates; use for self-improvement passes or when the user asks for a harness update.
---
# harness
Self-improvement loop for this harness. Closes the gap between "something went wrong" and "the rule/skill changed".

Run full pass on user request (e.g. "하네스 업데이트"). Automatic light pass (no request needed) after: user correction or feedback; reviewer blocking finding exposing a rule/skill gap; same manual step done >=2 times; repeat gate failure class; model or worker drift; end of each accepted task before commit. Light pass only queues signals; it never competes with or delays task units.

## Loop
1. Harvest candidate signals (see scripts).
2. Write ledger at `tmp/<task>/signals.md` (default `<task>` = `harness-<today>`); one row per signal: source path + quote, gap, proposed target (docs/skill/script/AGENTS).
3. Classify each signal via skill `codify` (ephemeral -> tmp, repeatable -> script, general -> skill, cross-skill policy -> AGENTS.md, project-specific -> docs).
4. Dispatch each classified signal as a unit to a worker. Orchestrator never edits; per skill `orchestrate` (shared scaffolding goes to the first unit's worker).
5. Peer review: reviewer != author; fix; max 2 rounds.
6. Gate: codify check + `orchestrate/scripts/verify.sh <task> rules`.
7. Commit via skill `git-flow`.
8. If a user prompt set the rule -> skill `prompt-log` after the unit completes.
9. Mark the signal done in the ledger; never delete rows, they are the audit trail.

## Scope guards
- Only evidence-backed changes. No invented rules, no speculative refactors.
- Prefer replacing or removing stale lines over appending.
- Delete obsolete task records instead of trusting them; never link durable docs to task scratch paths.
- Never weaken safety rules: `main` protection, no hiding repo state (`.git/info/exclude`/stash/force), Herdr-only delegation.
- Durable user-facing rule change beyond the signal's evidence -> ask user first.
- Out of scope: memory-style notes and agent-specific content; keep wording agent-neutral.

## Surfaces
Covers skills, AGENTS.md rules, docs/, scripts, and handoff records. Check all five every full pass.

## Scripts
- Signals: `scripts/signals.sh [--since <git-rev|date>]` -> stdout candidate signals (blocking findings, failed gates, triage events, blocked callbacks, BLOCK verdicts, repeated how-lines, stale pointers; `--since` keeps only files with mtime or rev commit time >= the given value).
- Ledger: `scripts/ledger.sh [<task>]` -> scaffold `tmp/<task>/signals.md` (default `harness-<today>`).

Signals are candidates only. Nothing is applied without classification, a dispatched unit, review, and a green gate.
