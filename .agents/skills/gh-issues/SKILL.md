---
name: gh-issues
description: Create and manage GitHub issues with canonical labels and milestones. Use for issue workflows.
---
# gh-issues
Canonical labels: focus, instant, tuck, frontend, design (colors fixed). No other labels.

FIT framework:
- focus: milestone core work
- instant: small, finish right away
- tuck: deferred/parked
Domain labels: frontend, design.
Every issue gets exactly one milestone, exactly one FIT label, and optional domain labels.
Issue body explanation order: why -> what -> how.

Milestones: semver titles with Korean stage description.
Closing: issues close with their work — `Closes #N` in the shipping PR body, or verify acceptance against main right after merge and close with that evidence; never leave shipped issues open.

Scripts (POSIX sh; --dry-run prints mutations):
- labels.sh: sync labels to canonical set (create missing, delete extras).
- milestone.sh <title> "<description>": ensure milestone exists or update description; prints number + URL.
- issue.sh "<title>" <milestone> <label>[,<label>...] ["<body>"]: validate then create issue.