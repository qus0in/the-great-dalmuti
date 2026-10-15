# 0.3 마일스톤 계획 이슈 작성

- 날짜: 2026-10-15
- 결과: 이슈 #19–#24, 마일스톤 0.3.0

## 원문

```text
0.3에 대한 이슈 작성 : npm lts 버전 하에서 express로 ssr + axios를 사용하여 fetching하여 로직 구현. supabase를 사용하여 구글 oauth2 로그인 진행. (.env를 서버쪽에서 사용). render로 배포. (별도 dockerfile은 없음. .env로 환경변수 제공). dom은 querySelector계열로만 제공하고, es6+ 문법으로 js는 별도 파일로 빼서 관리. 클린 아키텍처 지향으로 ui / app / domain / infra 패키지 구조를 가지기. localStorage, sessionStorage는 적절히 상태 관리를 위해 사용. 한 모듈은 80줄 넘기지 않도록 하고 SOLID 원칙을 적용. (kiss, yagni, dry 원칙을 안에 내장). 레이어를 위에, 그 아래 도메인/피쳐를 작성 (app/auth 처럼.)
```

## 의도

0.3 이슈 작성을 요청하며 Express SSR+axios, Supabase 구글 OAuth2, Render 배포(.env, Dockerfile 없음), 클린 아키텍처/코드 규칙(80줄·SOLID·KISS/YAGNI/DRY)을 규정.
