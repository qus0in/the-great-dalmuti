# 테스트 전용 Anonymous 계정 허용

- 날짜: 2026-10-16
- 결과: docs/0.3-patch-plan.md (patch 추적 표 위치). 선택: 테스트 전용 계정은 Supabase Anonymous 로그인(signInAnonymously)으로 만들고 테스트 후 삭제, Anonymous Sign-ins 활성화 승인, Email provider 미사용

## 원문

```text
테스트용으로 임의 가상 로그인전용 계정이 있어도 돼
```

## 의도

단계 B 인증 경로를 테스트 전용 Anonymous 계정 4개(테스트 후 삭제)로 확정한다. 실제 JWT·RLS 경로는 유지하고, Email provider는 계속 쓰지 않는다.
