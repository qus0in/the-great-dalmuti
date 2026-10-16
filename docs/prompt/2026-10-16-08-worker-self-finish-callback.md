# 워커가 종료 시 스스로 마무리하고 오케스트레이터가 watch하지 않게 하네스 개선

- 날짜: 2026-10-16
- 결과: .agents/skills/orchestrate/SKILL.md, .agents/skills/orchestrate/scripts/dispatch.sh, .agents/skills/orchestrate/scripts/notify.sh, AGENTS.md

## 원문

```text
워커가 종료시 스스로 마무리 짓고 오케스트레이터가 watch하게 하지 말고, 워커가 리뷰어나 오케스트레이터를 적절히 호출하게 하네스 개선
```

## 의도

워커가 종료 시 스스로 마무리하고 오케스트레이터가 watch하지 않게 하며, 워커가 리뷰어나 오케스트레이터를 적절히 호출하도록 하네스를 개선.
