---
name: git-flow
description: Manage git flow by protecting main, shipping dev via PR, syncing, and bootstrapping dev. Use for branch and release workflows.
---
# git-flow
Bootstrap: direct commits to main until rule-making ends.

After bootstrap: all work on dev; main changes only via PR dev -> main. main protected (no direct/force push, no delete, PR required, 0 approvals, enforce admins).

Workers never commit/push; orchestrator commits on dev after final review, then ships via PR and merges. Avoids concurrent git index use.

Scripts (POSIX sh; --dry-run prints quoted mutations, runs read-only queries only, never mutates; unknown flag exits 2 first; guards enforced in dry-run too):
- protect.sh [--dry-run]: apply main protection (idempotent).
- ship.sh "<title>" ["<body>"] [--body-file FILE] [--merge] [--dry-run]: require dev + clean tree; push dev; lookup failure aborts (never creates duplicate); reuse/create PR (URL printed only when run); --merge merges, ff main to origin/main, returns to dev and ff's dev.
- sync.sh [--dry-run]: fetch; ff dev to origin/main with runtime fallback to merge commit (dry-run prints ff attempt + note, never invents fallback); no force push or push.
- start.sh [--dry-run]: resolve local/remote dev, print/run taken branch only (create from main and push if missing); ends on dev.