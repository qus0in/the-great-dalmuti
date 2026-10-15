---
name: orchestrate
description: Split work across worker agents via herdr; orchestrator only dispatches and does final review, workers implement and peer-review each other. Use for any non-trivial task when worker agents are available.
---
# orchestrate
Orchestrator never implements. Only (1) dispatches, (2) final review.

Find workers: `scripts/workers.sh [--idle] [--model]`.
Assign by capability: identify model (kind + status line), map to tier (references/models.md), assign by tier; reviewer should differ in family from author.
Plan: split into units with disjoint file ownership; orchestrator does shared scaffolding that would conflict (e.g. indexes) before dispatch.
Briefs: `tmp/<task>/brief-<worker>.md` (goal, owned, forbidden, acceptance, report path `tmp/<task>/report-<worker>.md`).
Dispatch non-blocking: `scripts/dispatch.sh <target> <brief-path>` (no --wait).
Loop is event-driven: dispatch -> `scripts/wait.sh --any` run in background (harness background or `&`); on first worker settling, read its report and dispatch the next unit (task/review/fix) to it. Never foreground-wait; keep conversation responsive.
Peer review: reviewer != author writes `tmp/<task>/review-<reviewer>.md` (blocking/non-blocking). Author fixes; max 2 rounds.
Final review: read reports/reviews, diff, run codify `check.sh`; accept or new brief. Never fix.
Blocked worker: read it, never auto-approve; escalate. No idle workers: ask user or `herdr agent start`.
Provider errors: reassign a worker that errors for ~5 min (references/models.md).