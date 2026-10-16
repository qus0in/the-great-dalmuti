# Supabase Realtime 채택 및 향후 Spring Boot Redis 이관 경계 고려

- 날짜: 2026-10-15
- 결과: docs/adr/0003-0.3-transport.md, docs/adr/0005-0.3-migration-boundaries.md

## 원문

```text
일단 그렇게 하고 나중에 spring boot 서버로 이관 시 redis로 Realtime 대체 예정임을 고려
```

## 의도

0.3 전송·저장으로 Supabase Realtime과 DB를 채택하고 향후 Spring Boot 서버 이관 시 Redis로 대체할 수 있는 이관 경계를 마련하도록 결정.
