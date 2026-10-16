# Google 로그인 설정 (Supabase)

## 왜

#30의 "Supabase·Google OAuth 설정 절차를 docs/에 기록" 요구를 채우기 위해, 붙여넣은 가이드 중 이 프로젝트의 결정과 맞는 부분만 남긴다.

## 무엇

### 1. Google Cloud 동의 화면

- Audience는 External, 확인용 계정은 Test users에 등록한다.
- 범위는 `openid`·`email`·`profile`이다.

### 2. OAuth Client

- 종류는 Web application이다.
- JS origins: `http://localhost:3000`, `https://the-great-dalmuti.onrender.com`.
- redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.

### 3. Supabase provider 활성화

- Supabase 대시보드 → Authentication → Providers → Google을 켜고 Client ID·Secret을 입력한다.
- 두 값은 Supabase 대시보드에만 두고, 저장소·`.env`에 두지 않는다.

### 4. URL Configuration

- Site URL·Redirect URLs는 [배포 문서 4단계](deployment.md#4-supabase-auth-redirect-url-승인-후-실행)와 같은 값이며, 중복 대신 해당 단계를 따른다.

### 5. 두 redirect의 차이

- Google에 등록하는 redirect URI(Supabase callback)와 Supabase에 등록하는 Redirect URLs(우리 서비스 주소)는 서로 다른 설정이다. 혼동하면 `redirect_uri_mismatch`가 난다.

### 6. 브라우저 호출 (개념 수준)

- `signInWithOAuth`(`provider: 'google'`) → Google 동의 → Supabase callback → 복귀 주소로 이동한다.
- `getUser`로 사용자를 확인하고, `signOut`으로 끝낸다. 호출 규약은 [ADR-0003](adr/0003-0.3-transport.md) 확정 6·8에 따른다.

### 7. 오류 4행

| 오류 | 대응 |
| --- | --- |
| `redirect_uri_mismatch` | Google에 등록된 Supabase Callback URL을 확인한다. |
| `invalid_client` | Client ID·Secret이 Supabase 대시보드에 바르게 들어갔는지 확인한다. |
| `access_denied`·403 | Audience·Test users 등록을 확인한다. |
| 잘못된 페이지로 이동 | Site URL·Redirect URLs를 확인한다. |

### 8. 브라우저 탑재 방식

- 브라우저 탑재 방식은 [ADR-0010](adr/0010-0.3-browser-supabase-js.md)에 따라 ESM CDN import로 싣는다.

## 어떻게

- 순서: 동의 화면 → OAuth Client → Supabase provider → URL Configuration → 동작 확인.
- 공식 문서: [Supabase Google 로그인 안내](https://supabase.com/docs/guides/auth/social-login/auth-google).
