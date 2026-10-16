import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';

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
function onClick(selector, fn) {
  document.querySelector(selector)?.addEventListener('click', fn);
}

// 로그인 화면: 세션이 있으면 대기실로, 없으면 버튼 연결
function guardLogin(user) {
  if (user) window.location.replace('/');
  else onClick('[data-auth="login"]', signInWithGoogle);
}

// hall·play: 세션이 없으면 로그인 화면으로, 있으면 표시·연결
async function guardApp(user) {
  if (!user) window.location.replace('/login');
  else {
    syncAuthUI(user);
    onClick('[data-auth="logout"]', signOut);
    const sb = await getClient();
    sb.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      if (!next) {
        window.location.replace('/login');
      } else {
        syncAuthUI(next);
      }
    });
  }
}

// 페이지 표식(data-page)으로 가드·이동을 처리한다
async function init() {
  const { page } = document.body.dataset;
  if (!page) return;
  let user;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }
  if (page === 'login') return guardLogin(user);
  await guardApp(user);
}

init();
