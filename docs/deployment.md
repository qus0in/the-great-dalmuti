# 배포 (GitHub Pages · Actions)

## 왜 (Why)

- `dist/`의 정적 프로토타입을 누구나 브라우저로 확인할 수 있도록 고정 공개 URL로 배포합니다.
- 이 저장소의 Pages는 이미 **GitHub Actions 소스**(`build_type: "workflow"`)로 설정되어 있어, 별도 사용자 전환이 필요하지 않습니다(API로 확인: `source.branch: main`).

## 무엇을 (What)

- **사이트 URL**: `https://qus0in.github.io/the-great-dalmuti/`
- **산출물**: `dist/` 디렉터리만 업로드합니다. 공개 URL 루트는 `dist/` 내부가 그대로 노출되므로 URL에 `/dist` 경로가 포함되지 않으며, 페이지의 상대 경로(`css/…`, `play.html`)가 그대로 동작합니다.
- **워크플로**: `.github/workflows/pages.yml`
  - 트리거: `main` 브랜치 push(`dist/**` 또는 워크플로 파일 자체가 바뀐 경우) + 수동 `workflow_dispatch`
  - 권한: `contents: read`, `pages: write`, `id-token: write`
  - 환경: `github-pages`, 동시성: `group: pages`(진행 중 취소 없음)
  - 단계: checkout → configure-pages → upload-pages-artifact(`path: dist`) → deploy-pages
  - 정적 HTML/CSS만 배포하므로 빌드 스택(Node 등) 설정이 없습니다.

### 배포 소스 선택 평가 (SWOT)

- **강점**: `dist/`만 정확히 업로드되어 공개 범위가 명확하고, 빌드 도구 없이 순수 정적 산출물을 그대로 배포하며, 모든 배포가 Actions 로그로 감사됩니다.
- **약점**: 배포가 Actions 러너에 의존하므로 러너 장애 시 수동 재실행이 필요합니다.
- **기회**: 같은 사이트에서 현재의 정적 대기실(hall)/플레이(play) 프로토타입을 링크 하나로 공유할 수 있어, 별도 호스팅 없이 확인과 피드백이 가능합니다.
- **위협**: 워크플로 파일 변경도 배포를 트리거하므로, 변경은 `paths` 한정과 수동 dispatch로 통제합니다.

## 어떻게 (How)

1. **자동 배포**: `dev`에서 작업 → PR로 `dev` -> `main` 병합 → `main`에 push되면 워크플로가 실행되어 `dist/`가 사이트 루트로 게시됩니다.
2. **수동 배포**: GitHub Actions 탭에서 "Deploy GitHub Pages" 워크플로를 선택해 `main` 기준으로 Run workflow(= `workflow_dispatch`).
3. **실패 확인**: Actions 탭의 해당 실행 로그에서 어느 단계에서 실패했는지 확인합니다.
4. **설정 위치**: 저장소 Settings의 Pages에서 소스가 "GitHub Actions"인지 확인할 수 있습니다(현재 이미 Actions 소스).
5. **주의**: `dist/` 밖의 파일은 배포에 포함되지 않고, 공개 URL에는 `/dist`가 없으며, 워크플로 파일 자체 변경도 배포를 트리거합니다.
