# AGENTS
Agent-only rules. Shared by all agents (claude/codex/opencode/...). Terse by design.
CLAUDE.md -> AGENTS.md, .claude/skills -> .agents/skills: symlinks. Edit targets only.

## Placement
- tmp/<task>/ : ephemeral, mutable (scratch, logs, drafts, handoff). gitignored. Never referenced from docs/skills/AGENTS.md. Per-task subdir; no cross-agent overwrite.
- docs/ : project-specific system/structure. Stable, not reusable elsewhere. Human-readable (ko).
- .agents/skills/<name>/SKILL.md : general, reusable procedure. Agent-only.
- .agents/skills/<name>/scripts/ : deterministic, token-saving steps of that skill.
- AGENTS.md : principles for using skills + cross-skill policy. No procedures here.
Ambiguous -> skill `codify`.

## Using skills
- Read index below; open a SKILL.md only when its trigger matches.
- Script exists -> run it; don't re-derive or read its source unless it fails.
- Don't paste skill/doc content into replies or other files; cite path.
- Repeated manual step, or output reproducible by code -> scriptify (via `codify`).

## Codify (meta rule)
- New durable knowledge, repeated work, or request to record rules/skills/docs -> run skill `codify`.
- After any change under .agents/skills or docs -> `.agents/skills/codify/scripts/check.sh` must pass.
- User prompt that sets durable rules/structure/workflow -> log via skill `prompt-log` after the work.
- Scripts w/ outward-facing effects: build inputs once; `--dry-run` swaps only the executor (print vs run). Reviewers verify the real path (validate payload bytes, e.g. `jq`), not dry-run text alone.
- Missing/empty Herdr caller IDs -> skill `orchestrate` references/handoff.md: identity from live evidence only, never focus/cwd; `HERDR_ENV=1` alone proves nothing.

## Orchestration
- Non-trivial task -> invoke skill `orchestrate` and delegate by default; no separate user request required; orchestrator only dispatches briefs and does final review.
- Dispatch + waits run in background; orchestrator never blocks on a worker; redistribute as each worker settles.
- Workers implement; reviewer != author; each worker owns a disjoint file set.
- Assign units by each worker's model tier (see skill `orchestrate`); reviewer differs from author in model family when possible.
- Trivial single-step answer: answer directly, no orchestration.

## Git
- Remote: github qus0in/the-great-dalmuti.
- Work on `dev`; main only via PR dev->main (skill `git-flow`).
- `main` protected; never push/force-push it.
- Workers don't commit/push; orchestrator commits after final review.

## Issues
- Skill `gh-issues`. Labels only: focus, instant, tuck, frontend, design.
- Milestones: semver + Korean stage description. Current: 0.1.1 = 학습 문서와 협업 운영 정비.
- Every issue: exactly 1 milestone + >=1 label.

## Skills
<!-- skills:begin -->
- codify: Persist knowledge into tmp, docs, skills, scripts or AGENTS.md by placement rules; scaffold, index, check. Use when recording rules/skills/docs, after learning a reusable procedure or project structure, or when work repeats.
- gh-issues: Create and manage GitHub issues with canonical labels and milestones. Use for issue workflows.
- git-flow: Manage git flow by protecting main, shipping dev via PR, syncing, and bootstrapping dev. Use for branch and release workflows.
- orchestrate: Automatically delegate non-trivial tasks without a separate user request; orchestrator dispatches and does final review, workers implement and independently review.
- prompt-log: Record meaningful user prompts verbatim into docs/prompt with intent and outcome. Use when a user prompt sets durable rules, structure, workflow, or design decisions, or when asked to log prompts.
<!-- skills:end -->
