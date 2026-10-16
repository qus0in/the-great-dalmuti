# AGENTS
Agent-only rules. Shared by all agents (claude/codex/opencode/...). Terse by design.
CLAUDE.md -> AGENTS.md, .claude/skills -> .agents/skills: symlinks. Edit targets only.

## Placement
- tmp/<task>/ : ephemeral, mutable (scratch, logs, drafts, handoff). gitignored. Never referenced from docs/skills/AGENTS.md. Per-task subdir; no cross-agent overwrite.
- docs/ : project-specific system/structure. Stable, not reusable elsewhere. Human-readable (ko).
- .agents/skills/<name>/SKILL.md : general, reusable procedure. Agent-only.
- .agents/skills/<name>/scripts/ : deterministic, token-saving steps of that skill.
- AGENTS.md : principles for using skills + cross-skill policy. No procedures here.
- README.md (root) : user-authored; never create/edit/delete/reformat it without an explicit user request. Generated docs/prompt/README.md stays script-owned (prompt-log).
Ambiguous -> skill `codify`.

## Using skills
- Explanation order: why -> what -> how (issues, briefs, reports, PRs, docs). Structure: STAR for done work; SWOT for option/design evaluation. Pick one per doc.
- Korean particle/suffix directly after emphasis -> inline code, or `<strong>` only with supported HTML rendering; avoid adjacent closing `**` in replies/docs.
- Read index below; open a SKILL.md only when its trigger matches.
- Script exists -> run it; don't re-derive or read its source unless it fails.
- Don't paste skill/doc content into replies or other files; cite path.
- Repeated manual step, or output reproducible by code -> scriptify (via `codify`).
- Workflow actions -> skill `gh-actions`: look up latest stable major (@vN) via `scripts/latest.sh`; runtimes = LTS per skill; verify via `scripts/check.sh` before review.

