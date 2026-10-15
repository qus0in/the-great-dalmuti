---
name: git-flow
description: Manage git flow by protecting main, shipping dev via PR, syncing, and bootstrapping dev. Use for branch and release workflows.
---
# git-flow
Bootstrap: direct commits to main until rule-making ends.

After bootstrap: all work on dev; main changes only via PR dev -> main. main protected (no direct/force push, no delete, PR required, 0 approvals, enforce admins).

Workers never commit/push; orchestrator commits on dev after final review, then ships via PR and merges. Avoids concurrent git index use.

Scripts (POSIX sh; --dry-run prints outward-facing commands):
- protect.sh: apply main protection (idempotent).
- ship.sh "<title>" ["<body>"] [--merge] [--dry-run]: require dev + clean tree; push dev; reuse/create PR; print URL; --merge merges and ff main.
- sync.sh [--dry-run]: fetch; ff dev to origin/main, fallback merge commit; no force push or push.
- start.sh [--dry-run]: ensure dev tracking origin/dev (create from main and push if missing), checkout dev.