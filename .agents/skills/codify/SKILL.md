---
name: codify
description: Persist knowledge into tmp, docs, skills, scripts or AGENTS.md by placement rules; scaffold, index, check. Use when recording rules/skills/docs, after learning a reusable procedure or project structure, or when work repeats.
---
# codify
Paths relative to repo root. S=.agents/skills/codify/scripts

## 1. Classify (first match wins)
1. ephemeral / will change soon -> tmp/<task>/ ; stop.
2. deterministic + repeatable (same input -> same output) -> scripts/ of owning skill.
3. general, reusable procedure -> .agents/skills/<name>/SKILL.md
4. principle for using skills / policy across skills -> AGENTS.md (1 line each)
5. project-specific structure/system, not reusable -> docs/<topic>.md
Split mixed knowledge across targets; link by path, never duplicate.

## 2. Write
- New skill: `$S/new-skill.sh <name> "<description>"` (name: [a-z0-9-]+).
- Existing skill: edit in place; prefer replacing lines over appending.
- docs: Korean prose for humans.

## 3. Style (AGENTS.md, SKILL.md; agent-only)
- English, imperative, fragments. Symbols ok (->, /, ;).
- No rationale unless it changes behavior. No examples unless format is non-obvious.
- description = trigger, 1 line, no ": " (YAML).
- SKILL.md body <= ~60 lines; overflow -> references/<topic>.md, loaded on demand.
- Tool/agent-neutral wording; works for any agent.

## 4. Scriptify
- Candidate: step run >=2x, or output fully determined by inputs/files.
- scripts/<verb>.sh: POSIX sh, executable, idempotent, non-interactive, exit!=0 on fail, terse stdout.
- Resolve root from script path, not cwd.
- Generated file owned by a skill -> scripts/index.sh with `--check` (exit 1 if stale); check.sh runs it.
- SKILL.md references the script with a 1-line usage; no restating its logic.

## 5. Finish
- `$S/index.sh` (sync AGENTS.md skills index)
- `$S/check.sh` must print `ok`.
