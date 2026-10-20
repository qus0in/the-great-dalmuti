# brief {{worker}} — 리뷰(읽기 전용): {{unit}}

## 왜
{{author}}의 작업(`{{author_brief}}`)을 다른 모델 계열이 독립 검증한다.

## 무엇
- 대상: `{{snapshot}}`의 파일과 HEAD 차이 + 보고서 `{{report}}`.
- 시작 전·끝난 뒤 스냅샷 파일과 작업 트리를 `cmp`로 대조해 작업 중 변경이 없음을 확인한다.
- `{{author_brief}}` 완료 기준 {{criteria}}만으로 판정한다. 기준 밖은 비차단 관찰로 남긴다.
- 화면·PNG 주장이 있으면 PNG를 직접 열어 확인한다.
- 본문에 적힌 `PR`·이슈 번호는 종류가 바뀌어 있을 수 있으니 `gh pr view`로 실제 종류를 확인한다.
- 작성자 보고에 통과한 게이트 근거가 있으면 그대로 재사용한다. 게이트 재실행은 작성자 보고 뒤 게이트 입력이 바뀐 경우에만 그 게이트에 한정한다.
- 판정은 `status: done` + `verdict: accept|block`으로 쓴다. 차단(`verdict: block`)이어도 `status: blocked`로 쓰지 않는다.
- 판정을 쓰면 반드시 완료 꼬리(`verdict.sh`, 알림으로 마감하는 흐름이면 `notify.sh`)를 실행한다. 꼬리를 생략하면 알림이 없어 단위가 멈춘다.

## 금지
파일 수정(보고서 제외), 커밋/push/stash, gh 쓰기.

## 완료 기준 (고정)
{{criteria}} 항목을 빠짐없이 확인한다. 하나라도 어긋나면 `verdict: block`, 모두 만족하면 `verdict: accept`으로 판정한다.
