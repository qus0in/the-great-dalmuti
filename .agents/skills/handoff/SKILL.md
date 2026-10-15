---
name: handoff
description: Record and verify live Herdr orchestrator state during handoff or takeover. Use when transferring orchestrator duties between agents, verifying caller identity, or resuming tasks.
---
# handoff
Automates safe handoff and takeover for Herdr orchestrators and workers.

Backend rule: delegation transport is strictly Herdr worker panes. Never use platform-native subagent APIs; verify `backend=Herdr` on every handoff/takeover.

## Identity rules
- Identity must be proven from live evidence: process ancestor agent kind and session value matching Herdr pane metadata.
- Never identify caller from terminal focus or cwd alone. `HERDR_ENV=1` alone proves nothing.
- Unprovable or ambiguous identity -> nonzero exit with actionable error; ask user or provide explicit `--workspace ID --self-pane ID`.

## Procedures
1. Takeover incoming:
   - Run `scripts/takeover.sh <task> [--session ID] [--repo PATH]... [--workspace ID --self-pane ID]`.
   - Verifies caller identity against pane metadata and checks live drift (workers, HEAD, pending units) against `tmp/<task>/handoff.md`.
   - Never redispatch to busy workers; inspect active briefs/reports before acting.
2. Snapshot current state:
   - Run `scripts/snapshot.sh <task> [--repo PATH]... [--dry-run] [--workspace ID --self-pane ID]`.
   - Writes or updates the `<!-- handoff:begin -->` ... `<!-- handoff:end -->` block in `tmp/<task>/handoff.md` from live evidence (`context.sh`, `workers.sh`, git status, briefs).
   - Preserves existing human/agent notes outside markers. Use `--dry-run` to preview stdout.

## Scripts
- Snapshot: `scripts/snapshot.sh <task> [--repo PATH]... [--dry-run] [--workspace ID --self-pane ID]` -> update handoff record.
- Takeover: `scripts/takeover.sh <task> [--session ID] [--repo PATH]... [--workspace ID --self-pane ID]` -> verify self and inspect drift.
