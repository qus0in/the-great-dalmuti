---
name: gh-issues
description: Create and manage GitHub issues with canonical labels and milestones. Use for issue workflows.
---
# gh-issues
Canonical labels: focus, instant, tuck, frontend, design (colors fixed). No other labels.

Milestones: semver titles with Korean stage description. Every issue gets one milestone and >=1 label.

Scripts (POSIX sh; --dry-run prints mutations):
- labels.sh: sync labels to canonical set (create missing, delete extras).
- milestone.sh <title> "<description>": ensure milestone exists or update description; prints number + URL.
- issue.sh "<title>" <milestone> <label>[,<label>...] ["<body>"]: validate then create issue.