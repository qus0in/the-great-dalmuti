# README 최소 수정·Pino 도입과 PR 진행 규칙

- 날짜: 2026-10-16
- 결과: README.md, package.json, package-lock.json, src/ui/server.js, src/ui/http/request-logging.js, src/ui/http/request-logging.test.js, src/ui/http/request-logging-app.test.js, docs/adr/0012-pino-http-logging.md, docs/adr/README.md

## 원문

```text
지시(사용자 결정, 네 건):

1. 미푸시 처리: 로컬 dev의 미푸시 4커밋과 미커밋 파일은 **다음 PR에 묶어서 올린다**. 지금 따로 올리지 않는다.
2. 0.4 설계 인터뷰 [#44](https://github.com/qus0in/the-great-dalmuti/issues/44)는 **다음에 한다** — 지금 시작하지 말고 0.4 나머지 이슈도 손대지 않는다.
3. 루트 `README.md`에 **렌더 링크를 기존 줄의 다음 줄에 추가**한다. 사용자 명시 요청 건이므로 요청 범위만 원문대로 고쳐 커밋한다(새 줄 내용: `https://the-great-dalmuti.onrender.com`, 기존 Pages 링크 줄은 그대로 유지). README는 사용자 소유 파일 — 요청한 줄 외는 재포맷하지 않는다.
4. Express에 **로깅용 `pino`를 추가**한다. 의존 추가·미들웨어 연결 위치·로그 레벨은 오케스트레이터가 정해 기록하고(필요하면 ADR), 100줄 제한·레이어 의존 규칙·PR 전용 CI를 지킨다.

제약 유지: main 보호, 리뷰는 구현자와 다른 에이전트, 최소 2단계 분배와 배정 결과 명시.
```

## 의도

다음 PR에 미푸시 작업을 함께 싣고, 지금은 push·PR 없이 0.4를 보류하면서 README 최소 수정과 Express Pino 로깅을 진행하라는 지시를 보존한다. 최초 관측은 dev=f54aa77, origin/dev와 동일, clean이었고, README/Pino 변경은 리뷰·게이트 후 로컬 커밋 7aa17af·8b19c7e로 남아 미푸시이며 ADR-0012와 인덱스는 아직 독립 리뷰·커밋 전이다.
