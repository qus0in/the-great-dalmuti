---
name: gh-actions
description: Discover and verify latest stable or LTS GitHub Actions and runtime versions. Use when creating or updating GitHub Actions workflow files.
---
# gh-actions
Rule and scripts for keeping GitHub Actions workflow versions up to date.

Never pick action versions or runtimes from memory or stale templates.

## Rules
- When adding or updating a workflow, look up the real latest stable release for each action.
- Pin policy: pin each action to its latest stable major tag (`@vN`).
- SHA pins allowed if accompanied by comment `# vX.Y.Z` matching the latest major version.
- Runtime policy: for setup actions (e.g. `setup-node`, `setup-python`, `setup-java`), prefer LTS (`lts/*` or current active LTS) rather than arbitrary versions.
- Before review: run `scripts/check.sh` on all modified or new workflow files.

## Scripts
- Lookup: `scripts/latest.sh <owner/repo>...` -> print `<owner/repo> <latest stable tag> <major tag>` from GitHub releases/tags.
- Verify: `scripts/check.sh [workflow files...]` -> check that `uses:` actions meet or exceed latest major (`ok` or list stale refs; exit 1 on stale).
