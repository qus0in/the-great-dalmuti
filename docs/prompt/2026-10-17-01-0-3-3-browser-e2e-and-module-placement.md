# 0.3.3 브라우저 E2E 로그인·모듈 배치 결정

- 날짜: 2026-10-17
- 결과: docs/adr/0013-0.3.3-browser-e2e-and-module-placement.md, src/ui/dom-query.test.js, docs/0.3-patch-plan.md

## 원문

```text
0.3.3 브라우저 한 판 E2E에서 로그인을 어떻게 통과할까요?
→ 테스트 세션 주입

브라우저 모듈은 어디에 둘까요?
→ src/ui/public/js에 모음
```

## 의도

0.3.3(#34) 브라우저 E2E는 익명 테스트 계정 토큰을 headless Chrome sessionStorage에 주입해 로그인하고, 브라우저 모듈은 src/ui/public/js에 모아 분리한다.
