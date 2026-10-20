import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';
import * as gate from './auth-gate.js';

let client = null;

// 서버에서 공개 설정을 읽어 클라이언트를 만든다 (세션은 탭별로 보관)
export async function getClient() {
  if (client) return client;
  // eslint-disable-next-line compat/compat -- 공개 설정 조회는 fetch가 표준 (IE11은 지원 종료)
  const res = await fetch('/api/config');
  const { supabaseUrl, supabasePublishableKey } = await res.json();
  client = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { storage: window.sessionStorage },
  });
  return client;
}

// 구글 로그인 (끝나면 대기실로 돌아온다)
export async function signInWithGoogle() {
  const sb = await getClient();
  await sb.auth.signInWithOAuth({
    provider: 'google',
    // eslint-disable-next-line compat/compat -- origin 조합은 표준 (IE11은 지원 종료)
    options: { redirectTo: `${window.location.origin}/` },
  });
}

// 로그아웃 (로그인 화면으로 이동)
export async function signOut() {
  const sb = await getClient();
  await sb.auth.signOut();
  window.location.replace('/login');
}

// 지금 사용자 (없으면 null)
export async function currentUser() {
  const sb = await getClient();
  const { data } = await sb.auth.getSession();
  return data.session?.user ?? null;
}

// 복귀 주소 세션 대기 (10초 안에 세션 없으면 로그인으로)
async function waitForSession() {
  const sb = await getClient();
  const guard = gate.createSessionGuard({
    timeoutMs: 10000,
    redirect: () => window.location.replace('/login'),
    reload: () => window.location.reload(),
  });
  sb.auth.onAuthStateChange((_event, session) => guard.onSession(session));
  guard.start();
}

// hall·play·admin 표시 (세션 확인 뒤)
async function showApp(user) {
  gate.revealAuthBody();
  gate.syncAuthUI(user);
  gate.onAuthClick('[data-auth="logout"]', signOut);
  const sb = await getClient();
  sb.auth.onAuthStateChange((_event, session) => {
    const next = session?.user ?? null;
    if (!next) {
      window.location.replace('/login');
    } else {
      gate.syncAuthUI(next);
    }
  });
}

// 페이지 표식(data-page)으로 가림·이동을 처리한다
async function init() {
  const { page } = document.body.dataset;
  if (!page) return;
  const { search, hash } = window.location;
  const isOAuth = gate.isOAuthReturn(search, hash);
  let user;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }
  const next = gate.decideAuthGate({ page, user, isOAuth });
  if (next === 'to-login' || next === 'to-home') {
    const target = next === 'to-home' ? '/' : '/login';
    window.location.replace(target);
    return;
  }
  if (next === 'wait') {
    await waitForSession();
    return;
  }
  if (page === 'login') {
    gate.revealAuthBody();
    gate.onAuthClick('[data-auth="login"]', signInWithGoogle);
    return;
  }
  await showApp(user);
}

init();
