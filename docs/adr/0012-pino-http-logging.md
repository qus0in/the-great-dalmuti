# ADR-0012: Pino HTTP 요청 로깅

- 상태: accepted
- 날짜: 2026-10-16
- 관련: [ADR-0003](./0003-0.3-transport.md), [ADR-0007](./0007-0.3-structure.md)
- 출처: 2026-10-16 사용자 결정 및 구현 위임

## Why

Express 서버의 HTTP 요청을 운영 로그에서 추적할 수 있도록 로깅을 도입한다. 사용자는 Pino 도입을 선택했고 구현 세부사항은 위임했다. 이 ADR은 사용자 결정과 구현 제안을 분리해 기록한다.

## What

### 확정 결정

1. Express에 Pino를 도입한다.
2. 의존성 구성, Express 연결 지점, 로그 레벨의 구현 선택은 오케스트레이터에게 위임한다. 구체적인 패키지 조합이나 로그 형식은 사용자가 직접 선택한 것으로 기록하지 않는다.

### 제안 (공학적 수단, 사용자 명시 선택 아님)

1. `pino`와 공식 HTTP 어댑터 `pino-http`를 사용한다. 실제 구현 시점의 안정 버전과 Node.js 22·24 호환성을 확인한다.
2. `src/ui/http/request-logging.js`에 로거 생성 함수를 두고, Express 앱을 만든 직후 첫 `app.use` 미들웨어로 연결한다. 헬스 체크·정적 파일·리다이렉트·API·404·오류 응답을 포함한다.
3. Pino 기본 `info` 수준을 사용하고 `LOG_LEVEL` 환경 변수로 지원 수준을 바꿀 수 있게 한다. 성공·리다이렉트는 `info`, 4xx는 `warn`, 5xx와 오류는 `error`로 남긴다. 로그는 JSON 표준 출력으로 보내고 `pino-pretty`는 추가하지 않는다.
4. 요청 식별자·메서드·쿼리 문자열을 뺀 경로와 응답 상태 코드·처리 시간만 허용 목록으로 기록한다. 헤더·본문·쿼리·토큰·쿠키·비밀 키·손패·원본 오류 메시지·스택은 제외한다. 라이브러리 기본 직렬화기가 제외 대상을 다시 기록하지 않는지 확인한다.
5. 외부 패키지 의존은 UI HTTP 어댑터 안에 한정해 레이어 관계를 바꾸지 않는다. `src/main.js`의 기존 시작·런타임 `console` 로그 변경은 요청 로깅 범위 밖이다.

### 미결 (임의 결정 금지)

없음. 세부 구현은 확정된 사용자 결정이 아니라 위임된 구현 제안이다.

## How

구현 시 위 제안을 기준으로 Express HTTP 경계에 연결하고, 민감 필드가 출력되지 않는지 확인한다. Pino 및 pino-http의 공식 문서는 [Pino README](https://github.com/pinojs/pino/blob/main/README.md), [Pino API](https://github.com/pinojs/pino/blob/main/docs/api.md), [pino-http README](https://github.com/pinojs/pino-http#readme)이다 (확인일: 2026-10-16).
