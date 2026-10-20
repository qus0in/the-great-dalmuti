---
name: git-flow
description: Manage git flow by protecting main, shipping dev via PR, syncing, and bootstrapping dev. Use for branch and release workflows.
---
# git-flow
Bootstrap: direct commits to main until rule-making ends.

After bootstrap: all work on dev; main changes only via PR dev -> main. main protected (no direct/force push, no delete, PR required, 0 approvals, enforce admins).

Workers never commit/push; orchestrator commits on dev after final review, then ships via PR and merges. Avoids concurrent git index use.

README.md (root) is user-authored: never stage edits to it unless the user asked; commit user content verbatim, no reformatting.

Scripts (POSIX sh; --dry-run prints quoted mutations, runs read-only queries only, never mutates; unknown flag exits 2 first; guards enforced in dry-run too):
- protect.sh [--dry-run]: apply main protection (idempotent).
- ship.sh "<title>" ["<body>"] [--body-file FILE] [--merge] [--dry-run]: require dev + clean tree; push dev; lookup failure aborts (never creates duplicate); reuse/create PR (URL printed only when run); body carries `Closes #N` for every issue the PR delivers; --merge reads origin repo policy once, prefers allowed merge/squash/rebase (invalid/none aborts), ff's main, returns to dev and ff's with runtime merge-commit fallback preserving history (dry-run prints ff attempt + fallback note), pushes dev.
- ship.sh: push 전 `git fetch origin main`(dry-run에서도 실행) 후 `git diff --quiet origin/main HEAD`가 조용하면 push·gh 없이 `nothing to ship: dev tree equals origin/main`을 stderr에 쓰고 exit 0.
- ship.sh guards (on dev + clean tree) are absolute: never hide an untracked file via `.git/info/exclude`/stash to pass them; commit the file verbatim (user-authored) or ask, then rerun.
- ship 후 main 머지 커밋이 dev 조상인지 확인; PR이 CONFLICTING이면 pull_request CI가 뜨지 않음 → sync 먼저.
- sync.sh [--dry-run]: fetch; ff dev to origin/main with runtime fallback to merge commit (dry-run prints ff attempt + note, never invents fallback); no force push or push.
- start.sh [--dry-run]: resolve local/remote dev, print/run taken branch only (create from main and push if missing); ends on dev.

Previous minor patch ([ADR-0009 62f](docs/adr/0009-0.x-learn-branches.md)):
- 해당 minor 최신 태그에서 `hotfix/0.<minor>.<patch>` 브랜치 생성 → base `v0.<minor>`로 PR.
- 저장소 머지 정책(squash/merge/rebase)에 맞춰 머지(`gh pr merge <method> --admin`, ruleset 우회).
- `v0.<minor>`에 태그·릴리스 생성; 이슈 수동 종료(기본 브랜치 아닌 base PR은 `Closes #N` 자동 종료 안 됨); 동일 수정을 `dev`에 이식.
