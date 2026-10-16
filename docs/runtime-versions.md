# 런타임 및 의존성 버전 명세

0.3 스켈레톤 구성을 위해 공식 소스에서 조회한 런타임 및 핵심 패키지 버전 정보입니다.

- 조회 일자: 2026-10-16

## 1. Node.js 런타임

- **공식 출처**: [Node.js Release Schedule](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json) (참고: [Node.js Previous Releases](https://nodejs.org/en/about/previous-releases))
- **조회 상태**:
  - Node.js v24 (Codename: Krypton): Active LTS (LTS 시작 2025-10-28, End-of-Life 2028-04-30)
  - Node.js v22 (Codename: Jod): Maintenance LTS (End-of-Life 2027-04-30)
- **적용 범위**: `package.json`의 `engines.node`를 `^22 || ^24`로 설정하여 현재 유효한 LTS 메이저 버전(Active LTS v24 및 Maintenance LTS v22)만 허용합니다 (비LTS 홀수 메이저 제외).

## 2. Express

- **공식 출처**: [npm registry (express)](https://registry.npmjs.org/express)
- **최신 안정 버전**: `5.3.0` (dist-tag `latest`)
- **용도**: 정적 파일 서빙(`src/ui/public/`) 및 0.3 프로토타입 API 서버 호스팅.

## 3. Axios

- **공식 출처**: [npm registry (axios)](https://registry.npmjs.org/axios)
- **최신 안정 버전**: `1.20.0` (dist-tag `latest`)
- **용도**: 향후 클라이언트 및 서버 간 HTTP 통신 의존성(0.3 초기 정적 서빙 단계에서는 미사용으로 의존성 설치 보류 및 기록만 유지).
