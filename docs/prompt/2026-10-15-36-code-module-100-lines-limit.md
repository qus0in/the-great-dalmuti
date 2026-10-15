# 모든 비문서·비바이너리 프로그래밍 모듈 100줄 이하 제한 규칙 반영

- 날짜: 2026-10-15
- 결과: .agents/skills/codify/scripts/lines.sh, .agents/skills/codify/SKILL.md, AGENTS.md, docs/structure.md

## 원문

```text
모든 문서/바이너리가 아닌 프로그래밍 모듈들은 100줄 이하로 작성한다 - 는 룰과 스킬이 존재하는지 확인하고 없을 경우 반영
```

## 의도

문서와 바이너리를 제외한 모든 코드 모듈을 100줄 이하로 제한하여 단일 책임 원칙과 검토 용이성을 확보하고 lines.sh 스크립트로 검증 체계를 수립
