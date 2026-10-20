# brief {{worker}} — {{version}} PR 본문

## 왜
{{version}} 묶음을 `main`에 합친다. 근거 문서: {{sources}}.

## 무엇
`tmp/{{task}}/pr-body.md` 작성. 형식은 왜 → 무엇 → 어떻게, 한국어. 근거: {{sources}}, `git diff {{since}}...dev` 전체. tmp 경로 금지. 마지막 줄은 {{closes}}.

## 소유 / 금지
소유: `tmp/{{task}}/pr-body.md`만. 그 외 수정·커밋·push·gh 쓰기 금지.

## 완료 기준 (고정)
A. diff 전체 반영(코드·문서 묶음). B. 마지막 줄이 `{{closes}}`. C. 가나·영어 동사 0건.
