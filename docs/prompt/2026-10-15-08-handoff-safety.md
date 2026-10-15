# 인수인계 안전 규칙과 handoff 절차 개선

- 날짜: 2026-10-15
- 결과: AGENTS.md, .agents/skills/orchestrate/SKILL.md, .agents/skills/orchestrate/references/handoff.md, .agents/skills/orchestrate/scripts/context.sh, .agents/skills/orchestrate/scripts/workers.sh, .agents/skills/orchestrate/scripts/dispatch.sh, .agents/skills/orchestrate/scripts/wait.sh

## 원문

```text
인수인계 과정 시 문제 없게 룰, 스킬 등을 개선
```

## 의도

인수인계 과정의 문제(빈 Herdr caller ID로 워커 없음 오인, 포커스/cwd 기반 신원 오인)를 막기 위해 신원을 실시간 증거로만 확정하고, context.sh와 --workspace/--self-pane 플래그, handoff 기록 절차를 AGENTS.md 규칙과 orchestrate 스킬로 개선함.
