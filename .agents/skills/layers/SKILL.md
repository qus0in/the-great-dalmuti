---
name: layers
description: Lint layer dependency rules and 100-line limit for src features
---
# layers
S=.agents/skills/layers/scripts
C=.agents/skills/codify/scripts

## 1. Rule source
- Layout: `src/{ui,app,domain,infra}/<feature>`.
- Allowed imports: ui -> app (and own); app -> domain (+ app ports); infra -> app/domain; domain -> nothing outside domain.
- Domain must not import any bare package or any non-domain layer.
- 100-line gate is reused via `C/lines.sh` (no local counter).

## 2. Usage
- `$S/check.sh [root]` -> validates src layer/import directions and run `lines.sh`; prints `ok` or `<file>: <problem>`.
- If `$root/src` is absent, prints `ok` and exits 0.
- HTML under `src/ui/public` and `dist/*.html` is exempt from line count.

## 3. Scope
- Read-only audit against the decided layout. Fix the reported imports or split the long file; never weaken the rules.
