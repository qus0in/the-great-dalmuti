# 0.4 API 자격 증명과 env 로딩 결정

- 날짜: 2026-10-20
- 결과: docs/adr/0018-0.4-ai-integration.md,.env.sample,docs/deployment.md

## 원문

```text
groq, gemini, nim, cf 모두 api key 발급 예정이고, .env로 제공할 예정. 관련하여 노드 자체 기능으로 env load하게 하고 (최신 기능이 있음) 나머지 사항들 진행. 우선 0.3.x 최신에서의 사용자 리뷰 가능 상태인지 확인하고 가능하다면 링크 제공.
```

## 의도

0.4 AI 통합에 쓸 Groq·Gemini·NVIDIA NIM·Cloudflare 4곳의 API 키 발급 방침과 .env 제공, Node 자체 기능으로 env 로드하는 방식을 확정한다.
