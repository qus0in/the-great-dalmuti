---
name: adr
description: Record design decisions as ADRs from user Q&A; scaffold, index, check. Use when making or changing architecture/implementation decisions or running a decision interview.
---
# adr
Paths relative to repo root. S=.agents/skills/adr/scripts

## 1. Trigger
- Making/changing an architecture or implementation decision, or running a decision interview -> this skill.
- Mechanical work with no decision to record: skip.

## 2. Interview (capture before writing)
- Offer options per question with a `Recommended` option first; wait for the user's pick.
- One decision per answer; next question only after the current answer is recorded.
- Record each answer immediately in `tmp/<task>/decisions.md`, numbered, source/date noted.
- Free-form user answers: verbatim, no translation or fixing; redact secrets as [REDACTED].
- Author analysis/recommendation is never a decision, even if unopposed; keep it in 제안/미결 or the SWOT table.

## 3. ADR format (scripts enforce it)
- Files: `docs/adr/NNNN-<slug>.md` (4-digit number, slug [a-z0-9.-]+). `docs/adr/README.md` is generated (script-owned; never hand-edit).
- H1 `# ADR-NNNN: <title>`; NNNN equals the filename number.
- Header bullets: `- 상태: draft|accepted|superseded|deprecated[ (<note>)]`, `- 날짜: YYYY-MM-DD`; optional `- 관련:`, `- 관련 이슈:`, `- 이력:`/`- 출처:`.
- Sections in order: `## Why`, `## What`, `## How`; body is Korean prose for humans; fixed headings stay verbatim.
- What holds `### 확정 결정`, optional `### 제안 (공학적 수단, 사용자 명시 선택 아님)`, `### 미결 (임의 결정 금지)` (may say 없음), optional `### 대안 비교 (작성자 분석, 사용자 결정 아님)` SWOT table.

## 4. Writing rules
- 확정 결정: user-chosen decisions only, transcribed faithfully (verbatim for free text); never invent or infer.
- 제안: engineering means the user did not explicitly select; labeled as author's, not decided.
- 미결: items nobody may decide; when a decision lands, move it out of 미결 in the same change.
- SWOT 대안 비교 is author analysis; label it and never promote it to 확정.
- Canonical-once: one ADR states each decision; other ADRs link to that ADR/section, never restate the wording.
- Supersede by status (`superseded`) plus a pointer to the replacing ADR; never delete or rewrite history.
- 관련 이슈: link open issues only; closed parents appear solely as closure history.

## 5. Flow
1. Scaffold: `$S/new.sh <slug> "<title ko>"` -> draft ADR at the next number; refuses an existing slug.
2. Write/refine the ADR body from the decisions log; keep 확정/제안/미결 separated and honest.
3. `$S/check.sh [files...]` -> format + index validation; must print `ok` before review.
4. `$S/index.sh [--check]` -> regenerate `docs/adr/README.md`; `--check` fails if the index is stale.
5. Review: reviewer != author (different model family when possible), read-only verdict on the changed delta.
6. Commit on dev; main only via PR (skill git-flow).
7. Free-text decision prompts -> skill `prompt-log` (verbatim, after the outcome is known).
8. Affected issues -> skill `gh-issues`; user approval before any outward gh write (title/body edits, ADR links).
