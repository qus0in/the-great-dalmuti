# handoff
Safe handoff/takeover when Herdr caller IDs (`HERDR_WORKSPACE_ID` / `HERDR_PANE_ID`) are missing, empty, partial, or ambiguous.

## Identity rules
- Caller/workspace identity must be evidence-backed: live agent metadata or session evidence. Never identify the caller from terminal focus or cwd alone.
- `HERDR_ENV=1` alone does not establish workspace or self.
- Missing IDs, failed discovery, or an empty worker list is NOT proof of no workers: distinguish error (could not ask) from confirmed empty (asked, zero agents). Never silently print empty success.
- Explicit context from the orchestrator may be used only after it is confirmed against live agent metadata/session evidence; if still ambiguous, ask the user.
- No auto focus-based fallback: never switch/focus panes or guess pane IDs to discover workers or self.
- Resolve context via `scripts/context.sh` (structured JSON); pass `--workspace <ID> --self-pane <ID>` to workers/dispatch/wait only with confirmed values. Missing/partial/invalid/mismatching context -> nonzero exit with actionable error.

## Handoff record
On takeover, before acting, write `tmp/<task>/handoff.md`:
- backend: verify and record `backend=Herdr` explicitly (never built-in/native child agents)
- workspace/self IDs + evidence (which live command/output produced them)
- current branch and pre-existing changes (git status/diff summary)
- per worker: identity, pane ID, name, model, status, and live confirmation timestamp (when `workers.sh --model` output was captured)
- owned files (from briefs)
- active tasks (dispatched briefs, in-flight reviews)
- brief/report/review paths per task
- pending findings and next actions

## Takeover behavior
- Revalidate live state (backend, branch, workers, reports, reviews) on takeover: artifacts and status history are evidence, not current truth. Verify `backend=Herdr`; do not assume backend from 'worker' label alone.
- Do not interrupt or resend to busy/blocked workers; inspect its artifacts/status first, reassign via a new brief only if warranted.
