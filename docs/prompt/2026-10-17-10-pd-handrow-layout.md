# 손패 일자 겹침 배열 적용

- 날짜: 2026-10-17
- 결과: DESIGN.md, src/ui/public/css/play/hand.css, src/ui/public/css/play/hand-fan.css, src/ui/public/css/play/hand-mobile.css, src/ui/public/css/play/hand-fan-deal.css, src/ui/public/js/play-dom-cards.js

## 원문

```text
그리고 카드가 쭈욱 뭐 있지 않고 막 휘었다 이상하게 배치되고 처음 들어갔을 때 0.2 화면이 잠깐 떠있다가 변환돼
```

손패 배치 질문에 대한 사용자 선택:

```text
일자 겹침 배열 (Recommended)
```

함께 들어온 관련 원문:

```text
이미 하나가 선택된 상황에서 여러개를 선택해서 호버하기 어려움
```

## 의도

사용자는 휘어진 카드 배치와 첫 진입 시 예시 화면 노출, 선택된 카드가 있을 때 추가 선택·호버가 어려운 문제를 알렸다. 손패 배치 질문에서는 일자 겹침 배열을 선택했고, 이에 따라 회전 없이 겹치는 반응형 손패와 선택·호버 기준을 갱신했다.
