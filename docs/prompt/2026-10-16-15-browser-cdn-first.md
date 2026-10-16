# 브라우저 CDN 우선 원칙

- 날짜: 2026-10-16
- 결과: docs/adr/0010-0.3-browser-supabase-js.md

## 원문

```text
supabase는 브라우저에서는 cdn으로 하고, 서버가 나은 작업만 express에서
```

## 의도

Supabase 사용 위치 원칙(브라우저 CDN 기본, Express는 서버가 나은 작업만)을 세우기 위함.
