# brief {{worker}} — 리뷰(읽기 전용): {{unit}}

## 왜
{{author}}의 작업(`{{author_brief}}`)을 다른 모델 계열이 독립 검증한다.

## 무엇
- 대상: `{{snapshot}}`의 파일과 HEAD 차이 + 보고서 `{{report}}`.
- 시작 전·끝난 뒤 스냅샷 파일과 작업 트리를 `cmp`로 대조해 작업 중 변경이 없음을 확인한다.
- `{{author_brief}}` 완료 기준 {{criteria}}만으로 판정한다. 기준 밖은 비차단 관찰로 남긴다.
- 화면·PNG 주장이 있으면 PNG를 직접 열어 확인한다.

## 금지
파일 수정(보고서 제외), 커밋/push, gh 쓰기.

## 완료 기준 (고정)
{{criteria}} 항목을 빠짐없이 확인한다. 하나라도 어긋나면 `verdict: block`, 모두 만족하면 `verdict: accept`으로 판정한다.
