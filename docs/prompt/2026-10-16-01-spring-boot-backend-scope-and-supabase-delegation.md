# 백엔드 기능 위임 원칙 및 Spring Boot 이관 범위 결정

- 날짜: 2026-10-16
- 결과: docs/adr/0001-0.3-play-scope.md, docs/adr/0003-0.3-transport.md, docs/adr/0005-0.3-migration-boundaries.md

## 원문

```text
이후 본격적인 백엔드 기능은 spring boot 도입시하고 웬만한 건 supabase에 위임할 수 있는 건 위임.
```

## 의도

본격적인 백엔드 기능은 향후 Spring Boot 도입 시 구현하고 0.3에서는 가능한 기능을 Supabase에 최대한 위임하도록 원칙을 결정.