## Codify (meta rule)
- New durable knowledge, repeated work, or request to record rules/skills/docs -> run skill `codify`.
- Design/implementation decision to make or change -> run skill `adr`; record user-chosen decisions only, never invent them.
- After any change under .agents/skills or docs -> `.agents/skills/codify/scripts/check.sh` must pass.
- User prompt that sets durable rules/structure/workflow -> log via skill `prompt-log` after the work.
- Scripts w/ outward-facing effects: build inputs once; `--dry-run` swaps only the executor (print vs run). Reviewers verify the real path (validate payload bytes, e.g. `jq`), not dry-run text alone.
- Missing/empty Herdr caller IDs -> skill `handoff`: identity from live evidence only, never focus/cwd; `HERDR_ENV=1` alone proves nothing.
- Non-doc, non-binary code files <= 100 lines (split by responsibility; dist/*.html exempt until 0.3 SSR); verify via skill codify lines.sh.

## Verification
- Deterministic checks (lint, tests, lines, scripts) run through their owners (scripts); do not hand-read or repeat an unchanged green suite.
- Review for judgment only, scoped to changed/failing/unresolved inputs or explicit risk.
- Reuse passed evidence unchanged; rerun only affected checks after a relevant edit or failure.
- Scope frozen at dispatch: acceptance criteria change only with user approval. Reviewers judge only against them; outside findings are out-of-scope observations, never blocking. Fix rounds carry blocking findings only. Non-blocking or out-of-scope findings never become new units — log to the harness ledger or propose to the user. Workers stay within owned files + acceptance and report other issues instead of fixing.
- Status and report reads are event-driven (completion, failure, or next decision needed), not pane polling.

## Orchestration
- Non-trivial task -> invoke skill `orchestrate` and delegate via Herdr by default; no separate user request required; orchestrator only dispatches briefs and does final review.
- Orchestrator actions limited to ask/brief/dispatch/wait/review/commit; every other edit (scaffolding, code/docs/skills/AGENTS, prompt-log, gh writes, gate fixes) is worker work even when unrequested -> details in skill `orchestrate`.
- Self-improve: "하네스 업데이트" or similar request -> skill `harness` full pass. Run harness light pass automatically (no request needed) on user corrections, reviewer blocking findings, repeated manual steps, gate failure classes, worker drift, and before each commit.
- Delegation transport strictly means existing Herdr worker panes dispatched via `orchestrate/scripts`; never built-in collaboration spawn/followup/subagent APIs. Tool availability is not authorization to substitute backend.
- Before dispatch, resolve live workspace/self and verify intended worker; if Herdr is unavailable, context missing, or no worker ready, follow safe discovery/escalation; never silently replace with native subagents or self-implement worker units.
- Event-driven via worker callbacks (orchestrate/scripts/notify.sh); orchestrator acts on callback or triage timer without polling loops, redistributing as units settle.
- Herdr workers implement; reviewer != author; each worker owns a disjoint file set.
- Assign units by each worker's model tier (see skill `orchestrate`); reviewer differs from author in model family when possible.
- Trivial single-step answer: answer directly, no orchestration.

## Git
- Remote: github qus0in/the-great-dalmuti.
- Work on `dev`; main only via PR dev->main (skill `git-flow`).
- `main` protected; never push/force-push it.
- Workers don't commit/push; orchestrator commits after final review.
- Never hide repo state to pass a guard: no `.git/info/exclude`, no stash/force. A content rule is not a tracking rule; untracked file blocking a check -> commit verbatim or ask.

## Issues
- Skill `gh-issues`. FIT framework: focus = milestone core work; instant = small, finish right away; tuck = deferred/parked. Domain labels: frontend, design.
- Milestones: semver + Korean stage description. Current: 0.3.0 = Express 정적 서빙·Supabase 로그인과 게임 로직.
- Every issue: exactly 1 milestone + exactly 1 FIT label + optional domain labels.
- Issues close with their work: `Closes #N` in the shipping PR body, or verify acceptance against main right after merge and close citing that evidence.
- Progress tracked/reported per semver patch only (table: version · issues/scope · status 계획/작업 중/PR 열림/머지됨/릴리스됨, canonical docs/0.3-patch-plan.md); no speed/date estimates.

## UI prototype (0.2)
- UI work under dist/ → read `DESIGN.md` + skill `ui-prototype` (placement, tokens, check/shot scripts) before starting; cite its paths, don't restate it.
- Visual/headless verification is worker-only: never run headless Chrome as orchestrator; assign to a worker and read its report/PNGs.

## Structure (0.3)
- 0.3 source: layers above features under `src/{ui,app,domain,infra}/<feature>` (deps ui -> app -> domain, infra implements ports, domain no external deps); 0.3 screens at `src/ui/public/`; `dist/` frozen as 0.2 Pages preview, Render serves 0.3. Canonical: `docs/adr/0007-0.3-structure.md` + `docs/structure.md`.
- 0.3 targets early-course learners who don't know servers yet: browser-first (CDN supabase-js), Express only for server-only work, short readable code; canonical `docs/adr/0010-0.3-browser-supabase-js.md`.

## Skills
<!-- skills:begin -->
- adr: Record design decisions as ADRs from user Q&A; scaffold, index, check. Use when making or changing architecture/implementation decisions or running a decision interview.
- codify: Persist knowledge into tmp, docs, skills, scripts or AGENTS.md by placement rules; scaffold, index, check. Use when recording rules/skills/docs, after learning a reusable procedure or project structure, or when work repeats.
- gh-actions: Discover and verify latest stable or LTS GitHub Actions and runtime versions. Use when creating or updating GitHub Actions workflow files.
- gh-issues: Create and manage GitHub issues with canonical labels and milestones. Use for issue workflows.
- git-flow: Manage git flow by protecting main, shipping dev via PR, syncing, and bootstrapping dev. Use for branch and release workflows.
- handoff: Record and verify live Herdr orchestrator state during handoff or takeover. Use when transferring orchestrator duties between agents, verifying caller identity, or resuming tasks.
- harness: Harvest lessons from reviews, failures, and corrections, then dispatch them as skill/rule/doc/script updates; use for self-improvement passes or when the user asks for a harness update.
- layers: Lint layer dependency rules and 100-line limit for src features
- orchestrate: Automatically delegate non-trivial tasks via Herdr without a separate user request; orchestrator dispatches and does final review, workers implement and independently review.
- prompt-log: Record meaningful user prompts verbatim into docs/prompt with intent and outcome. Use when a user prompt sets durable rules, structure, workflow, or design decisions, or when asked to log prompts.
- ui-prototype: Building or reviewing HTML/CSS prototype screens in dist/. Use when implementing or reviewing hall/play pages, their styles, or design-token compliance.
<!-- skills:end -->
