---
name: orchestrate
description: Automatically delegate non-trivial tasks via Herdr without a separate user request; orchestrator dispatches and does final review, workers implement and independently review.
---
# orchestrate
Orchestrator never implements. Only (1) dispatches, (2) final review.
Start automatically for non-trivial work; separate orchestration/delegation request not required. One-step trivial answer -> respond directly.
Delegation transport: existing Herdr worker panes dispatched via scripts/dispatch.sh only. Never use built-in collaboration spawn/followup/subagent APIs; tool availability is not authorization to substitute delegation backend.
Before dispatch: resolve live workspace/self via scripts/context.sh and verify worker. If Herdr unavailable, context missing, or no ready worker, follow discovery/start/escalation below; never silently replace with native subagents or self-implement.

Find workers: `scripts/context.sh [--workspace ID --self-pane ID]` -> workspace/self IDs (JSON, exit!=0 = unknown, not "no workers"); `scripts/workers.sh [--idle] [--model] [--workspace <ID> --self-pane <ID>]` (output: `<target> <agent> <status> [<model> <effort>]`; model may be multi-word, `?` if unknown).
Assign by capability: identify model (kind + status line), map to tier (references/models.md), assign by tier; reviewer should differ in family from author.
Plan: split into units with disjoint file ownership; orchestrator does shared scaffolding that would conflict (e.g. indexes) before dispatch.
Briefs: `tmp/<task>/brief-<worker>.md` (goal, owned, forbidden, acceptance, report path `tmp/<task>/report-<worker>.md`).
Dispatch non-blocking: `scripts/dispatch.sh [--workspace <ID> --self-pane <ID>] <target> <brief-path>` (no --wait).
Loop is event-driven: dispatch -> `scripts/wait.sh [--any] [--timeout MS] [--workspace <ID> --self-pane <ID>] <target>...` run in background (harness background or `&`); on first worker settling, read its report and dispatch the next unit (task/review/fix) to it. Never foreground-wait; keep conversation responsive.
Missing/empty Herdr caller IDs, handoff, identity: references/handoff.md (never identify caller from focus/cwd; revalidate live state on takeover; handoff record must verify backend=Herdr).
Peer review: reviewer != author on Herdr panes writes `tmp/<task>/review-<reviewer>.md` (blocking/non-blocking). Author fixes; max 2 rounds.
Final review: read reports/reviews, diff, run codify `check.sh`; accept or new brief. Never fix. Commit/push via skill `git-flow` after acceptance.
Blocked worker: read it, never auto-approve; escalate. No idle workers: ask user or `herdr agent start`. Never substitute native subagents.
Provider errors: reassign a worker that errors for ~5 min (references/models.md).
