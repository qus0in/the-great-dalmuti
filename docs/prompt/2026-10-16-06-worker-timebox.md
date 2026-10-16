# 오케스트레이터 10분 타임박스·워커 역량 판정 하네스 갱신

- 날짜: 2026-10-16
- 결과: .agents/skills/orchestrate/SKILL.md, .agents/skills/orchestrate/scripts/, .agents/skills/orchestrate/references/models.md

## 원문

```text
오케스트레이터는 워커에게 10분 정도 안에 진행할 수 있을만큼만 분배해서 주며, 워커거 10분 이상 진행을 하고 있다면 1) 모델의 역량부족 2) 애초에 길게 걸리는 작업 (e2e, 외부 api) 3) 자체 오류 임을 판정해야함. 관련 하네스 업데이트.
```

## 의도

오케스트레이터는 워커에게 약 10분 분량만 분배하고 10분 초과 진행 시 모델 역량 부족·원래 장시간 작업·자체 오류를 판정하도록 하네스 갱신.
