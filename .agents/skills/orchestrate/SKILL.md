---
name: orchestrate
description: Automatically delegate non-trivial tasks via Herdr without a separate user request; orchestrator dispatches and does final review, workers implement and independently review.
---
# orchestrate
Orchestrator allowed actions only: ask user; write tmp/<task>/ briefs, contracts, decision ledgers, handoff snapshots; dispatch/wait; read reports/diffs/gate logs; read-only live-state queries (git/gh/herdr); final review; commit/push via skill `git-flow`.
Orchestrator never does anything else, even unrequested: scaffolding (`new-skill.sh`, index sync), code/doc/skill/AGENTS edits, prompt-log entries, issue/release/wiki/gh writes, gate fixes -> worker units.
Start automatically for non-trivial work; separate orchestration/delegation request not required. One-step trivial answer -> respond directly (answer, no file change).
Delegation transport: existing Herdr worker panes dispatched via scripts/dispatch.sh only. Never use built-in collaboration spawn/followup/subagent APIs; tool availability is not authorization to substitute delegation backend.
Before dispatch: resolve live workspace/self via scripts/context.sh and verify worker. If Herdr unavailable, context missing, or no ready worker, follow discovery/start/escalation below; never silently replace with native subagents or self-implement.

Find workers: `scripts/context.sh [--workspace ID --self-pane ID]` -> workspace/self IDs (JSON, exit!=0 = unknown, not "no workers"); `scripts/workers.sh [--idle] [--model] [--workspace <ID> --self-pane <ID>]` (output: `<target> <agent> <status> [<model> <effort>]`; model may be multi-word, `?` if unknown).
Assign by capability: identify model (kind + status line), map to tier (references/models.md), assign by tier; reviewer should differ in family from author.
Plan: split into units with disjoint file ownership; shared scaffolding needed by parallel units (new-skill.sh, index sync) -> first unit's worker, then fan out.
Unit sizing (S3): each brief sized for ~10 min of target worker's tier; larger work split before dispatch. Declare any inherently long step (e2e, external API, installs/builds) with expected duration up front.
Briefs: `tmp/<task>/brief-<worker>.md` (ordered why -> what -> how; goal, owned, forbidden, frozen acceptance criteria, report path `tmp/<task>/report-<worker>.md` (STAR)).
Scope freeze (S1): acceptance criteria frozen at dispatch; changing them requires user approval. Worker: stay within owned files and acceptance criteria; report other issues without fixing.
Dispatch non-blocking: `scripts/dispatch.sh [--workspace <ID> --self-pane <ID>] <target> <brief-path>` (no --wait); returns start timestamp on stdout (save in `tmp/<task>/dispatch-<worker>.log`; elapsed time via `scripts/elapsed.sh`).
Loop is event-driven: dispatch -> `scripts/wait.sh [--any] [--timeout MS] [--workspace <ID> --self-pane <ID>] <target>...` run in background (harness background or `&`); default timeout 10 min (600000 ms). On first worker settling, read report and dispatch next unit. Never foreground-wait; keep conversation responsive.
Timebox triage (S3): on timeout or worker busy >10 min, orchestrator triages once (pane read allowed) and classifies exactly one: (1) capability shortfall -> split unit or reassign to higher tier; (2) inherently long task (declared in brief, or e2e/external API evident) -> extend with explicit new timebox; (3) self error (provider error, crash, stuck prompt, dialog, loop) -> recover or reassign (~5 min provider rule). Record classification + evidence in `tmp/<task>/` and harness signal if it reveals a gap.
All workers busy -> queue unit, dispatch on first settle; never self-implement (no native subagents, no direct edits).
Missing/empty Herdr caller IDs, handoff, identity: skill handoff (scripts/snapshot.sh, scripts/takeover.sh; never identify caller from focus/cwd; verify backend=Herdr).
Peer review (S1): reviewer != author on Herdr panes writes `tmp/<task>/review-<reviewer>.md` (STAR form); judge strictly against unit's original acceptance criteria — findings outside them are out-of-scope observations, never blocking.
Fix rounds (S1): carry blocking findings only (author fixes, max 2 rounds). Non-blocking and out-of-scope findings never become new units or fix-round items; record to harness ledger or propose to user.
Final review: read machine gate output (`scripts/verify.sh <task> [rules|ui|all]`; logs `tmp/<task>/verify-<gate>.log`), reports/reviews, and the diff; accept or new brief. Never fix; never reproduce automated checks. Commit/push via skill `git-flow` after acceptance.
Gates/reruns: `verify.sh <task> [rules|ui|all]` runs the applicable gates once per checkpoint (rules = codify check.sh, ui = ui-prototype check.sh) and logs under `tmp/<task>/`; reuse valid passed evidence by workflow policy — never reuse failures; rerun only on relevant input change, repair, or stated risk (AGENTS.md Verification).
Blocked worker: read pane/report then escalate — pane reads only for blocked/errored/stalled/triage work, not routine polling. No idle workers: ask user or `herdr agent start`. Never substitute native subagents.
Provider errors: reassign a worker that errors for ~5 min (references/models.md).
Orchestrator never runs headless/visual QA itself; assign visual/headless verification to a worker and read its report/PNGs.
