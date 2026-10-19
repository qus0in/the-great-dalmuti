// 인증 가림·표시·이동 판단 (저장소 직접 접근 금지, 판단 함수는 테스트)
const PROTECTED_PAGES = ['hall', 'play', 'admin'];

// 외부 로그인 복귀 주소인가 (PKCE 코드·암시적 토큰, 세션 생성 전)
export function isOAuthReturn(search, hash) {
  const query = String(search ?? '');
  const fragment = String(hash ?? '');
  if (/(?:^|[?&])code=/.test(query)) return true;
  return fragment.includes('access_token');
}

// 보호 화면인가 (대기실·플레이·관리자)
export function isProtectedPage(page) {
  return PROTECTED_PAGES.includes(page);
}

// 확인 뒤 이동·표시 결정 (복귀 주소는 기다림, 튕기지 않는다)
export function decideAuthGate({ page, user, isOAuth }) {
  if (page === 'login') {
    if (user) return 'to-home';
    if (isOAuth) return 'wait';
    return 'show';
  }
  if (isProtectedPage(page)) {
    if (user) return 'show';
    if (isOAuth) return 'wait';
    return 'to-login';
  }
  return 'show';
}

// 표시 전환 (data-auth 속성으로만 찾는다)
export function syncAuthUI(user) {
  const name = user?.user_metadata?.full_name ?? user?.email ?? '';
  for (const el of document.querySelectorAll('[data-auth="signed-in"]')) {
    el.hidden = !user;
  }
  for (const el of document.querySelectorAll('[data-auth="signed-out"]')) {
    el.hidden = Boolean(user);
  }
  for (const el of document.querySelectorAll('[data-auth="user-name"]')) {
    el.textContent = name;
  }
}

// 버튼 연결 (없으면 무시)
export function onAuthClick(selector, fn) {
  document.querySelector(selector)?.addEventListener('click', fn);
}

// 확인 전 가림 해제 (표시 확정 때만 호출)
export function revealAuthBody() {
  document.body.removeAttribute('data-auth-guard');
}
