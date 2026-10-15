---
name: prompt-log
description: Record meaningful user prompts verbatim into docs/prompt with intent and outcome. Use when a user prompt sets durable rules, structure, workflow, or design decisions, or when asked to log prompts.
---
# prompt-log
S=.agents/skills/prompt-log/scripts

## Meaningful (log)
- sets/changes rules, placement, structure, workflow, conventions, design decisions, preferences.
## Skip
- one-off queries, status checks, trivial fixes, confirmations, prompts already logged.

## Do
1. Once per qualifying prompt, after its work is done (outcome known).
2. `$S/add.sh <slug> "<title ko>" "<outcome paths, comma-sep>" "<intent ko, 1-2 sentences>" <<'P'`
   `<prompt verbatim>`
   `P`
   - verbatim: no translation/fixing; redact secrets as [REDACTED].
   - backfill past date: `PROMPT_DATE=YYYY-MM-DD $S/add.sh ...`
3. Never hand-edit docs/prompt/README.md (generated). Entry files editable only to fix intent/outcome.
4. Run codify check (`.agents/skills/codify/scripts/check.sh`).
