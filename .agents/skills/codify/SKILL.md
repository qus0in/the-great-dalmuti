---
name: codify
description: Persist knowledge into tmp, docs, skills, scripts or AGENTS.md by placement rules; scaffold, index, check. Use when recording rules/skills/docs, after learning a reusable procedure or project structure, or when work repeats.
---
# codify
Paths relative to repo root. S=.agents/skills/codify/scripts

## 1. Classify (first match wins)
1. ephemeral / will change soon (incl. gate logs `verify-*.log`) -> tmp/<task>/ ; stop.
2. deterministic + repeatable (same input -> same output) -> scripts/ of owning skill.
3. general, reusable procedure -> .agents/skills/<name>/SKILL.md
4. principle for using skills / policy across skills -> AGENTS.md (1 line each)
5. project-specific structure/system, not reusable -> docs/<topic>.md
Split mixed knowledge across targets; link by path, never duplicate.
Root README.md is user-authored and never a codify target: edit only on explicit user request. Generated docs/prompt/README.md stays prompt-log-owned.

## 2. Write
- New skill: `$S/new-skill.sh <name> "<description>"` (name: [a-z0-9-]+).
- Existing skill: edit in place; prefer replacing lines over appending.
- docs: Korean prose for humans. Explanation order: why -> what -> how. Structure: STAR for done work; SWOT for option/design evaluation. Pick one per doc.
- Korean particle/suffix adjacent to closing `**` -> inline code (one backtick pair), or `<strong>` if HTML supported; preserve wording/spacing. Keep bounded bold, verbatim logs, and code examples intact. Review before sending/publishing.

## 3. Style (AGENTS.md, SKILL.md; agent-only)
- English, imperative, fragments. Symbols ok (->, /, ;).
- No rationale unless it changes behavior. No examples unless format is non-obvious.
- description = trigger, 1 line, no ": " (YAML).
- SKILL.md body <= ~60 lines; overflow -> references/<topic>.md, loaded on demand.
- Code limits: every non-doc, non-binary code file <= 100 lines (split by responsibility; dist/*.html exempt until 0.3 SSR); verify via `$S/lines.sh`.
- Instruction file size budget: root AGENTS.md <= 24KB (warn > 16KB) to prevent truncation; verify via `$S/check.sh`.
- Tool/agent-neutral wording; works for any agent.

## 4. Scriptify
- Candidate: step run >=2x, or output fully determined by inputs/files.
- scripts/<verb>.sh: POSIX sh, executable, idempotent, non-interactive, exit!=0 on fail, terse stdout.
- scripts/lines.sh [--max N] [paths...]: check code file line limits (default 100; paths = files or directories, none = repo-wide).
- Project values (extra line-gate exempt file globs) live in `.agents/project.conf`; empty/missing conf = generic defaults (no extra exemptions).
- Outward-facing effects: build inputs once; `--dry-run` swaps only the executor (print vs run) — never a second code path.
- Real path is what reviewers verify (validate payload bytes, e.g. `jq`), not dry-run text.
- Resolve root from script path, not cwd.
- Generated file owned by a skill -> scripts/index.sh with `--check` (exit 1 if stale); check.sh runs it.
- SKILL.md references the script with a 1-line usage; no restating its logic.

## 5. Finish
- `$S/index.sh` (sync AGENTS.md skills index)
- `$S/check.sh` must print `ok` (includes the repo-wide 100-line gate).
- Gates after changes: `orchestrate/scripts/verify.sh <task> [rules|ui|all]` once per checkpoint; failures must be fixed or reported, not exempted.
