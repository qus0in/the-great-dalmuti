# 워커 컨텍스트 정리 및 Codex compact 규칙

- 날짜: 2026-10-18
- 결과: .agents/skills/orchestrate/scripts/dispatch.sh, .agents/skills/orchestrate/scripts/dispatch-reset.sh, .agents/skills/orchestrate/SKILL.md, .agents/skills/orchestrate/references/models.md

## 원문

```text
하네스 상 새로운 작업 앞에서는 clear 또는 compress를 하게 (워커)
```

추가 결정 질문("새 작업 앞 정리를 어떻게 할까요?")에 대한 사용자 선택:

```text
Codex는 compact만 (Recommended)
```

## 의도

하네스에서 새 작업 단위를 전달하기 전에 워커의 대화 맥락을 비우거나 압축하여 이전 작업 잔여물로 인한 맥락 오염을 방지하도록 지시했다. 또한 모델 초기화가 관측된 Codex 환경에서는 신규 작업에서도 compact 명령만 사용하고, 다른 도구는 clear 계열 명령을 사용하도록 결정했다.
