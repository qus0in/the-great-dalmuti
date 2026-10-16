# 배포 — Render (0.3 서비스)

## 왜 (Why)

- `dist/`는 0.2 프로토타입 미리보기로 동결되어 있고, 0.3은 Express 서버와 Supabase를 사용하는 실제 서비스입니다 (`ADR-0007`).
- GitHub Pages 정적 배포 워크플로는 `f88a869`에서 삭제되었습니다.
- 0.3은 Render Web Service로 배포하고, `dist/`는 0.2 frozen artifact로 유지합니다.

## 무엇을 (What)

- **배포 대상**: GitHub 저장소 `qus0in/the-great-dalmuti`, 브랜치 `main` (git-flow에서 `dev` → `main` PR).
- **런타임**: Native Node, Dockerfile 없음.
- **빌드/시작**: build `npm ci`, start `npm start`.
- **Node 버전**: `package.json`의 `"engines": { "node": "^22 || ^24" }`; Render 환경변수 `NODE_VERSION=24` 권장 ([Node version](https://render.com/docs/node-version)).
- **환경 변수** (`Render` dashboard, `.env.sample` 키 기준):
  - `SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
  - `SUPABASE_JWKS_URL`
  - `NODE_ENV=production`
  - `PORT`는 Render가 자동 주입하므로 수동 입력하지 않습니다.
- **리전/플랜**: Region `oregon`, Plan `free` (이후 사용할 AI API의 리전 제약을 피하기 위함).
- **헬스 경로**: `/healthz` ([Health checks](https://render.com/docs/health-checks)).
- **Supabase Auth redirect URL**: Render 도메인으로 설정 ([Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)).
- 역할 참조: [ADR-0002 렌더링](adr/0002-0.3-rendering.md), [ADR-0003 전송과 저장](adr/0003-0.3-transport.md), [ADR-0007 구조](adr/0007-0.3-structure.md).

## 어떻게 (How)

### 0. 승인 전 로컬 확인

```sh
npm ci
npm test
npm run lint
npm run format:check
.agents/skills/layers/scripts/check.sh
```

### 1. Render Web Service 생성 (승인 후 실행)

외부 효과를 만드는 단계이므로 승인 필요(외부 효과) — 대시보드 또는 CLI 중 하나로 실행합니다.

- 공통: Region `oregon`, Plan `free` — "리전은 오리건, free tier로 만들어야함. 이후 사용할 ai api 가 싱가포르 등에서 허용이 안됨".
- 대시보드: `New +` → `Web Service`; GitHub 저장소 `qus0in/the-great-dalmuti` 연결. ([Render web services](https://render.com/docs/web-services))
- 대시보드: Runtime `Node`, Branch `main`, Build Command `npm ci`, Start Command `npm start`.
- 대시보드: `healthCheckPath`는 `/healthz`로 지정.
- CLI (대안, 승인 필요(외부 효과), 플래그는 `render services create --help`에서 확인):

```sh
render services create --name <service-name> --type web_service --repo https://github.com/qus0in/the-great-dalmuti --runtime node --branch main --build-command "npm ci" --start-command "npm start" --health-check-path /healthz --region oregon --plan free --output json
```

### 2. 환경 변수 등록 (승인 후 실행)

dashboard `Environment` 탭에서 위 4개 Supabase 키와 `NODE_ENV=production`을 입력하고, `.env` 파일은 커밋하지 않습니다. ([Environment variables](https://render.com/docs/configure-environment-variables))

### 3. 배포 브랜치와 자동 배포 (승인 후 실행)

- Render의 auto-deploy branch를 `main`으로 설정합니다. ([Web services](https://render.com/docs/web-services))
- `dev`에서 `main`으로 PR 병합 후 자동 빌드/배포가 실행됩니다.
- 무료 티어 제약: 15분 무요청 시 sleep, cold start 약 50초~1분, ephemeral disk, 월 750시간. ([Free tier](https://render.com/docs/free#free-web-services))

### 4. Supabase Auth redirect URL (승인 후 실행)

- Supabase Dashboard → Authentication → URL Configuration.
- Site URL: `https://<render-service-name>.onrender.com`
- Redirect URLs: `https://<render-service-name>.onrender.com/**`, `http://localhost:3000/**`

### 5. 수동 E2E 체크리스트 (승인 후 실행)

- [ ] 정적 화면 렌더링 (`GET /`)
- [ ] 플레이 화면 (`GET /play.html`)
- [ ] 헬스체크 (`GET /healthz`)
- [ ] `GET /api/config` 공개 필드 + Cache-Control
- [ ] Google 로그인 redirect 흐름
- [ ] 브라우저 콘솔에서 secret sentinel 부재

### 6. 복구

배포 실패는 Render가 이전 버전으로 유지하므로, 먼저 Actions/Render 로그를 확인하고, 필요한 경우 이전 successful deploy로 rollback합니다.

## 참고 (References)

- Render: [Web services](https://render.com/docs/web-services), [Node version](https://render.com/docs/node-version), [Node + Express](https://render.com/docs/deploy-node-express-app), [Environment variables](https://render.com/docs/configure-environment-variables), [Health checks](https://render.com/docs/health-checks), [Web services(auto-deploy)](https://render.com/docs/web-services#auto-deploy), [Free tier](https://render.com/docs/free#free-web-services)
- Supabase: [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
